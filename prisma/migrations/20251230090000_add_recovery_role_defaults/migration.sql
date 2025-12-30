-- Add recovery key + mustChangePassword + adjust default role to STAFF
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "recoveryKeyHash" TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- New default for future users
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'STAFF';

-- Optional safety: ensure existing null roles become STAFF (shouldn't happen)
UPDATE "user" SET "role" = 'STAFF' WHERE "role" IS NULL;
