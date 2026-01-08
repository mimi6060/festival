-- Add soft delete fields to User model for GDPR compliance

-- AlterTable
ALTER TABLE "User" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex for performance when filtering soft-deleted users
CREATE INDEX "User_isDeleted_idx" ON "User"("isDeleted");
