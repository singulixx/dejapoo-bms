import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptJson } from "@/lib/crypto";
import { shopeeAuthedGet } from "@/lib/shopee";

export async function GET() {
  const acc = await prisma.marketplaceAccount.findFirst({
    where: { channel: "SHOPEE", isActive: true },
    orderBy: { updatedAt: "desc" },
  });

  if (!acc) {
    return NextResponse.json({ ok: false, message: "Shopee belum terkoneksi" }, { status: 400 });
  }

  const credentials = acc.credentialsEnc ? decryptJson<any>(acc.credentialsEnc) : null;
  const at = acc.accessTokenEnc ? decryptJson<any>(acc.accessTokenEnc) : null;

  const shopId = credentials?.shop_id;
  const accessToken = at?.access_token;

  if (!shopId || !accessToken) {
    return NextResponse.json({ ok: false, message: "Credential Shopee tidak lengkap" }, { status: 400 });
  }

  // Simple connectivity test: get shop info
  const data = await shopeeAuthedGet({
    path: "/api/v2/shop/get_shop_info",
    accessToken,
    shopId,
    params: { shop_id: shopId },
  });

  return NextResponse.json({ ok: true, shop_id: shopId, result: data });
}
