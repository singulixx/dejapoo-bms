import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  // Zod terbaru: z.record butuh (keyType, valueType)
  credentials: z.record(z.string(), z.unknown()).optional(), // will be encrypted if provided
});

function encryptJson(data: unknown) {
  const raw = JSON.stringify(data);

  const key = crypto
    .createHash("sha256")
    .update(process.env.MARKETPLACE_SECRET || "dev-secret")
    .digest(); // 32 bytes

  const iv = crypto.randomBytes(12); // recommended IV length for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const enc = Buffer.concat([cipher.update(raw, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Store iv + tag + ciphertext
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

// Next.js 15: params pada dynamic route handler adalah Promise
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const { id } = await params;

  const acc = await prisma.marketplaceAccount.findUnique({ where: { id } });
  if (!acc) return NextResponse.json({ message: "Account not found" }, { status: 404 });

  return NextResponse.json(acc);
}

export async function PUT(req: Request, { params }: Ctx) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = { ...parsed.data };

  if (parsed.data.credentials) {
    data.credentialsEnc = encryptJson(parsed.data.credentials);
    delete (data as any).credentials;
  }

  const updated = await prisma.marketplaceAccount.update({
    where: { id },
    data: data as any,
  });

  return NextResponse.json({ ok: true, id: updated.id });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const { id } = await params;

  const updated = await prisma.marketplaceAccount.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ ok: true, id: updated.id });
}
