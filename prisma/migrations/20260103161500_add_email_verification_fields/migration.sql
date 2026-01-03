-- AlterTable
-- Add email verification fields to User table
ALTER TABLE "User"
ADD COLUMN "emailVerificationToken" TEXT,
ADD COLUMN "emailVerificationExpires" TIMESTAMP(3),
ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

-- Add comment for documentation
COMMENT ON COLUMN "User"."emailVerificationToken" IS 'Hashed email verification token (SHA-256)';
COMMENT ON COLUMN "User"."emailVerificationExpires" IS 'Token expiration timestamp (24 hours from creation)';
COMMENT ON COLUMN "User"."emailVerifiedAt" IS 'Timestamp when email was verified';
