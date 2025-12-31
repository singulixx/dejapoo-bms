import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/auth";
import { generateInitialPassword, generateRecoveryKey } from "@/lib/password";

/**
 * OWNER creates STAFF account.
 * Returns the generated password + recoveryKey ONCE (show it and store it securely).
 *
 * POST body:
 *  { username: string }
 */
export async function POST(req: Request) {
  const auth = requireOwner(req);
  if (!auth.ok) return auth.res;

  const body = (await req.json().catch(() => null)) as { username?: string } | null;
  const username = body?.username?.trim();
  if (!username) {
    return Response.json({ message: "Username wajib diisi" }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) {
    return Response.json({ message: "Username sudah terpakai" }, { status: 409 });
  }

  const password = generateInitialPassword();
  const recoveryKey = generateRecoveryKey();

  const passwordHash = await bcrypt.hash(password, 12);
  const recoveryKeyHash = await bcrypt.hash(recoveryKey, 12);

  await prisma.user.create({
    data: {
      username,
      passwordHash,
      recoveryKeyHash,
      role: "STAFF",
      isActive: true,
      mustChangePassword: true, // force staff to change password on first login
    },
  });

  return Response.json({ ok: true, username, role: "STAFF", password, recoveryKey });
}

/**
 * OWNER lists STAFF accounts.
 */
export async function GET(req: Request) {
  const auth = requireOwner(req);
  if (!auth.ok) return auth.res;

  const users = await prisma.user.findMany({
    where: { role: "STAFF" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return Response.json({ ok: true, users });
}
