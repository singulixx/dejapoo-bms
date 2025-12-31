import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = 'force-dynamic';

const UpdateProduct = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional().nullable(),
  description: z.string().optional().nullable(),
  category: z.string().min(1).optional(),
  imageUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const { id } = await params;
  const parsed = UpdateProduct.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { headers: { "Cache-Control": "no-store" }, status: 400 });

  const updated = await prisma.product.update({
    where: { id: id },
    data: parsed.data,
  });

  return NextResponse.json(updated, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(_req);
  if (!auth.ok) return auth.res;
  const { id } = await params;

  const updated = await prisma.product.update({
    where: { id: id },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ ok: true, id: updated.id }, { headers: { "Cache-Control": "no-store" } });
}