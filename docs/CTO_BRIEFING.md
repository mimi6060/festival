# Festival Management Platform - CTO Technical Briefing

**Document Version**: 1.0
**Date**: January 2026
**Confidentiality**: Internal

---

## Executive Summary

La **Festival Management Platform** est une solution SaaS complète de gestion de festivals musicaux. Elle couvre l'ensemble du cycle de vie d'un événement : vente de billets, paiements cashless, programmation artistique, gestion des zones, camping, vendeurs, et analytics en temps réel.

### Key Metrics

| Metric                  | Value                              |
| ----------------------- | ---------------------------------- |
| **Test Coverage**       | 86.18% statements, 73.17% branches |
| **Total Tests**         | 5,061+ tests across 96+ suites     |
| **API Modules**         | 25 modules métier                  |
| **Database Models**     | 40+ models (1,474 lines schema)    |
| **Supported Languages** | 6 (FR, EN, DE, ES, IT, PT)         |
| **Applications**        | 4 (API, Web, Admin, Mobile)        |

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                   │
├──────────────┬──────────────┬──────────────┬───────────────────────────┤
│   Web App    │  Admin App   │  Mobile App  │     External Partners     │
│  (Next.js)   │  (Next.js)   │(React Native)│       (Webhooks)          │
│   :3000      │    :4200     │    Expo      │                           │
└──────┬───────┴──────┬───────┴──────┬───────┴───────────┬───────────────┘
       │              │              │                   │
       └──────────────┴──────────────┴───────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │    Load Balancer      │
                    │    (NGINX / ALB)      │
                    └───────────┬───────────┘
                                │
       ┌────────────────────────▼────────────────────────┐
       │                  API LAYER                       │
       │              NestJS 11 Backend                   │
       │                  :3333                           │
       │  ┌─────────────────────────────────────────────┐│
       │  │  REST API  │  WebSocket  │  Webhooks        ││
       │  │  (Swagger) │  (Socket.io)│  (Stripe)        ││
       │  └─────────────────────────────────────────────┘│
       └──────┬─────────────┬─────────────┬──────────────┘
              │             │             │
    ┌─────────▼──────┐ ┌────▼─────┐ ┌─────▼──────┐
    │  PostgreSQL 16 │ │  Redis 7 │ │  MinIO/S3  │
    │  (Primary DB)  │ │  (Cache) │ │  (Files)   │
    └────────────────┘ └──────────┘ └────────────┘
```

### Design Principles

1. **Multi-tenant Architecture**: Toutes les données sont scopées par `festivalId`
2. **Event-driven**: WebSocket pour le temps réel, webhooks pour les intégrations
3. **API-first**: Documentation OpenAPI/Swagger auto-générée
4. **Security by Design**: JWT httpOnly, RBAC, rate limiting, soft delete

---

## 2. Technology Stack

### Backend

| Component | Technology    | Version   | Notes                            |
| --------- | ------------- | --------- | -------------------------------- |
| Runtime   | Node.js       | 20 LTS    | Long-term support                |
| Framework | NestJS        | 11.x      | Enterprise-grade, modular        |
| ORM       | Prisma        | 6.x       | Type-safe, migrations            |
| Database  | PostgreSQL    | 16+       | ACID, JSON support               |
| Cache     | Redis         | 7+        | Sessions, rate limiting, pub/sub |
| Auth      | Passport.js   | 0.7.x     | JWT + OAuth (Google, GitHub)     |
| Payments  | Stripe        | API v2024 | Checkout, Connect, Webhooks      |
| Push      | Firebase FCM  | Admin SDK | iOS, Android, Web                |
| Logging   | Pino + Sentry | Latest    | Structured logs, error tracking  |
| Real-time | Socket.io     | 4.8.x     | WebSocket gateways               |

### Frontend

| Component | Technology            | Version   | Notes                   |
| --------- | --------------------- | --------- | ----------------------- |
| Framework | Next.js               | 15.x      | App Router, SSR/SSG     |
| UI        | React                 | 18.x      | Concurrent features     |
| Styling   | Tailwind CSS          | 3.x       | Utility-first           |
| State     | Zustand               | 4.x       | Lightweight, simple API |
| Forms     | React Hook Form + Zod | 7.x / 4.x | Validation intégrée     |
| i18n      | next-intl             | 3.x       | 6 langues supportées    |
| Charts    | Recharts              | 3.x       | Analytics dashboards    |

### Mobile

| Component  | Technology       | Version | Notes             |
| ---------- | ---------------- | ------- | ----------------- |
| Framework  | React Native     | 0.73+   | Cross-platform    |
| Build      | Expo             | SDK 50+ | OTA updates       |
| Navigation | React Navigation | 7.x     | Native navigation |
| Storage    | AsyncStorage     | 1.x     | Offline support   |

### Infrastructure

| Component     | Technology           | Notes                      |
| ------------- | -------------------- | -------------------------- |
| Monorepo      | Nx                   | 22.x - Build orchestration |
| Container     | Docker               | Multi-stage builds         |
| Orchestration | Kubernetes           | Production deployment      |
| CI/CD         | GitHub Actions       | Automated testing          |
| Monitoring    | Prometheus + Grafana | Metrics & dashboards       |
| CDN/WAF       | Cloudflare           | DDoS protection            |

---

## 3. API Modules (25 modules)

### Core Business Modules

| Module            | Description                    | Key Features                           |
| ----------------- | ------------------------------ | -------------------------------------- |
| **auth**          | Authentication & Authorization | JWT, OAuth (Google/GitHub), MFA-ready  |
| **users**         | User management                | RBAC (6 roles), profile, preferences   |
| **festivals**     | Festival CRUD                  | Multi-tenant, status workflow          |
| **tickets**       | Ticket management              | QR codes, validation, transfer         |
| **payments**      | Payment processing             | Stripe Checkout, refunds, Connect      |
| **cashless**      | Digital wallet                 | NFC, configurable limits, daily caps   |
| **program**       | Artist & performances          | Conflict detection, favorites          |
| **vendors**       | Food & merchandise             | Inventory, orders, commissions         |
| **zones**         | Access control                 | Capacity tracking, real-time occupancy |
| **camping**       | Accommodation                  | Zones, spots, bookings                 |
| **staff**         | Staff management               | Shifts, badges, assignments            |
| **notifications** | Push & email                   | Templates, scheduling, FCM             |
| **promo-codes**   | Discount codes                 | Stacking rules, usage limits           |
| **analytics**     | KPIs & reporting               | Real-time stats, bulk export           |
| **gdpr**          | Data compliance                | Export, right to be forgotten          |
| **support**       | Support tickets                | Messaging, priorities                  |

### Technical Modules

| Module         | Description                                |
| -------------- | ------------------------------------------ |
| **cache**      | Redis caching layer with TTL management    |
| **email**      | SMTP integration with Handlebars templates |
| **pdf**        | PDF generation (PDFKit)                    |
| **queue**      | Background jobs (BullMQ-ready)             |
| **monitoring** | Health checks, metrics endpoints           |
| **logger**     | Structured logging (Pino)                  |
| **prisma**     | Database service wrapper                   |

---

## 4. Database Schema

### Statistics

- **Total Models**: 40+
- **Enums**: 25+
- **Schema Size**: 1,474 lines
- **Indexes**: Optimized for common queries

### Core Entities

```
User ──────────┬── Ticket ──────── TicketCategory
               │                         │
               │                         │
               ├── CashlessAccount ─── CashlessTransaction
               │
               ├── Payment ────────── Refund
               │
               └── Notification

Festival ──────┬── Zone ──────────── ZoneAccessLog
               │
               ├── Stage ─────────── Performance ── Artist
               │
               ├── Vendor ────────── VendorProduct
               │                          │
               │                     VendorOrder
               │
               └── CampingZone ───── CampingSpot ── CampingBooking
```

### Key Enums

| Enum                | Values                                               |
| ------------------- | ---------------------------------------------------- |
| **UserRole**        | ADMIN, ORGANIZER, STAFF, CASHIER, SECURITY, USER     |
| **FestivalStatus**  | DRAFT, PUBLISHED, ONGOING, COMPLETED, CANCELLED      |
| **TicketStatus**    | AVAILABLE, RESERVED, SOLD, USED, CANCELLED, REFUNDED |
| **PaymentStatus**   | PENDING, PROCESSING, COMPLETED, FAILED, REFUNDED     |
| **TransactionType** | TOPUP, PAYMENT, REFUND, TRANSFER, CORRECTION         |

---

## 5. Security & Compliance

### Authentication & Authorization

| Feature              | Implementation                                    |
| -------------------- | ------------------------------------------------- |
| **JWT Tokens**       | Access (15min) + Refresh (7d) in httpOnly cookies |
| **OAuth**            | Google, GitHub (extensible)                       |
| **Password Hashing** | bcrypt with 12 salt rounds                        |
| **RBAC**             | 6 roles with granular permissions                 |
| **Rate Limiting**    | Configurable per-endpoint via decorator           |
| **CSRF Protection**  | SameSite=Strict cookies                           |

### Data Protection (GDPR)

| Requirement                | Status      |
| -------------------------- | ----------- |
| Consent tracking           | Implemented |
| Data export (Art. 15)      | Implemented |
| Right to erasure (Art. 17) | Implemented |
| Data retention policy      | Documented  |
| DPA template               | Available   |

### Payment Security (PCI-DSS)

| Aspect               | Implementation                              |
| -------------------- | ------------------------------------------- |
| Card data            | Never touches our servers (Stripe Elements) |
| Webhook verification | Signature validation                        |
| SAQ-A eligible       | Scope reduction documented                  |

### Implemented Security Features

- Soft delete for critical entities (audit trail)
- Request/response logging with PII filtering
- API versioning (`X-API-Version` header)
- Standardized error codes (ERR_XXXX format)
- Webhook signature verification (Stripe)
- QR codes signed with HMAC-SHA256

---

## 6. Test Coverage & Quality

### Current Coverage (as of January 2026)

| Metric         | Value  | Target | Status   |
| -------------- | ------ | ------ | -------- |
| **Statements** | 86.18% | 80%    | EXCEEDED |
| **Branches**   | 73.17% | 70%    | EXCEEDED |
| **Functions**  | 84.22% | 80%    | EXCEEDED |
| **Lines**      | 86.06% | 80%    | EXCEEDED |

**Total**: 5,061+ tests across 96+ test suites

### Test Types

| Type              | Location            | Framework               |
| ----------------- | ------------------- | ----------------------- |
| Unit tests        | `*.spec.ts`         | Jest                    |
| Integration tests | `*.int-spec.ts`     | Jest + Supertest        |
| E2E tests         | `apps/api-e2e/`     | Jest + Supertest        |
| WebSocket tests   | `*.gateway.spec.ts` | Jest + socket.io-client |

### Key Test Areas

- Payment flows (checkout, refunds, webhooks)
- Authentication (JWT, OAuth, refresh tokens)
- Ticket validation (QR generation, scanning)
- Cashless transactions (limits, daily caps)
- WebSocket gateways (presence, zones, broadcast)
- GDPR compliance (export, deletion)

---

## 7. Real-time Features (WebSocket)

### Implemented Gateways

| Gateway                | Purpose           | Events                                    |
| ---------------------- | ----------------- | ----------------------------------------- |
| **EventsGateway**      | General events    | notifications, updates                    |
| **PresenceGateway**    | Online status     | user:online, user:offline                 |
| **ZonesGateway**       | Zone occupancy    | zone:entered, zone:exited, capacity:alert |
| **BroadcastGateway**   | Announcements     | announcement, emergency                   |
| **SupportChatGateway** | Support messaging | message:sent, message:received            |

### Architecture

```
Client ──── Socket.io ──── Gateway ──── Service ──── Redis Pub/Sub
                              │
                              └── Event Emitter (internal)
```

---

## 8. Development Workflow

### Commands

```bash
# Development
npx nx serve api          # API on :3333
npx nx serve web          # Web on :3000
npx nx serve admin        # Admin on :4200

# Testing
npx nx test api           # Unit tests
npx nx e2e api-e2e        # E2E tests
npm run test:coverage     # With coverage report

# Build & Deploy
npx nx build api --skip-nx-cache
./scripts/verify-ci.sh    # Pre-push verification
```

### CI/CD Pipeline

```
Push → Lint → Type Check → Unit Tests → Build → E2E Tests → Deploy
```

---

## 9. External Integrations

| Service          | Purpose            | Integration Type    |
| ---------------- | ------------------ | ------------------- |
| **Stripe**       | Payments           | REST API + Webhooks |
| **Firebase FCM** | Push notifications | Admin SDK           |
| **Google OAuth** | Social login       | Passport strategy   |
| **GitHub OAuth** | Social login       | Passport strategy   |
| **Sentry**       | Error tracking     | SDK integration     |
| **SMTP**         | Email delivery     | Nodemailer          |

---

## 10. Documentation Assets

| Document      | Location                        | Description                     |
| ------------- | ------------------------------- | ------------------------------- |
| API Guide     | `docs/api/API_GUIDE.md`         | Endpoint documentation          |
| API Reference | `docs/api/API_REFERENCE.md`     | OpenAPI spec details            |
| Webhooks      | `docs/api/WEBHOOKS.md`          | Integration guide               |
| Architecture  | `docs/ARCHITECTURE.md`          | System diagrams                 |
| Deployment    | `docs/DEPLOYMENT.md`            | Deploy instructions             |
| Kubernetes    | `docs/KUBERNETES_DEPLOYMENT.md` | K8s manifests                   |
| Security      | `docs/security/`                | Pentest guide, methodology      |
| GDPR          | `docs/compliance/gdpr/`         | Full GDPR documentation         |
| PCI-DSS       | `docs/compliance/pci-dss/`      | Payment compliance              |
| Legal         | `docs/legal/`                   | Terms, privacy, cookies (FR/EN) |

---

## 11. Roadmap Recommendations

### Short-term Priorities

1. **Performance Monitoring**
   - APM integration (DataDog/New Relic)
   - Database query performance dashboards

2. **Scaling Preparation**
   - Horizontal pod autoscaling config
   - Database read replicas setup

3. **Mobile App Release**
   - App Store / Play Store submission
   - Push notification testing at scale

### Medium-term Enhancements

1. **Advanced Analytics**
   - Predictive attendance modeling
   - Revenue forecasting
   - Real-time heatmaps

2. **Integration Expansion**
   - Ticketmaster/Eventbrite import
   - Accounting software export (QuickBooks, Xero)
   - CRM integrations (Salesforce, HubSpot)

3. **Feature Additions**
   - Loyalty program
   - Dynamic pricing
   - Marketplace for ticket resale

---

## 12. Risk Assessment

| Risk                    | Severity | Mitigation                              |
| ----------------------- | -------- | --------------------------------------- |
| Payment provider outage | High     | Failover to secondary provider (future) |
| Database failure        | High     | Daily backups, point-in-time recovery   |
| DDoS attack             | Medium   | Cloudflare WAF, rate limiting           |
| Data breach             | High     | Encryption at rest, minimal PII storage |
| Third-party dependency  | Medium   | Lock versions, audit dependencies       |

---

## Appendix A: Environment Variables

Required environment variables for production:

```env
# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# JWT (minimum 32 characters each)
JWT_SECRET=...
JWT_REFRESH_SECRET=...

# QR Code signing
QR_SECRET=...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Firebase
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# Email
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...

# Monitoring
SENTRY_DSN=...
```

---

## Appendix B: API Error Codes Reference

| Range | Category       | Example                            |
| ----- | -------------- | ---------------------------------- |
| 1xxx  | General errors | ERR_1000: Validation failed        |
| 2xxx  | Authentication | ERR_2001: Invalid credentials      |
| 3xxx  | Authorization  | ERR_3001: Insufficient permissions |
| 4xxx  | Resources      | ERR_4000: Not found                |
| 5xxx  | Payments       | ERR_5001: Payment failed           |
| 6xxx  | Tickets        | ERR_6001: Ticket already used      |
| 7xxx  | Festivals      | ERR_7001: Festival not active      |
| 8xxx  | Cashless       | ERR_8001: Insufficient balance     |
| 9xxx  | Zones          | ERR_9001: Zone at capacity         |
| 10xxx | Users          | ERR_10001: Email already exists    |
| 11xxx | Vendors        | ERR_11001: Product out of stock    |
| 12xxx | Notifications  | ERR_12001: Invalid token           |
| 13xxx | Promo Codes    | ERR_13001: Code not stackable      |

---

**Document prepared for CTO review**
_Last updated: January 2026_
