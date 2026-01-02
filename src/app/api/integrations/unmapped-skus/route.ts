import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function extractExternalSkus(payload: any): string[] {
  const itemsRaw = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.item_list)
      ? payload.item_list
      : [];

  const skus: string[] = [];
  for (const it of (itemsRaw as any[])) {
    const externalSkuId = String(
      it.externalSkuId ?? it.model_sku ?? it.item_sku ?? it.sku_id ?? it.variation_id ?? it.sku ?? ""
    ).trim();
    if (externalSkuId) skus.push(externalSkuId);
  }
  return skus;
}

export async function GET(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const { searchParams } = new URL(req.url);
  const channel = searchParams.get("channel") as ("SHOPEE" | "TIKTOK" | null);
  const take = Math.min(500, Math.max(1, Number(searchParams.get("take") || "200")));

  if (!channel) return NextResponse.json({ message: "Missing channel" }, { status: 400 });

  // Fetch recent UNMAPPED events for this channel
  const events = await prisma.webhookEvent.findMany({
    where: { channel, status: "UNMAPPED" },
    orderBy: [{ receivedAt: "desc" }],
    take,
  });

  // Build set of currently mapped SKUs to filter out ones already resolved
  const maps = await prisma.channelSkuMap.findMany({ where: { channel } });
  const mappedSet = new Set(maps.map((m) => m.externalSkuId));

  const agg = new Map<string, { externalSkuId: string; count: number; lastSeenAt: string; sampleOrderId?: string }>();

  for (const ev of events) {
    const payload = ev.payloadJson as any;
    const externalOrderId =
      ev.externalOrderId || payload?.externalOrderId || payload?.orderId || payload?.ordersn || payload?.order_sn || undefined;

    const skus = extractExternalSkus(payload);
    for (const sku of skus) {
      if (mappedSet.has(sku)) continue;
      const prev = agg.get(sku);
      const ts = ev.receivedAt.toISOString();
      if (!prev) {
        agg.set(sku, { externalSkuId: sku, count: 1, lastSeenAt: ts, sampleOrderId: externalOrderId });
      } else {
        prev.count += 1;
        // keep latest lastSeenAt
        if (ts > prev.lastSeenAt) prev.lastSeenAt = ts;
        if (!prev.sampleOrderId && externalOrderId) prev.sampleOrderId = externalOrderId;
      }
    }
  }

  const items = Array.from(agg.values()).sort((a, b) => (a.lastSeenAt < b.lastSeenAt ? 1 : -1));
  return NextResponse.json({ items });
}
