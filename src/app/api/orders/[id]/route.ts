import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// Next.js 15: params pada dynamic route handler adalah Promise
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  // Riwayat/detail penjualan harus bisa diakses semua role (read-only).
  const auth = requireAuth(req);
  if (!auth.ok) return auth.res;

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, outlet: true },
  });

  if (!order) return NextResponse.json({ error: "Not found" }, { headers: { "Cache-Control": "no-store" }, status: 404 });
  return NextResponse.json(order, { headers: { "Cache-Control": "no-store" } });
}