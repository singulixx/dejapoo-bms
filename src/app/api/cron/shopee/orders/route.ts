import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptJson, encryptJson } from "@/lib/crypto";
import { refreshToken, shopeeAuthedGet } from "@/lib/shopee";

export const dynamic = 'force-dynamic';

type StoredCreds = { shop_id: number; merchant_id?: number | null };

function toUnixSeconds(d: Date) {
  return Math.floor(d.getTime() / 1000);
}

function mapShopeeStatus(status?: string | null) {
  const s = String(status || "").toLowerCase();
  if (s.includes("cancel")) return "CANCELLED" as const;
  if (s.includes("completed") || s.includes("delivered") || s.includes("finish")) return "COMPLETED" as const;
  if (s.includes("shipped") || s.includes("shipment") || s.includes("ready")) return "SHIPPED" as const;
  if (s.includes("paid") || s.includes("to_ship") || s.includes("processed")) return "PAID" as const;
  return "NEW" as const;
}

async function getOrCreateWarehouse() {
  const outlet =
    (await prisma.outlet.findFirst({ where: { type: "WAREHOUSE" }, orderBy: { createdAt: "asc" } })) ||
    (await prisma.outlet.create({ data: { name: "Gudang", type: "WAREHOUSE", isActive: true } }));
  return outlet;
}

async function ensureFreshToken(account: any) {
  const creds = decryptJson<StoredCreds>(account.credentialsEnc);
  const access = account.accessTokenEnc ? decryptJson<{ access_token: string }>(account.accessTokenEnc).access_token : null;
  const refresh = account.refreshTokenEnc ? decryptJson<{ refresh_token: string }>(account.refreshTokenEnc).refresh_token : null;

  const expiresAt: Date | null = account.tokenExpiresAt ? new Date(account.tokenExpiresAt) : null;
  const expiresSoon = !expiresAt || expiresAt.getTime() - Date.now() < 5 * 60 * 1000;

  if (access && !expiresSoon) {
    return { shopId: creds.shop_id, accessToken: access };
  }
  if (!refresh) throw new Error(`Shopee account ${account.id} missing refresh_token`);

  const t = await refreshToken({ refreshToken: refresh, shopId: creds.shop_id });
  const newExpiresAt = new Date(Date.now() + t.expire_in * 1000);
  await prisma.marketplaceAccount.update({
    where: { id: account.id },
    data: {
      accessTokenEnc: encryptJson({ access_token: t.access_token }),
      refreshTokenEnc: t.refresh_token ? encryptJson({ refresh_token: t.refresh_token }) : account.refreshTokenEnc,
      tokenExpiresAt: newExpiresAt,
    },
  });
  return { shopId: creds.shop_id, accessToken: t.access_token };
}

export async function POST(req: Request) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => ({}));
  const hours = Number(body?.hours ?? 24);
  const lookbackHours = Number.isFinite(hours) && hours > 0 && hours <= 168 ? hours : 24;

  const end = new Date();
  const start = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

  const accounts = await prisma.marketplaceAccount.findMany({ where: { channel: "SHOPEE", isActive: true } });
  if (!accounts.length) return NextResponse.json({ ok: true, message: "No active Shopee accounts" }, { headers: { "Cache-Control": "no-store" } });

  const outlet = await getOrCreateWarehouse();
  const results: any[] = [];

  for (const account of accounts) {
    try {
      const { shopId, accessToken } = await ensureFreshToken(account);

      // 1) list orders
      const list = await shopeeAuthedGet<{ order_list: Array<{ order_sn: string; order_status?: string }> }>({
        path: "/api/v2/order/get_order_list",
        shopId,
        accessToken,
        query: {
          time_range_field: "create_time",
          time_from: toUnixSeconds(start),
          time_to: toUnixSeconds(end),
          page_size: 50,
        },
      });

      const orderSns = (list?.order_list || []).map((o) => o.order_sn).filter(Boolean);
      let processed = 0;

      for (const orderSn of orderSns) {
        // 2) fetch order detail
        const detail = await shopeeAuthedGet<any>({
          path: "/api/v2/order/get_order_detail",
          shopId,
          accessToken,
          query: {
            order_sn_list: orderSn,
            response_optional_fields: "item_list,recipient_address,shipping_carrier,total_amount,actual_shipping_fee,package_list",
          },
        });

        const order = Array.isArray(detail?.order_list) ? detail.order_list[0] : detail?.order_list?.[0];
        if (!order) continue;

        const externalOrderId = String(order.order_sn);
        const status = mapShopeeStatus(order.order_status);

        const itemList: any[] = Array.isArray(order.item_list) ? order.item_list : [];
        const items = itemList
          .map((it) => {
            const externalSkuId = String(it.model_sku || it.item_sku || it.model_id || it.item_id || "").trim();
            const qty = Number(it.model_quantity_purchased ?? it.quantity ?? 0);
            const price = it.model_discounted_price ?? it.model_original_price ?? it.item_price ?? null;
            return {
              externalSkuId,
              qty,
              price: price != null ? Number(price) : null,
            };
          })
          .filter((x) => x.externalSkuId && x.qty > 0);

        if (!items.length) continue;

        const maps = await prisma.channelSkuMap.findMany({
          where: { channel: "SHOPEE", externalSkuId: { in: items.map((i) => i.externalSkuId) } },
        });
        const mapBySku = new Map(maps.map((m) => [m.externalSkuId, m.variantId]));
        const missing = items.filter((i) => !mapBySku.get(i.externalSkuId));
        if (missing.length) {
          // store as webhook event-like record for visibility
          await prisma.webhookEvent.create({
            data: {
              channel: "SHOPEE",
              idempotencyKey: `CRON-SHOPEE-${externalOrderId}-${Date.now()}`,
              externalOrderId,
              externalEventId: null,
              payloadJson: { source: "cron", order_sn: externalOrderId, missing: missing.map((m) => m.externalSkuId) },
              status: "UNMAPPED",
              errorMessage: `Unmapped SKU: ${missing.map((m) => m.externalSkuId).join(", ")}`,
            },
          });
          continue;
        }

        const variantIds = items.map((i) => mapBySku.get(i.externalSkuId)!);
        const variants = await prisma.productVariant.findMany({
          where: { id: { in: variantIds }, deletedAt: null },
          include: { product: true },
        });
        const vById = new Map(variants.map((v) => [v.id, v]));

        const orderItems = items.map((it) => {
          const variantId = mapBySku.get(it.externalSkuId)!;
          const variant = vById.get(variantId)!;
          const unitPrice = it.price != null ? it.price : (variant?.price ?? 0);
          return { productId: variant.productId, variantId, qty: it.qty, price: unitPrice, subtotal: unitPrice * it.qty };
        });
        const totalAmount = orderItems.reduce((s, x) => s + x.subtotal, 0);

        await prisma.$transaction(async (tx) => {
          const existingOrder = await tx.order.findUnique({
            where: { channel_externalOrderId: { channel: "SHOPEE", externalOrderId } },
            select: { id: true },
          });

          const created = await tx.order.upsert({
            where: { channel_externalOrderId: { channel: "SHOPEE", externalOrderId } },
            update: { totalAmount, outletId: outlet.id, source: "API", status },
            create: {
              orderCode: `API-SHOPEE-${externalOrderId.slice(-12)}`,
              channel: "SHOPEE",
              source: "API",
              outletId: outlet.id,
              externalOrderId,
              totalAmount,
              status,
            },
          });

          await tx.orderItem.deleteMany({ where: { orderId: created.id } });
          await tx.orderItem.createMany({ data: orderItems.map((it) => ({ ...it, orderId: created.id })) });

          // Apply stock only on first creation (avoid double-decrement on repeated sync)
          if (!existingOrder) {
            for (const it of orderItems) {
              await tx.stock.upsert({
                where: { outletId_variantId: { outletId: outlet.id, variantId: it.variantId } },
                update: { qty: { decrement: it.qty } },
                create: { outletId: outlet.id, variantId: it.variantId, qty: 0 - it.qty },
              });
              await tx.stockMovement.create({
                data: {
                  type: "OUT",
                  outletId: outlet.id,
                  variantId: it.variantId,
                  qty: it.qty,
                  note: `CRON SHOPEE ${externalOrderId}`,
                  refType: "ORDER",
                  refId: created.id,
                },
              });
            }
          }
        });

        processed++;
      }

      results.push({ accountId: account.id, shopId, scanned: orderSns.length, processed });
    } catch (e: any) {
      results.push({ accountId: account.id, error: String(e?.message || e) });
    }
  }

  return NextResponse.json({ ok: true, range: { hours: lookbackHours }, results }, { headers: { "Cache-Control": "no-store" } });
}