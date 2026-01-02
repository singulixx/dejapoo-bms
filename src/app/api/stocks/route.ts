import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const url = new URL(req.url);
  const outletId = url.searchParams.get("outletId") || undefined;
  const variantId = url.searchParams.get("variantId") || undefined;
  const productId = url.searchParams.get("productId") || undefined;
  const size = url.searchParams.get("size") || undefined;
  const q = url.searchParams.get("q")?.trim() || "";
  const wantSummary = url.searchParams.get("summary") === "1";

  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10)));
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (outletId) where.outletId = outletId;
  if (variantId) where.variantId = variantId;
  if (productId || size) {
    where.variant = {};
    if (productId) where.variant.productId = productId;
    if (size) where.variant.size = size;
  }
  if (q) {
    where.OR = [
      { variant: { sku: { contains: q } } },
      { variant: { product: { name: { contains: q } } } },
      { outlet: { name: { contains: q } } },
    ];
  }

  // Optional summary mode: return totals per desain & low-stock indicators (for UX).
  if (wantSummary) {
    const rows = await prisma.stock.findMany({
      where,
      select: {
        qty: true,
        variant: { select: { id: true, minQty: true, product: { select: { id: true, name: true } } } },
      },
      take: 5000,
    });

    const byProduct = new Map<string, { productId: string; productName: string; totalQty: number; low: number }>();
    let lowRows = 0;
    for (const r of rows) {
      const pid = r.variant.product.id;
      const cur = byProduct.get(pid) || { productId: pid, productName: r.variant.product.name, totalQty: 0, low: 0 };
      cur.totalQty += r.qty || 0;
      if ((r.qty || 0) <= (r.variant.minQty || 0)) {
        cur.low += 1;
        lowRows += 1;
      }
      byProduct.set(pid, cur);
    }

    const products = Array.from(byProduct.values()).sort((a, b) => b.totalQty - a.totalQty);
    return NextResponse.json({
      totalRows: rows.length,
      lowRows,
      totalsPerProduct: products,
    });
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

  return NextResponse.json({ items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}
