import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const BodySchema = z.object({
  ids: z.array(z.string().min(1)).optional(),
  all: z.boolean().optional(),
});

export async function POST(req: Request) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.res;

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input" }, { status: 400 });
  }

  const userId = auth.user.sub;
  const role = auth.user.role;
  const now = new Date();

  // ✅ Jangan pakai "as const" supaya OR tidak jadi readonly
  const whereAccess = {
    OR: [{ userId }, { role }, { userId: null, role: null }],
  };

  if (parsed.data.all) {
    await prisma.notification.updateMany({
      where: { ...whereAccess, isRead: false },
      data: { isRead: true, readAt: now },
    });
  } else if (parsed.data.ids?.length) {
    await prisma.notification.updateMany({
      where: { ...whereAccess, id: { in: parsed.data.ids }, isRead: false },
      data: { isRead: true, readAt: now },
    });
  } else {
    return NextResponse.json({ message: "Invalid input" }, { status: 400 });
  }

  const unreadCount = await prisma.notification.count({
    where: { ...whereAccess, isRead: false },
  });

  return NextResponse.json({ ok: true, unreadCount });
}
