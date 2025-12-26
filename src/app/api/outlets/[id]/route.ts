import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const UpdateOutletSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["WAREHOUSE", "OFFLINE_STORE", "ONLINE"]).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const outlet = await prisma.outlet.findUnique({ where: { id: params.id } });
  if (!outlet) return NextResponse.json({ message: "Outlet not found" }, { status: 404 });
  return NextResponse.json(outlet);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => null);
  const parsed = UpdateOutletSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", errors: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.outlet.update({
    where: { id: params.id },
    data: parsed.data,
  });
  return NextResponse.json({ ok: true, id: updated.id });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  // soft delete outlet (keep historical integrity)
  const updated = await prisma.outlet.update({
    where: { id: params.id },
    data: { isActive: false, deletedAt: new Date() },
  });
  return NextResponse.json({ ok: true, id: updated.id });
}
