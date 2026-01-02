import { NextResponse } from "next/server";
import { requireCron } from "@/lib/cron";

export async function POST(req: Request) {
  const cron = requireCron(req);
  if (!cron.ok) return cron.res;

  // Token Shopee direfresh otomatis saat sync orders.
  // Endpoint ini disediakan bila suatu saat perlu refresh terpisah.
  return NextResponse.json({ ok: true, message: "No-op (token refresh handled during sync)" });
}
