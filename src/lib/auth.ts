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

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as AccessTokenPayload;
}

function getReqMeta(req: Request) {
  // NextRequest.ip is not available here; best effort from headers.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  // Always prefer the real request URL path. (x-pathname can be spoofed or missing)
  let path: string | null = null;
  try {
    path = new URL(req.url).pathname;
  } catch {
    path = null;
  }

  return {
    method: req.method,
    path: path,
    ip: ip,
    userAgent: req.headers.get("user-agent") || null,
  };
}

export function requireAuth(req: Request) {
  const token = getBearerToken(req);
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
  if (auth.user.role !== "ADMIN") {
    return { ok: false as const, res: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  }
  return auth;
}
