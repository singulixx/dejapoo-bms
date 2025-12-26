import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export function getIdempotencyKey(channel: string, rawBody: string) {
  return crypto.createHash("sha256").update(`${channel}:${rawBody}`).digest("hex");
}

export function requireWebhookSecret(req: Request, envKey: string) {
  const expected = process.env[envKey];
  if (!expected) {
    return { ok: false as const, status: 500, message: `Missing env ${envKey}` };
  }
  const got = req.headers.get("x-webhook-secret") || "";
  if (got !== expected) {
    return { ok: false as const, status: 401, message: "Unauthorized" };
  }
  return { ok: true as const };
}

export async function getOrCreateWarehouseOutletId() {
  const outlet = await prisma.outlet.findFirst({ where: { type: "WAREHOUSE" }, orderBy: { createdAt: "asc" } });
  if (outlet) return outlet.id;
  const created = await prisma.outlet.create({ data: { name: "Gudang", type: "WAREHOUSE", isActive: true } });
  return created.id;
}

/**
 * Minimal normalizer for webhook payloads.
 *
 * We intentionally keep this loose because each platform's payload can differ.
 * Expected (recommended) shape:
 * {
 *   externalOrderId: string,
 *   status?: "PAID" | "CANCELLED" | ...,
 *   items: [{ externalSkuId: string, qty: number, price?: number }],
 *   note?: string,
 * }
 */
export function normalizeWebhookPayload(payload: any) {
  const externalOrderId =
    payload?.externalOrderId ??
    payload?.order_id ??
    payload?.orderId ??
    payload?.data?.order_id ??
    payload?.data?.orderId;

  const status = payload?.status ?? payload?.order_status ?? payload?.data?.status ?? payload?.data?.order_status;
  const note = payload?.note ?? payload?.remark ?? payload?.data?.note;

  const rawItems = payload?.items ?? payload?.data?.items ?? payload?.order_items ?? payload?.data?.order_items;
  const items = Array.isArray(rawItems)
    ? rawItems
        .map((it: any) => ({
          externalSkuId: it?.externalSkuId ?? it?.sku_id ?? it?.skuId ?? it?.item_sku ?? it?.seller_sku,
          qty: Number(it?.qty ?? it?.quantity ?? it?.amount ?? 0),
          price: it?.price != null ? Number(it.price) : undefined,
        }))
        .filter((x: any) => x.externalSkuId && Number.isFinite(x.qty) && x.qty > 0)
    : [];

  return { externalOrderId: externalOrderId ? String(externalOrderId) : null, status: status ? String(status) : null, note: note ? String(note) : null, items };
}
