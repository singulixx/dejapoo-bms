import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function POST(req: Request) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.res;

  const res = NextResponse.json({ ok: true });
  // Clear auth cookie
  res.cookies.set({ name: "accessToken", value: "", path: "/", maxAge: 0 });
  return res;
}
