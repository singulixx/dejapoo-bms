import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const UpdateSchema = z.object({
  marketplaceSku: z.string().min(1).optional(),
  marketplaceProductId: z.string().optional().nullable(),
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const row = await prisma.marketplaceProduct.findUnique({
    where: { id: params.id },
    include: { variant: true, account: true },
  });
  if (!row) return NextResponse.json({ message: "Mapping not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", errors: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.marketplaceProduct.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json({ ok: true, id: updated.id });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  await prisma.marketplaceProduct.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
