import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const UpdateOutletSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["WAREHOUSE", "OFFLINE_STORE", "ONLINE"]).optional(),
  isActive: z.boolean().optional(),
});

// Next.js 15: params pada dynamic route handler adalah Promise
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const { id } = await params;

  const outlet = await prisma.outlet.findUnique({ where: { id } });
  if (!outlet) return NextResponse.json({ message: "Outlet not found" }, { status: 404 });

  return NextResponse.json(outlet);
}

export async function PUT(req: Request, { params }: Ctx) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = UpdateOutletSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await prisma.outlet.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ ok: true, id: updated.id });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const { id } = await params;

  // soft delete outlet (keep historical integrity)
  const updated = await prisma.outlet.update({
    where: { id },
    data: { isActive: false, deletedAt: new Date() },
  });

  return NextResponse.json({ ok: true, id: updated.id });
}
