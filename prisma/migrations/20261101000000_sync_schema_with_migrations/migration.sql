-- Preserve verification state before the legacy column is dropped below.
UPDATE "User" SET "emailVerified" = true WHERE "emailVerifiedAt" IS NOT NULL;

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE', 'GITHUB', 'FACEBOOK', 'APPLE');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('EUR', 'USD', 'GBP', 'CHF');

-- CreateEnum
CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'RETRYING');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApiKeyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ApiKeyTier" AS ENUM ('FREE', 'STARTER', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "ApiKeyScope" AS ENUM ('READ', 'WRITE', 'DELETE', 'ADMIN');

-- CreateEnum
CREATE TYPE "SupportedLanguage" AS ENUM ('FR', 'EN', 'DE', 'ES', 'IT', 'NL');

-- CreateEnum
CREATE TYPE "SponsorTier" AS ENUM ('PLATINUM', 'GOLD', 'SILVER', 'BRONZE', 'PARTNER');

-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('MEDIA', 'TECHNOLOGY', 'TRANSPORT', 'ACCOMMODATION', 'FOOD_BEVERAGE', 'SECURITY', 'MEDICAL', 'ARTIST_AGENCY', 'OTHER');

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_userId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_userId_fkey";

-- AlterTable
ALTER TABLE "Artist" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Festival" ADD COLUMN     "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "NotificationPreference" ADD COLUMN     "emailLanguage" TEXT NOT NULL DEFAULT 'fr';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "convertedAt" TIMESTAMP(3),
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "exchangeRate" DECIMAL(18,8),
ADD COLUMN     "exchangeRateId" TEXT,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "originalAmount" DECIMAL(10,2),
ADD COLUMN     "originalCurrency" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PromoCode" ADD COLUMN     "stackable" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "guestEmail" TEXT,
ADD COLUMN     "guestFirstName" TEXT,
ADD COLUMN     "guestLastName" TEXT,
ADD COLUMN     "guestPhone" TEXT,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isGuest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "transferredAt" TIMESTAMP(3),
ADD COLUMN     "transferredFromUserId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TicketCategory" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "emailVerificationExpires",
DROP COLUMN "emailVerificationToken",
DROP COLUMN "emailVerifiedAt",
ADD COLUMN     "authProvider" "AuthProvider" NOT NULL DEFAULT 'LOCAL',
ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "displayCurrency" TEXT,
ADD COLUMN     "oauthProviderId" TEXT,
ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3),
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorSecret" TEXT,
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeAccountId" TEXT,
ADD COLUMN     "stripeOnboardingComplete" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "VendorOrder" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "baseCurrency" "Currency" NOT NULL DEFAULT 'EUR',
    "targetCurrency" "Currency" NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "inverseRate" DECIMAL(18,8) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'api',
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FestivalCurrencySettings" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "defaultCurrency" "Currency" NOT NULL DEFAULT 'EUR',
    "supportedCurrencies" "Currency"[] DEFAULT ARRAY['EUR']::"Currency"[],
    "displayFormat" TEXT NOT NULL DEFAULT 'symbol',
    "decimalSeparator" TEXT NOT NULL DEFAULT ',',
    "thousandsSeparator" TEXT NOT NULL DEFAULT ' ',
    "symbolPosition" TEXT NOT NULL DEFAULT 'after',
    "autoConvert" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FestivalCurrencySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateAlertSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "festivalId" TEXT,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "alertType" TEXT NOT NULL DEFAULT 'both',
    "threshold" DECIMAL(5,2) NOT NULL DEFAULT 2.0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggered" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateAlertSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Webhook" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "headers" JSONB,
    "description" TEXT,
    "createdById" TEXT,
    "lastTriggeredAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastAttemptAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),
    "responseCode" INTEGER,
    "responseBody" TEXT,
    "responseHeaders" JSONB,
    "errorMessage" TEXT,
    "duration" INTEGER,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    "total" DECIMAL(10,2) NOT NULL,
    "originalCurrency" TEXT,
    "originalSubtotal" DECIMAL(10,2),
    "originalTax" DECIMAL(10,2),
    "originalTotal" DECIMAL(10,2),
    "exchangeRate" DECIMAL(18,8),
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerAddress" TEXT,
    "customerPhone" TEXT,
    "customerVatNumber" TEXT,
    "companyName" TEXT NOT NULL,
    "companyAddress" TEXT NOT NULL,
    "companyVatNumber" TEXT,
    "companyEmail" TEXT,
    "companyPhone" TEXT,
    "taxExempt" BOOLEAN NOT NULL DEFAULT false,
    "reverseCharge" BOOLEAN NOT NULL DEFAULT false,
    "taxCountry" TEXT,
    "paymentId" TEXT,
    "notes" TEXT,
    "internalNotes" TEXT,
    "termsAndConditions" TEXT,
    "metadata" JSONB,
    "pdfUrl" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "taxRate" DECIMAL(5,2),
    "taxAmount" DECIMAL(10,2),
    "itemType" TEXT,
    "itemId" TEXT,
    "metadata" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "tier" "ApiKeyTier" NOT NULL DEFAULT 'FREE',
    "status" "ApiKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "scopes" "ApiKeyScope"[] DEFAULT ARRAY['READ']::"ApiKeyScope"[],
    "permissions" JSONB,
    "description" TEXT,
    "ipWhitelist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "lastUsedIp" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "festivalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FestivalLanguageSettings" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "defaultLanguage" "SupportedLanguage" NOT NULL DEFAULT 'FR',
    "supportedLanguages" "SupportedLanguage"[] DEFAULT ARRAY['FR', 'EN']::"SupportedLanguage"[],
    "autoDetect" BOOLEAN NOT NULL DEFAULT true,
    "fallbackToDefault" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FestivalLanguageSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FestivalLocalizedContent" (
    "id" TEXT NOT NULL,
    "languageSettingsId" TEXT NOT NULL,
    "language" "SupportedLanguage" NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "shortDescription" TEXT,
    "rules" TEXT,
    "welcomeMessage" TEXT,
    "metadata" JSONB,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FestivalLocalizedContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sponsor" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "websiteUrl" TEXT,
    "tier" "SponsorTier" NOT NULL DEFAULT 'PARTNER',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "websiteUrl" TEXT,
    "type" "PartnerType" NOT NULL DEFAULT 'OTHER',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "servicesProvided" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExchangeRate_baseCurrency_targetCurrency_idx" ON "ExchangeRate"("baseCurrency", "targetCurrency");

-- CreateIndex
CREATE INDEX "ExchangeRate_effectiveAt_idx" ON "ExchangeRate"("effectiveAt");

-- CreateIndex
CREATE INDEX "ExchangeRate_isActive_idx" ON "ExchangeRate"("isActive");

-- CreateIndex
CREATE INDEX "ExchangeRate_targetCurrency_isActive_effectiveAt_idx" ON "ExchangeRate"("targetCurrency", "isActive", "effectiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_baseCurrency_targetCurrency_effectiveAt_key" ON "ExchangeRate"("baseCurrency", "targetCurrency", "effectiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "FestivalCurrencySettings_festivalId_key" ON "FestivalCurrencySettings"("festivalId");

-- CreateIndex
CREATE INDEX "FestivalCurrencySettings_festivalId_idx" ON "FestivalCurrencySettings"("festivalId");

-- CreateIndex
CREATE INDEX "RateAlertSubscription_userId_idx" ON "RateAlertSubscription"("userId");

-- CreateIndex
CREATE INDEX "RateAlertSubscription_festivalId_idx" ON "RateAlertSubscription"("festivalId");

-- CreateIndex
CREATE INDEX "RateAlertSubscription_currency_enabled_idx" ON "RateAlertSubscription"("currency", "enabled");

-- CreateIndex
CREATE INDEX "RateAlertSubscription_userId_currency_idx" ON "RateAlertSubscription"("userId", "currency");

-- CreateIndex
CREATE INDEX "Webhook_festivalId_idx" ON "Webhook"("festivalId");

-- CreateIndex
CREATE INDEX "Webhook_isActive_idx" ON "Webhook"("isActive");

-- CreateIndex
CREATE INDEX "Webhook_festivalId_isActive_idx" ON "Webhook"("festivalId", "isActive");

-- CreateIndex
CREATE INDEX "Webhook_events_idx" ON "Webhook"("events");

-- CreateIndex
CREATE UNIQUE INDEX "Webhook_festivalId_url_key" ON "Webhook"("festivalId", "url");

-- CreateIndex
CREATE INDEX "WebhookDelivery_webhookId_idx" ON "WebhookDelivery"("webhookId");

-- CreateIndex
CREATE INDEX "WebhookDelivery_status_idx" ON "WebhookDelivery"("status");

-- CreateIndex
CREATE INDEX "WebhookDelivery_event_idx" ON "WebhookDelivery"("event");

-- CreateIndex
CREATE INDEX "WebhookDelivery_createdAt_idx" ON "WebhookDelivery"("createdAt");

-- CreateIndex
CREATE INDEX "WebhookDelivery_webhookId_status_idx" ON "WebhookDelivery"("webhookId", "status");

-- CreateIndex
CREATE INDEX "WebhookDelivery_status_nextRetryAt_idx" ON "WebhookDelivery"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "WebhookDelivery_webhookId_createdAt_idx" ON "WebhookDelivery"("webhookId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_festivalId_idx" ON "Invoice"("festivalId");

-- CreateIndex
CREATE INDEX "Invoice_userId_idx" ON "Invoice"("userId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_issueDate_idx" ON "Invoice"("issueDate");

-- CreateIndex
CREATE INDEX "Invoice_dueDate_idx" ON "Invoice"("dueDate");

-- CreateIndex
CREATE INDEX "Invoice_festivalId_status_idx" ON "Invoice"("festivalId", "status");

-- CreateIndex
CREATE INDEX "Invoice_userId_status_idx" ON "Invoice"("userId", "status");

-- CreateIndex
CREATE INDEX "Invoice_invoiceNumber_idx" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_paymentId_idx" ON "Invoice"("paymentId");

-- CreateIndex
CREATE INDEX "Invoice_createdAt_idx" ON "Invoice"("createdAt");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceItem_itemType_idx" ON "InvoiceItem"("itemType");

-- CreateIndex
CREATE INDEX "InvoiceItem_itemId_idx" ON "InvoiceItem"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_keyPrefix_idx" ON "ApiKey"("keyPrefix");

-- CreateIndex
CREATE INDEX "ApiKey_status_idx" ON "ApiKey"("status");

-- CreateIndex
CREATE INDEX "ApiKey_tier_idx" ON "ApiKey"("tier");

-- CreateIndex
CREATE INDEX "ApiKey_festivalId_idx" ON "ApiKey"("festivalId");

-- CreateIndex
CREATE INDEX "ApiKey_userId_status_idx" ON "ApiKey"("userId", "status");

-- CreateIndex
CREATE INDEX "ApiKey_status_expiresAt_idx" ON "ApiKey"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "ApiKey_lastUsedAt_idx" ON "ApiKey"("lastUsedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_userId_name_key" ON "ApiKey"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "FestivalLanguageSettings_festivalId_key" ON "FestivalLanguageSettings"("festivalId");

-- CreateIndex
CREATE INDEX "FestivalLanguageSettings_festivalId_idx" ON "FestivalLanguageSettings"("festivalId");

-- CreateIndex
CREATE INDEX "FestivalLocalizedContent_languageSettingsId_idx" ON "FestivalLocalizedContent"("languageSettingsId");

-- CreateIndex
CREATE INDEX "FestivalLocalizedContent_language_idx" ON "FestivalLocalizedContent"("language");

-- CreateIndex
CREATE INDEX "FestivalLocalizedContent_isPublished_idx" ON "FestivalLocalizedContent"("isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "FestivalLocalizedContent_languageSettingsId_language_key" ON "FestivalLocalizedContent"("languageSettingsId", "language");

-- CreateIndex
CREATE INDEX "Sponsor_festivalId_idx" ON "Sponsor"("festivalId");

-- CreateIndex
CREATE INDEX "Sponsor_tier_idx" ON "Sponsor"("tier");

-- CreateIndex
CREATE INDEX "Sponsor_isActive_idx" ON "Sponsor"("isActive");

-- CreateIndex
CREATE INDEX "Sponsor_displayOrder_idx" ON "Sponsor"("displayOrder");

-- CreateIndex
CREATE INDEX "Partner_festivalId_idx" ON "Partner"("festivalId");

-- CreateIndex
CREATE INDEX "Partner_type_idx" ON "Partner"("type");

-- CreateIndex
CREATE INDEX "Partner_isActive_idx" ON "Partner"("isActive");

-- CreateIndex
CREATE INDEX "Partner_displayOrder_idx" ON "Partner"("displayOrder");

-- CreateIndex
CREATE INDEX "Artist_isDeleted_idx" ON "Artist"("isDeleted");

-- CreateIndex
CREATE INDEX "Festival_isFeatured_idx" ON "Festival"("isFeatured");

-- CreateIndex
CREATE INDEX "Payment_isDeleted_idx" ON "Payment"("isDeleted");

-- CreateIndex
CREATE INDEX "Payment_originalCurrency_idx" ON "Payment"("originalCurrency");

-- CreateIndex
CREATE INDEX "Ticket_guestEmail_idx" ON "Ticket"("guestEmail");

-- CreateIndex
CREATE INDEX "Ticket_isGuest_idx" ON "Ticket"("isGuest");

-- CreateIndex
CREATE INDEX "Ticket_transferredFromUserId_idx" ON "Ticket"("transferredFromUserId");

-- CreateIndex
CREATE INDEX "Ticket_isDeleted_idx" ON "Ticket"("isDeleted");

-- CreateIndex
CREATE INDEX "TicketCategory_isDeleted_idx" ON "TicketCategory"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_stripeAccountId_key" ON "Vendor"("stripeAccountId");

-- CreateIndex
CREATE INDEX "Vendor_isDeleted_idx" ON "Vendor"("isDeleted");

-- CreateIndex
CREATE INDEX "Vendor_stripeAccountId_idx" ON "Vendor"("stripeAccountId");

-- CreateIndex
CREATE INDEX "VendorOrder_isDeleted_idx" ON "VendorOrder"("isDeleted");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_transferredFromUserId_fkey" FOREIGN KEY ("transferredFromUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "Webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FestivalLanguageSettings" ADD CONSTRAINT "FestivalLanguageSettings_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FestivalLocalizedContent" ADD CONSTRAINT "FestivalLocalizedContent_languageSettingsId_fkey" FOREIGN KEY ("languageSettingsId") REFERENCES "FestivalLanguageSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsor" ADD CONSTRAINT "Sponsor_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

