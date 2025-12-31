import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Riwayat penjualan harus bisa diakses semua role (read-only).
  const auth = requireAuth(req);
  if (!auth.ok) return auth.res;

  const url = new URL(req.url);
  const channel = url.searchParams.get("channel") as any;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(10, parseInt(url.searchParams.get("pageSize") || "20", 10)));
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (channel) where.channel = channel;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) {
      // make `to` inclusive for date-only inputs
      const d = new Date(to);
      if (to.length <= 10) {
        d.setHours(23, 59, 59, 999);
      }
      where.createdAt.lte = d;
    }
  }

  const [items, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({ items, page, pageSize, total }, { headers: { "Cache-Control": "no-store" } });
}