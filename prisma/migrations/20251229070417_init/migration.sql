-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN');

-- CreateEnum
CREATE TYPE "Size" AS ENUM ('S', 'M', 'L', 'XL', 'XXL');

-- CreateEnum
CREATE TYPE "OutletType" AS ENUM ('WAREHOUSE', 'OFFLINE_STORE', 'ONLINE');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('IN', 'OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "OrderChannel" AS ENUM ('SHOPEE', 'TIKTOK', 'OFFLINE_STORE', 'RESELLER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'QRIS');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('NEW', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('MANUAL', 'API');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "role" TEXT,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "message" TEXT,
    "href" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authsession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authsession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "imageUrl" TEXT,
    "costPrice" INTEGER NOT NULL DEFAULT 0,
    "sellPrice" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productvariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "size" "Size" NOT NULL,
    "color" TEXT,
    "sku" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "minQty" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productvariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outlet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OutletType" NOT NULL DEFAULT 'WAREHOUSE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outlet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock" (
    "id" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stockmovement" (
    "id" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "outletId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stockmovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stockin" (
    "id" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "supplier" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stockin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stockinitem" (
    "id" TEXT NOT NULL,
    "stockInId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stockinitem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stocktransfer" (
    "id" TEXT NOT NULL,
    "fromOutletId" TEXT NOT NULL,
    "toOutletId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stocktransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stocktransferitem" (
    "id" TEXT NOT NULL,
    "stockTransferId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,

    CONSTRAINT "stocktransferitem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order" (
    "id" TEXT NOT NULL,
    "orderCode" TEXT NOT NULL,
    "channel" "OrderChannel" NOT NULL,
    "source" "OrderSource" NOT NULL DEFAULT 'MANUAL',
    "outletId" TEXT,
    "marketplaceOrderId" TEXT,
    "externalOrderId" TEXT,
    "totalAmount" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'NEW',
    "paymentMethod" "PaymentMethod",
    "customerName" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhookevent" (
    "id" TEXT NOT NULL,
    "channel" "OrderChannel" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "externalEventId" TEXT,
    "externalOrderId" TEXT,
    "payloadJson" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "errorMessage" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "webhookevent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channelskumap" (
    "id" TEXT NOT NULL,
    "channel" "OrderChannel" NOT NULL,
    "externalSkuId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channelskumap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orderitem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,

    CONSTRAINT "orderitem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplaceaccount" (
    "id" TEXT NOT NULL,
    "channel" "OrderChannel" NOT NULL,
    "name" TEXT,
    "credentialsEnc" TEXT NOT NULL,
    "accessTokenEnc" TEXT,
    "refreshTokenEnc" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplaceaccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplaceproduct" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "marketplaceSku" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplaceproduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditlog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "username" TEXT,
    "role" TEXT,
    "action" TEXT NOT NULL,
    "model" TEXT,
    "entity" TEXT,
    "entityId" TEXT,
    "method" TEXT,
    "path" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "data" JSONB,
    "metadata" JSONB,
    "metaJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditlog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE INDEX "notification_userId_isRead_createdAt_idx" ON "notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "notification_role_isRead_createdAt_idx" ON "notification"("role", "isRead", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "authsession_tokenHash_key" ON "authsession"("tokenHash");

-- CreateIndex
CREATE INDEX "authsession_userId_idx" ON "authsession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "product_code_key" ON "product"("code");

-- CreateIndex
CREATE UNIQUE INDEX "productvariant_sku_key" ON "productvariant"("sku");

-- CreateIndex
CREATE INDEX "productvariant_productId_idx" ON "productvariant"("productId");

-- CreateIndex
CREATE INDEX "productvariant_sku_idx" ON "productvariant"("sku");

-- CreateIndex
CREATE INDEX "stock_variantId_idx" ON "stock"("variantId");

-- CreateIndex
CREATE INDEX "stock_outletId_idx" ON "stock"("outletId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_outletId_variantId_key" ON "stock"("outletId", "variantId");

-- CreateIndex
CREATE INDEX "stockmovement_variantId_idx" ON "stockmovement"("variantId");

-- CreateIndex
CREATE INDEX "stockmovement_outletId_idx" ON "stockmovement"("outletId");

-- CreateIndex
CREATE INDEX "stockmovement_createdAt_idx" ON "stockmovement"("createdAt");

-- CreateIndex
CREATE INDEX "stockmovement_type_idx" ON "stockmovement"("type");

-- CreateIndex
CREATE INDEX "stockinitem_variantId_idx" ON "stockinitem"("variantId");

-- CreateIndex
CREATE INDEX "stockinitem_stockInId_idx" ON "stockinitem"("stockInId");

-- CreateIndex
CREATE INDEX "stocktransfer_fromOutletId_idx" ON "stocktransfer"("fromOutletId");

-- CreateIndex
CREATE INDEX "stocktransfer_toOutletId_idx" ON "stocktransfer"("toOutletId");

-- CreateIndex
CREATE INDEX "stocktransfer_date_idx" ON "stocktransfer"("date");

-- CreateIndex
CREATE INDEX "stocktransferitem_variantId_idx" ON "stocktransferitem"("variantId");

-- CreateIndex
CREATE INDEX "stocktransferitem_stockTransferId_idx" ON "stocktransferitem"("stockTransferId");

-- CreateIndex
CREATE UNIQUE INDEX "order_orderCode_key" ON "order"("orderCode");

-- CreateIndex
CREATE INDEX "order_channel_idx" ON "order"("channel");

-- CreateIndex
CREATE INDEX "order_outletId_idx" ON "order"("outletId");

-- CreateIndex
CREATE INDEX "order_createdAt_idx" ON "order"("createdAt");

-- CreateIndex
CREATE INDEX "order_marketplaceOrderId_idx" ON "order"("marketplaceOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "order_channel_externalOrderId_key" ON "order"("channel", "externalOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "webhookevent_idempotencyKey_key" ON "webhookevent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "webhookevent_channel_idx" ON "webhookevent"("channel");

-- CreateIndex
CREATE INDEX "webhookevent_receivedAt_idx" ON "webhookevent"("receivedAt");

-- CreateIndex
CREATE INDEX "webhookevent_externalOrderId_idx" ON "webhookevent"("externalOrderId");

-- CreateIndex
CREATE INDEX "channelskumap_variantId_idx" ON "channelskumap"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "channelskumap_channel_externalSkuId_key" ON "channelskumap"("channel", "externalSkuId");

-- CreateIndex
CREATE INDEX "orderitem_orderId_idx" ON "orderitem"("orderId");

-- CreateIndex
CREATE INDEX "orderitem_variantId_idx" ON "orderitem"("variantId");

-- CreateIndex
CREATE INDEX "orderitem_productId_idx" ON "orderitem"("productId");

-- CreateIndex
CREATE INDEX "marketplaceaccount_channel_idx" ON "marketplaceaccount"("channel");

-- CreateIndex
CREATE INDEX "marketplaceproduct_marketplaceSku_idx" ON "marketplaceproduct"("marketplaceSku");

-- CreateIndex
CREATE INDEX "marketplaceproduct_variantId_idx" ON "marketplaceproduct"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "marketplaceproduct_accountId_variantId_key" ON "marketplaceproduct"("accountId", "variantId");

-- CreateIndex
CREATE INDEX "auditlog_userId_idx" ON "auditlog"("userId");

-- CreateIndex
CREATE INDEX "auditlog_username_idx" ON "auditlog"("username");

-- CreateIndex
CREATE INDEX "auditlog_model_idx" ON "auditlog"("model");

-- CreateIndex
CREATE INDEX "auditlog_entity_idx" ON "auditlog"("entity");

-- CreateIndex
CREATE INDEX "auditlog_createdAt_idx" ON "auditlog"("createdAt");

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authsession" ADD CONSTRAINT "authsession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productvariant" ADD CONSTRAINT "productvariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "productvariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stockmovement" ADD CONSTRAINT "stockmovement_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stockmovement" ADD CONSTRAINT "stockmovement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "productvariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stockin" ADD CONSTRAINT "stockin_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stockinitem" ADD CONSTRAINT "stockinitem_stockInId_fkey" FOREIGN KEY ("stockInId") REFERENCES "stockin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stockinitem" ADD CONSTRAINT "stockinitem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "productvariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocktransfer" ADD CONSTRAINT "stocktransfer_fromOutletId_fkey" FOREIGN KEY ("fromOutletId") REFERENCES "outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocktransfer" ADD CONSTRAINT "stocktransfer_toOutletId_fkey" FOREIGN KEY ("toOutletId") REFERENCES "outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocktransferitem" ADD CONSTRAINT "stocktransferitem_stockTransferId_fkey" FOREIGN KEY ("stockTransferId") REFERENCES "stocktransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocktransferitem" ADD CONSTRAINT "stocktransferitem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "productvariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channelskumap" ADD CONSTRAINT "channelskumap_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "productvariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orderitem" ADD CONSTRAINT "orderitem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orderitem" ADD CONSTRAINT "orderitem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orderitem" ADD CONSTRAINT "orderitem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "productvariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplaceproduct" ADD CONSTRAINT "marketplaceproduct_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "marketplaceaccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplaceproduct" ADD CONSTRAINT "marketplaceproduct_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "productvariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
