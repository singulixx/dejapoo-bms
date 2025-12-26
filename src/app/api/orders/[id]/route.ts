import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  // Riwayat/detail penjualan harus bisa diakses semua role (read-only).
  const auth = requireAuth(_req);
  if (!auth.ok) return auth.res;

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true, outlet: true },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
}
