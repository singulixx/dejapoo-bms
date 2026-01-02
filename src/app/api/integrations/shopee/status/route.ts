import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptJson } from "@/lib/crypto";

export async function GET() {
  const acc = await prisma.marketplaceAccount.findFirst({
    where: { channel: "SHOPEE", isActive: true },
    orderBy: { updatedAt: "desc" },
  });

  if (!acc) {
    return NextResponse.json({ connected: false });
  }

  // credentialsEnc contains shop_id + merchant_id
  let credentials: any = null;
  try {
    credentials = acc.credentialsEnc ? decryptJson(acc.credentialsEnc) : null;
  } catch {
    credentials = null;
  }

  return NextResponse.json({
    connected: true,
    id: acc.id,
    name: acc.name,
    shop_id: credentials?.shop_id ?? null,
    merchant_id: credentials?.merchant_id ?? null,
    tokenExpiresAt: acc.tokenExpiresAt,
  });
}
