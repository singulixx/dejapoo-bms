import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

// Trigger manual dari UI (admin/owner). Tidak bergantung pada Vercel Cron.
export async function POST(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  // panggil endpoint internal /api/cron/run dengan header cron khusus
  const url = new URL(req.url);
  const origin = `${url.protocol}//${url.host}`;

  const body = await req.text();

  const res = await fetch(`${origin}/api/cron/run`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-vercel-cron": "1",
    },
    body: body || "{}",
    cache: "no-store",
  });

  const j = await res.json().catch(() => ({}));
  return NextResponse.json(j, { status: res.status });
}
