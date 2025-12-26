import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const pageSize = Math.min(200, Math.max(1, Number(url.searchParams.get("pageSize") || "50")));

  const q = (url.searchParams.get("q") || "").trim();
  const action = (url.searchParams.get("action") || "").trim();
  const model = (url.searchParams.get("model") || "").trim();
  const username = (url.searchParams.get("username") || "").trim();

  const where: any = {};
  if (action) where.action = action;
  if (model) where.model = model;
  if (username) where.username = username;
  if (q) {
    where.OR = [
      { action: { contains: q } },
      { model: { contains: q } },
      { entityId: { contains: q } },
      { username: { contains: q } },
      { path: { contains: q } },
      { ip: { contains: q } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ page, pageSize, total, items });
}
