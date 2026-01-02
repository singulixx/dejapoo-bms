import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const acc = await prisma.marketplaceAccount.findFirst({
    where: { channel: "SHOPEE", isActive: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!acc) return NextResponse.json({ ok: true });

  await prisma.marketplaceAccount.update({
    where: { id: acc.id },
    data: { isActive: false },
  });
  return NextResponse.json({ ok: true });
}
