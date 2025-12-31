-- Stock Adjustment + Stock Opname (W1)

CREATE TABLE IF NOT EXISTS "stockadjustment" (
  "id" TEXT NOT NULL,
  "outletId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "deltaQty" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  CONSTRAINT "stockadjustment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "stockadjustment_outletId_idx" ON "stockadjustment"("outletId");
CREATE INDEX IF NOT EXISTS "stockadjustment_variantId_idx" ON "stockadjustment"("variantId");
CREATE INDEX IF NOT EXISTS "stockadjustment_createdAt_idx" ON "stockadjustment"("createdAt");

ALTER TABLE "stockadjustment" ADD CONSTRAINT "stockadjustment_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stockadjustment" ADD CONSTRAINT "stockadjustment_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "productvariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stockadjustment" ADD CONSTRAINT "stockadjustment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "stockopname" (
  "id" TEXT NOT NULL,
  "outletId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  CONSTRAINT "stockopname_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "stockopname_outletId_idx" ON "stockopname"("outletId");
CREATE INDEX IF NOT EXISTS "stockopname_date_idx" ON "stockopname"("date");

ALTER TABLE "stockopname" ADD CONSTRAINT "stockopname_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stockopname" ADD CONSTRAINT "stockopname_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "stockopnameitem" (
  "id" TEXT NOT NULL,
  "stockOpnameId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "systemQty" INTEGER NOT NULL,
  "countedQty" INTEGER NOT NULL,
  "diffQty" INTEGER NOT NULL,
  CONSTRAINT "stockopnameitem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "stockopnameitem_variantId_idx" ON "stockopnameitem"("variantId");
CREATE INDEX IF NOT EXISTS "stockopnameitem_stockOpnameId_idx" ON "stockopnameitem"("stockOpnameId");

ALTER TABLE "stockopnameitem" ADD CONSTRAINT "stockopnameitem_stockOpnameId_fkey" FOREIGN KEY ("stockOpnameId") REFERENCES "stockopname"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stockopnameitem" ADD CONSTRAINT "stockopnameitem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "productvariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
