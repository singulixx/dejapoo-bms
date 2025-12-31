import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { createAndEmitNotification } from "@/lib/notifications";

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  outletId: z.string().min(1).optional(),
  channel: z.enum(["SHOPEE", "TIKTOK"]),
  date: z.string().datetime().optional(),
  note: z.string().optional(),
  marketplaceOrderId: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      variantId: z.string().min(1).optional(),
      productVariantId: z.string().min(1).optional(),
      qty: z.number().int().positive(),
      price: z.number().int().min(0).optional(), // optional override
    }),
  ).min(1),
});

function orderCode() {
  const now = new Date();
  const y = String(now.getFullYear()).slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${y}${m}${d}-${rand}`;
}

export async function POST(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { headers: { "Cache-Control": "no-store" }, status: 400 });

  // MVP: single outlet (Gudang). If not provided, auto-pick/create WAREHOUSE outlet.
  let outletId = parsed.data.outletId;
  if (!outletId) {
    const outlet = await prisma.outlet.findFirst({ where: { type: "WAREHOUSE" }, orderBy: { createdAt: "asc" } });
    outletId = outlet?.id;
    if (!outletId) {
      const createdOutlet = await prisma.outlet.create({ data: { name: "Gudang", type: "WAREHOUSE", isActive: true } });
      outletId = createdOutlet.id;
    }
  }

  const { channel, note, marketplaceOrderId } = parsed.data;
  const date = parsed.data.date ? new Date(parsed.data.date) : new Date();

  const normalizedItems = parsed.data.items.map((it) => ({
    productId: it.productId,
    variantId: it.variantId ?? it.productVariantId,
    qty: it.qty,
    price: it.price,
  }));

  if (normalizedItems.some((x) => !x.variantId)) {
    return NextResponse.json({ error: "Invalid input" }, { headers: { "Cache-Control": "no-store" }, status: 400 });
  }

  const created = await prisma.$transaction(async (tx) => {
    // Validate product active
    const products = await tx.product.findMany({
      where: { id: { in: normalizedItems.map((i) => i.productId) }, deletedAt: null },
      select: { id: true, isActive: true },
    });
    const activeSet = new Set(products.filter((p) => p.isActive).map((p) => p.id));
    for (const it of normalizedItems) {
      if (!activeSet.has(it.productId)) throw new Error("PRODUCT_INACTIVE");
    }

    // Load variant prices
    const variants = await tx.productVariant.findMany({
      where: { id: { in: normalizedItems.map((i) => i.variantId!) }, deletedAt: null },
      select: { id: true, price: true },
    });
    const priceMap = new Map(variants.map((v) => [v.id, v.price]));

    // Stock check (no minus)
    for (const it of normalizedItems) {
      const stock = await tx.stock.findUnique({
        where: { outletId_variantId: { outletId: outletId!, variantId: it.variantId! } },
      });
      const current = stock?.qty ?? 0;
      if (current - it.qty < 0) throw new Error("INSUFFICIENT_STOCK");
    }

    const orderItems = normalizedItems.map((it) => {
      const unitPrice = it.price ?? priceMap.get(it.variantId!) ?? 0;
      const subtotal = unitPrice * it.qty;
      return { ...it, price: unitPrice, subtotal };
    });

    const totalAmount = orderItems.reduce((sum, it) => sum + it.subtotal, 0);
    const code = orderCode();

    const order = await tx.order.create({
      data: {
        orderCode: code,
        channel,
        outletId: outletId!,
        marketplaceOrderId: marketplaceOrderId ?? null,
        totalAmount,
        status: "NEW",
        paymentMethod: null,
        customerName: null,
        note: note ?? null,
        createdAt: date,
        items: {
          create: orderItems.map((it) => ({
            productId: it.productId,
            variantId: it.variantId!,
            qty: it.qty,
            price: it.price,
            subtotal: it.subtotal,
          })),
        },
      },
      include: { items: true },
    });

    for (const it of orderItems) {
      await tx.stock.update({
        where: { outletId_variantId: { outletId: outletId!, variantId: it.variantId! } },
        data: { qty: { decrement: it.qty } },
      });
      await tx.stockMovement.create({
        data: {
          type: "OUT",
          outletId: outletId!,
          variantId: it.variantId!,
          qty: it.qty,
          note: note ?? null,
          refType: "ORDER",
          refId: order.id,
          createdAt: date,
        },
      });
    }

    return order;
  }).catch((e: any) => {
    const msg = String(e?.message || e);
    if (msg === "PRODUCT_INACTIVE") return { __error: "Produk nonaktif tidak boleh ditransaksikan" };
    if (msg === "INSUFFICIENT_STOCK") return { __error: "Stok tidak cukup" };
    throw e;
  });

  if ((created as any).__error) return NextResponse.json(created, { headers: { "Cache-Control": "no-store" }, status: 400 });

  // Realtime notification (best-effort). Broadcast to OWNER + ADMIN.
  try {
    await createAndEmitNotification({
      roles: ["OWNER", "ADMIN"],
      type: "ORDER",
      title: `Order baru: ${(created as any).orderCode}`,
      message: `Channel: ${(created as any).channel} • Total: ${(created as any).totalAmount}`,
      href: null,
      metaJson: { orderId: (created as any).id },
    });
  } catch {
    // ignore
  }
  return NextResponse.json(created, { headers: { "Cache-Control": "no-store" }, status: 201 });
}