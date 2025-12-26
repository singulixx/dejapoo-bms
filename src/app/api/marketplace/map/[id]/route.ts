import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const UpdateSchema = z.object({
  marketplaceSku: z.string().min(1).optional(),
  marketplaceProductId: z.string().optional().nullable(),
});

// Next.js 15: params pada dynamic route handler adalah Promise
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const { id } = await params;

  const row = await prisma.marketplaceProduct.findUnique({
    where: { id },
    include: { variant: true, account: true },
  });

  if (!row) return NextResponse.json({ message: "Mapping not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PUT(req: Request, { params }: Ctx) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await prisma.marketplaceProduct.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ ok: true, id: updated.id });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const { id } = await params;

  await prisma.marketplaceProduct.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
