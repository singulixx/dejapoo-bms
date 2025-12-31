import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.res;

  return NextResponse.json({ message: "Not implemented yet. This endpoint is protected and ready for Vercel Cron wiring." }, { headers: { "Cache-Control": "no-store" }, status: 501 });
}