import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  credentials: z.record(z.any()).optional(), // will be encrypted if provided
});

function encryptJson(data: any) {
  const raw = JSON.stringify(data);
  const key = crypto.createHash("sha256").update(process.env.MARKETPLACE_SECRET || "dev-secret").digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(raw, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const acc = await prisma.marketplaceAccount.findUnique({ where: { id: params.id } });
  if (!acc) return NextResponse.json({ message: "Account not found" }, { status: 404 });
  return NextResponse.json(acc);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", errors: parsed.error.flatten() }, { status: 400 });
  }

  const data: any = { ...parsed.data };
  if (parsed.data.credentials) {
    data.credentialsEnc = encryptJson(parsed.data.credentials);
    delete data.credentials;
  }

  const updated = await prisma.marketplaceAccount.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true, id: updated.id });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const updated = await prisma.marketplaceAccount.update({ where: { id: params.id }, data: { isActive: false } });
  return NextResponse.json({ ok: true, id: updated.id });
}
