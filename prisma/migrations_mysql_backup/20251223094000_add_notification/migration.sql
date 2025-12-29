-- CreateTable
CREATE TABLE `notification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `role` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'INFO',
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NULL,
    `href` VARCHAR(191) NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `readAt` DATETIME(3) NULL,
    `metaJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notification_userId_isRead_createdAt_idx`(`userId`, `isRead`, `createdAt`),
    INDEX `notification_role_isRead_createdAt_idx`(`role`, `isRead`, `createdAt`),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `notification`
ADD CONSTRAINT `notification_userId_fkey`
FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
