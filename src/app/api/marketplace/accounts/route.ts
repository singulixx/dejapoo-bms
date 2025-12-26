import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const CreateSchema = z.object({
  channel: z.enum(["SHOPEE", "TIKTOK"]),
  name: z.string().optional().nullable(),
  credentials: z.record(z.any()),
});

function encryptJson(data: any) {
  const secret = process.env.MARKETPLACE_SECRET || process.env.JWT_SECRET || "dev-secret";
  const iv = crypto.randomBytes(12);
  const key = crypto.createHash("sha256").update(secret).digest();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(data), "utf8");
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export async function POST(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Invalid payload", issues: parsed.error.issues }, { status: 400 });

  const account = await prisma.marketplaceAccount.create({
    data: {
      channel: parsed.data.channel,
      name: parsed.data.name ?? null,
      credentialsEnc: encryptJson(parsed.data.credentials),
      isActive: true,
    },
  });

  return NextResponse.json(account, { status: 201 });
}

export async function GET(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const items = await prisma.marketplaceAccount.findMany({
    where: { isActive: true },
    orderBy: [{ channel: "asc" }, { createdAt: "desc" }],
    select: { id: true, channel: true, name: true, isActive: true, createdAt: true, updatedAt: true },
  });
  return NextResponse.json({ items });
}
