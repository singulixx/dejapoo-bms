import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const channel = url.searchParams.get("channel") || undefined;

  const where: any = {};
  if (from || to) where.createdAt = {};
  if (from) where.createdAt.gte = new Date(from);
  if (to) where.createdAt.lte = new Date(to);
  if (channel) where.channel = channel;

  const orders = await prisma.order.findMany({
    where,
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const byChannel: Record<string, { orders: number; amount: number }> = {};
  const byProduct: Record<string, { productId: string; productName: string; qty: number; amount: number }> = {};

  for (const o of orders) {
    const k = o.channel;
    byChannel[k] = byChannel[k] || { orders: 0, amount: 0 };
    byChannel[k].orders += 1;
    byChannel[k].amount += o.totalAmount;

    for (const it of o.items) {
      const pid = it.productId;
      byProduct[pid] = byProduct[pid] || { productId: pid, productName: it.product.name, qty: 0, amount: 0 };
      byProduct[pid].qty += it.qty;
      byProduct[pid].amount += it.subtotal;
    }
  }

  const byProductArr = Object.values(byProduct).sort((a, b) => b.amount - a.amount);

  return NextResponse.json({
    byChannel: Object.entries(byChannel).map(([channel, v]) => ({ channel, ...v })),
    byProduct: byProductArr.slice(0, 200),
  });
}
