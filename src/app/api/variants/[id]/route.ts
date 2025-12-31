import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = 'force-dynamic';

const UpdateVariant = z.object({
  size: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  price: z.number().int().nonnegative().optional(),
  color: z.string().optional().nullable(),
  minQty: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;


  const { id } = await params;
  const parsed = UpdateVariant.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { headers: { "Cache-Control": "no-store" }, status: 400 });

  // normalize empty string to null for optional nullable fields
  const data: any = { ...parsed.data };
  if (Object.prototype.hasOwnProperty.call(data, "color") && data.color === "") data.color = null;

  const updated = await prisma.productVariant.update({
    where: { id: id },
    data,
  });
  return NextResponse.json(updated, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(_req);
  if (!auth.ok) return auth.res;
  const { id } = await params;

  const updated = await prisma.productVariant.update({
    where: { id: id },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ ok: true, id: updated.id }, { headers: { "Cache-Control": "no-store" } });
}