import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = 'force-dynamic';

const MapSchema = z.object({
  accountId: z.string().min(1),
  variantId: z.string().min(1),
  marketplaceSku: z.string().min(1),
});

export async function POST(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => null);
  const parsed = MapSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Invalid payload", issues: parsed.error.issues }, { headers: { "Cache-Control": "no-store" }, status: 400 });

  const [account, variant] = await Promise.all([
    prisma.marketplaceAccount.findFirst({ where: { id: parsed.data.accountId, isActive: true } }),
    prisma.productVariant.findFirst({ where: { id: parsed.data.variantId, deletedAt: null } }),
  ]);
  if (!account) return NextResponse.json({ message: "Marketplace account not found" }, { headers: { "Cache-Control": "no-store" }, status: 404 });
  if (!variant) return NextResponse.json({ message: "Variant not found" }, { headers: { "Cache-Control": "no-store" }, status: 404 });

  const mapped = await prisma.marketplaceProduct.upsert({
    where: { accountId_variantId: { accountId: parsed.data.accountId, variantId: parsed.data.variantId } },
    update: { marketplaceSku: parsed.data.marketplaceSku },
    create: { accountId: parsed.data.accountId, variantId: parsed.data.variantId, marketplaceSku: parsed.data.marketplaceSku },
  });

  return NextResponse.json(mapped, { headers: { "Cache-Control": "no-store" }, status: 201 });
}