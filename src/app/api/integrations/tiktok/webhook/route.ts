import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function pickExternalOrderId(payload: any): string | null {
  const candidates = [
    payload?.externalOrderId,
    payload?.orderId,
    payload?.order_id,
    payload?.orderNo,
    payload?.order_no,
    payload?.data?.order_id,
    payload?.data?.orderNo,
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
      const externalSkuId = String(it?.externalSkuId ?? it?.sku_id ?? it?.variation_id ?? it?.seller_sku ?? it?.sku ?? "").trim();
      const qty = Number(it?.qty ?? it?.quantity ?? it?.amount ?? 0);
      const price = it?.price != null ? Number(it.price) : null;
      return { externalSkuId, qty, price };
    })
    .filter((x) => x.externalSkuId && x.qty > 0);
}

export async function POST(req: Request) {
  const secret = process.env.WEBHOOK_SECRET_TIKTOK || "";
  const header = req.headers.get("x-webhook-secret") || "";
  if (!secret || header !== secret) {
    return NextResponse.json({ message: "Unauthorized" }, { headers: { "Cache-Control": "no-store" }, status: 401 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload) return NextResponse.json({ message: "Invalid JSON" }, { headers: { "Cache-Control": "no-store" }, status: 400 });

  const raw = JSON.stringify(payload);
  const idempotencyKey = sha256(`TIKTOK:${raw}`);

  const externalOrderId = pickExternalOrderId(payload);
  const existing = await prisma.webhookEvent.findUnique({ where: { idempotencyKey } });
  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true }, { headers: { "Cache-Control": "no-store" } });
  }

  const event = await prisma.webhookEvent.create({
    data: {
      channel: "TIKTOK",
      idempotencyKey,
      externalOrderId: externalOrderId ?? null,
      externalEventId: payload?.event_id ? String(payload.event_id) : null,
      payloadJson: payload,
      status: "RECEIVED",
    },
  });

  if (!externalOrderId) {
    await prisma.webhookEvent.update({ where: { id: event.id }, data: { status: "IGNORED", errorMessage: "Missing externalOrderId" } });
    return NextResponse.json({ ok: true, status: "IGNORED" }, { headers: { "Cache-Control": "no-store" } });
  }

  const items = normalizeItems(payload);
  if (items.length === 0) {
    await prisma.webhookEvent.update({ where: { id: event.id }, data: { status: "IGNORED", errorMessage: "No items" } });
    return NextResponse.json({ ok: true, status: "IGNORED" }, { headers: { "Cache-Control": "no-store" } });
  }

  const maps = await prisma.channelSkuMap.findMany({
    where: { channel: "TIKTOK", externalSkuId: { in: items.map((i) => i.externalSkuId) } },
  });
  const mapBySku = new Map(maps.map((m) => [m.externalSkuId, m.variantId]));
  const missing = items.filter((i) => !mapBySku.get(i.externalSkuId));
  if (missing.length) {
    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: { status: "UNMAPPED", errorMessage: `Unmapped SKU: ${missing.map((m) => m.externalSkuId).join(", ")}` },
    });
    return NextResponse.json({ ok: true, status: "UNMAPPED", missing: missing.map((m) => m.externalSkuId) }, { headers: { "Cache-Control": "no-store" }, status: 202 });
  }

  const outlet = (await prisma.outlet.findFirst({ where: { type: "WAREHOUSE" }, orderBy: { createdAt: "asc" } }))
    ?? (await prisma.outlet.create({ data: { name: "Gudang", type: "WAREHOUSE", isActive: true } }));

  const variantIds = items.map((i) => mapBySku.get(i.externalSkuId)!) ;
  const variants = await prisma.productVariant.findMany({ where: { id: { in: variantIds }, deletedAt: null }, include: { product: true } });
  const vById = new Map(variants.map((v) => [v.id, v]));

  for (const it of items) {
    const variantId = mapBySku.get(it.externalSkuId)!;
    const stock = await prisma.stock.findUnique({ where: { outletId_variantId: { outletId: outlet.id, variantId } } });
    const current = stock?.qty ?? 0;
    if (current - it.qty < 0) {
      await prisma.webhookEvent.update({ where: { id: event.id }, data: { status: "ERROR", errorMessage: `Insufficient stock for ${it.externalSkuId}` } });
      return NextResponse.json({ ok: false, message: "Insufficient stock" }, { headers: { "Cache-Control": "no-store" }, status: 409 });
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
      where: { channel_externalOrderId: { channel: "TIKTOK", externalOrderId } },
      update: { totalAmount, outletId: outlet.id, source: "API" },
      create: {
        orderCode: `API-TIKTOK-${externalOrderId.slice(-12)}`,
        channel: "TIKTOK",
        source: "API",
        outletId: outlet.id,
        externalOrderId,
        totalAmount,
        status: "NEW",
      },
    });

    await tx.orderItem.deleteMany({ where: { orderId: created.id } });
    await tx.orderItem.createMany({ data: orderItems.map((it) => ({ ...it, orderId: created.id })) });

    for (const it of orderItems) {
      await tx.stock.update({ where: { outletId_variantId: { outletId: outlet.id, variantId: it.variantId } }, data: { qty: { decrement: it.qty } } });
      await tx.stockMovement.create({
        data: {
          type: "OUT",
          outletId: outlet.id,
          variantId: it.variantId,
          qty: it.qty,
          note: `API TIKTOK ${externalOrderId}`,
          refType: "ORDER",
          refId: created.id,
        },
      });
    }

    return created;
  });

  await prisma.webhookEvent.update({ where: { id: event.id }, data: { status: "PROCESSED", processedAt: new Date(), errorMessage: null } });
  return NextResponse.json({ ok: true, status: "PROCESSED", orderId: order.id }, { headers: { "Cache-Control": "no-store" } });
}