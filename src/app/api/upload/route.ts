import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export const dynamic = 'force-dynamic';

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
  if (!form) return NextResponse.json({ message: "Invalid form" }, { headers: { "Cache-Control": "no-store" }, status: 400 });

  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ message: "File is required" }, { headers: { "Cache-Control": "no-store" }, status: 400 });
  }

  const filename = (file as any).name as string | undefined;
  const ext = safeExt(filename || "image.png");
  const buf = Buffer.from(await (file as File).arrayBuffer());

  // limit 5MB
  if (buf.byteLength > 5 * 1024 * 1024) {
    return NextResponse.json({ message: "File terlalu besar (maks 5MB)" }, { headers: { "Cache-Control": "no-store" }, status: 400 });
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const outName = `design-${stamp}-${rand}${ext}`;
  const outPath = path.join(uploadsDir, outName);
  await writeFile(outPath, buf);

  return NextResponse.json({ url: `/uploads/${outName}` }, { headers: { "Cache-Control": "no-store" }, status: 201 });
}