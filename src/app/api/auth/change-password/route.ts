import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function POST(req: Request) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.res;

  const body = (await req.json().catch(() => null)) as
    | { currentPassword?: string; newPassword?: string }
    | null;

  const currentPassword = body?.currentPassword;
  const newPassword = body?.newPassword;

  if (!currentPassword || !newPassword) {
    return Response.json(
      { message: "Password lama dan password baru wajib diisi" },
      { status: 400 },
    );
  }
  if (newPassword.length < 6) {
    return Response.json(
      { message: "Password baru minimal 6 karakter" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id: auth.user.sub } });
  if (!user || !user.isActive) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    return Response.json({ message: "Password lama salah" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  });

  return Response.json({ ok: true });
}