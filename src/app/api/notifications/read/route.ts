import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  ids: z.array(z.string().min(1)).optional(),
  all: z.boolean().optional(),
});

export async function POST(req: Request) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.res;

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { headers: { "Cache-Control": "no-store" }, status: 400 });

  const userId = auth.user.sub;
  const role = auth.user.role;

  const now = new Date();

  // NOTE: must NOT be `as const` because Prisma types expect a mutable array.
  const whereAccess: Prisma.NotificationWhereInput = {
    OR: [{ userId }, { role }, { userId: null, role: null }],
  };

  if (parsed.data.all) {
    await prisma.notification.updateMany({
      where: { ...whereAccess, isRead: false },
      data: { isRead: true, readAt: now },
    });
  } else if (parsed.data.ids?.length) {
    await prisma.notification.updateMany({
      where: { ...whereAccess, id: { in: parsed.data.ids } },
      data: { isRead: true, readAt: now },
    });
  } else {
    return NextResponse.json({ message: "Invalid input" }, { headers: { "Cache-Control": "no-store" }, status: 400 });
  }

  const unreadCount = await prisma.notification.count({
    where: { ...whereAccess, isRead: false },
  });

  return NextResponse.json({ ok: true, unreadCount }, { headers: { "Cache-Control": "no-store" } });
}