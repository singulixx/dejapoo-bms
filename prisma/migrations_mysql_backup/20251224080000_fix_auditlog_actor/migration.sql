-- Expand AuditLog so we can reliably record "who did what".
-- MySQL

-- Make existing columns nullable where needed (older schema required them).
ALTER TABLE `auditlog`
  MODIFY `userId` VARCHAR(191) NULL,
  MODIFY `entity` VARCHAR(191) NULL;

-- Add actor + request context columns.
ALTER TABLE `auditlog`
  ADD COLUMN `username` VARCHAR(191) NULL AFTER `userId`,
  ADD COLUMN `role` VARCHAR(191) NULL AFTER `username`,
  ADD COLUMN `model` VARCHAR(191) NULL AFTER `action`,
  ADD COLUMN `method` VARCHAR(16) NULL AFTER `entityId`,
  ADD COLUMN `path` VARCHAR(191) NULL AFTER `method`,
  ADD COLUMN `ip` VARCHAR(64) NULL AFTER `path`,
  ADD COLUMN `userAgent` VARCHAR(255) NULL AFTER `ip`,
  ADD COLUMN `data` JSON NULL AFTER `userAgent`,
  ADD COLUMN `metadata` JSON NULL AFTER `data`;

-- Helpful indexes for filtering/search.
CREATE INDEX `auditlog_username_idx` ON `auditlog`(`username`);
CREATE INDEX `auditlog_model_idx` ON `auditlog`(`model`);
