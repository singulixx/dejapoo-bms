-- Add user.role column for authorization & tell who did what
-- This migration fixes P2022 "column role does not exist" errors.

ALTER TABLE `user`
  ADD COLUMN `role` VARCHAR(191) NOT NULL DEFAULT 'ADMIN' AFTER `isActive`;

CREATE INDEX `user_role_idx` ON `user`(`role`);
