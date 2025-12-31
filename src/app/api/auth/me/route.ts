import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.res;

  return NextResponse.json({ user: auth.user }, { headers: { "Cache-Control": "no-store" } });
}