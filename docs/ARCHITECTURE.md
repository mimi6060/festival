# Architecture Documentation - Festival Management Platform

This document provides comprehensive architecture documentation with visual diagrams for the Festival Management Platform. Designed for new developers to quickly understand the system.

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Authentication Flow](#2-authentication-flow)
3. [Payment Flow](#3-payment-flow)
4. [Ticket Purchase Flow](#4-ticket-purchase-flow)
5. [Cashless Payment Flow](#5-cashless-payment-flow)
6. [Data Model](#6-data-model)
7. [Tech Stack Summary](#7-tech-stack-summary)

---

## 1. System Overview

High-level architecture showing how all components interact.

```mermaid
graph TB
    subgraph Clients["Client Applications"]
        Web["Next.js Web App<br/>(Public Frontend)"]
        Admin["Next.js Admin<br/>(Dashboard)"]
        Mobile["React Native<br/>(Mobile App)"]
    end

    subgraph Gateway["API Gateway Layer"]
        LB["Load Balancer<br/>(NGINX/ALB)"]
    end

    subgraph Backend["Backend Services"]
        API["NestJS API<br/>(REST + WebSocket)"]
        Queue["BullMQ<br/>(Job Queue)"]
    end

    subgraph Data["Data Layer"]
        PostgreSQL[("PostgreSQL<br/>(Primary DB)")]
        Redis[("Redis<br/>(Cache + Sessions)")]
        MinIO[("MinIO/S3<br/>(File Storage)")]
    end

    subgraph External["External Services"]
        Stripe["Stripe<br/>(Payments)"]
        FCM["Firebase FCM<br/>(Push Notifications)"]
        Sentry["Sentry<br/>(Error Tracking)"]
        Email["SMTP<br/>(Emails)"]
    end

    subgraph Monitoring["Monitoring"]
        Prometheus["Prometheus<br/>(Metrics)"]
        Grafana["Grafana<br/>(Dashboards)"]
    end

    Web --> LB
    Admin --> LB
    Mobile --> LB
    LB --> API

    API --> PostgreSQL
    API --> Redis
    API --> MinIO
    API --> Queue
    Queue --> Redis

    API --> Stripe
    API --> FCM
    API --> Sentry
    API --> Email

    API --> Prometheus
    Prometheus --> Grafana

    style Web fill:#61dafb
    style Admin fill:#61dafb
    style Mobile fill:#61dafb
    style API fill:#e0234e
    style PostgreSQL fill:#336791
    style Redis fill:#dc382d
    style Stripe fill:#635bff
```

### Component Descriptions

| Component           | Technology   | Purpose                                       |
| ------------------- | ------------ | --------------------------------------------- |
| **Web App**         | Next.js 15   | Public-facing website for festival-goers      |
| **Admin Dashboard** | Next.js 15   | Management interface for organizers           |
| **Mobile App**      | React Native | Native mobile experience with offline support |
| **API**             | NestJS 10    | Core backend with REST API + WebSocket        |
| **PostgreSQL**      | v16          | Primary relational database                   |
| **Redis**           | v7           | Caching, sessions, job queues                 |
| **Stripe**          | API          | Payment processing                            |

---

## 2. Authentication Flow

JWT-based authentication with httpOnly cookies for security.

```mermaid
sequenceDiagram
    autonumber
    participant Client as Client<br/>(Web/Mobile)
    participant API as NestJS API
    participant DB as PostgreSQL
    participant Redis as Redis Cache

    %% Login Flow
    rect rgb(240, 248, 255)
        Note over Client,Redis: Login Flow
        Client->>API: POST /auth/login<br/>{email, password}
        API->>DB: Find user by email
        DB-->>API: User record
        API->>API: Verify password (bcrypt)
        API->>API: Generate JWT tokens<br/>(access: 15min, refresh: 7d)
        API->>DB: Store refresh token hash
        API->>Redis: Cache user session
        API-->>Client: Set httpOnly cookies<br/>+ user data
    end

    %% Authenticated Request
    rect rgb(255, 248, 240)
        Note over Client,Redis: Authenticated Request
        Client->>API: GET /api/protected<br/>(with httpOnly cookie)
        API->>API: JwtAuthGuard validates token
        API->>API: RolesGuard checks permissions
        API->>Redis: Check session validity
        API->>DB: Fetch requested data
        API-->>Client: Protected resource
    end

    %% Token Refresh
    rect rgb(240, 255, 240)
        Note over Client,Redis: Token Refresh (when access token expires)
        Client->>API: POST /auth/refresh<br/>(refresh token in cookie)
        API->>DB: Validate refresh token
        API->>API: Generate new access token
        API-->>Client: New access token<br/>(httpOnly cookie)
    end

    %% Logout
    rect rgb(255, 240, 240)
        Note over Client,Redis: Logout
        Client->>API: POST /auth/logout
        API->>DB: Clear refresh token
        API->>Redis: Invalidate session
        API-->>Client: Clear cookies
    end
```

### Token Configuration

| Token Type             | Duration   | Storage                   | Purpose              |
| ---------------------- | ---------- | ------------------------- | -------------------- |
| **Access Token**       | 15 minutes | httpOnly cookie           | API authentication   |
| **Refresh Token**      | 7 days     | httpOnly cookie + DB hash | Token renewal        |
| **Email Verification** | 24 hours   | Database                  | Account verification |
| **Password Reset**     | 1 hour     | Database (SHA-256 hash)   | Password recovery    |

### Security Features

- **httpOnly Cookies**: Prevents XSS token theft
- **Secure Flag**: HTTPS only in production
- **SameSite=Strict**: CSRF protection
- **Token Rotation**: Refresh tokens are rotated on use
- **Password Hashing**: bcrypt with 12 salt rounds

---

## 3. Payment Flow

Stripe Checkout integration with webhook handling.

```mermaid
sequenceDiagram
    autonumber
    participant User as User
    participant Web as Web App
    participant API as NestJS API
    participant DB as PostgreSQL
    participant Stripe as Stripe API

    %% Checkout Initiation
    rect rgb(240, 248, 255)
        Note over User,Stripe: Checkout Initiation
        User->>Web: Click "Buy Tickets"
        Web->>API: POST /payments/create-intent<br/>{amount, currency, metadata}
        API->>API: Validate amount > 0
        API->>Stripe: Create PaymentIntent<br/>(amount in cents)
        Stripe-->>API: PaymentIntent + client_secret
        API->>DB: Create Payment record<br/>(status: PENDING)
        API-->>Web: {paymentId, clientSecret}
    end

    %% Payment Processing
    rect rgb(255, 248, 240)
        Note over User,Stripe: Payment Processing (Stripe Elements)
        Web->>Web: Display Stripe Elements form
        User->>Web: Enter card details
        Web->>Stripe: Confirm PaymentIntent<br/>(client_secret + card)
        Stripe->>Stripe: Process payment
        Stripe-->>Web: Payment result
    end

    %% Webhook Handling
    rect rgb(240, 255, 240)
        Note over User,Stripe: Webhook Handling (Async)
        Stripe->>API: POST /payments/webhook<br/>(payment_intent.succeeded)
        API->>API: Verify webhook signature
        API->>DB: Update Payment status<br/>(status: COMPLETED)
        API->>DB: Create Tickets for user
        API->>API: Generate QR codes
        API-->>Stripe: 200 OK
    end

    %% Confirmation
    rect rgb(255, 240, 255)
        Note over User,Stripe: Order Confirmation
        Web->>API: GET /tickets/me
        API->>DB: Fetch user tickets
        API-->>Web: Ticket data + QR codes
        Web-->>User: Display tickets
    end
```

### Webhook Events Handled

| Event                           | Action                                                   |
| ------------------------------- | -------------------------------------------------------- |
| `payment_intent.succeeded`      | Update payment status, create tickets, generate QR codes |
| `payment_intent.payment_failed` | Update payment status to FAILED, notify user             |
| `charge.refunded`               | Process refund, update ticket status                     |
| `charge.dispute.created`        | Flag payment, notify admin                               |

### Payment States

```mermaid
stateDiagram-v2
    [*] --> PENDING: Create PaymentIntent
    PENDING --> PROCESSING: User submits payment
    PROCESSING --> COMPLETED: Stripe confirms
    PROCESSING --> FAILED: Payment rejected
    COMPLETED --> REFUNDED: Admin processes refund
    FAILED --> [*]: User abandons
    REFUNDED --> [*]
    COMPLETED --> [*]
```

---

## 4. Ticket Purchase Flow

End-to-end ticket purchase from selection to QR code generation.

```mermaid
sequenceDiagram
    autonumber
    participant User as User
    participant Web as Web App
    participant API as NestJS API
    participant DB as PostgreSQL
    participant Stripe as Stripe

    %% Ticket Selection
    rect rgb(240, 248, 255)
        Note over User,Stripe: 1. Ticket Selection
        User->>Web: Browse festival
        Web->>API: GET /festivals/{slug}
        API->>DB: Fetch festival + categories
        API-->>Web: Festival details + ticket types
        User->>Web: Select tickets<br/>(2x VIP, 1x Standard)
        Web->>Web: Add to cart (Zustand store)
    end

    %% Checkout
    rect rgb(255, 248, 240)
        Note over User,Stripe: 2. Checkout & Payment
        User->>Web: Proceed to checkout
        Web->>API: POST /tickets/purchase<br/>{festivalId, categoryId, quantity}
        API->>DB: Check ticket availability
        API->>API: Validate quotas & limits
        API->>Stripe: Create PaymentIntent
        Stripe-->>API: client_secret
        API-->>Web: Redirect to payment
        User->>Stripe: Complete payment
    end

    %% Ticket Creation
    rect rgb(240, 255, 240)
        Note over User,Stripe: 3. Ticket Generation (Post-Payment)
        Stripe->>API: Webhook: payment_intent.succeeded
        API->>DB: Create Ticket records
        loop For each ticket
            API->>API: Generate unique QR code
            API->>API: Sign QR data (HMAC-SHA256)
        end
        API->>DB: Update category soldCount
        API->>API: Send confirmation email
    end

    %% Access Tickets
    rect rgb(255, 240, 255)
        Note over User,Stripe: 4. Access Tickets
        User->>Web: View "My Tickets"
        Web->>API: GET /tickets/me
        API->>DB: Fetch user tickets
        API-->>Web: Tickets with QR codes
        Web-->>User: Display QR codes
    end
```

### QR Code Structure

```mermaid
graph LR
    subgraph QR["QR Code Content (JSON)"]
        A["ticketId"] --> B["Unique UUID"]
        C["code"] --> D["Short code for display"]
        E["hash"] --> F["HMAC-SHA256 signature"]
        G["version"] --> H["Schema version"]
    end
```

**QR Code Security:**

- Signed with HMAC-SHA256 using server secret (min 32 chars)
- Contains ticket ID, short code, and cryptographic hash
- Validated server-side on scan
- Single-use protection (status changes to USED)

### Ticket Validation at Entry

```mermaid
flowchart TD
    A[Staff scans QR] --> B{Parse QR data}
    B -->|Invalid format| C[Reject: Invalid QR]
    B -->|Valid format| D{Verify HMAC signature}
    D -->|Invalid| E[Reject: Tampered QR]
    D -->|Valid| F{Check ticket status}
    F -->|SOLD| G{Check festival status}
    F -->|USED| H[Reject: Already used]
    F -->|CANCELLED| I[Reject: Cancelled ticket]
    G -->|ONGOING| J{Check zone access}
    G -->|Not ongoing| K[Reject: Festival not active]
    J -->|Allowed| L[Grant access + Log entry]
    J -->|Denied| M[Reject: Zone access denied]

    style L fill:#90EE90
    style C fill:#FFB6C1
    style E fill:#FFB6C1
    style H fill:#FFB6C1
    style I fill:#FFB6C1
    style K fill:#FFB6C1
    style M fill:#FFB6C1
```

---

## 5. Cashless Payment Flow

NFC-based cashless wallet system for in-festival purchases.

```mermaid
sequenceDiagram
    autonumber
    participant User as User
    participant App as Mobile App
    participant API as NestJS API
    participant DB as PostgreSQL
    participant Stripe as Stripe

    %% Account Creation
    rect rgb(240, 248, 255)
        Note over User,Stripe: 1. Wallet Setup
        User->>App: Open Cashless wallet
        App->>API: GET /cashless/account
        API->>DB: Find or create account
        API-->>App: Account details<br/>{balance: 0, nfcTagId: null}
    end

    %% Top-up Flow
    rect rgb(255, 248, 240)
        Note over User,Stripe: 2. Top-up Wallet
        User->>App: Top up 50 EUR
        App->>API: POST /cashless/topup<br/>{amount: 50, festivalId}
        API->>API: Validate amount<br/>(min: 5, max: 500)
        API->>API: Check max balance<br/>(limit: 1000 EUR)
        API->>Stripe: Create PaymentIntent
        Stripe-->>API: client_secret
        User->>Stripe: Complete payment
        Stripe->>API: Webhook: succeeded
        API->>DB: Update balance atomically
        API->>DB: Create TOPUP transaction
        API-->>App: New balance: 50 EUR
    end

    %% Payment Flow
    rect rgb(240, 255, 240)
        Note over User,Stripe: 3. Make Payment at Vendor
        User->>App: Scan vendor QR / NFC tap
        App->>API: POST /cashless/pay<br/>{amount: 12.50, vendorId}
        API->>DB: Check account status
        API->>API: Verify sufficient balance
        API->>DB: Begin transaction
        API->>DB: Deduct from user balance
        API->>DB: Create PAYMENT transaction
        API->>DB: Create VendorOrder
        API->>DB: Commit transaction
        API-->>App: Success!<br/>New balance: 37.50 EUR
    end

    %% Refund Flow
    rect rgb(255, 240, 255)
        Note over User,Stripe: 4. Refund (if needed)
        User->>App: Request refund
        App->>API: POST /cashless/refund<br/>{transactionId}
        API->>DB: Verify original transaction
        API->>API: Check not already refunded
        API->>DB: Credit balance back
        API->>DB: Create REFUND transaction
        API-->>App: Refund processed
    end
```

### Cashless Configuration

| Setting         | Value        | Description            |
| --------------- | ------------ | ---------------------- |
| **MIN_TOPUP**   | 5.00 EUR     | Minimum top-up amount  |
| **MAX_TOPUP**   | 500.00 EUR   | Maximum single top-up  |
| **MAX_BALANCE** | 1,000.00 EUR | Maximum wallet balance |
| **MIN_PAYMENT** | 0.01 EUR     | Minimum payment amount |

### Transaction Types

```mermaid
graph LR
    subgraph Types["Transaction Types"]
        T1["TOPUP"] --> D1["Add funds to wallet"]
        T2["PAYMENT"] --> D2["Pay at vendor"]
        T3["REFUND"] --> D3["Reverse a payment"]
        T4["TRANSFER"] --> D4["Send to another user"]
        T5["CORRECTION"] --> D5["Admin adjustment"]
    end

    style T1 fill:#90EE90
    style T2 fill:#FFB6C1
    style T3 fill:#87CEEB
    style T4 fill:#DDA0DD
    style T5 fill:#F0E68C
```

### NFC Flow

```mermaid
flowchart LR
    A[NFC Tag] -->|Tap| B[Reader Device]
    B -->|Read UID| C[API Lookup]
    C -->|Find account| D{Account exists?}
    D -->|Yes| E[Process payment]
    D -->|No| F[Link tag to user]
    F --> G[Create account]
    G --> E
```

---

## 6. Data Model

Simplified Entity-Relationship diagram of core entities.

```mermaid
erDiagram
    USER ||--o{ TICKET : purchases
    USER ||--o| CASHLESS_ACCOUNT : has
    USER ||--o{ PAYMENT : makes
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ SUPPORT_TICKET : creates

    FESTIVAL ||--o{ TICKET_CATEGORY : has
    FESTIVAL ||--o{ TICKET : sells
    FESTIVAL ||--o{ ZONE : contains
    FESTIVAL ||--o{ STAGE : has
    FESTIVAL ||--o{ VENDOR : hosts
    FESTIVAL ||--o{ CAMPING_ZONE : provides

    TICKET_CATEGORY ||--o{ TICKET : generates

    TICKET ||--o{ ZONE_ACCESS_LOG : logs

    PAYMENT ||--o{ TICKET : funds
    PAYMENT ||--o| CASHLESS_TRANSACTION : triggers

    CASHLESS_ACCOUNT ||--o{ CASHLESS_TRANSACTION : records

    STAGE ||--o{ PERFORMANCE : schedules
    ARTIST ||--o{ PERFORMANCE : performs

    VENDOR ||--o{ VENDOR_PRODUCT : sells
    VENDOR ||--o{ VENDOR_ORDER : receives

    CAMPING_ZONE ||--o{ CAMPING_SPOT : contains
    CAMPING_SPOT ||--o{ CAMPING_BOOKING : booked

    USER {
        uuid id PK
        string email UK
        string passwordHash
        string firstName
        string lastName
        enum role "ADMIN|ORGANIZER|STAFF|CASHIER|SECURITY|USER"
        enum status "ACTIVE|INACTIVE|BANNED|PENDING_VERIFICATION"
        boolean emailVerified
        datetime lastLoginAt
    }

    FESTIVAL {
        uuid id PK
        uuid organizerId FK
        string name
        string slug UK
        string location
        datetime startDate
        datetime endDate
        enum status "DRAFT|PUBLISHED|ONGOING|COMPLETED|CANCELLED"
        int maxCapacity
        int currentAttendees
    }

    TICKET {
        uuid id PK
        uuid festivalId FK
        uuid categoryId FK
        uuid userId FK
        string qrCode UK
        enum status "AVAILABLE|RESERVED|SOLD|USED|CANCELLED|REFUNDED"
        decimal purchasePrice
        datetime usedAt
    }

    TICKET_CATEGORY {
        uuid id PK
        uuid festivalId FK
        string name
        enum type "STANDARD|VIP|BACKSTAGE|CAMPING|PARKING|COMBO"
        decimal price
        int quota
        int soldCount
    }

    PAYMENT {
        uuid id PK
        uuid userId FK
        decimal amount
        string currency
        enum status "PENDING|PROCESSING|COMPLETED|FAILED|REFUNDED"
        enum provider "STRIPE|PAYPAL|BANK_TRANSFER|CASH"
        string providerPaymentId
    }

    CASHLESS_ACCOUNT {
        uuid id PK
        uuid userId FK UK
        decimal balance
        string nfcTagId UK
        boolean isActive
    }

    CASHLESS_TRANSACTION {
        uuid id PK
        uuid accountId FK
        uuid festivalId FK
        enum type "TOPUP|PAYMENT|REFUND|TRANSFER|CORRECTION"
        decimal amount
        decimal balanceBefore
        decimal balanceAfter
    }

    ZONE {
        uuid id PK
        uuid festivalId FK
        string name
        int capacity
        int currentOccupancy
    }

    VENDOR {
        uuid id PK
        uuid festivalId FK
        string name
        enum type "FOOD|DRINK|BAR|MERCHANDISE"
        decimal commissionRate
    }

    STAGE {
        uuid id PK
        uuid festivalId FK
        string name
        int capacity
    }

    ARTIST {
        uuid id PK
        string name
        string genre
    }

    PERFORMANCE {
        uuid id PK
        uuid artistId FK
        uuid stageId FK
        datetime startTime
        datetime endTime
    }
```

### Key Relationships

| Relationship                   | Description                           |
| ------------------------------ | ------------------------------------- |
| User -> Tickets                | One user can purchase many tickets    |
| User -> CashlessAccount        | One-to-one relationship               |
| Festival -> TicketCategories   | Festival defines ticket types         |
| Payment -> Tickets             | One payment can fund multiple tickets |
| CashlessTransaction -> Payment | Top-ups linked to payments            |

### Database Indexes

Critical indexes for performance:

```sql
-- Ticket queries
@@index([festivalId, status])           -- Analytics by festival
@@index([festivalId, categoryId])       -- Reports by category
@@index([userId, status])               -- User's tickets

-- Cashless queries
@@index([festivalId, type, createdAt])  -- Transaction analytics
@@index([accountId, createdAt])         -- User history

-- Payment queries
@@index([userId, status])               -- User payment history
@@index([provider, status])             -- Provider analysis
```

---

## 7. Tech Stack Summary

### Backend

| Component | Technology | Version |
| --------- | ---------- | ------- |
| Runtime   | Node.js    | 20 LTS  |
| Framework | NestJS     | 10.x    |
| ORM       | Prisma     | 5.x     |
| Database  | PostgreSQL | 16      |
| Cache     | Redis      | 7       |
| Queue     | BullMQ     | 5.x     |
| WebSocket | Socket.io  | 4.x     |

### Frontend

| Component  | Technology      | Version |
| ---------- | --------------- | ------- |
| Framework  | Next.js         | 15.x    |
| UI Library | React           | 19.x    |
| Styling    | Tailwind CSS    | 3.x     |
| State      | Zustand         | 4.x     |
| Forms      | React Hook Form | 7.x     |
| i18n       | next-intl       | 3.x     |

### Mobile

| Component  | Technology       | Version |
| ---------- | ---------------- | ------- |
| Framework  | React Native     | 0.73.x  |
| Navigation | React Navigation | 6.x     |
| Storage    | AsyncStorage     | 1.x     |
| Push       | Firebase FCM     | -       |

### Infrastructure

| Component        | Technology           |
| ---------------- | -------------------- |
| Containerization | Docker               |
| Orchestration    | Kubernetes           |
| CI/CD            | GitHub Actions       |
| Monitoring       | Prometheus + Grafana |
| Logging          | Pino + Sentry        |
| CDN/WAF          | Cloudflare           |

---

## Additional Resources

- [API Guide](./api/API_GUIDE.md) - Complete API documentation
- [Webhooks](./api/WEBHOOKS.md) - Webhook integration guide
- [Security](./security/GDPR_AUDIT.md) - GDPR compliance documentation
- [Deployment](./DEPLOYMENT.md) - Deployment instructions

---

_Last updated: January 2026_
