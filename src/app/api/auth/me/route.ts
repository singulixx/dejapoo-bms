import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.res;

  return NextResponse.json({ user: auth.user });
}
