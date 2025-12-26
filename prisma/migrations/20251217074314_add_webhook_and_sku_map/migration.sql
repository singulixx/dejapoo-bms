/*
  Warnings:

  - You are about to alter the column `size` on the `productvariant` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(0))`.
  - A unique constraint covering the columns `[channel,externalOrderId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `marketplaceaccount` MODIFY `channel` ENUM('SHOPEE', 'TIKTOK', 'OFFLINE_STORE', 'RESELLER') NOT NULL;

-- AlterTable
ALTER TABLE `order` ADD COLUMN `customerName` VARCHAR(191) NULL,
    ADD COLUMN `externalOrderId` VARCHAR(191) NULL,
    ADD COLUMN `note` VARCHAR(191) NULL,
    ADD COLUMN `paymentMethod` ENUM('CASH', 'TRANSFER', 'QRIS') NULL,
    ADD COLUMN `source` ENUM('MANUAL', 'API') NOT NULL DEFAULT 'MANUAL',
    MODIFY `channel` ENUM('SHOPEE', 'TIKTOK', 'OFFLINE_STORE', 'RESELLER') NOT NULL;

-- AlterTable
ALTER TABLE `product` ADD COLUMN `costPrice` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `sellPrice` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `productvariant` MODIFY `size` ENUM('S', 'M', 'L', 'XL', 'XXL') NOT NULL;

-- CreateTable
CREATE TABLE `WebhookEvent` (
    `id` VARCHAR(191) NOT NULL,
    `channel` ENUM('SHOPEE', 'TIKTOK', 'OFFLINE_STORE', 'RESELLER') NOT NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `externalEventId` VARCHAR(191) NULL,
    `externalOrderId` VARCHAR(191) NULL,
    `payloadJson` JSON NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'RECEIVED',
    `errorMessage` VARCHAR(191) NULL,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedAt` DATETIME(3) NULL,

    UNIQUE INDEX `WebhookEvent_idempotencyKey_key`(`idempotencyKey`),
    INDEX `WebhookEvent_channel_idx`(`channel`),
    INDEX `WebhookEvent_receivedAt_idx`(`receivedAt`),
    INDEX `WebhookEvent_externalOrderId_idx`(`externalOrderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChannelSkuMap` (
    `id` VARCHAR(191) NOT NULL,
    `channel` ENUM('SHOPEE', 'TIKTOK', 'OFFLINE_STORE', 'RESELLER') NOT NULL,
    `externalSkuId` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ChannelSkuMap_variantId_idx`(`variantId`),
    UNIQUE INDEX `ChannelSkuMap_channel_externalSkuId_key`(`channel`, `externalSkuId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `metaJson` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_userId_idx`(`userId`),
    INDEX `AuditLog_entity_idx`(`entity`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Order_channel_externalOrderId_key` ON `Order`(`channel`, `externalOrderId`);

-- AddForeignKey
ALTER TABLE `ChannelSkuMap` ADD CONSTRAINT `ChannelSkuMap_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
