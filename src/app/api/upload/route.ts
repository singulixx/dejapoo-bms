import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import path from "path";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

function safeExt(filename: string) {
  const ext = path.extname(filename || "").toLowerCase();
  const allowed = new Set([".jpg", ".jpeg", ".png", ".webp"]);
  return allowed.has(ext) ? ext : ".png";
}

export async function POST(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ message: "Invalid form data" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "File tidak ditemukan" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ message: "File terlalu besar (maks 5MB)" }, { status: 400 });
  }

  const ext = safeExt(file.name);
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const key = `uploads/design-${stamp}-${rand}${ext}`;

  const buf = Buffer.from(await file.arrayBuffer());

  // Requires env var: BLOB_READ_WRITE_TOKEN on Vercel
  const blob = await put(key, buf, {
    access: "public",
    contentType: file.type || "application/octet-stream",
    addRandomSuffix: false,
  });

  return NextResponse.json({ url: blob.url }, { status: 201 });
}
