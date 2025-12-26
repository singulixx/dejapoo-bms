import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { put } from "@vercel/blob";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";

function safeExt(filename: string) {
  const ext = path.extname(filename || "").toLowerCase();
  const allowed = new Set([".jpg", ".jpeg", ".png", ".webp"]);
  return allowed.has(ext) ? ext : ".png";
}

export async function POST(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = safeExt(file.name);
  const key = `uploads/${Date.now()}-${crypto.randomUUID()}${ext}`;

  const blob = await put(key, file, {
    access: "public",
    contentType: file.type || "image/png",
    addRandomSuffix: false
  });

  return NextResponse.json({ url: blob.url, pathname: blob.pathname });
}
