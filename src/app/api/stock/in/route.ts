import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  outletId: z.string().min(1).optional(),
  supplier: z.string().optional(),
  date: z.string().datetime().optional(),
  note: z.string().optional(),
  items: z
    .array(
      z.object({
        // prefer `variantId` (sesuai schema Prisma), tapi terima `productVariantId` untuk kompatibilitas
        variantId: z.string().min(1).optional(),
        productVariantId: z.string().min(1).optional(),
        qty: z.number().int().positive(),
      }),
    )
    .min(1),
});

export async function POST(req: Request) {
  
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;
const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { headers: { "Cache-Control": "no-store" }, status: 400 });

  const { items, supplier, note } = parsed.data;
const date = parsed.data.date ? new Date(parsed.data.date) : new Date();

// MVP: single outlet (Gudang). If not provided, auto-pick/create WAREHOUSE outlet.
let outletId = parsed.data.outletId;
if (!outletId) {
  const outlet = await prisma.outlet.findFirst({ where: { type: "WAREHOUSE" }, orderBy: { createdAt: "asc" } });
  outletId = outlet?.id;
  if (!outletId) {
    const createdOutlet = await prisma.outlet.create({ data: { name: "Gudang", type: "WAREHOUSE", isActive: true } });
    outletId = createdOutlet.id;
  }
}

  const normalizedItems = items.map((it) => ({
    variantId: it.variantId ?? it.productVariantId,
    qty: it.qty,
  }));

  if (normalizedItems.some((x) => !x.variantId)) {
    return NextResponse.json({ error: "Invalid input" }, { headers: { "Cache-Control": "no-store" }, status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const stockIn = await tx.stockIn.create({
      data: {
        outletId,
        supplier,
        note,
        date,
        items: { create: normalizedItems.map((it) => ({ variantId: it.variantId!, qty: it.qty })) },
      },
      include: { items: true },
    });

    for (const it of normalizedItems) {
      await tx.stock.upsert({
        where: { outletId_variantId: { outletId, variantId: it.variantId! } },
        create: { outletId, variantId: it.variantId!, qty: it.qty },
        update: { qty: { increment: it.qty } },
      });

      await tx.stockMovement.create({
        data: {
          type: "IN",
          outletId,
          variantId: it.variantId!,
          qty: it.qty,
          note,
          refType: "STOCK_IN",
          refId: stockIn.id,
          createdAt: date,
        },
      });
    }

    return stockIn;
  });

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" }, status: 201 });
}