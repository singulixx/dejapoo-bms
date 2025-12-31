import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

/**
 * Forgot password WITHOUT email.
 * Flow:
 * 1) User enters username + recoveryKey (given at account creation).
 * 2) Server verifies recoveryKeyHash and returns short-lived resetToken (10 minutes).
 *
 * POST body:
 *  { username: string; recoveryKey: string }
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { username?: string; recoveryKey?: string } | null;
  const username = body?.username?.trim();
  const recoveryKey = body?.recoveryKey?.trim();

  if (!username || !recoveryKey) {
    return Response.json({ message: "Username dan recovery key wajib diisi" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.isActive) {
    // Do not reveal whether the username exists
    return Response.json({ message: "Data tidak valid" }, { status: 400 });
  }

  if (!user.recoveryKeyHash) {
    return Response.json({ message: "Akun ini belum punya recovery key. Hubungi OWNER." }, { status: 400 });
  }

  const ok = await bcrypt.compare(recoveryKey, user.recoveryKeyHash);
  if (!ok) {
    return Response.json({ message: "Data tidak valid" }, { status: 400 });
  }

  const resetToken = jwt.sign(
    { sub: user.id, purpose: "reset-password" },
    process.env.JWT_SECRET!,
    { expiresIn: "10m" },
  );

  return Response.json({ ok: true, resetToken });
}