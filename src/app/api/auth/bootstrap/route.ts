import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function POST() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    return NextResponse.json({ error: "Missing ADMIN_USERNAME / ADMIN_PASSWORD env" }, { headers: { "Cache-Control": "no-store" }, status: 400 }, );
  }

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) return NextResponse.json({ ok: true, already: true }, { headers: { "Cache-Control": "no-store" } });

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({ data: { username, passwordHash, isActive: true, role: "ADMIN" } });

  // MVP seed: default outlet (Gudang)
  const outlet = await prisma.outlet.findFirst({ where: { type: "WAREHOUSE" } });
  if (!outlet) {
    await prisma.outlet.create({ data: { name: "Gudang", type: "WAREHOUSE", isActive: true } });
  }

  return NextResponse.json({ ok: true, created: true }, { headers: { "Cache-Control": "no-store" } });
}