import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

/**
 * Finish forgot-password flow using resetToken (short-lived).
 *
 * POST body:
 *  { resetToken: string; newPassword: string }
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { resetToken?: string; newPassword?: string } | null;
  const resetToken = body?.resetToken;
  const newPassword = body?.newPassword;

  if (!resetToken || !newPassword) {
    return Response.json({ message: "resetToken dan newPassword wajib diisi" }, { status: 400 });
  }

  let payload: any;
  try {
    payload = jwt.verify(resetToken, process.env.JWT_SECRET!);
  } catch {
    return Response.json({ message: "Token tidak valid / kadaluarsa" }, { status: 400 });
  }

  if (payload?.purpose !== "reset-password" || !payload?.sub) {
    return Response.json({ message: "Token tidak valid" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: String(payload.sub) } });
  if (!user || !user.isActive) {
    return Response.json({ message: "User tidak ditemukan" }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  });

  return Response.json({ ok: true });
}
