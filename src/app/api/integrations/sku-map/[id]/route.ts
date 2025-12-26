import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// Next.js 15: `params` is a Promise in dynamic route handlers.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const { id } = await params;
  await prisma.channelSkuMap.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
