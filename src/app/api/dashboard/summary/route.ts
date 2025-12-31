import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export const dynamic = 'force-dynamic';

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfMonth(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
}


function startOfNDaysAgo(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() - days);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function GET(req: Request) {
  // Dashboard is accessible to any authenticated user (OWNER/ADMIN/STAFF/etc.).
  const auth = requireAuth(req);
  if (!auth.ok) return auth.res;

  const now = new Date();
  const dayStart = startOfDay(now);
  const monthStart = startOfMonth(now);
  const trendStart = startOfNDaysAgo(now, 29);

  let totalProducts,
    totalVariants,
    stockAgg,
    outlets,
    salesToday,
    salesMonth,
    channelToday,
    topProducts,
    stockRows,
    trendRows,
    movementRows;

  try {
    [
      totalProducts,
      totalVariants,
      stockAgg,
      outlets,
      salesToday,
      salesMonth,
      channelToday,
      topProducts,
      stockRows,
      trendRows,
      movementRows,
    ] = await Promise.all([
      prisma.product.count({ where: { deletedAt: null } }),
      prisma.productVariant.count({ where: { deletedAt: null } }),
      prisma.stock.groupBy({ by: ["outletId"], _sum: { qty: true } }),
      prisma.outlet.findMany({
        where: { deletedAt: null, isActive: true },
        select: { id: true, name: true, type: true },
      }),
      prisma.order.aggregate({
        where: { createdAt: { gte: dayStart } },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      prisma.order.aggregate({
        where: { createdAt: { gte: monthStart } },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      prisma.order.groupBy({
        by: ["channel"],
        where: { createdAt: { gte: dayStart } },
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
      prisma.orderItem.groupBy({
        by: ["productId"],
        _sum: { qty: true, subtotal: true },
        orderBy: { _sum: { subtotal: "desc" } },
        take: 10,
      }),
      prisma.stock.findMany({ include: { variant: { select: { minQty: true } } } }),
      // NOTE: table is mapped with @@map("order") which becomes quoted "order" in Postgres.
      // Using "Order" will fail (case-sensitive) and can also collide with reserved keywords.
      prisma.$queryRaw<
        { d: string; channel: string; orders: bigint; amount: bigint }[]
      >(Prisma.sql`
        SELECT to_char(("createdAt")::date, 'YYYY-MM-DD') as d,
               "channel" as channel,
               COUNT(*)::bigint as orders,
               COALESCE(SUM("totalAmount"),0)::bigint as amount
        FROM "order"
        WHERE "createdAt" >= ${trendStart}
        GROUP BY ("createdAt")::date, "channel"
        ORDER BY ("createdAt")::date ASC
      `),
      prisma.stockMovement.groupBy({
        by: ["outletId", "type"],
        where: { createdAt: { gte: trendStart } },
        _sum: { qty: true },
      }),
    ]);
  } catch (err: any) {
    // Surface a readable error in Vercel logs, while returning a safe message to the client.
    console.error("[dashboard/summary] failed", err);
    return NextResponse.json(
      {
        message: "Failed to build dashboard summary",
        // Include a short message to speed up debugging in production.
        // (This does not include secrets; it's typically a Prisma error code or SQL text.)
        error: String(err?.message ?? err),
        hint: "Open Vercel → Deployments → (latest) → Functions → /api/dashboard/summary to see full logs.",
      },
      { status: 500 }
    );
  }

  // Be defensive: if a Stock row somehow lost its Variant relation, avoid crashing the dashboard.
  const lowStockCount = stockRows.filter((r) => {
    const min = (r as any).variant?.minQty ?? 0;
    return Number((r as any).qty ?? 0) < Number(min);
  }).length;

  const outletStock = outlets.map((o) => {
    const hit = stockAgg.find((s) => s.outletId === o.id);
    return { outletId: o.id, outletName: o.name, outletType: o.type, qty: Number(hit?._sum.qty ?? 0) };
  });

  const totalStock = outletStock.reduce((a, b) => a + (b.qty ?? 0), 0);

  const topProductIds = topProducts.map((p) => p.productId);
  const productNames = topProductIds.length
    ? await prisma.product.findMany({ where: { id: { in: topProductIds } }, select: { id: true, name: true } })
    : [];

  const top10 = topProducts.map((p) => ({
    productId: p.productId,
    productName: productNames.find((x) => x.id === p.productId)?.name ?? "Unknown",
    qty: Number(p._sum.qty ?? 0),
    revenue: Number(p._sum.subtotal ?? 0),
  }));

  const channelSummary = ["SHOPEE", "TIKTOK", "OFFLINE_STORE"].map((ch) => {
    const hit = channelToday.find((c) => c.channel === ch);
    return {
      channel: ch,
      orders: Number(hit?._count._all ?? 0),
      amount: Number(hit?._sum.totalAmount ?? 0),
    };
  });

  // ---- trend normalize (last 30 days) ----
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  const trendByDay = days.map((d) => {
    const byCh = (ch: string) => {
      const hit = trendRows.find((r) => r.d === d && r.channel === ch);
      return { orders: Number(hit?.orders ?? 0), amount: Number(hit?.amount ?? 0) };
    };
    const shopee = byCh("SHOPEE");
    const tiktok = byCh("TIKTOK");
    const offline = byCh("OFFLINE_STORE");
    return {
      date: d,
      total: {
        orders: shopee.orders + tiktok.orders + offline.orders,
        amount: shopee.amount + tiktok.amount + offline.amount,
      },
      shopee,
      tiktok,
      offline,
    };
  });

  const outletPerf = outlets.map((o) => {
    const sumType = (t: string) => {
      const hit = movementRows.find((m) => m.outletId === o.id && m.type === t);
      return Number(hit?._sum.qty ?? 0);
    };
    return {
      outletId: o.id,
      outletName: o.name,
      outletType: o.type,
      inQty: sumType("IN") + sumType("TRANSFER_IN"),
      outQty: sumType("OUT") + sumType("TRANSFER_OUT"),
    };
  });

  return NextResponse.json({
    totals: {
      products: totalProducts,
      variants: totalVariants,
      stockTotal: totalStock,
      stockByOutlet: outletStock,
    },
    sales: {
      today: { orders: salesToday._count._all, amount: salesToday._sum.totalAmount ?? 0 },
      month: { orders: salesMonth._count._all, amount: salesMonth._sum.totalAmount ?? 0 },
      byChannelToday: channelSummary,
    },
    alerts: {
      lowStockVariants: lowStockCount,
      newMarketplaceOrders: 0,
      marketplaceStockMismatch: 0,
    },
    topProducts: top10,
    trends: {
      rangeDays: 30,
      daily: trendByDay,
    },
    outletPerformance30d: outletPerf,
  }, { headers: { "Cache-Control": "no-store" } });
}