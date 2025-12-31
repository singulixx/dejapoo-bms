import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const BodySchema = z.object({
  outletId: z.string().min(1).optional(),
  variantId: z.string().min(1),
  deltaQty: z.number().int(),
  reason: z.string().min(3),
  date: z.string().datetime().optional(),
});

async function getOrCreateDefaultWarehouseOutletId() {
  const outlet = await prisma.outlet.findFirst({
    where: { type: "WAREHOUSE" },
    orderBy: { createdAt: "asc" },
  });
  if (outlet?.id) return outlet.id;

  const created = await prisma.outlet.create({
    data: { name: "Gudang", type: "WAREHOUSE", isActive: true },
  });
  return created.id;
}

export async function POST(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const { variantId, deltaQty } = parsed.data;
  const reason = parsed.data.reason.trim();
  const createdAt = parsed.data.date ? new Date(parsed.data.date) : new Date();

  if (deltaQty === 0) {
    return NextResponse.json({ message: "deltaQty cannot be 0" }, { status: 400 });
  }

  const outletId = parsed.data.outletId || (await getOrCreateDefaultWarehouseOutletId());

  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.stock.findUnique({
        where: { outletId_variantId: { outletId, variantId } },
      });

      const systemQty = current?.qty ?? 0;
      const newQty = systemQty + deltaQty;
      if (newQty < 0) {
        throw new Error(`Stock would go negative. systemQty=${systemQty} deltaQty=${deltaQty}`);
      }

      const adj = await tx.stockAdjustment.create({
        data: {
          outletId,
          variantId,
          deltaQty,
          reason,
          createdAt,
          createdById: auth.user.sub,
        },
      });

      await tx.stock.upsert({
        where: { outletId_variantId: { outletId, variantId } },
        create: { outletId, variantId, qty: newQty },
        update: { qty: newQty },
      });

      await tx.stockMovement.create({
        data: {
          type: "ADJUSTMENT",
          outletId,
          variantId,
          qty: deltaQty,
          note: reason,
          refType: "STOCK_ADJUSTMENT",
          refId: adj.id,
          createdAt,
        },
      });

      return { adjustment: adj, systemQty, newQty };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Failed" }, { status: 400 });
  }
}
