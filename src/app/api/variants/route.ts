import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

/**
 * Samakan PERSIS dengan enum Prisma
 */
const SizeEnum = z.enum(["S", "M", "L", "XL", "XXL"]);

const CreateVariant = z.object({
  productId: z.string().min(1),
  size: SizeEnum,
  sku: z.string().min(1),
  price: z.number().int().positive(),
  color: z.string().optional().nullable(),
  minQty: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function POST(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => null);
  const parsed = CreateVariant.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const product = await prisma.product.findFirst({
    where: { id: parsed.data.productId, deletedAt: null },
  });

  if (!product) {
    return NextResponse.json({ message: "Product not found" }, { status: 404 });
  }

  const created = await prisma.productVariant.create({
    data: {
      productId: parsed.data.productId,
      size: parsed.data.size, // ✅ sekarang cocok dengan enum Prisma
      sku: parsed.data.sku,
      price: parsed.data.price,
      color: parsed.data.color ?? null,
      minQty: parsed.data.minQty ?? 0,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return NextResponse.json(created, { status: 201 });
}

export async function GET(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const productId = searchParams.get("productId") || undefined;
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize") || "20")),
  );
  const includeInactive =
    searchParams.get("includeInactive") === "1" ||
    searchParams.get("includeInactive") === "true";

  const where: any = { deletedAt: null };
  if (!includeInactive) where.isActive = true;
  if (productId) where.productId = productId;

  if (q) {
    where.OR = [
      { sku: { contains: q } },
      { size: { contains: q } },
      { color: { contains: q } },
      { product: { name: { contains: q } } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.productVariant.count({ where }),
    prisma.productVariant.findMany({
      where,
      include: { product: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
