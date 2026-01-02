import { NextResponse } from "next/server";

/**
 * Allow Vercel Cron invocations and (optionally) a shared secret.
 *
 * - Vercel Cron adds `x-vercel-cron: 1`
 * - If you set CRON_SECRET, you can also call with `Authorization: Bearer <CRON_SECRET>`
 */
export function requireCron(req: Request) {
  const fromVercelCron = req.headers.get("x-vercel-cron") === "1";

  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null;
  const fromSecret = Boolean(secret) && Boolean(bearer) && bearer === secret;

  if (fromVercelCron || fromSecret) return { ok: true as const };

  return {
    ok: false as const,
    res: NextResponse.json(
      { ok: false, error: "Unauthorized cron" },
      { status: 401 }
    ),
  };
}
