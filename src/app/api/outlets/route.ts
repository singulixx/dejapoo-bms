import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const CreateOutletSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["WAREHOUSE", "OFFLINE_STORE", "ONLINE"]).optional(),
});

export async function POST(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => null);
  const parsed = CreateOutletSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Invalid payload", issues: parsed.error.issues }, { status: 400 });

  const outlet = await prisma.outlet.create({
    data: { name: parsed.data.name, type: parsed.data.type ?? "WAREHOUSE" },
  });
  return NextResponse.json(outlet, { status: 201 });
}

export async function GET(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const url = new URL(req.url);
  const includeInactive = url.searchParams.get("includeInactive") === "1";

  const items = await prisma.outlet.findMany({
    where: { deletedAt: null, ...(includeInactive ? {} : { isActive: true }) },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ items });
}
