import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/shopee";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function pickExternalOrderId(payload: any): string | null {
  const candidates = [
    payload?.externalOrderId,
    payload?.orderId,
    payload?.order_id,
    payload?.ordersn,
    payload?.order_sn,
    payload?.data?.orderId,
    payload?.data?.order_sn,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
    if (typeof c === "number") return String(c);
  }
  return null;
}

function normalizeItems(payload: any): Array<{ externalSkuId: string; qty: number; price?: number | null }> {
  const list: any[] = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.item_list)
      ? payload.item_list
      : Array.isArray(payload?.data?.items)
        ? payload.data.items
        : Array.isArray(payload?.data?.item_list)
          ? payload.data.item_list
          : [];

  return list
    .map((it) => {
      const externalSkuId = String(it?.externalSkuId ?? it?.model_sku ?? it?.item_sku ?? it?.sku_id ?? it?.variation_id ?? it?.sku ?? "").trim();
      const qty = Number(it?.qty ?? it?.quantity ?? it?.amount ?? 0);
      const price = it?.price != null ? Number(it.price) : null;
      return { externalSkuId, qty, price };
    })
    .filter((x) => x.externalSkuId && x.qty > 0);
}

function determineAction(payload: any): { action: "OUT" | "IN"; status: "PAID" | "CANCELLED" | "RETURNED" } {
  const raw = String(
    payload?.status ?? payload?.order_status ?? payload?.data?.status ?? payload?.data?.order_status ?? payload?.event ?? payload?.event_type ?? payload?.type ?? ""
  ).toLowerCase();
  const canceledHints = ["cancel", "cancelled", "canceled", "void", "closed", "expire", "failed", "refund"];
  const returnedHints = ["return", "returned", "reverse", "rto"];
  if (returnedHints.some((h) => raw.includes(h))) return { action: "IN", status: "RETURNED" };
  if (canceledHints.some((h) => raw.includes(h))) return { action: "IN", status: "CANCELLED" };
  return { action: "OUT", status: "PAID" };
}

export async function POST(req: Request) {
  // Auth options:
  // 1) Simple shared secret (recommended for internal testing): set WEBHOOK_SECRET_SHOPEE and send header x-webhook-secret
  // 2) Best-effort Shopee signature verification: header x-shopee-signature = HMAC-SHA256(rawBody, partner_key)
  const secret = process.env.WEBHOOK_SECRET_SHOPEE || "";
  const header = req.headers.get("x-webhook-secret") || "";

  const rawBody = await req.text();
  const sigHeader = req.headers.get("x-shopee-signature") || req.headers.get("X-Shopee-Signature");

  const okBySecret = !!secret && header === secret;
  const okBySig = verifyWebhookSignature(rawBody, sigHeader);

  if (!okBySecret && !okBySig) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = (() => {
    try { return rawBody ? JSON.parse(rawBody) : null; } catch { return null; }
  })();
  if (!payload) return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });

  const raw = JSON.stringify(payload);
  const idempotencyKey = sha256(`SHOPEE:${raw}`);

  // Store event (idempotent)
  const externalOrderId = pickExternalOrderId(payload);
  const existing = await prisma.webhookEvent.findUnique({ where: { idempotencyKey } });
  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const event = await prisma.webhookEvent.create({
    data: {
      channel: "SHOPEE",
      idempotencyKey,
      externalOrderId: externalOrderId ?? null,
      externalEventId: payload?.event_id ? String(payload.event_id) : null,
      payloadJson: payload,
      status: "RECEIVED",
    },
  });

  // Try process immediately
  if (!externalOrderId) {
    await prisma.webhookEvent.update({ where: { id: event.id }, data: { status: "IGNORED", errorMessage: "Missing externalOrderId" } });
    return NextResponse.json({ ok: true, status: "IGNORED" });
  }

  const items = normalizeItems(payload);
  if (items.length === 0) {
    await prisma.webhookEvent.update({ where: { id: event.id }, data: { status: "IGNORED", errorMessage: "No items" } });
    return NextResponse.json({ ok: true, status: "IGNORED" });
  }

  const maps = await prisma.channelSkuMap.findMany({
    where: { channel: "SHOPEE", externalSkuId: { in: items.map((i) => i.externalSkuId) } },
  });
  const mapBySku = new Map(maps.map((m) => [m.externalSkuId, m.variantId]));
  const missing = items.filter((i) => !mapBySku.get(i.externalSkuId));
  if (missing.length) {
    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: { status: "UNMAPPED", errorMessage: `Unmapped SKU: ${missing.map((m) => m.externalSkuId).join(", ")}` },
    });
    return NextResponse.json({ ok: true, status: "UNMAPPED", missing: missing.map((m) => m.externalSkuId) }, { status: 202 });
  }

  // Use the same retry processor by calling internal API isn't possible here; implement minimal create order
  const outlet = (await prisma.outlet.findFirst({ where: { type: "WAREHOUSE" }, orderBy: { createdAt: "asc" } }))
    ?? (await prisma.outlet.create({ data: { name: "Gudang", type: "WAREHOUSE", isActive: true } }));

  const variantIds = items.map((i) => mapBySku.get(i.externalSkuId)!) ;
  const variants = await prisma.productVariant.findMany({ where: { id: { in: variantIds }, deletedAt: null }, include: { product: true } });
  const vById = new Map(variants.map((v) => [v.id, v]));

  const { action, status: mappedStatus } = determineAction(payload);

  // stock check (only for OUT)
  if (action === "OUT") for (const it of items) {
    const variantId = mapBySku.get(it.externalSkuId)!;
    const stock = await prisma.stock.findUnique({ where: { outletId_variantId: { outletId: outlet.id, variantId } } });
    const current = stock?.qty ?? 0;
    if (current - it.qty < 0) {
      await prisma.webhookEvent.update({ where: { id: event.id }, data: { status: "ERROR", errorMessage: `Insufficient stock for ${it.externalSkuId}` } });
      return NextResponse.json({ ok: false, message: "Insufficient stock" }, { status: 409 });
    }
  }

  const orderItems = items.map((it) => {
    const variantId = mapBySku.get(it.externalSkuId)!;
    const variant = vById.get(variantId)!;
    const unitPrice = it.price != null ? it.price : (variant?.price ?? 0);
    return { productId: variant.productId, variantId, qty: it.qty, price: unitPrice, subtotal: unitPrice * it.qty };
  });
  const totalAmount = orderItems.reduce((s, x) => s + x.subtotal, 0);

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.upsert({
      where: { channel_externalOrderId: { channel: "SHOPEE", externalOrderId } },
      update: { totalAmount, outletId: outlet.id, source: "API", status: mappedStatus },
      create: {
        orderCode: `API-SHOPEE-${externalOrderId.slice(-12)}`,
        channel: "SHOPEE",
        source: "API",
        outletId: outlet.id,
        externalOrderId,
        totalAmount,
        status: mappedStatus,
      },
    });

    await tx.orderItem.deleteMany({ where: { orderId: created.id } });
    await tx.orderItem.createMany({ data: orderItems.map((it) => ({ ...it, orderId: created.id })) });

    // Idempotent stock apply per action+variant
    const refType = action === "OUT" ? "STOCK_OUT" : "RETURN";
    for (const it of orderItems) {
      const exists = await tx.stockMovement.findFirst({ where: { refType, refId: created.id, variantId: it.variantId } });
      if (exists) continue;
      await tx.stock.update({
        where: { outletId_variantId: { outletId: outlet.id, variantId: it.variantId } },
        data: { qty: action === "OUT" ? { decrement: it.qty } : { increment: it.qty } },
      });
      await tx.stockMovement.create({
        data: {
          type: action === "OUT" ? "OUT" : "IN",
          outletId: outlet.id,
          variantId: it.variantId,
          qty: it.qty,
          note: `API SHOPEE ${externalOrderId} (${mappedStatus})`,
          refType,
          refId: created.id,
        },
      });
    }

    return created;
  });

  await prisma.webhookEvent.update({ where: { id: event.id }, data: { status: "PROCESSED", processedAt: new Date(), errorMessage: null } });
  return NextResponse.json({ ok: true, status: "PROCESSED", orderId: order.id });
}
