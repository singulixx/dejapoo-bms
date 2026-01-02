import { NextResponse } from "next/server";
import { requireCron } from "@/lib/cron";

export async function POST(req: Request) {
  const gate = requireCron(req);
  if (!gate.ok) return gate.res;

  return NextResponse.json(
    { message: "Not implemented yet. This endpoint is protected and ready for Vercel Cron wiring." },
    { status: 501 }
  );
}
