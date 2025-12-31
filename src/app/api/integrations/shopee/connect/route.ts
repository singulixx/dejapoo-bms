import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { requireAdmin } from "@/lib/auth";
import { buildShopAuthUrl } from "@/lib/shopee";

export const dynamic = 'force-dynamic';

/**
 * Start Shopee OAuth (shop authorization).
 *
 * Usage: open this URL in browser while logged-in (cookie auth) to be redirected to Shopee.
 */
export async function GET(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const now = Math.floor(Date.now() / 1000);
  const state = jwt.sign(
    { sub: auth.user.sub, username: auth.user.username, iat: now },
    process.env.JWT_SECRET!,
    { expiresIn: "10m" }
  );

  const url = buildShopAuthUrl(state);
  return NextResponse.redirect(url);
}