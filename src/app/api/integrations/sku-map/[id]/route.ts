import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const { id } = await params;
  await prisma.channelSkuMap.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
