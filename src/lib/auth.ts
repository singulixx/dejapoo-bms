import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { requestContext } from "@/lib/request-context";

// NOTE: role is stored as VARCHAR in DB and may include values like
// OWNER / ADMIN / CASHIER / WAREHOUSE, etc. Keep this flexible.
export type AccessTokenPayload = { sub: string; username: string; role: string };

export function getBearerToken(req: Request) {
  const h = req.headers.get("authorization") || "";
  const [type, token] = h.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
}

function getCookieToken(req: Request, name: string) {
  const cookie = req.headers.get("cookie") || "";
  if (!cookie) return null;
  // naive but robust enough: split by ';' then match key
  const parts = cookie.split(";").map((p) => p.trim());
  for (const p of parts) {
    if (!p) continue;
    const idx = p.indexOf("=");
    if (idx === -1) continue;
    const k = p.slice(0, idx).trim();
    if (k !== name) continue;
    const v = p.slice(idx + 1);
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  }
  return null;
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as AccessTokenPayload;
}

function getReqMeta(req: Request) {
  // NextRequest.ip is not available here; best effort from headers.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined;

  // Always prefer the real request URL path. (x-pathname can be spoofed or missing)
  let path: string | undefined = undefined;
  try {
    path = new URL(req.url).pathname;
  } catch {
    path = undefined;
  }

  return {
    method: req.method,
    path: path,
    ip: ip,
    userAgent: req.headers.get("user-agent") || undefined,
  };
}

export function requireAuth(req: Request) {
  // Prefer Authorization header, fallback to HttpOnly cookie set by /api/auth/login.
  const token = getBearerToken(req) || getCookieToken(req, "accessToken");
  if (!token) {
    return { ok: false as const, res: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }
  try {
    const payload = verifyAccessToken(token);

    const ctx = {
      user: { id: payload.sub, username: payload.username, role: payload.role },
      req: getReqMeta(req),
    };

    // Best-effort: set context for the current async chain.
    // NOTE: some libraries (e.g. interactive transactions) can lose ALS context,
    // so routes that use prisma.$transaction should wrap their work with
    // requestContext.run(ctx, async () => { ... }).
    requestContext.enterWith(ctx);

    return { ok: true as const, user: payload, ctx };
  } catch {
    return { ok: false as const, res: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }
}

export function requireAdmin(req: Request) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth;
  // Allow OWNER and ADMIN to access admin-level endpoints.
  // (MVP: OWNER is effectively the super-admin.)
  const role = String(auth.user.role ?? "").trim().toUpperCase();
  if (role !== "ADMIN" && role !== "OWNER") {
    return { ok: false as const, res: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  }
  return auth;
}
