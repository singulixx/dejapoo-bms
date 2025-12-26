import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const BodySchema = z.object({
  fromOutletId: z.string().min(1),
  toOutletId: z.string().min(1),
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
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { fromOutletId, toOutletId, items, note } = parsed.data;
  if (fromOutletId === toOutletId) return NextResponse.json({ error: "Outlet must differ" }, { status: 400 });
  const date = parsed.data.date ? new Date(parsed.data.date) : new Date();

  const normalizedItems = items.map((it) => ({
    variantId: it.variantId ?? it.productVariantId,
    qty: it.qty,
  }));
  if (normalizedItems.some((x) => !x.variantId)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const transfer = await prisma.$transaction(async (tx) => {
    // Validate stock availability
    for (const it of normalizedItems) {
      const stock = await tx.stock.findUnique({
        where: { outletId_variantId: { outletId: fromOutletId, variantId: it.variantId! } },
      });
      const current = stock?.qty ?? 0;
      if (current - it.qty < 0) {
        throw new Error(`INSUFFICIENT_STOCK:${it.variantId}`);
      }
    }

    const created = await tx.stockTransfer.create({
      data: {
        fromOutletId,
        toOutletId,
        note,
        date,
        items: { create: normalizedItems.map((it) => ({ variantId: it.variantId!, qty: it.qty })) },
      },
      include: { items: true },
    });

    for (const it of normalizedItems) {
      await tx.stock.update({
        where: { outletId_variantId: { outletId: fromOutletId, variantId: it.variantId! } },
        data: { qty: { decrement: it.qty } },
      });

      await tx.stock.upsert({
        where: { outletId_variantId: { outletId: toOutletId, variantId: it.variantId! } },
        create: { outletId: toOutletId, variantId: it.variantId!, qty: it.qty },
        update: { qty: { increment: it.qty } },
      });

      await tx.stockMovement.createMany({
        data: [
          {
            type: "TRANSFER_OUT",
            outletId: fromOutletId,
            variantId: it.variantId!,
            qty: it.qty,
            note,
            refType: "STOCK_TRANSFER",
            refId: created.id,
            createdAt: date,
          },
          {
            type: "TRANSFER_IN",
            outletId: toOutletId,
            variantId: it.variantId!,
            qty: it.qty,
            note,
            refType: "STOCK_TRANSFER",
            refId: created.id,
            createdAt: date,
          },
        ],
      });
    }

    return created;
  }).catch((e: any) => {
    const msg = String(e?.message || e);
    if (msg.startsWith("INSUFFICIENT_STOCK:")) {
      return { __error: "Insufficient stock", variantId: msg.split(":")[1] };
    }
    throw e;
  });

  if ((transfer as any).__error) {
    return NextResponse.json(transfer, { status: 400 });
  }

  return NextResponse.json(transfer, { status: 201 });
}
