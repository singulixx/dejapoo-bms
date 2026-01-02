import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// Minimal CSV parser (supports quotes, commas, and CRLF)
function parseCsv(text: string) {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    cur.push(field);
    field = "";
  };
  const pushRow = () => {
    // Trim trailing empty row
    if (cur.length === 1 && cur[0] === "") {
      cur = [];
      return;
    }
    rows.push(cur);
    cur = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && ch === ",") {
      pushField();
      continue;
    }
    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      pushField();
      pushRow();
      continue;
    }
    field += ch;
  }
  pushField();
  pushRow();

  const header = rows.shift() || [];
  const headers = header.map((h) => (h ?? "").trim());
  const data = rows.filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
  return { headers, data };
}

const BodySchema = z.object({
  channel: z.enum(["SHOPEE", "TIKTOK"]),
  csvText: z.string().min(1),
  mode: z.enum(["preview", "submit"]).default("preview"),
  mapping: z.object({
    orderId: z.string().min(1),
    sku: z.string().min(1),
    qty: z.string().min(1),
    date: z.string().optional(),
    price: z.string().optional(),
  }),
});

async function getOrCreateWarehouseOutletId() {
  const outlet = await prisma.outlet.findFirst({ where: { type: "WAREHOUSE" }, orderBy: { createdAt: "asc" } });
  if (outlet?.id) return outlet.id;
  const created = await prisma.outlet.create({ data: { name: "Gudang", type: "WAREHOUSE", isActive: true } });
  return created.id;
}

export async function POST(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const { channel, csvText, mode, mapping } = parsed.data;
  const { headers, data } = parseCsv(csvText);

  const idx = {
    orderId: headers.indexOf(mapping.orderId),
    sku: headers.indexOf(mapping.sku),
    qty: headers.indexOf(mapping.qty),
    date: mapping.date ? headers.indexOf(mapping.date) : -1,
    price: mapping.price ? headers.indexOf(mapping.price) : -1,
  };
  if (idx.orderId < 0 || idx.sku < 0 || idx.qty < 0) {
    return NextResponse.json({ message: "Mapping tidak valid (kolom tidak ditemukan)" }, { status: 400 });
  }

  const lines = data
    .map((r) => {
      const orderId = String(r[idx.orderId] ?? "").trim();
      const externalSkuId = String(r[idx.sku] ?? "").trim();
      const qty = Number(String(r[idx.qty] ?? "0").trim() || 0);
      const dateRaw = idx.date >= 0 ? String(r[idx.date] ?? "").trim() : "";
      const priceRaw = idx.price >= 0 ? String(r[idx.price] ?? "").trim() : "";
      const price = priceRaw ? Number(priceRaw.replace(/[^0-9.-]/g, "")) : null;
      return {
        orderId,
        externalSkuId,
        qty: Number.isFinite(qty) ? Math.trunc(qty) : 0,
        dateRaw,
        price: price != null && Number.isFinite(price) ? Math.trunc(price) : null,
      };
    })
    .filter((x) => x.orderId && x.externalSkuId && x.qty > 0);

  if (lines.length === 0) {
    return NextResponse.json({ message: "Tidak ada baris yang valid (cek mapping + isi CSV)" }, { status: 400 });
  }

  const uniqueSkus = Array.from(new Set(lines.map((x) => x.externalSkuId)));
  const maps = await prisma.channelSkuMap.findMany({ where: { channel, externalSkuId: { in: uniqueSkus } } });
  const mapBySku = new Map(maps.map((m) => [m.externalSkuId, m.variantId]));
  const missingSkus = uniqueSkus.filter((sku) => !mapBySku.get(sku));

  // Group by orderId
  const byOrder = new Map<string, { orderId: string; dateRaw?: string; items: Array<{ externalSkuId: string; qty: number; price: number | null }> }>();
  for (const l of lines) {
    const cur = byOrder.get(l.orderId) || { orderId: l.orderId, dateRaw: l.dateRaw || undefined, items: [] as any[] };
    cur.items.push({ externalSkuId: l.externalSkuId, qty: l.qty, price: l.price });
    if (!cur.dateRaw && l.dateRaw) cur.dateRaw = l.dateRaw;
    byOrder.set(l.orderId, cur);
  }

  const orders = Array.from(byOrder.values());

  // Stock check (warehouse)
  const outletId = await getOrCreateWarehouseOutletId();
  const neededByVariant = new Map<string, number>();
  for (const o of orders) {
    for (const it of o.items) {
      const variantId = mapBySku.get(it.externalSkuId);
      if (!variantId) continue;
      neededByVariant.set(variantId, (neededByVariant.get(variantId) || 0) + it.qty);
    }
  }
  const stocks = await prisma.stock.findMany({
    where: { outletId, variantId: { in: Array.from(neededByVariant.keys()) } },
    select: { variantId: true, qty: true },
  });
  const stockByVariant = new Map(stocks.map((s) => [s.variantId, s.qty]));

  const insufficient: Array<{ variantId: string; need: number; have: number }> = [];
  for (const [variantId, need] of neededByVariant.entries()) {
    const have = stockByVariant.get(variantId) ?? 0;
    if (have - need < 0) insufficient.push({ variantId, need, have });
  }

  if (mode === "preview") {
    return NextResponse.json({
      headers,
      stats: {
        orders: orders.length,
        lines: lines.length,
        mappedSkus: uniqueSkus.length - missingSkus.length,
        missingSkus: missingSkus.length,
        insufficient: insufficient.length,
      },
      missingSkus,
      insufficient,
      sample: orders.slice(0, 5),
    });
  }

  // Submit: if missing mappings -> reject
  if (missingSkus.length) {
    return NextResponse.json({ message: "Masih ada SKU yang belum di-mapping", missingSkus }, { status: 409 });
  }

  // Submit: allow proceed even if insufficient? safer: block
  if (insufficient.length) {
    return NextResponse.json({ message: "Stok tidak cukup untuk sebagian item", insufficient }, { status: 409 });
  }

  const created = await prisma.$transaction(async (tx) => {
    const results: any[] = [];

    for (const o of orders) {
      // Resolve variants + prices
      const resolved = o.items.map((it) => {
        const variantId = mapBySku.get(it.externalSkuId)!;
        return { ...it, variantId };
      });
      const variants = await tx.productVariant.findMany({
        where: { id: { in: resolved.map((x) => x.variantId) }, deletedAt: null },
        include: { product: true },
      });
      const vById = new Map(variants.map((v) => [v.id, v]));

      const orderItems = resolved.map((it) => {
        const v = vById.get(it.variantId)!;
        const unitPrice = it.price != null ? it.price : (v?.price ?? 0);
        return { productId: v.productId, variantId: it.variantId, qty: it.qty, price: unitPrice, subtotal: unitPrice * it.qty };
      });
      const totalAmount = orderItems.reduce((s, x) => s + x.subtotal, 0);

      const externalOrderId = o.orderId;
      const createdOrder = await tx.order.upsert({
        where: { channel_externalOrderId: { channel, externalOrderId } },
        update: { totalAmount, source: "MANUAL", outletId, note: "CSV_IMPORT" },
        create: {
          orderCode: `CSV-${channel}-${externalOrderId.slice(-12)}`,
          channel,
          source: "MANUAL",
          outletId,
          externalOrderId,
          totalAmount,
          status: "NEW",
          note: "CSV_IMPORT",
        },
      });

      // Replace items
      await tx.orderItem.deleteMany({ where: { orderId: createdOrder.id } });
      await tx.orderItem.createMany({ data: orderItems.map((it) => ({ ...it, orderId: createdOrder.id })) });

      // Idempotent stock apply: only if no movements exist for this order
      const existingMov = await tx.stockMovement.count({ where: { refType: "CSV_IMPORT", refId: createdOrder.id } });
      if (existingMov === 0) {
        for (const it of orderItems) {
          await tx.stock.update({ where: { outletId_variantId: { outletId, variantId: it.variantId } }, data: { qty: { decrement: it.qty } } });
          await tx.stockMovement.create({
            data: {
              type: "OUT",
              outletId,
              variantId: it.variantId,
              qty: it.qty,
              note: `CSV_IMPORT ${channel} ${externalOrderId}`,
              refType: "CSV_IMPORT",
              refId: createdOrder.id,
            },
          });
        }
      }

      results.push({ orderId: createdOrder.id, externalOrderId, totalAmount, appliedStock: existingMov === 0 });
    }

    return results;
  });

  return NextResponse.json({ ok: true, createdCount: created.length, results: created }, { status: 201 });
}
