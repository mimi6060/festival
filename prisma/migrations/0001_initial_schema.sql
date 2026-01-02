-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'ORGANIZER', 'STAFF', 'CASHIER', 'SECURITY', 'USER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BANNED', 'PENDING_VERIFICATION');

-- CreateEnum
CREATE TYPE "FestivalStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD', 'USED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('STANDARD', 'VIP', 'BACKSTAGE', 'CAMPING', 'PARKING', 'COMBO');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'PAYPAL', 'BANK_TRANSFER', 'CASH');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('TOPUP', 'PAYMENT', 'REFUND', 'TRANSFER', 'CORRECTION');

-- CreateEnum
CREATE TYPE "VendorType" AS ENUM ('FOOD', 'DRINK', 'BAR', 'MERCHANDISE');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VendorPaymentMethod" AS ENUM ('CASHLESS', 'CARD', 'CASH');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TICKET_PURCHASED', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'CASHLESS_TOPUP', 'ARTIST_REMINDER', 'FESTIVAL_UPDATE', 'SCHEDULE_CHANGE', 'SECURITY_ALERT', 'PROMO', 'VENDOR_ORDER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationPlatform" AS ENUM ('IOS', 'ANDROID', 'WEB');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('TICKETS', 'PAYMENTS', 'CASHLESS', 'PROGRAM', 'SECURITY', 'PROMOTIONS', 'VENDOR', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ScheduledNotificationStatus" AS ENUM ('PENDING', 'SENT', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "AccommodationType" AS ENUM ('TENT', 'CARAVAN', 'GLAMPING', 'CABIN', 'CAMPERVAN');

-- CreateEnum
CREATE TYPE "CampingSpotStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ZoneAccessAction" AS ENUM ('ENTRY', 'EXIT');

-- CreateEnum
CREATE TYPE "PoiType" AS ENUM ('STAGE', 'FOOD', 'DRINK', 'TOILET', 'MEDICAL', 'INFO', 'ATM', 'PARKING', 'CAMPING', 'ENTRANCE', 'EXIT', 'CHARGING', 'LOCKER');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "LostItemStatus" AS ENUM ('REPORTED', 'FOUND', 'RETURNED', 'UNCLAIMED');

-- CreateEnum
CREATE TYPE "StaffDepartment" AS ENUM ('SECURITY', 'TICKETING', 'CASHLESS', 'FOOD_BEVERAGE', 'TECHNICAL', 'MEDICAL', 'CLEANING', 'LOGISTICS', 'ARTIST_RELATIONS', 'COMMUNICATIONS', 'VOLUNTEER_COORDINATION', 'GENERAL');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "StaffAccessLevel" AS ENUM ('BASIC', 'STANDARD', 'ELEVATED', 'FULL', 'ADMIN');

-- CreateEnum
CREATE TYPE "PerformanceStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('MARKETING', 'ANALYTICS', 'PERSONALIZATION', 'THIRD_PARTY_SHARING', 'ESSENTIAL');

-- CreateEnum
CREATE TYPE "GdprRequestType" AS ENUM ('DATA_ACCESS', 'DATA_DELETION', 'DATA_RECTIFICATION', 'DATA_PORTABILITY', 'CONSENT_WITHDRAWAL');

-- CreateEnum
CREATE TYPE "GdprRequestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "refreshToken" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Festival" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT NOT NULL,
    "address" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "FestivalStatus" NOT NULL DEFAULT 'DRAFT',
    "maxCapacity" INTEGER NOT NULL,
    "currentAttendees" INTEGER NOT NULL DEFAULT 0,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "websiteUrl" TEXT,
    "contactEmail" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Festival_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketCategory" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "TicketType" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "quota" INTEGER NOT NULL,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "maxPerUser" INTEGER NOT NULL DEFAULT 4,
    "saleStartDate" TIMESTAMP(3) NOT NULL,
    "saleEndDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "qrCode" TEXT NOT NULL,
    "qrCodeData" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'SOLD',
    "purchasePrice" DECIMAL(10,2) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedByStaffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paymentId" TEXT,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "PaymentProvider" NOT NULL,
    "providerPaymentId" TEXT,
    "providerData" JSONB,
    "description" TEXT,
    "metadata" JSONB,
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashlessAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "nfcTagId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashlessAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashlessTransaction" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "balanceBefore" DECIMAL(10,2) NOT NULL,
    "balanceAfter" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "paymentId" TEXT,
    "performedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashlessTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "capacity" INTEGER,
    "currentOccupancy" INTEGER NOT NULL DEFAULT 0,
    "requiresTicketType" "TicketType"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZoneAccessLog" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "action" "ZoneAccessAction" NOT NULL,
    "performedById" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZoneAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "zoneId" TEXT,
    "role" "UserRole" NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genre" TEXT,
    "bio" TEXT,
    "imageUrl" TEXT,
    "spotifyUrl" TEXT,
    "instagramUrl" TEXT,
    "websiteUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stage" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "capacity" INTEGER,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Performance" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Performance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapPoi" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PoiType" NOT NULL,
    "description" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "iconUrl" TEXT,
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapPoi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "festivalId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "data" JSONB,
    "imageUrl" TEXT,
    "actionUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" "NotificationPlatform" NOT NULL,
    "deviceName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "enabledCategories" "NotificationCategory"[] DEFAULT ARRAY['TICKETS', 'PAYMENTS', 'CASHLESS', 'PROGRAM', 'SECURITY', 'SYSTEM']::"NotificationCategory"[],
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledNotification" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "data" JSONB,
    "imageUrl" TEXT,
    "actionUrl" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "ScheduledNotificationStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "targetAll" BOOLEAN NOT NULL DEFAULT false,
    "targetUserIds" TEXT[],
    "targetRoles" "UserRole"[],
    "targetTicketTypes" "TicketType"[],
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "titleTemplate" TEXT NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "defaultImageUrl" TEXT,
    "defaultActionUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "VendorType" NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "location" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "openingHours" JSONB,
    "qrMenuCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorProduct" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "category" TEXT,
    "imageUrl" TEXT,
    "stock" INTEGER,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "allergens" TEXT[],
    "options" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "category" TEXT,
    "imageUrl" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "commission" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "VendorPaymentMethod" NOT NULL DEFAULT 'CASHLESS',
    "cashlessTransactionId" TEXT,
    "notes" TEXT,
    "estimatedReadyAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "options" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorPayout" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "commission" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(10,2) NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "bankAccount" TEXT,
    "bankName" TEXT,
    "reference" TEXT,
    "processedAt" TIMESTAMP(3),
    "processedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaqCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaqCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaqItem" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaqItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "festivalId" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isStaff" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LostItem" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "reportedBy" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "status" "LostItemStatus" NOT NULL DEFAULT 'REPORTED',
    "foundBy" TEXT,
    "contactInfo" TEXT,
    "imageUrl" TEXT,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LostItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampingZone" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "AccommodationType" NOT NULL,
    "capacity" INTEGER NOT NULL,
    "pricePerNight" DECIMAL(10,2) NOT NULL,
    "amenities" TEXT[],
    "rules" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampingZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampingSpot" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "CampingSpotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "size" TEXT,
    "electricityHook" BOOLEAN NOT NULL DEFAULT false,
    "waterHook" BOOLEAN NOT NULL DEFAULT false,
    "maxVehicleLength" DOUBLE PRECISION,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampingSpot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampingBooking" (
    "id" TEXT NOT NULL,
    "bookingNumber" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "guestCount" INTEGER NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "vehiclePlate" TEXT,
    "vehicleType" TEXT,
    "qrCode" TEXT,
    "qrCodeData" TEXT,
    "notes" TEXT,
    "staffNotes" TEXT,
    "paymentId" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "checkedInBy" TEXT,
    "checkedOutAt" TIMESTAMP(3),
    "checkedOutBy" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampingBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[],
    "accessLevel" "StaffAccessLevel" NOT NULL DEFAULT 'STANDARD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "department" "StaffDepartment" NOT NULL DEFAULT 'GENERAL',
    "employeeCode" TEXT,
    "phone" TEXT,
    "emergencyContact" JSONB,
    "badgeNumber" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffShift" (
    "id" TEXT NOT NULL,
    "staffMemberId" TEXT NOT NULL,
    "zoneId" TEXT,
    "title" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "breakDuration" INTEGER NOT NULL DEFAULT 0,
    "status" "ShiftStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffCheckIn" (
    "id" TEXT NOT NULL,
    "staffMemberId" TEXT NOT NULL,
    "shiftId" TEXT,
    "checkInTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkOutTime" TIMESTAMP(3),
    "location" TEXT,
    "checkInMethod" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavoriteArtist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "festivalId" TEXT,
    "notifyMe" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteArtist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ConsentType" NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT false,
    "grantedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GdprRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "GdprRequestType" NOT NULL,
    "status" "GdprRequestStatus" NOT NULL DEFAULT 'PENDING',
    "details" TEXT,
    "format" TEXT,
    "downloadUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GdprRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceInfo" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "User_lastLoginAt_idx" ON "User"("lastLoginAt");

-- CreateIndex
CREATE UNIQUE INDEX "Festival_slug_key" ON "Festival"("slug");

-- CreateIndex
CREATE INDEX "Festival_organizerId_idx" ON "Festival"("organizerId");

-- CreateIndex
CREATE INDEX "Festival_slug_idx" ON "Festival"("slug");

-- CreateIndex
CREATE INDEX "Festival_status_idx" ON "Festival"("status");

-- CreateIndex
CREATE INDEX "Festival_startDate_endDate_idx" ON "Festival"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "Festival_isDeleted_idx" ON "Festival"("isDeleted");

-- CreateIndex
CREATE INDEX "TicketCategory_festivalId_idx" ON "TicketCategory"("festivalId");

-- CreateIndex
CREATE INDEX "TicketCategory_type_idx" ON "TicketCategory"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_qrCode_key" ON "Ticket"("qrCode");

-- CreateIndex
CREATE INDEX "Ticket_festivalId_idx" ON "Ticket"("festivalId");

-- CreateIndex
CREATE INDEX "Ticket_userId_idx" ON "Ticket"("userId");

-- CreateIndex
CREATE INDEX "Ticket_qrCode_idx" ON "Ticket"("qrCode");

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

-- CreateIndex
CREATE INDEX "Ticket_festivalId_status_idx" ON "Ticket"("festivalId", "status");

-- CreateIndex
CREATE INDEX "Ticket_festivalId_categoryId_idx" ON "Ticket"("festivalId", "categoryId");

-- CreateIndex
CREATE INDEX "Ticket_festivalId_createdAt_idx" ON "Ticket"("festivalId", "createdAt");

-- CreateIndex
CREATE INDEX "Ticket_userId_status_idx" ON "Ticket"("userId", "status");

-- CreateIndex
CREATE INDEX "Ticket_categoryId_status_idx" ON "Ticket"("categoryId", "status");

-- CreateIndex
CREATE INDEX "Ticket_createdAt_idx" ON "Ticket"("createdAt");

-- CreateIndex
CREATE INDEX "Ticket_paymentId_idx" ON "Ticket"("paymentId");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_providerPaymentId_idx" ON "Payment"("providerPaymentId");

-- CreateIndex
CREATE INDEX "Payment_userId_status_idx" ON "Payment"("userId", "status");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_provider_status_idx" ON "Payment"("provider", "status");

-- CreateIndex
CREATE INDEX "Payment_paidAt_idx" ON "Payment"("paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "CashlessAccount_userId_key" ON "CashlessAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CashlessAccount_nfcTagId_key" ON "CashlessAccount"("nfcTagId");

-- CreateIndex
CREATE INDEX "CashlessAccount_nfcTagId_idx" ON "CashlessAccount"("nfcTagId");

-- CreateIndex
CREATE UNIQUE INDEX "CashlessTransaction_paymentId_key" ON "CashlessTransaction"("paymentId");

-- CreateIndex
CREATE INDEX "CashlessTransaction_accountId_idx" ON "CashlessTransaction"("accountId");

-- CreateIndex
CREATE INDEX "CashlessTransaction_festivalId_idx" ON "CashlessTransaction"("festivalId");

-- CreateIndex
CREATE INDEX "CashlessTransaction_type_idx" ON "CashlessTransaction"("type");

-- CreateIndex
CREATE INDEX "CashlessTransaction_createdAt_idx" ON "CashlessTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "CashlessTransaction_festivalId_type_idx" ON "CashlessTransaction"("festivalId", "type");

-- CreateIndex
CREATE INDEX "CashlessTransaction_festivalId_createdAt_idx" ON "CashlessTransaction"("festivalId", "createdAt");

-- CreateIndex
CREATE INDEX "CashlessTransaction_festivalId_type_createdAt_idx" ON "CashlessTransaction"("festivalId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "CashlessTransaction_accountId_createdAt_idx" ON "CashlessTransaction"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "CashlessTransaction_performedById_idx" ON "CashlessTransaction"("performedById");

-- CreateIndex
CREATE INDEX "Zone_festivalId_idx" ON "Zone"("festivalId");

-- CreateIndex
CREATE INDEX "ZoneAccessLog_zoneId_idx" ON "ZoneAccessLog"("zoneId");

-- CreateIndex
CREATE INDEX "ZoneAccessLog_ticketId_idx" ON "ZoneAccessLog"("ticketId");

-- CreateIndex
CREATE INDEX "ZoneAccessLog_timestamp_idx" ON "ZoneAccessLog"("timestamp");

-- CreateIndex
CREATE INDEX "ZoneAccessLog_zoneId_timestamp_idx" ON "ZoneAccessLog"("zoneId", "timestamp");

-- CreateIndex
CREATE INDEX "StaffAssignment_userId_idx" ON "StaffAssignment"("userId");

-- CreateIndex
CREATE INDEX "StaffAssignment_festivalId_idx" ON "StaffAssignment"("festivalId");

-- CreateIndex
CREATE INDEX "StaffAssignment_zoneId_idx" ON "StaffAssignment"("zoneId");

-- CreateIndex
CREATE INDEX "Artist_name_idx" ON "Artist"("name");

-- CreateIndex
CREATE INDEX "Artist_genre_idx" ON "Artist"("genre");

-- CreateIndex
CREATE INDEX "Stage_festivalId_idx" ON "Stage"("festivalId");

-- CreateIndex
CREATE UNIQUE INDEX "Stage_festivalId_name_key" ON "Stage"("festivalId", "name");

-- CreateIndex
CREATE INDEX "Performance_artistId_idx" ON "Performance"("artistId");

-- CreateIndex
CREATE INDEX "Performance_stageId_idx" ON "Performance"("stageId");

-- CreateIndex
CREATE INDEX "Performance_startTime_idx" ON "Performance"("startTime");

-- CreateIndex
CREATE INDEX "Performance_stageId_startTime_idx" ON "Performance"("stageId", "startTime");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "MapPoi_festivalId_idx" ON "MapPoi"("festivalId");

-- CreateIndex
CREATE INDEX "MapPoi_type_idx" ON "MapPoi"("type");

-- CreateIndex
CREATE INDEX "MapPoi_latitude_longitude_idx" ON "MapPoi"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_festivalId_idx" ON "Notification"("festivalId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_token_key" ON "PushToken"("token");

-- CreateIndex
CREATE INDEX "PushToken_userId_idx" ON "PushToken"("userId");

-- CreateIndex
CREATE INDEX "PushToken_token_idx" ON "PushToken"("token");

-- CreateIndex
CREATE INDEX "PushToken_platform_idx" ON "PushToken"("platform");

-- CreateIndex
CREATE INDEX "PushToken_isActive_idx" ON "PushToken"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_userId_token_key" ON "PushToken"("userId", "token");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "ScheduledNotification_festivalId_idx" ON "ScheduledNotification"("festivalId");

-- CreateIndex
CREATE INDEX "ScheduledNotification_status_idx" ON "ScheduledNotification"("status");

-- CreateIndex
CREATE INDEX "ScheduledNotification_scheduledFor_idx" ON "ScheduledNotification"("scheduledFor");

-- CreateIndex
CREATE INDEX "ScheduledNotification_createdById_idx" ON "ScheduledNotification"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_name_key" ON "NotificationTemplate"("name");

-- CreateIndex
CREATE INDEX "NotificationTemplate_type_idx" ON "NotificationTemplate"("type");

-- CreateIndex
CREATE INDEX "NotificationTemplate_isActive_idx" ON "NotificationTemplate"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_qrMenuCode_key" ON "Vendor"("qrMenuCode");

-- CreateIndex
CREATE INDEX "Vendor_festivalId_idx" ON "Vendor"("festivalId");

-- CreateIndex
CREATE INDEX "Vendor_ownerId_idx" ON "Vendor"("ownerId");

-- CreateIndex
CREATE INDEX "Vendor_type_idx" ON "Vendor"("type");

-- CreateIndex
CREATE INDEX "Vendor_isOpen_idx" ON "Vendor"("isOpen");

-- CreateIndex
CREATE INDEX "Vendor_isActive_idx" ON "Vendor"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_festivalId_name_key" ON "Vendor"("festivalId", "name");

-- CreateIndex
CREATE INDEX "VendorProduct_vendorId_idx" ON "VendorProduct"("vendorId");

-- CreateIndex
CREATE INDEX "VendorProduct_category_idx" ON "VendorProduct"("category");

-- CreateIndex
CREATE INDEX "VendorProduct_isAvailable_idx" ON "VendorProduct"("isAvailable");

-- CreateIndex
CREATE INDEX "VendorProduct_sortOrder_idx" ON "VendorProduct"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "VendorProduct_vendorId_name_key" ON "VendorProduct"("vendorId", "name");

-- CreateIndex
CREATE INDEX "MenuItem_vendorId_idx" ON "MenuItem"("vendorId");

-- CreateIndex
CREATE INDEX "MenuItem_category_idx" ON "MenuItem"("category");

-- CreateIndex
CREATE INDEX "MenuItem_isAvailable_idx" ON "MenuItem"("isAvailable");

-- CreateIndex
CREATE UNIQUE INDEX "VendorOrder_orderNumber_key" ON "VendorOrder"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "VendorOrder_cashlessTransactionId_key" ON "VendorOrder"("cashlessTransactionId");

-- CreateIndex
CREATE INDEX "VendorOrder_vendorId_idx" ON "VendorOrder"("vendorId");

-- CreateIndex
CREATE INDEX "VendorOrder_userId_idx" ON "VendorOrder"("userId");

-- CreateIndex
CREATE INDEX "VendorOrder_status_idx" ON "VendorOrder"("status");

-- CreateIndex
CREATE INDEX "VendorOrder_createdAt_idx" ON "VendorOrder"("createdAt");

-- CreateIndex
CREATE INDEX "VendorOrder_orderNumber_idx" ON "VendorOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "VendorOrder_paymentMethod_idx" ON "VendorOrder"("paymentMethod");

-- CreateIndex
CREATE INDEX "VendorOrder_vendorId_status_idx" ON "VendorOrder"("vendorId", "status");

-- CreateIndex
CREATE INDEX "VendorOrder_vendorId_createdAt_idx" ON "VendorOrder"("vendorId", "createdAt");

-- CreateIndex
CREATE INDEX "VendorOrder_vendorId_status_createdAt_idx" ON "VendorOrder"("vendorId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "VendorOrder_userId_createdAt_idx" ON "VendorOrder"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "VendorOrder_status_createdAt_idx" ON "VendorOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "VendorOrderItem_orderId_idx" ON "VendorOrderItem"("orderId");

-- CreateIndex
CREATE INDEX "VendorOrderItem_productId_idx" ON "VendorOrderItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorPayout_reference_key" ON "VendorPayout"("reference");

-- CreateIndex
CREATE INDEX "VendorPayout_vendorId_idx" ON "VendorPayout"("vendorId");

-- CreateIndex
CREATE INDEX "VendorPayout_status_idx" ON "VendorPayout"("status");

-- CreateIndex
CREATE INDEX "VendorPayout_periodStart_periodEnd_idx" ON "VendorPayout"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "VendorPayout_createdAt_idx" ON "VendorPayout"("createdAt");

-- CreateIndex
CREATE INDEX "FaqCategory_order_idx" ON "FaqCategory"("order");

-- CreateIndex
CREATE INDEX "FaqItem_categoryId_idx" ON "FaqItem"("categoryId");

-- CreateIndex
CREATE INDEX "FaqItem_order_idx" ON "FaqItem"("order");

-- CreateIndex
CREATE INDEX "FaqItem_isActive_idx" ON "FaqItem"("isActive");

-- CreateIndex
CREATE INDEX "SupportTicket_userId_idx" ON "SupportTicket"("userId");

-- CreateIndex
CREATE INDEX "SupportTicket_festivalId_idx" ON "SupportTicket"("festivalId");

-- CreateIndex
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");

-- CreateIndex
CREATE INDEX "SupportTicket_priority_idx" ON "SupportTicket"("priority");

-- CreateIndex
CREATE INDEX "SupportTicket_createdAt_idx" ON "SupportTicket"("createdAt");

-- CreateIndex
CREATE INDEX "SupportMessage_ticketId_idx" ON "SupportMessage"("ticketId");

-- CreateIndex
CREATE INDEX "SupportMessage_senderId_idx" ON "SupportMessage"("senderId");

-- CreateIndex
CREATE INDEX "SupportMessage_createdAt_idx" ON "SupportMessage"("createdAt");

-- CreateIndex
CREATE INDEX "LostItem_festivalId_idx" ON "LostItem"("festivalId");

-- CreateIndex
CREATE INDEX "LostItem_reportedBy_idx" ON "LostItem"("reportedBy");

-- CreateIndex
CREATE INDEX "LostItem_status_idx" ON "LostItem"("status");

-- CreateIndex
CREATE INDEX "LostItem_createdAt_idx" ON "LostItem"("createdAt");

-- CreateIndex
CREATE INDEX "CampingZone_festivalId_idx" ON "CampingZone"("festivalId");

-- CreateIndex
CREATE INDEX "CampingZone_type_idx" ON "CampingZone"("type");

-- CreateIndex
CREATE INDEX "CampingZone_isActive_idx" ON "CampingZone"("isActive");

-- CreateIndex
CREATE INDEX "CampingZone_sortOrder_idx" ON "CampingZone"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CampingZone_festivalId_name_key" ON "CampingZone"("festivalId", "name");

-- CreateIndex
CREATE INDEX "CampingSpot_zoneId_idx" ON "CampingSpot"("zoneId");

-- CreateIndex
CREATE INDEX "CampingSpot_status_idx" ON "CampingSpot"("status");

-- CreateIndex
CREATE INDEX "CampingSpot_isActive_idx" ON "CampingSpot"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CampingSpot_zoneId_number_key" ON "CampingSpot"("zoneId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "CampingBooking_bookingNumber_key" ON "CampingBooking"("bookingNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CampingBooking_qrCode_key" ON "CampingBooking"("qrCode");

-- CreateIndex
CREATE INDEX "CampingBooking_spotId_idx" ON "CampingBooking"("spotId");

-- CreateIndex
CREATE INDEX "CampingBooking_userId_idx" ON "CampingBooking"("userId");

-- CreateIndex
CREATE INDEX "CampingBooking_status_idx" ON "CampingBooking"("status");

-- CreateIndex
CREATE INDEX "CampingBooking_checkIn_checkOut_idx" ON "CampingBooking"("checkIn", "checkOut");

-- CreateIndex
CREATE INDEX "CampingBooking_bookingNumber_idx" ON "CampingBooking"("bookingNumber");

-- CreateIndex
CREATE INDEX "CampingBooking_qrCode_idx" ON "CampingBooking"("qrCode");

-- CreateIndex
CREATE INDEX "CampingBooking_vehiclePlate_idx" ON "CampingBooking"("vehiclePlate");

-- CreateIndex
CREATE UNIQUE INDEX "StaffRole_name_key" ON "StaffRole"("name");

-- CreateIndex
CREATE INDEX "StaffRole_name_idx" ON "StaffRole"("name");

-- CreateIndex
CREATE INDEX "StaffRole_accessLevel_idx" ON "StaffRole"("accessLevel");

-- CreateIndex
CREATE UNIQUE INDEX "StaffMember_badgeNumber_key" ON "StaffMember"("badgeNumber");

-- CreateIndex
CREATE INDEX "StaffMember_userId_idx" ON "StaffMember"("userId");

-- CreateIndex
CREATE INDEX "StaffMember_festivalId_idx" ON "StaffMember"("festivalId");

-- CreateIndex
CREATE INDEX "StaffMember_roleId_idx" ON "StaffMember"("roleId");

-- CreateIndex
CREATE INDEX "StaffMember_department_idx" ON "StaffMember"("department");

-- CreateIndex
CREATE INDEX "StaffMember_badgeNumber_idx" ON "StaffMember"("badgeNumber");

-- CreateIndex
CREATE INDEX "StaffMember_isActive_idx" ON "StaffMember"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "StaffMember_userId_festivalId_key" ON "StaffMember"("userId", "festivalId");

-- CreateIndex
CREATE INDEX "StaffShift_staffMemberId_idx" ON "StaffShift"("staffMemberId");

-- CreateIndex
CREATE INDEX "StaffShift_zoneId_idx" ON "StaffShift"("zoneId");

-- CreateIndex
CREATE INDEX "StaffShift_startTime_idx" ON "StaffShift"("startTime");

-- CreateIndex
CREATE INDEX "StaffShift_endTime_idx" ON "StaffShift"("endTime");

-- CreateIndex
CREATE INDEX "StaffShift_status_idx" ON "StaffShift"("status");

-- CreateIndex
CREATE INDEX "StaffShift_staffMemberId_startTime_idx" ON "StaffShift"("staffMemberId", "startTime");

-- CreateIndex
CREATE INDEX "StaffCheckIn_staffMemberId_idx" ON "StaffCheckIn"("staffMemberId");

-- CreateIndex
CREATE INDEX "StaffCheckIn_shiftId_idx" ON "StaffCheckIn"("shiftId");

-- CreateIndex
CREATE INDEX "StaffCheckIn_checkInTime_idx" ON "StaffCheckIn"("checkInTime");

-- CreateIndex
CREATE INDEX "StaffCheckIn_staffMemberId_checkInTime_idx" ON "StaffCheckIn"("staffMemberId", "checkInTime");

-- CreateIndex
CREATE INDEX "FavoriteArtist_userId_idx" ON "FavoriteArtist"("userId");

-- CreateIndex
CREATE INDEX "FavoriteArtist_artistId_idx" ON "FavoriteArtist"("artistId");

-- CreateIndex
CREATE INDEX "FavoriteArtist_festivalId_idx" ON "FavoriteArtist"("festivalId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteArtist_userId_artistId_festivalId_key" ON "FavoriteArtist"("userId", "artistId", "festivalId");

-- CreateIndex
CREATE INDEX "UserConsent_userId_idx" ON "UserConsent"("userId");

-- CreateIndex
CREATE INDEX "UserConsent_type_idx" ON "UserConsent"("type");

-- CreateIndex
CREATE INDEX "UserConsent_granted_idx" ON "UserConsent"("granted");

-- CreateIndex
CREATE UNIQUE INDEX "UserConsent_userId_type_key" ON "UserConsent"("userId", "type");

-- CreateIndex
CREATE INDEX "GdprRequest_userId_idx" ON "GdprRequest"("userId");

-- CreateIndex
CREATE INDEX "GdprRequest_type_idx" ON "GdprRequest"("type");

-- CreateIndex
CREATE INDEX "GdprRequest_status_idx" ON "GdprRequest"("status");

-- CreateIndex
CREATE INDEX "GdprRequest_createdAt_idx" ON "GdprRequest"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_isActive_idx" ON "Session"("isActive");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- AddForeignKey
ALTER TABLE "Festival" ADD CONSTRAINT "Festival_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketCategory" ADD CONSTRAINT "TicketCategory_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TicketCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashlessAccount" ADD CONSTRAINT "CashlessAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashlessTransaction" ADD CONSTRAINT "CashlessTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CashlessAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashlessTransaction" ADD CONSTRAINT "CashlessTransaction_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashlessTransaction" ADD CONSTRAINT "CashlessTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoneAccessLog" ADD CONSTRAINT "ZoneAccessLog_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoneAccessLog" ADD CONSTRAINT "ZoneAccessLog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Performance" ADD CONSTRAINT "Performance_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Performance" ADD CONSTRAINT "Performance_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapPoi" ADD CONSTRAINT "MapPoi_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorProduct" ADD CONSTRAINT "VendorProduct_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorOrder" ADD CONSTRAINT "VendorOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorOrder" ADD CONSTRAINT "VendorOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorOrderItem" ADD CONSTRAINT "VendorOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "VendorOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorOrderItem" ADD CONSTRAINT "VendorOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "VendorProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPayout" ADD CONSTRAINT "VendorPayout_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaqItem" ADD CONSTRAINT "FaqItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FaqCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampingZone" ADD CONSTRAINT "CampingZone_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampingSpot" ADD CONSTRAINT "CampingSpot_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "CampingZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampingBooking" ADD CONSTRAINT "CampingBooking_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "CampingSpot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampingBooking" ADD CONSTRAINT "CampingBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "StaffRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffShift" ADD CONSTRAINT "StaffShift_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffShift" ADD CONSTRAINT "StaffShift_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffCheckIn" ADD CONSTRAINT "StaffCheckIn_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffCheckIn" ADD CONSTRAINT "StaffCheckIn_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "StaffShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteArtist" ADD CONSTRAINT "FavoriteArtist_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConsent" ADD CONSTRAINT "UserConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GdprRequest" ADD CONSTRAINT "GdprRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

