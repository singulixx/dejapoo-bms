import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { requestContext } from "@/lib/request-context";

// NOTE: role is stored as VARCHAR in DB and may include values like
// OWNER / ADMIN / CASHIER / WAREHOUSE, etc. Keep this flexible.
export type AccessTokenPayload = {
  sub: string;
  username: string;
  role: string;
};

export function getBearerToken(req: Request) {
  const h = req.headers.get("authorization") || "";
  const [type, token] = h.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return jwt.verify(token, secret) as AccessTokenPayload;
}

function getReqMeta(req: Request) {
  // Best effort IP from headers.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined;

  // IMPORTANT: RequestContext expects path: string | undefined (NOT null)
  let pathname: string | undefined;
  try {
    pathname = new URL(req.url).pathname || undefined;
  } catch {
    pathname = undefined;
  }

  const userAgent = req.headers.get("user-agent") || undefined;

  return {
    method: req.method,
    path: pathname,
    ip,
    userAgent,
  };
}

export function requireAuth(req: Request) {
  const token = getBearerToken(req);
  if (!token) {
    return {
      ok: false as const,
      res: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }

  try {
    const payload = verifyAccessToken(token);

    const ctx = {
      user: { id: payload.sub, username: payload.username, role: payload.role },
      req: getReqMeta(req),
    };

    // Set ALS context for downstream logs/audit hooks, best-effort.
    requestContext.enterWith(ctx);

    return { ok: true as const, user: payload, ctx };
  } catch {
    return {
      ok: false as const,
      res: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }
}

export function requireAdmin(req: Request) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth;

  if (auth.user.role !== "ADMIN") {
    return {
      ok: false as const,
      res: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
    };
  }

  return auth;
}
