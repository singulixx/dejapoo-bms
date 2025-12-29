import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { username?: string; password?: string } | null;
  const username = body?.username?.trim();
  const password = body?.password;

  if (!username || !password) {
    return Response.json({ message: "Username dan password wajib diisi" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.isActive) {
    return Response.json({ message: "Username/password salah" }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return Response.json({ message: "Username/password salah" }, { status: 401 });
  }

  const accessToken = jwt.sign({ sub: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET!, {
    expiresIn: "7d",
  });

  // Also set an HttpOnly cookie so Next.js middleware (server-side) can detect auth.
  const res = NextResponse.json({ accessToken });
  res.cookies.set({
    name: "accessToken",
    value: accessToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}
