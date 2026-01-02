import { NextResponse } from "next/server";
import { requireCron } from "@/lib/cron";
import { syncShopeeOrders } from "@/lib/shopee-sync";

// Endpoint utama untuk Vercel Cron (Hobby-safe).
// Jadwal di vercel.json: 0 19 * * * (≈ 02:00 WIB)
export async function POST(req: Request) {
  const cron = requireCron(req);
  if (!cron.ok) return cron.res;

  const startedAt = Date.now();
  const body = await req.json().catch(() => ({}));
  const hours = body?.hours ?? 24;

  console.log(`[CRON] run start source=${cron.source} hours=${hours}`);

  const results: any = {
    shopee: null as any,
    tiktok: { ok: true, message: "Skip (not implemented)" },
    pushStock: { ok: true, message: "Skip (not implemented)" },
  };

  try {
    results.shopee = await syncShopeeOrders({ hours: Number(hours) });
  } catch (e: any) {
    results.shopee = { ok: false, message: String(e?.message || e) };
  }

  const ms = Date.now() - startedAt;
  console.log(`[CRON] run done in ${ms}ms`);

  return NextResponse.json({ ok: true, tookMs: ms, results });
}
