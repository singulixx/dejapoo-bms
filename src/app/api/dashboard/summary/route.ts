import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

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
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const now = new Date();
  const dayStart = startOfDay(now);
  const monthStart = startOfMonth(now);
  const trendStart = startOfNDaysAgo(now, 29);

  const [
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
      // Prisma `groupBy` expects `by` to be a literal tuple. Without `as const`, TS infers
      // `string[]` and Next.js build fails with an overload/union "not callable" error.
      prisma.stock.groupBy({ by: ["outletId"] as const, _sum: { qty: true } }),
      prisma.outlet.findMany({ where: { deletedAt: null, isActive: true }, select: { id: true, name: true, type: true } }),
      prisma.order.aggregate({ where: { createdAt: { gte: dayStart } }, _sum: { totalAmount: true }, _count: { _all: true } }),
      prisma.order.aggregate({ where: { createdAt: { gte: monthStart } }, _sum: { totalAmount: true }, _count: { _all: true } }),
      prisma.order.groupBy({
        by: ["channel"] as const,
        where: { createdAt: { gte: dayStart } },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      prisma.orderItem.groupBy({
        by: ["productId"] as const,
        _sum: { qty: true, subtotal: true },
        orderBy: { _sum: { subtotal: "desc" } },
        take: 10,
      }),
      prisma.stock.findMany({
        include: { variant: { select: { minQty: true } } },
      }),
      prisma.$queryRawUnsafe<
        { d: string; channel: string; orders: bigint; amount: bigint }[]
      >(
        [
          "SELECT DATE(createdAt) as d, channel, COUNT(*) as orders, COALESCE(SUM(totalAmount),0) as amount",
          "FROM `Order`",
          "WHERE createdAt >= ?",
          "GROUP BY d, channel",
          "ORDER BY d ASC",
        ].join("\n"),
        trendStart
      ),
      prisma.$queryRawUnsafe<
        { outletId: string; type: string; qty: bigint }[]
      >(
        `SELECT outletId, type, COALESCE(SUM(qty),0) as qty
         FROM StockMovement
         WHERE createdAt >= ?
         GROUP BY outletId, type`,
        trendStart
      ),
    ]);

  const lowStockCount = stockRows.filter((r) => r.qty < r.variant.minQty).length;

  const outletStock = outlets.map((o) => {
    const hit = stockAgg.find((s) => s.outletId === o.id);
    return { outletId: o.id, outletName: o.name, outletType: o.type, qty: hit?._sum.qty ?? 0 };
  });

  const totalStock = outletStock.reduce((a, b) => a + (b.qty ?? 0), 0);

  const topProductIds = topProducts.map((p) => p.productId);
  const productNames = topProductIds.length
    ? await prisma.product.findMany({ where: { id: { in: topProductIds } }, select: { id: true, name: true } })
    : [];

  const top10 = topProducts.map((p) => ({
    productId: p.productId,
    productName: productNames.find((x) => x.id === p.productId)?.name ?? "Unknown",
    qty: p._sum.qty ?? 0,
    revenue: p._sum.subtotal ?? 0,
  }));

  const channelSummary = ["SHOPEE", "TIKTOK", "OFFLINE_STORE"].map((ch) => {
    const hit = channelToday.find((c) => c.channel === ch);
    return {
      channel: ch,
      orders: hit?._count._all ?? 0,
      amount: hit?._sum.totalAmount ?? 0,
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
      return Number(hit?.qty ?? 0);
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
  });
}
