import { NextResponse } from "next/server";

/**
 * Vercel Cron akan mengirim header `x-vercel-cron: 1`.
 * Untuk trigger manual (mis. dari Postman), gunakan Authorization Bearer CRON_SECRET.
 */
export function requireCron(req: Request) {
  const vercelCron = req.headers.get("x-vercel-cron");
  if (vercelCron === "1") return { ok: true as const, source: "vercel" as const };

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return {
      ok: false as const,
      res: NextResponse.json(
        { message: "Forbidden (missing CRON_SECRET)" },
        { status: 403 }
      ),
    };
  }

  const auth = req.headers.get("authorization") || "";
  const [type, token] = auth.split(" ");
  if (type === "Bearer" && token && token === secret) {
    return { ok: true as const, source: "secret" as const };
  }

  return {
    ok: false as const,
    res: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
  };
}
