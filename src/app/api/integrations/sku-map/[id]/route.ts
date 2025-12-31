import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// Next.js 15 route handlers type `params` as a Promise for dynamic segments.
// Use `await params` to satisfy Next's type checker and avoid build failures.
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
