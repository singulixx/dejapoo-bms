-- CreateTable
CREATE TABLE `AuthSession` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AuthSession_tokenHash_key`(`tokenHash`),
    INDEX `AuthSession_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `category` VARCHAR(191) NOT NULL,
    `imageUrl` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Product_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductVariant` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `size` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NULL,
    `sku` VARCHAR(191) NOT NULL,
    `price` INTEGER NOT NULL,
    `minQty` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProductVariant_sku_key`(`sku`),
    INDEX `ProductVariant_productId_idx`(`productId`),
    INDEX `ProductVariant_sku_idx`(`sku`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Outlet` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('WAREHOUSE', 'OFFLINE_STORE', 'ONLINE') NOT NULL DEFAULT 'WAREHOUSE',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Stock` (
    `id` VARCHAR(191) NOT NULL,
    `outletId` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NOT NULL,
    `qty` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Stock_variantId_idx`(`variantId`),
    INDEX `Stock_outletId_idx`(`outletId`),
    UNIQUE INDEX `Stock_outletId_variantId_key`(`outletId`, `variantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockMovement` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('IN', 'OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT') NOT NULL,
    `outletId` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NOT NULL,
    `qty` INTEGER NOT NULL,
    `refType` VARCHAR(191) NULL,
    `refId` VARCHAR(191) NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StockMovement_variantId_idx`(`variantId`),
    INDEX `StockMovement_outletId_idx`(`outletId`),
    INDEX `StockMovement_createdAt_idx`(`createdAt`),
    INDEX `StockMovement_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockIn` (
    `id` VARCHAR(191) NOT NULL,
    `outletId` VARCHAR(191) NOT NULL,
    `supplier` VARCHAR(191) NULL,
    `date` DATETIME(3) NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockInItem` (
    `id` VARCHAR(191) NOT NULL,
    `stockInId` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NOT NULL,
    `qty` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StockInItem_variantId_idx`(`variantId`),
    INDEX `StockInItem_stockInId_idx`(`stockInId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockTransfer` (
    `id` VARCHAR(191) NOT NULL,
    `fromOutletId` VARCHAR(191) NOT NULL,
    `toOutletId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StockTransfer_fromOutletId_idx`(`fromOutletId`),
    INDEX `StockTransfer_toOutletId_idx`(`toOutletId`),
    INDEX `StockTransfer_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockTransferItem` (
    `id` VARCHAR(191) NOT NULL,
    `stockTransferId` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NOT NULL,
    `qty` INTEGER NOT NULL,

    INDEX `StockTransferItem_variantId_idx`(`variantId`),
    INDEX `StockTransferItem_stockTransferId_idx`(`stockTransferId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Order` (
    `id` VARCHAR(191) NOT NULL,
    `orderCode` VARCHAR(191) NOT NULL,
    `channel` ENUM('SHOPEE', 'TIKTOK', 'OFFLINE_STORE') NOT NULL,
    `outletId` VARCHAR(191) NULL,
    `marketplaceOrderId` VARCHAR(191) NULL,
    `totalAmount` INTEGER NOT NULL,
    `status` ENUM('NEW', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'NEW',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Order_orderCode_key`(`orderCode`),
    INDEX `Order_channel_idx`(`channel`),
    INDEX `Order_outletId_idx`(`outletId`),
    INDEX `Order_createdAt_idx`(`createdAt`),
    INDEX `Order_marketplaceOrderId_idx`(`marketplaceOrderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NOT NULL,
    `qty` INTEGER NOT NULL,
    `price` INTEGER NOT NULL,
    `subtotal` INTEGER NOT NULL,

    INDEX `OrderItem_orderId_idx`(`orderId`),
    INDEX `OrderItem_variantId_idx`(`variantId`),
    INDEX `OrderItem_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketplaceAccount` (
    `id` VARCHAR(191) NOT NULL,
    `channel` ENUM('SHOPEE', 'TIKTOK', 'OFFLINE_STORE') NOT NULL,
    `name` VARCHAR(191) NULL,
    `credentialsEnc` VARCHAR(191) NOT NULL,
    `accessTokenEnc` VARCHAR(191) NULL,
    `refreshTokenEnc` VARCHAR(191) NULL,
    `tokenExpiresAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MarketplaceAccount_channel_idx`(`channel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketplaceProduct` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NOT NULL,
    `marketplaceSku` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MarketplaceProduct_marketplaceSku_idx`(`marketplaceSku`),
    INDEX `MarketplaceProduct_variantId_idx`(`variantId`),
    UNIQUE INDEX `MarketplaceProduct_accountId_variantId_key`(`accountId`, `variantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AuthSession` ADD CONSTRAINT `AuthSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductVariant` ADD CONSTRAINT `ProductVariant_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Stock` ADD CONSTRAINT `Stock_outletId_fkey` FOREIGN KEY (`outletId`) REFERENCES `Outlet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Stock` ADD CONSTRAINT `Stock_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_outletId_fkey` FOREIGN KEY (`outletId`) REFERENCES `Outlet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockIn` ADD CONSTRAINT `StockIn_outletId_fkey` FOREIGN KEY (`outletId`) REFERENCES `Outlet`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockInItem` ADD CONSTRAINT `StockInItem_stockInId_fkey` FOREIGN KEY (`stockInId`) REFERENCES `StockIn`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockInItem` ADD CONSTRAINT `StockInItem_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockTransfer` ADD CONSTRAINT `StockTransfer_fromOutletId_fkey` FOREIGN KEY (`fromOutletId`) REFERENCES `Outlet`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockTransfer` ADD CONSTRAINT `StockTransfer_toOutletId_fkey` FOREIGN KEY (`toOutletId`) REFERENCES `Outlet`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockTransferItem` ADD CONSTRAINT `StockTransferItem_stockTransferId_fkey` FOREIGN KEY (`stockTransferId`) REFERENCES `StockTransfer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockTransferItem` ADD CONSTRAINT `StockTransferItem_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_outletId_fkey` FOREIGN KEY (`outletId`) REFERENCES `Outlet`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketplaceProduct` ADD CONSTRAINT `MarketplaceProduct_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `MarketplaceAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketplaceProduct` ADD CONSTRAINT `MarketplaceProduct_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
