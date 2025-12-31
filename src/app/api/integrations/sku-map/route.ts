import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = 'force-dynamic';

const UpsertSchema = z.object({
  channel: z.enum(["SHOPEE", "TIKTOK"]),
  externalSkuId: z.string().min(1),
  variantId: z.string().min(1),
});

export async function GET(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const { searchParams } = new URL(req.url);
  const channel = searchParams.get("channel") as ("SHOPEE" | "TIKTOK" | null);

  const where: any = {};
  if (channel) where.channel = channel;

  const items = await prisma.channelSkuMap.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
    include: { variant: { include: { product: true } } },
  });

  return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => null);
  const parsed = UpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", issues: parsed.error.issues }, { headers: { "Cache-Control": "no-store" }, status: 400 });
  }

  const variant = await prisma.productVariant.findFirst({ where: { id: parsed.data.variantId, deletedAt: null } });
  if (!variant) return NextResponse.json({ message: "Variant not found" }, { headers: { "Cache-Control": "no-store" }, status: 404 });

  const mapped = await prisma.channelSkuMap.upsert({
    where: { channel_externalSkuId: { channel: parsed.data.channel, externalSkuId: parsed.data.externalSkuId } },
    update: { variantId: parsed.data.variantId },
    create: { channel: parsed.data.channel, externalSkuId: parsed.data.externalSkuId, variantId: parsed.data.variantId },
  });

  return NextResponse.json(mapped, { headers: { "Cache-Control": "no-store" }, status: 201 });
}