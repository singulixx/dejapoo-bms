import crypto from "crypto";

export type ShopeeTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expire_in: number; // seconds
  shop_id: number;
  merchant_id?: number;
};

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function getShopeeConfig() {
  const partnerId = Number(requiredEnv("SHOPEE_PARTNER_ID"));
  const partnerKey = requiredEnv("SHOPEE_PARTNER_KEY");
  const host = (process.env.SHOPEE_HOST || "partner.shopeemobile.com").trim();
  const redirectUrl = requiredEnv("SHOPEE_REDIRECT_URL");
  return { partnerId, partnerKey, host, redirectUrl };
}

export function shopeeSign(base: string, partnerKey: string): string {
  return crypto.createHmac("sha256", partnerKey).update(base).digest("hex");
}

export function unixNow(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Shopee v2: for most signed API calls:
 * base_string = partner_id + path + timestamp + access_token + shop_id
 */
export function signWithAccessToken(args: {
  partnerId: number;
  path: string;
  timestamp: number;
  accessToken: string;
  shopId: number;
  partnerKey: string;
}) {
  const { partnerId, path, timestamp, accessToken, shopId, partnerKey } = args;
  const base = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
  return shopeeSign(base, partnerKey);
}

/**
 * Shopee v2 token APIs (no access_token yet):
 * base_string = partner_id + path + timestamp
 * (Some regions include shop_id in docs; we include it when provided for compatibility.)
 */
export function signForToken(args: {
  partnerId: number;
  path: string;
  timestamp: number;
  partnerKey: string;
  shopId?: number;
}) {
  const { partnerId, path, timestamp, partnerKey, shopId } = args;
  const base = shopId != null ? `${partnerId}${path}${timestamp}${shopId}` : `${partnerId}${path}${timestamp}`;
  return shopeeSign(base, partnerKey);
}

export function buildShopAuthUrl(state: string) {
  const { partnerId, partnerKey, host, redirectUrl } = getShopeeConfig();
  const path = "/api/v2/shop/auth_partner";
  const timestamp = unixNow();
  const sign = signForToken({ partnerId, path, timestamp, partnerKey });

  const u = new URL(`https://${host}${path}`);
  u.searchParams.set("partner_id", String(partnerId));
  u.searchParams.set("timestamp", String(timestamp));
  u.searchParams.set("sign", sign);
  u.searchParams.set("redirect", redirectUrl);
  u.searchParams.set("state", state);
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
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Shopee API error ${res.status}: ${JSON.stringify(data)}`);
  }
  // Shopee usually wraps under { error, message, response }
  if (data?.error && data.error !== "") {
    throw new Error(`Shopee API error: ${data.error} ${data.message || ""}`);
  }
  return (data?.response ?? data) as T;
}

export async function exchangeToken(params: { code: string; shopId?: number }) {
  const { partnerId, partnerKey, host } = getShopeeConfig();
  const path = "/api/v2/auth/token/get";
  const timestamp = unixNow();
  const sign = signForToken({ partnerId, path, timestamp, partnerKey, shopId: params.shopId });
  const u = new URL(`https://${host}${path}`);
  u.searchParams.set("partner_id", String(partnerId));
  u.searchParams.set("timestamp", String(timestamp));
  u.searchParams.set("sign", sign);

  const body: any = { code: params.code, partner_id: partnerId };
  if (params.shopId != null) body.shop_id = params.shopId;

  return shopeeFetch<ShopeeTokenResponse>(u.toString(), {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function refreshToken(params: { refreshToken: string; shopId: number }) {
  const { partnerId, partnerKey, host } = getShopeeConfig();
  const path = "/api/v2/auth/access_token/get";
  const timestamp = unixNow();
  const sign = signForToken({ partnerId, path, timestamp, partnerKey, shopId: params.shopId });
  const u = new URL(`https://${host}${path}`);
  u.searchParams.set("partner_id", String(partnerId));
  u.searchParams.set("timestamp", String(timestamp));
  u.searchParams.set("sign", sign);

  const body = {
    partner_id: partnerId,
    shop_id: params.shopId,
    refresh_token: params.refreshToken,
  };
  return shopeeFetch<ShopeeTokenResponse>(u.toString(), { method: "POST", body: JSON.stringify(body) });
}

export async function shopeeAuthedGet<T>(params: {
  path: string;
  shopId: number;
  accessToken: string;
  query?: Record<string, string | number | boolean | undefined | null>;
}) {
  const { partnerId, partnerKey, host } = getShopeeConfig();
  const timestamp = unixNow();
  const sign = signWithAccessToken({
    partnerId,
    path: params.path,
    timestamp,
    accessToken: params.accessToken,
    shopId: params.shopId,
    partnerKey,
  });

  const u = new URL(`https://${host}${params.path}`);
  u.searchParams.set("partner_id", String(partnerId));
  u.searchParams.set("timestamp", String(timestamp));
  u.searchParams.set("access_token", params.accessToken);
  u.searchParams.set("shop_id", String(params.shopId));
  u.searchParams.set("sign", sign);
  for (const [k, v] of Object.entries(params.query || {})) {
    if (v == null) continue;
    u.searchParams.set(k, String(v));
  }

  return shopeeFetch<T>(u.toString(), { method: "GET" });
}
