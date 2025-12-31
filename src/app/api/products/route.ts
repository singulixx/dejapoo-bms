import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { requestContext } from "@/lib/request-context";
import { writeAuditLog } from "@/lib/audit";

const CreateProduct = z.object({
  name: z.string().min(1),
  code: z.string().min(1).optional().nullable(),
  description: z.string().optional().nullable(),
  category: z.string().min(1),
  // MVP: bisa URL external atau path hasil upload ("/uploads/...")
  imageUrl: z.string().optional().nullable(),
  costPrice: z.number().int().min(0).optional(),
  sellPrice: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function POST(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  // Ensure AsyncLocalStorage context is preserved across prisma interactive transactions.
  return await requestContext.run(auth.ctx, async () => {

  const body = await req.json().catch(() => null);
  const parsed = CreateProduct.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const sizes = ["S", "M", "L", "XL", "XXL"] as const;

const created = await prisma.$transaction(async (tx) => {
  // Ensure default outlet (Gudang) exists for MVP (single stock location)
  let outlet = await tx.outlet.findFirst({ where: { type: "WAREHOUSE" }, orderBy: { createdAt: "asc" } });
  if (!outlet) {
    outlet = await tx.outlet.create({ data: { name: "Gudang", type: "WAREHOUSE", isActive: true } });
  }

  const product = await tx.product.create({
    data: {
      name: parsed.data.name,
      code: parsed.data.code ? parsed.data.code : null,
      description: parsed.data.description ?? null,
      category: parsed.data.category,
      imageUrl: parsed.data.imageUrl ?? null,
      costPrice: parsed.data.costPrice ?? 0,
      sellPrice: parsed.data.sellPrice ?? 0,
      isActive: parsed.data.isActive ?? true,
    },
  });

  const base = (product.code || product.name)
    .toString()
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9\-]/g, "");

  const variants = await Promise.all(
    sizes.map((size) =>
      tx.productVariant.create({
        data: {
          productId: product.id,
          size,
          sku: `${base}-${size}`,
          price: product.sellPrice || 0,
          color: null,
          minQty: 0,
          isActive: true,
        },
      }),
    ),
  );

  // Create stock rows for each variant at default outlet
  await Promise.all(
    variants.map((v) =>
      tx.stock.create({
        data: { outletId: outlet!.id, variantId: v.id, qty: 0 },
      }),
    ),
  );

  return tx.product.findUnique({
    where: { id: product.id },
    include: { variants: { where: { deletedAt: null } } },
  });
});

// Explicit audit log (route-level) to guarantee "who did what" even when
// async context can be lost across interactive transactions.
// The generic Prisma $extends auditing is still present, but this ensures
// this critical flow is always captured.
if (created?.id) {
  await writeAuditLog(req, auth.user, {
    action: "PRODUCT_CREATE",
    model: "Product",
    entity: "Product",
    entityId: created.id,
    metadata: {
      name: created.name,
      code: created.code,
      category: created.category,
    },
  });
}

return NextResponse.json(created, { status: 201 });
  });
}

export async function GET(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") || "20")));
  const includeInactive = searchParams.get("includeInactive") === "1" || searchParams.get("includeInactive") === "true";

  const where: any = { deletedAt: null };
  if (!includeInactive) where.isActive = true;
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { code: { contains: q } },
      { category: { contains: q } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { variants: { where: { deletedAt: null } } },
    }),
  ]);

  return NextResponse.json({
    items,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}
