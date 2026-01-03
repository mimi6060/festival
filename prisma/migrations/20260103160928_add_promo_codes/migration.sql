-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateTable
CREATE TABLE "PromoCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" "DiscountType" NOT NULL,
    "discountValue" DECIMAL(10,2) NOT NULL,
    "maxUses" INTEGER,
    "currentUses" INTEGER NOT NULL DEFAULT 0,
    "minAmount" DECIMAL(10,2),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "festivalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");

-- CreateIndex
CREATE INDEX "PromoCode_code_idx" ON "PromoCode"("code");

-- CreateIndex
CREATE INDEX "PromoCode_festivalId_idx" ON "PromoCode"("festivalId");

-- CreateIndex
CREATE INDEX "PromoCode_isActive_idx" ON "PromoCode"("isActive");

-- CreateIndex
CREATE INDEX "PromoCode_expiresAt_idx" ON "PromoCode"("expiresAt");

-- AddForeignKey
ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE SET NULL ON UPDATE CASCADE;
