import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const UpdateVariant = z.object({
  size: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  price: z.number().int().nonnegative().optional(),
  color: z.string().optional().nullable(),
  minQty: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const parsed = UpdateVariant.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // normalize empty string to null for optional nullable fields
  const data: any = { ...parsed.data };
  if (Object.prototype.hasOwnProperty.call(data, "color") && data.color === "") data.color = null;

  const updated = await prisma.productVariant.update({
    where: { id: params.id },
    data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = requireAdmin(_req);
  if (!auth.ok) return auth.res;

  const updated = await prisma.productVariant.update({
    where: { id: params.id },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ ok: true, id: updated.id });
}
