import crypto from "crypto";

export type ShopeeTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expire_in: number; // seconds
  shop_id: number;
  merchant_id?: number;
};

type ShopeeErrorResponse = {
  error?: string;
  message?: string;
  error_msg?: string;
  request_id?: string;
};

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function host() {
  // Production default host for OpenAPI v2
  return process.env.SHOPEE_HOST || "partner.shopeemobile.com";
}

function partnerId(): number {
  return Number(requiredEnv("SHOPEE_PARTNER_ID"));
}

function partnerKey(): string {
  return requiredEnv("SHOPEE_PARTNER_KEY");
}

function nowTs(): number {
  return Math.floor(Date.now() / 1000);
}

function hmacSha256Hex(base: string, key: string) {
  return crypto.createHmac("sha256", key).update(base).digest("hex");
}

/**
 * Shopee OpenAPI v2 signature:
 * - Unauthed endpoints: base = partner_id + path + timestamp
 * - Authed (shop):      base = partner_id + path + timestamp + access_token + shop_id
 *
 * Suggestion referenced widely by community examples (v2). 
 */
export function signV2(params: {
  path: string;
  timestamp: number;
  accessToken?: string;
  shopId?: number;
}) {
  const pid = String(partnerId());
  const base =
    pid +
    params.path +
    String(params.timestamp) +
    (params.accessToken ? params.accessToken : "") +
    (params.shopId != null ? String(params.shopId) : "");
  return hmacSha256Hex(base, partnerKey());
}

/** Build Shopee "authorize shop" URL */
export function buildShopAuthUrl(state: string) {
  const timestamp = nowTs();
  const path = "/api/v2/shop/auth_partner";
  const sign = signV2({ path, timestamp });

  const redirect = requiredEnv("SHOPEE_REDIRECT_URL"); // full callback URL
  const u = new URL(`https://${host()}${path}`);
  u.searchParams.set("partner_id", String(partnerId()));
  u.searchParams.set("timestamp", String(timestamp));
  u.searchParams.set("sign", sign);
  u.searchParams.set("redirect", redirect);
  if (state) u.searchParams.set("state", state);
  return u.toString();
}

async function shopeeFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const e = data as ShopeeErrorResponse;
    const msg = e?.message || e?.error_msg || e?.error || `Shopee HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data as T;
}

export async function exchangeToken(params: { code: string; shopId?: number | null }) {
  const timestamp = nowTs();
  const path = "/api/v2/auth/token/get";
  const sign = signV2({ path, timestamp });

  const u = new URL(`https://${host()}${path}`);
  u.searchParams.set("partner_id", String(partnerId()));
  u.searchParams.set("timestamp", String(timestamp));
  u.searchParams.set("sign", sign);

  const body: any = { code: params.code, partner_id: partnerId() };
  if (params.shopId != null) body.shop_id = params.shopId;

  return shopeeFetch<ShopeeTokenResponse>(u.toString(), {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function refreshToken(params: { refreshToken: string; shopId: number }) {
  const timestamp = nowTs();
  const path = "/api/v2/auth/access_token/get";
  const sign = signV2({ path, timestamp });

  const u = new URL(`https://${host()}${path}`);
  u.searchParams.set("partner_id", String(partnerId()));
  u.searchParams.set("timestamp", String(timestamp));
  u.searchParams.set("sign", sign);

  const body = {
    refresh_token: params.refreshToken,
    shop_id: params.shopId,
    partner_id: partnerId(),
  };

  return shopeeFetch<ShopeeTokenResponse>(u.toString(), {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function shopeeAuthedGet<T>(params: {
  path: string;
  shopId: number;
  accessToken: string;
  query?: Record<string, any>;
}) {
  const timestamp = nowTs();
  const sign = signV2({
    path: params.path,
    timestamp,
    accessToken: params.accessToken,
    shopId: params.shopId,
  });

  const u = new URL(`https://${host()}${params.path}`);
  u.searchParams.set("partner_id", String(partnerId()));
  u.searchParams.set("timestamp", String(timestamp));
  u.searchParams.set("access_token", params.accessToken);
  u.searchParams.set("shop_id", String(params.shopId));
  u.searchParams.set("sign", sign);

  for (const [k, v] of Object.entries(params.query || {})) {
    if (v == null) continue;
    // arrays should be JSON-encoded for some endpoints
    u.searchParams.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }

  return shopeeFetch<T>(u.toString(), { method: "GET" });
}

export async function shopeeAuthedPost<T>(params: {
  path: string;
  shopId: number;
  accessToken: string;
  body?: any;
  query?: Record<string, any>;
}) {
  const timestamp = nowTs();
  const sign = signV2({
    path: params.path,
    timestamp,
    accessToken: params.accessToken,
    shopId: params.shopId,
  });

  const u = new URL(`https://${host()}${params.path}`);
  u.searchParams.set("partner_id", String(partnerId()));
  u.searchParams.set("timestamp", String(timestamp));
  u.searchParams.set("access_token", params.accessToken);
  u.searchParams.set("shop_id", String(params.shopId));
  u.searchParams.set("sign", sign);

  for (const [k, v] of Object.entries(params.query || {})) {
    if (v == null) continue;
    u.searchParams.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }

  return shopeeFetch<T>(u.toString(), {
    method: "POST",
    body: JSON.stringify(params.body ?? {}),
  });
}

/**
 * Webhook signature verification helper (best-effort).
 * Some webhook guides mention header like `x-shopee-signature` containing HMAC-SHA256 of raw body using partner key. 
 * If Shopee does not send this in your setup, you can still use WEBHOOK_SECRET_SHOPEE + x-webhook-secret.
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader?: string | null) {
  if (!signatureHeader) return false;
  const sig = signatureHeader.trim();
  const computed = crypto.createHmac("sha256", partnerKey()).update(rawBody).digest("hex");
  return computed === sig;
}
