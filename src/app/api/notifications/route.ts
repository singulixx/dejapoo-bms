import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.res;

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 100);

  const userId = auth.user.sub;
  const role = auth.user.role;

  const items = await prisma.notification.findMany({
    where: {
      OR: [{ userId }, { role }, { userId: null, role: null }],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const unreadCount = await prisma.notification.count({
    where: {
      isRead: false,
      OR: [{ userId }, { role }, { userId: null, role: null }],
    },
  });

  return NextResponse.json({ items, unreadCount });
}
