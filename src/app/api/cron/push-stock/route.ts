import { NextResponse } from "next/server";
import { requireCron } from "@/lib/cron";

export async function POST(req: Request) {
  const cron = requireCron(req);
  if (!cron.ok) return cron.res;

  return NextResponse.json({ ok: true, message: "Skip (push stock belum diimplementasikan)" });
}
