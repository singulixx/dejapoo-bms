import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { encryptJson } from "@/lib/crypto";
import { exchangeToken } from "@/lib/shopee";

export const dynamic = 'force-dynamic';

// Shopee will redirect to this endpoint with query params: code, shop_id, state.
// We validate state (JWT signed in /connect) and then exchange code for tokens.

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code") || "";
  const shopIdRaw = url.searchParams.get("shop_id") || url.searchParams.get("shopid") || "";
  const state = url.searchParams.get("state") || "";

  if (!code || !state) {
    return NextResponse.json({ message: "Missing code/state" }, { headers: { "Cache-Control": "no-store" }, status: 400 });
  }

  // Validate state
  let payload: any;
  try {
    payload = jwt.verify(state, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.json({ message: "Invalid state" }, { headers: { "Cache-Control": "no-store" }, status: 400 });
  }

  const shopId = shopIdRaw ? Number(shopIdRaw) : undefined;

  const token = await exchangeToken({ code, shopId });
  const expiresAt = new Date(Date.now() + token.expire_in * 1000);

  // Upsert a single Shopee marketplace account per shop_id (we use name = `shop:<id>`).
  const credentials = { shop_id: token.shop_id, merchant_id: token.merchant_id ?? null };

  const name = `shop:${token.shop_id}`;
  const existing = await prisma.marketplaceAccount.findFirst({ where: { channel: "SHOPEE", name, isActive: true } });
  if (existing) {
    await prisma.marketplaceAccount.update({
      where: { id: existing.id },
      data: {
        credentialsEnc: encryptJson(credentials),
        accessTokenEnc: encryptJson({ access_token: token.access_token }),
        refreshTokenEnc: token.refresh_token ? encryptJson({ refresh_token: token.refresh_token }) : null,
        tokenExpiresAt: expiresAt,
      },
    });
  } else {
    await prisma.marketplaceAccount.create({
      data: {
        channel: "SHOPEE",
        name,
        credentialsEnc: encryptJson(credentials),
        accessTokenEnc: encryptJson({ access_token: token.access_token }),
        refreshTokenEnc: token.refresh_token ? encryptJson({ refresh_token: token.refresh_token }) : null,
        tokenExpiresAt: expiresAt,
        isActive: true,
      },
    });
  }

  // Redirect back to the app UI (can be changed)
  const appUrl = process.env.APP_BASE_URL || "https://dejapoo-bms.vercel.app";
  return NextResponse.redirect(`${appUrl}/integrations?connected=shopee`);
}