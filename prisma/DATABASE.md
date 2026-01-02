# Festival Platform - Database Schema Documentation

## Overview

This document provides comprehensive documentation for the Festival Management Platform database schema. The platform is designed to handle 10,000 to 500,000 users across multiple simultaneous festival events.

**Version:** 2.0.0
**Last Updated:** 2026-01-02
**Database:** PostgreSQL 15+

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Core Models](#core-models)
4. [Business Logic](#business-logic)
5. [Performance Optimizations](#performance-optimizations)
6. [Security & Compliance](#security--compliance)
7. [Migration Guide](#migration-guide)

---

## Architecture Overview

### Multi-Tenant Design

The platform uses a **single-database, multi-tenant architecture** where festivals are isolated by `organizerId`. All festival-scoped queries must include the appropriate `festivalId` filter.

```
User (Organizer) --> Festival --> [Tickets, Zones, Vendors, etc.]
```

### Key Design Principles

1. **Soft Deletes**: Critical entities (Festival, User) support soft deletion via `isDeleted` flag
2. **Audit Trail**: All important actions are logged to `AuditLog`
3. **GDPR Compliance**: User consent tracking and data request handling
4. **High-Volume Optimization**: Composite indexes for QR scanning and cashless transactions

---

## Entity Relationship Diagram

```
                                    +----------------+
                                    |     User       |
                                    +-------+--------+
                                            |
            +-------------------------------+-------------------------------+
            |                               |                               |
    +-------v--------+             +--------v-------+              +--------v-------+
    |    Festival    |             |    Payment     |              |   Session      |
    +-------+--------+             +----------------+              +----------------+
            |
    +-------+-------+-------+-------+-------+-------+
    |       |       |       |       |       |       |
+---v--+ +--v--+ +--v--+ +--v---+ +-v--+ +--v--+ +--v---+
|Ticket| |Zone | |Vendor| |Stage | |Camp| |Staff| |MapPOI|
|Categ.| |     | |      | |      | |Zone| |Member|       |
+--+---+ +--+--+ +--+---+ +--+---+ +--+-+ +--+--+ +------+
   |        |       |        |       |       |
   v        v       v        v       v       v
Ticket   Access   Product  Perform. Spot   Shift
         Log               ance    Booking CheckIn
```

---

## Core Models

### User Management

#### User
The central user entity supporting multiple roles (RBAC).

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| email | String | Unique, login identifier |
| passwordHash | String | bcrypt hashed password |
| firstName | String | User's first name |
| lastName | String | User's last name |
| phone | String? | Optional phone number |
| role | UserRole | ADMIN, ORGANIZER, STAFF, CASHIER, SECURITY, USER |
| status | UserStatus | ACTIVE, INACTIVE, BANNED, PENDING_VERIFICATION |
| emailVerified | Boolean | Email verification status |
| lastLoginAt | DateTime? | Last successful login |

**Key Indexes:**
- `email` - Login lookup
- `[role, status]` - Admin user management views
- `[firstName, lastName]` - Name search

#### Session
Active user sessions for security tracking.

| Field | Type | Description |
|-------|------|-------------|
| userId | String | Foreign key to User |
| token | String | Unique session token |
| ipAddress | String? | Client IP address |
| userAgent | String? | Browser/client info |
| isActive | Boolean | Session validity |
| expiresAt | DateTime | Session expiration |

---

### Festival Management

#### Festival
Core multi-tenant entity representing a festival event.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| organizerId | String | FK to User (organizer) |
| name | String | Festival name |
| slug | String | URL-friendly identifier |
| location | String | Venue/city name |
| startDate | DateTime | Festival start |
| endDate | DateTime | Festival end |
| status | FestivalStatus | DRAFT, PUBLISHED, ONGOING, COMPLETED, CANCELLED |
| maxCapacity | Int | Maximum attendee capacity |
| currentAttendees | Int | Current count |
| timezone | String | Festival timezone (default: Europe/Paris) |
| currency | String | Currency code (default: EUR) |
| isDeleted | Boolean | Soft delete flag |

**Key Indexes:**
- `slug` - URL lookup
- `[organizerId, status]` - Organizer dashboard
- `[status, isDeleted]` - Active festivals filter

---

### Ticketing System

#### TicketCategory
Defines ticket types and pricing for a festival.

| Field | Type | Description |
|-------|------|-------------|
| festivalId | String | FK to Festival |
| name | String | Category name |
| type | TicketType | STANDARD, VIP, BACKSTAGE, CAMPING, PARKING, COMBO |
| price | Decimal | Ticket price |
| quota | Int | Maximum available |
| soldCount | Int | Current sold count |
| maxPerUser | Int | Limit per customer |
| saleStartDate | DateTime | Sales open |
| saleEndDate | DateTime | Sales close |

#### Ticket
Individual ticket instance.

| Field | Type | Description |
|-------|------|-------------|
| festivalId | String | FK to Festival |
| categoryId | String | FK to TicketCategory |
| userId | String | FK to User (owner) |
| qrCode | String | Unique QR code (scanning) |
| status | TicketStatus | AVAILABLE, RESERVED, SOLD, USED, CANCELLED, REFUNDED |
| purchasePrice | Decimal | Price at purchase |
| usedAt | DateTime? | Entry scan timestamp |

**Critical Indexes for Scanning:**
- `qrCode` - QR code lookup (< 10ms target)
- `[festivalId, usedAt]` - Entry flow analysis

---

### Payment & Cashless

#### Payment
Payment transaction with provider integration.

| Field | Type | Description |
|-------|------|-------------|
| userId | String | FK to User |
| amount | Decimal | Transaction amount |
| currency | String | Currency code |
| status | PaymentStatus | PENDING, PROCESSING, COMPLETED, FAILED, REFUNDED, CANCELLED |
| provider | PaymentProvider | STRIPE, PAYPAL, BANK_TRANSFER, CASH |
| providerPaymentId | String? | External payment ID |
| paidAt | DateTime? | Completion timestamp |

**Key Indexes:**
- `providerPaymentId` - Webhook processing
- `[userId, status]` - User payment history

#### CashlessAccount
Prepaid wallet for festival cashless system.

| Field | Type | Description |
|-------|------|-------------|
| userId | String | FK to User (unique) |
| balance | Decimal | Current balance |
| nfcTagId | String? | NFC wristband ID |
| isActive | Boolean | Account status |

**Critical Index:**
- `nfcTagId` - NFC scan lookup (real-time)

#### CashlessTransaction
Individual cashless payment transaction.

| Field | Type | Description |
|-------|------|-------------|
| accountId | String | FK to CashlessAccount |
| festivalId | String | FK to Festival |
| type | TransactionType | TOPUP, PAYMENT, REFUND, TRANSFER, CORRECTION |
| amount | Decimal | Transaction amount |
| balanceBefore | Decimal | Balance snapshot |
| balanceAfter | Decimal | Balance after |

**Key Indexes for Analytics:**
- `[festivalId, type, createdAt]` - Full analytics queries
- `[accountId, createdAt]` - User transaction history

---

### Zone & Access Control

#### Zone
Access-controlled areas within a festival.

| Field | Type | Description |
|-------|------|-------------|
| festivalId | String | FK to Festival |
| name | String | Zone name |
| capacity | Int? | Maximum capacity |
| currentOccupancy | Int | Real-time count |
| requiresTicketType | TicketType[] | Required ticket types |

#### ZoneAccessLog
Entry/exit tracking for capacity management.

| Field | Type | Description |
|-------|------|-------------|
| zoneId | String | FK to Zone |
| ticketId | String | FK to Ticket |
| action | ZoneAccessAction | ENTRY, EXIT |
| timestamp | DateTime | Event timestamp |

---

### Vendor System

#### Vendor
Food, drink, or merchandise vendor.

| Field | Type | Description |
|-------|------|-------------|
| festivalId | String | FK to Festival |
| ownerId | String | FK to User |
| name | String | Vendor name |
| type | VendorType | FOOD, DRINK, BAR, MERCHANDISE |
| commissionRate | Decimal | Platform commission % |
| isOpen | Boolean | Currently open |

#### VendorOrder
Customer order at vendor.

| Field | Type | Description |
|-------|------|-------------|
| orderNumber | String | Human-readable order ID |
| vendorId | String | FK to Vendor |
| userId | String | FK to User |
| status | OrderStatus | PENDING, CONFIRMED, PREPARING, READY, DELIVERED, CANCELLED |
| paymentMethod | VendorPaymentMethod | CASHLESS, CARD, CASH |

---

### Staff Management

#### StaffMember
Staff profile linked to festival.

| Field | Type | Description |
|-------|------|-------------|
| userId | String | FK to User |
| festivalId | String | FK to Festival |
| roleId | String | FK to StaffRole |
| department | StaffDepartment | SECURITY, TICKETING, CASHLESS, etc. |
| badgeNumber | String? | Physical badge ID |

#### StaffShift
Scheduled work shift.

| Field | Type | Description |
|-------|------|-------------|
| staffMemberId | String | FK to StaffMember |
| zoneId | String? | Optional zone assignment |
| startTime | DateTime | Shift start |
| endTime | DateTime | Shift end |
| status | ShiftStatus | SCHEDULED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW |

---

## Business Logic

### Ticket Lifecycle

```
AVAILABLE --> RESERVED --> SOLD --> USED
                |            |
                v            v
            CANCELLED    CANCELLED
                            |
                            v
                        REFUNDED
```

### Payment Flow

1. User initiates purchase
2. Payment created with status `PENDING`
3. Provider webhook updates to `PROCESSING`
4. On success: `COMPLETED`, tickets created
5. On failure: `FAILED`
6. Refunds: `REFUNDED`

### Cashless Transaction Flow

1. User tops up via Payment
2. CashlessTransaction type `TOPUP` created
3. Balance updated
4. User pays at vendor
5. CashlessTransaction type `PAYMENT` created
6. Balance deducted

---

## Performance Optimizations

### Index Strategy

| Use Case | Index | Target Performance |
|----------|-------|-------------------|
| QR Scanning | `Ticket.qrCode` | < 10ms |
| NFC Payment | `CashlessAccount.nfcTagId` | < 15ms |
| Webhook Processing | `Payment.providerPaymentId` | < 20ms |
| Festival Dashboard | `[festivalId, status]` | < 50ms |

### High-Volume Considerations

1. **Ticket Scanning**: Unique index on `qrCode` with single-column lookup
2. **Cashless Transactions**: Composite indexes for real-time analytics
3. **Zone Capacity**: `currentOccupancy` counter with optimistic locking
4. **Audit Logging**: Append-only with time-based partitioning recommended

### Recommended PostgreSQL Settings

```sql
-- For high-volume ticket scanning
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 64MB

-- Connection pooling
max_connections = 200
```

---

## Security & Compliance

### GDPR Models

#### UserConsent
Tracks user consent for various data processing purposes.

| ConsentType | Description |
|-------------|-------------|
| MARKETING | Marketing communications |
| ANALYTICS | Analytics and tracking |
| PERSONALIZATION | Personalized content |
| THIRD_PARTY_SHARING | Third-party data sharing |
| ESSENTIAL | Essential cookies/features |

#### GdprRequest
Handles data subject requests.

| RequestType | Description |
|-------------|-------------|
| DATA_ACCESS | Right to access personal data |
| DATA_DELETION | Right to be forgotten |
| DATA_RECTIFICATION | Right to correct data |
| DATA_PORTABILITY | Right to export data |
| CONSENT_WITHDRAWAL | Withdraw consent |

### Audit Trail

All important actions are logged to `AuditLog`:

| Field | Description |
|-------|-------------|
| userId | Who performed the action |
| action | Action type (CREATE, UPDATE, DELETE) |
| entityType | Model affected |
| entityId | Specific record |
| oldValue | Previous state (JSON) |
| newValue | New state (JSON) |
| ipAddress | Client IP |
| userAgent | Client info |

---

## Migration Guide

### Initial Setup

```bash
# Generate migration from schema
npx prisma migrate dev --name initial_schema

# Apply to production
npx prisma migrate deploy
```

### Seeding

```bash
# Run seed script
npx prisma db seed

# Test credentials
# Password: Festival2025!
# Admin: admin@festival.fr
# Organizer: organisateur@festival.fr
# Staff: staff@festival.fr
# User: user@festival.fr
```

### Schema Updates

1. Modify `schema.prisma`
2. Validate: `npx prisma validate`
3. Generate migration: `npx prisma migrate dev --name description`
4. Test locally
5. Deploy: `npx prisma migrate deploy`

---

## Appendix

### Enum Reference

<details>
<summary>UserRole</summary>

- `ADMIN` - Full platform access
- `ORGANIZER` - Festival management
- `STAFF` - General staff operations
- `CASHIER` - Cashless and payment operations
- `SECURITY` - Access control and zone management
- `USER` - Regular festival attendee
</details>

<details>
<summary>FestivalStatus</summary>

- `DRAFT` - Festival being configured, not public
- `PUBLISHED` - Festival open for ticket sales
- `ONGOING` - Festival currently happening
- `COMPLETED` - Festival ended successfully
- `CANCELLED` - Festival cancelled
</details>

<details>
<summary>TicketStatus</summary>

- `AVAILABLE` - Ticket slot available for purchase
- `RESERVED` - Ticket temporarily reserved during checkout
- `SOLD` - Ticket purchased, not yet used
- `USED` - Ticket scanned and used for entry
- `CANCELLED` - Ticket cancelled by user/admin
- `REFUNDED` - Ticket refunded after cancellation
</details>

<details>
<summary>PaymentStatus</summary>

- `PENDING` - Payment initiated, awaiting processing
- `PROCESSING` - Payment being processed
- `COMPLETED` - Payment successful
- `FAILED` - Payment failed
- `REFUNDED` - Payment refunded
- `CANCELLED` - Payment cancelled before processing
</details>

---

## Contact

For questions about this schema, contact the Festival Platform team.

**Repository:** festival-platform
**Documentation:** `/prisma/DATABASE.md`
**Schema:** `/prisma/schema.prisma`
