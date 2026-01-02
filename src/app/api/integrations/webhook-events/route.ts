import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function determineAction(payload: any): { action: "OUT" | "IN"; status: "PAID" | "CANCELLED" | "RETURNED" } {
  const raw = String(
    payload?.status ??
      payload?.order_status ??
      payload?.data?.status ??
      payload?.data?.order_status ??
      payload?.event ??
      payload?.event_type ??
      payload?.type ??
      ""
  ).toLowerCase();

  // best-effort mapping
  const canceledHints = ["cancel", "cancelled", "canceled", "void", "closed", "expire", "failed", "refund"];
  const returnedHints = ["return", "returned", "reverse", "rto"];

  if (returnedHints.some((h) => raw.includes(h))) return { action: "IN", status: "RETURNED" };
  if (canceledHints.some((h) => raw.includes(h))) return { action: "IN", status: "CANCELLED" };
  return { action: "OUT", status: "PAID" };
}

async function tryProcessEvent(eventId: string) {
  const event = await prisma.webhookEvent.findUnique({ where: { id: eventId } });
  if (!event) return { ok: false, message: "Event not found" };

  // Only retry for UNMAPPED/ERROR/RECEIVED
  if (!["UNMAPPED", "ERROR", "RECEIVED"].includes(event.status)) {
    return { ok: true, message: `No action for status ${event.status}` };
  }

  const payload = event.payloadJson as any;
  const externalOrderId = event.externalOrderId || payload?.externalOrderId || payload?.orderId || payload?.ordersn || payload?.order_sn;
  if (!externalOrderId) {
    await prisma.webhookEvent.update({ where: { id: eventId }, data: { status: "IGNORED", errorMessage: "Missing externalOrderId", processedAt: new Date() } });
    return { ok: false, message: "Missing externalOrderId" };
  }

  // Normalize items: expect payload.items = [{ externalSkuId, qty, price? }]
  const itemsRaw = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.item_list)
      ? payload.item_list
      : Array.isArray(payload?.items)
        ? payload.items
        : [];

  const items = (itemsRaw as any[]).map((it) => {
    const externalSkuId =
      String(it.externalSkuId ?? it.model_sku ?? it.item_sku ?? it.sku_id ?? it.variation_id ?? it.sku ?? "").trim();
    const qty = Number(it.qty ?? it.quantity ?? it.amount ?? 0);
    const price = it.price != null ? Number(it.price) : null;
    return { externalSkuId, qty, price };
  }).filter((x) => x.externalSkuId && x.qty > 0);

  if (items.length === 0) {
    await prisma.webhookEvent.update({ where: { id: eventId }, data: { status: "IGNORED", errorMessage: "No items", processedAt: new Date() } });
    return { ok: false, message: "No items" };
  }

  // Map externalSkuId -> variantId
  const maps = await prisma.channelSkuMap.findMany({
    where: { channel: event.channel, externalSkuId: { in: items.map((i) => i.externalSkuId) } },
  });
  const mapBySku = new Map(maps.map((m) => [m.externalSkuId, m.variantId]));

  const missing = items.filter((i) => !mapBySku.get(i.externalSkuId));
  if (missing.length) {
    await prisma.webhookEvent.update({
      where: { id: eventId },
      data: { status: "UNMAPPED", errorMessage: `Unmapped SKU: ${missing.map((m) => m.externalSkuId).join(", ")}` },
    });
    return { ok: false, message: "Unmapped SKU", missing: missing.map((m) => m.externalSkuId) };
  }

  // Upsert Order by (channel, externalOrderId) -> idempotent
  const outlet = await prisma.outlet.findFirst({ where: { type: "WAREHOUSE" }, orderBy: { createdAt: "asc" } })
    ?? await prisma.outlet.create({ data: { name: "Gudang", type: "WAREHOUSE", isActive: true } });

  const variantIds = items.map((i) => mapBySku.get(i.externalSkuId)!) ;
  const variants = await prisma.productVariant.findMany({ where: { id: { in: variantIds }, deletedAt: null }, include: { product: true } });
  const vById = new Map(variants.map((v) => [v.id, v]));

  const { action, status: mappedStatus } = determineAction(payload);

  // Stock check (only for OUT)
  if (action === "OUT") {
    for (const it of items) {
      const variantId = mapBySku.get(it.externalSkuId)!;
      const stock = await prisma.stock.findUnique({ where: { outletId_variantId: { outletId: outlet.id, variantId } } });
      const current = stock?.qty ?? 0;
      if (current - it.qty < 0) {
        await prisma.webhookEvent.update({ where: { id: eventId }, data: { status: "ERROR", errorMessage: `Insufficient stock for ${it.externalSkuId}` } });
        return { ok: false, message: "Insufficient stock" };
      }
    }
  }

  const orderItems = items.map((it) => {
    const variantId = mapBySku.get(it.externalSkuId)!;
    const variant = vById.get(variantId)!;
    const unitPrice = it.price != null ? it.price : (variant?.price ?? 0);
    return {
      productId: variant.productId,
      variantId,
      qty: it.qty,
      price: unitPrice,
      subtotal: unitPrice * it.qty,
    };
  });

  const totalAmount = orderItems.reduce((s, x) => s + x.subtotal, 0);

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.upsert({
      where: { channel_externalOrderId: { channel: event.channel, externalOrderId: String(externalOrderId) } },
      update: { totalAmount, source: "API", outletId: outlet.id, status: mappedStatus },
      create: {
        orderCode: `API-${event.channel}-${String(externalOrderId).slice(-12)}`,
        channel: event.channel,
        source: "API",
        outletId: outlet.id,
        externalOrderId: String(externalOrderId),
        totalAmount,
        status: mappedStatus,
      },
    });

    // Replace items (safe for retry)
    await tx.orderItem.deleteMany({ where: { orderId: created.id } });
    await tx.orderItem.createMany({ data: orderItems.map((it) => ({ ...it, orderId: created.id })) });

    // Idempotent stock apply (per action + variant)
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
          note: `API ${event.channel} ${externalOrderId} (${mappedStatus})`,
          refType,
          refId: created.id,
          createdAt: new Date(event.receivedAt),
        },
      });
    }

    return created;
  });

  await prisma.webhookEvent.update({ where: { id: eventId }, data: { status: "PROCESSED", processedAt: new Date(), externalOrderId: String(externalOrderId), errorMessage: null } });
  return { ok: true, orderId: order.id };
}

export async function GET(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const { searchParams } = new URL(req.url);
  const channel = searchParams.get("channel") as ("SHOPEE" | "TIKTOK" | null);
  const status = searchParams.get("status") || null;
  const take = Math.min(200, Math.max(1, Number(searchParams.get("take") || "50")));

  const where: any = {};
  if (channel) where.channel = channel;
  if (status) where.status = status;

  const items = await prisma.webhookEvent.findMany({
    where,
    orderBy: [{ receivedAt: "desc" }],
    take,
  });

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => null);
  const id = body?.id as string | undefined;
  if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });

  const result = await tryProcessEvent(id);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
