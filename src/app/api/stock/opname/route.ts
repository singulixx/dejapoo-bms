import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const BodySchema = z.object({
  outletId: z.string().min(1).optional(),
  date: z.string().datetime().optional(),
  note: z.string().optional(),
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        countedQty: z.number().int().min(0),
      })
    )
    .min(1),
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

  const createdAt = parsed.data.date ? new Date(parsed.data.date) : new Date();
  const note = (parsed.data.note || "Stock Opname").trim();
  const outletId = parsed.data.outletId || (await getOrCreateDefaultWarehouseOutletId());

  // Normalize duplicates: keep last countedQty per variantId
  const map = new Map<string, number>();
  for (const it of parsed.data.items) {
    map.set(it.variantId, it.countedQty);
  }
  const items = Array.from(map.entries()).map(([variantId, countedQty]) => ({ variantId, countedQty }));

  try {
    const opname = await prisma.$transaction(async (tx) => {
      const stocks = await tx.stock.findMany({
        where: { outletId, variantId: { in: items.map((x) => x.variantId) } },
      });
      const sys = new Map(stocks.map((s) => [s.variantId, s.qty]));

      const created = await tx.stockOpname.create({
        data: {
          outletId,
          date: createdAt,
          note,
          createdById: auth.user.sub,
          items: {
            create: items.map((it) => {
              const systemQty = sys.get(it.variantId) ?? 0;
              const diffQty = it.countedQty - systemQty;
              return {
                variantId: it.variantId,
                systemQty,
                countedQty: it.countedQty,
                diffQty,
              };
            }),
          },
        },
        include: { items: true },
      });

      for (const it of created.items) {
        await tx.stock.upsert({
          where: { outletId_variantId: { outletId, variantId: it.variantId } },
          create: { outletId, variantId: it.variantId, qty: it.countedQty },
          update: { qty: it.countedQty },
        });

        if (it.diffQty !== 0) {
          await tx.stockMovement.create({
            data: {
              type: "ADJUSTMENT",
              outletId,
              variantId: it.variantId,
              qty: it.diffQty,
              note,
              refType: "STOCK_OPNAME",
              refId: created.id,
              createdAt,
            },
          });
        }
      }

      return created;
    });

    return NextResponse.json(opname, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Failed" }, { status: 400 });
  }
}
