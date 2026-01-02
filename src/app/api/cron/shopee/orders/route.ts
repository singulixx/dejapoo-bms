import { NextResponse } from "next/server";
import { requireCron } from "@/lib/cron";
import { syncShopeeOrders } from "@/lib/shopee-sync";

export async function POST(req: Request) {
  const cron = requireCron(req);
  if (!cron.ok) return cron.res;
  const body = await req.json().catch(() => ({}));
  const data = await syncShopeeOrders({ hours: body?.hours });
  return NextResponse.json(data);
}
