import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const url = new URL(req.url);
  const outletId = url.searchParams.get("outletId") || undefined;
  const variantId = url.searchParams.get("variantId") || undefined;
  const q = url.searchParams.get("q")?.trim() || "";

  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10)));
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (outletId) where.outletId = outletId;
  if (variantId) where.variantId = variantId;
  if (q) {
    where.OR = [
      { variant: { sku: { contains: q } } },
      { variant: { product: { name: { contains: q } } } },
      { outlet: { name: { contains: q } } },
    ];
  }

  const [items, total] = await prisma.$transaction([
    prisma.stock.findMany({
      where,
      include: { outlet: true, variant: { include: { product: true } } },
      orderBy: [{ outletId: "asc" }],
      skip,
      take: pageSize,
    }),
    prisma.stock.count({ where }),
  ]);

  return NextResponse.json({ items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }, { headers: { "Cache-Control": "no-store" } });
}