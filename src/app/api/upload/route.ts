import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { put } from "@vercel/blob";
import path from "path";

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
  if (!form) return NextResponse.json({ message: "Invalid form" }, { status: 400 });

  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ message: "File is required" }, { status: 400 });
  }

  // @ts-expect-error - File API tersedia di runtime Next
  const filename = (file as any).name as string | undefined;
  const ext = safeExt(filename || "image.png");
  const buf = Buffer.from(await (file as File).arrayBuffer());

  // limit 5MB
  if (buf.byteLength > 5 * 1024 * 1024) {
    return NextResponse.json({ message: "File terlalu besar (maks 5MB)" }, { status: 400 });
  }

  // Vercel Serverless tidak mendukung penyimpanan file persisten di filesystem proyek
  // (public/ akan read-only saat runtime). Gunakan Vercel Blob sebagai storage.
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const outName = `design-${stamp}-${rand}${ext}`;

  const blob = await put(`uploads/${outName}`, buf, {
    access: "public",
    contentType: (file as File).type || "image/png",
  });

  return NextResponse.json({ url: blob.url }, { status: 201 });
}
