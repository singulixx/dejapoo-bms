import { NextResponse } from "next/server";
import { requireCron } from "@/lib/cron";

async function call(req: Request, path: string, body: any = {}) {
  const url = new URL(path, req.url);
  const headers: Record<string, string> = { "content-type": "application/json" };
  // If we are running via secret auth, forward it for local calls
  const auth = req.headers.get("authorization");
  if (auth) headers["authorization"] = auth;
  // If we are running as Vercel cron, forward the marker header
  const xv = req.headers.get("x-vercel-cron");
  if (xv) headers["x-vercel-cron"] = xv;

  const res = await fetch(url.toString(), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, json };
}

/**
 * Single entrypoint cron (Hobby-safe): runs all scheduled tasks.
 */
export async function POST(req: Request) {
  const gate = requireCron(req);
  if (!gate.ok) return gate.res;

  const results = {
    refreshToken: await call(req, "/api/cron/refresh-token"),
    shopeeOrders: await call(req, "/api/cron/shopee/orders", { hours: 24 }),
    tiktokOrders: await call(req, "/api/cron/tiktok/orders", { hours: 24 }),
    pushStock: await call(req, "/api/cron/push-stock"),
  };

  const ok = Object.values(results).every((r) => (r as any).ok);
  return NextResponse.json({ ok, results });
}

// Also allow GET for quick manual testing
export async function GET(req: Request) {
  return POST(req);
}
