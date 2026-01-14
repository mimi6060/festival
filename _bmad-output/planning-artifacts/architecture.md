# Architecture Document

# Festival Management Platform

**Version:** 1.0.0
**Date:** 2026-01-14
**Status:** Brownfield Documentation

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
├─────────────┬─────────────┬─────────────┬─────────────────────────┤
│  Next.js    │  Next.js    │  React      │                         │
│  Web App    │  Admin      │  Native     │  Third-party Clients    │
│  (Port 3000)│  (Port 4200)│  Mobile     │  (via API)              │
└──────┬──────┴──────┬──────┴──────┬──────┴────────────┬───────────┘
       │             │             │                    │
       └─────────────┴──────┬──────┴────────────────────┘
                            │ HTTPS / WSS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API Gateway (NestJS)                         │
│                        Port 3333                                 │
├─────────────────────────────────────────────────────────────────┤
│  REST API  │  WebSocket  │  Health    │  Swagger                 │
│  Endpoints │  Gateways   │  Checks    │  /api/docs               │
└──────┬─────┴──────┬──────┴──────┬─────┴─────────────────────────┘
       │            │             │
       ▼            ▼             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Service Layer                                │
├─────────┬─────────┬─────────┬─────────┬─────────┬───────────────┤
│  Auth   │ Festival│ Tickets │ Payments│ Cashless│ ...25 modules │
└────┬────┴────┬────┴────┬────┴────┬────┴────┬────┴───────────────┘
     │         │         │         │         │
     └─────────┴─────────┴────┬────┴─────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Data Layer                                   │
├──────────────────┬──────────────────┬───────────────────────────┤
│    PostgreSQL    │      Redis       │        MinIO/S3           │
│    (Primary DB)  │  (Cache/Queue)   │     (File Storage)        │
│    52 Models     │  Sessions/Jobs   │      Media Assets         │
└──────────────────┴──────────────────┴───────────────────────────┘
```

### 1.2 Technology Stack

| Layer          | Technology   | Version | Purpose                 |
| -------------- | ------------ | ------- | ----------------------- |
| **Runtime**    | Node.js      | 20 LTS  | Server runtime          |
| **Framework**  | NestJS       | 11.x    | Backend framework       |
| **ORM**        | Prisma       | 6.x     | Database access         |
| **Database**   | PostgreSQL   | 16+     | Primary storage         |
| **Cache**      | Redis        | 7.x     | Cache, sessions, queues |
| **Queue**      | BullMQ       | 5.x     | Background jobs         |
| **WebSocket**  | Socket.io    | 4.x     | Real-time communication |
| **Frontend**   | Next.js      | 15.x    | Web applications        |
| **Mobile**     | React Native | 0.76.x  | Mobile app              |
| **State**      | Zustand      | 4.5.x   | Frontend state          |
| **Validation** | Zod          | 4.x     | Schema validation       |

---

## 2. Module Architecture

### 2.1 NestJS Module Structure

```
apps/api/src/
├── main.ts                     # Application bootstrap
├── app/
│   └── app.module.ts           # Root module
├── config/                     # Configuration
├── modules/                    # Feature modules (25+)
│   ├── auth/                   # Authentication
│   ├── users/                  # User management
│   ├── festivals/              # Festival CRUD
│   ├── tickets/                # Ticketing
│   ├── payments/               # Stripe integration
│   ├── cashless/               # Digital wallet
│   ├── zones/                  # Access control
│   ├── staff/                  # Staff management
│   ├── program/                # Artists/Performances
│   ├── vendors/                # Vendor management
│   ├── camping/                # Accommodation
│   ├── notifications/          # Multi-channel notifs
│   ├── analytics/              # KPIs & exports
│   ├── support/                # Support tickets
│   ├── gdpr/                   # GDPR compliance
│   └── ...
├── gateways/                   # WebSocket gateways
│   ├── events.gateway.ts
│   ├── presence.gateway.ts
│   ├── zones.gateway.ts
│   ├── broadcast.gateway.ts
│   └── support-chat.gateway.ts
└── common/                     # Shared components
    ├── guards/
    ├── decorators/
    ├── interceptors/
    ├── middleware/
    └── services/
```

### 2.2 Module Dependency Graph

```
AppModule
├── ConfigModule (global)
├── PrismaModule (global)
├── CacheModule (global)
├── AuthModule
│   ├── JwtModule
│   └── PassportModule
├── UsersModule
├── FestivalsModule
│   └── LanguagesModule
├── TicketsModule
│   ├── PaymentsModule
│   └── PromoCodesModule
├── PaymentsModule
│   └── StripeModule
├── CashlessModule
│   └── PaymentsModule
├── ZonesModule
├── ProgramModule
├── VendorsModule
├── NotificationsModule
│   ├── FcmModule
│   └── EmailModule
├── AnalyticsModule
└── GdprModule
```

---

## 3. Data Architecture

### 3.1 Database Schema Overview

**Core Entities (52 models):**

| Category      | Models                                    |
| ------------- | ----------------------------------------- |
| **Users**     | User, RefreshToken, ApiKey                |
| **Festivals** | Festival, FestivalMedia, LocalizedContent |
| **Tickets**   | Ticket, TicketCategory, TicketTransfer    |
| **Payments**  | Payment, Subscription, Invoice            |
| **Cashless**  | CashlessAccount, CashlessTransaction      |
| **Program**   | Artist, Stage, Performance                |
| **Zones**     | Zone, ZoneAccessLog                       |
| **Staff**     | Staff, Shift, StaffAssignment             |
| **Vendors**   | Vendor, VendorProduct, VendorOrder        |
| **Camping**   | CampingZone, CampingSpot, CampingBooking  |
| **Support**   | SupportTicket, FAQItem, LostItem          |
| **System**    | Notification, PromoCode, WebhookEvent     |

### 3.2 Multi-Tenant Strategy

```
Toutes les entités liées aux festivals incluent:
- festivalId: String (FK → Festival)
- Index composite: [festivalId, ...]

Isolation garantie par:
1. Filtrage automatique dans services
2. Guards validant l'accès au festival
3. Middleware Prisma pour soft-delete
```

### 3.3 Key Relationships

```
User (1) ─────┬───── (*) Ticket
              ├───── (1) CashlessAccount
              ├───── (*) Payment
              └───── (*) Notification

Festival (1) ─┬───── (*) TicketCategory
              ├───── (*) Zone
              ├───── (*) Stage
              ├───── (*) Vendor
              └───── (*) Staff

Performance (*) ── (1) Artist
             (*) ── (1) Stage
```

---

## 4. Security Architecture

### 4.1 Authentication Flow

```
┌──────────┐    POST /auth/login     ┌──────────┐
│  Client  │ ─────────────────────▶  │   API    │
│          │                         │          │
│          │  ◀───────────────────── │          │
│          │   Set-Cookie:           │          │
│          │   access_token (15min)  │          │
│          │   refresh_token (7d)    │          │
└──────────┘                         └──────────┘

JWT Storage: httpOnly Cookies ONLY
Token Refresh: POST /auth/refresh
Logout: POST /auth/logout (invalidates all)
```

### 4.2 Authorization (RBAC)

| Role          | Permissions                      |
| ------------- | -------------------------------- |
| **ADMIN**     | Full system access               |
| **ORGANIZER** | Manage own festivals             |
| **STAFF**     | Operations on assigned festivals |
| **CASHIER**   | Cashless operations              |
| **SECURITY**  | Zone access validation           |
| **USER**      | Public features + own data       |

### 4.3 Security Controls

```typescript
@Controller('festivals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FestivalsController {

  @Get()
  @Public()  // No auth required
  findAll() { ... }

  @Post()
  @Roles('ADMIN', 'ORGANIZER')  // Role restriction
  create() { ... }

  @Delete(':id')
  @Roles('ADMIN')
  @RateLimit(10, '1m')  // Rate limiting
  remove() { ... }
}
```

---

## 5. API Architecture

### 5.1 REST API Structure

```
/api
├── /auth
│   ├── POST /login
│   ├── POST /register
│   ├── POST /refresh
│   ├── POST /logout
│   └── GET  /me
├── /festivals
│   ├── GET  /
│   ├── GET  /:slug
│   ├── POST /
│   ├── PATCH /:id
│   └── DELETE /:id
├── /tickets
│   ├── GET  /me
│   ├── POST /purchase
│   ├── POST /:id/validate
│   └── POST /:id/transfer
├── /payments
│   ├── POST /create-intent
│   └── POST /webhook
├── /cashless
│   ├── GET  /account
│   ├── POST /topup
│   └── POST /pay
└── ... (25+ modules)
```

### 5.2 WebSocket Events

| Gateway          | Events                            | Purpose               |
| ---------------- | --------------------------------- | --------------------- |
| **events**       | notification, ticket-update       | General notifications |
| **presence**     | user-online, user-offline, typing | User presence         |
| **zones**        | occupancy-update, capacity-alert  | Zone monitoring       |
| **broadcast**    | announcement, emergency           | Mass communication    |
| **support-chat** | message, typing, resolved         | Support tickets       |

### 5.3 Error Handling

```typescript
// Standardized error codes
ERR_1xxx: General errors
ERR_2xxx: Authentication errors
ERR_3xxx: Authorization errors
ERR_4xxx: Validation errors
ERR_5xxx: Business logic errors
ERR_6xxx: External service errors

// Response format
{
  "statusCode": 400,
  "errorCode": "ERR_4001",
  "message": "Validation failed",
  "details": { ... }
}
```

---

## 6. Integration Architecture

### 6.1 External Services

```
┌─────────────────┐     ┌─────────────────┐
│     Stripe      │     │   Firebase FCM  │
│  - Payments     │     │  - Push notifs  │
│  - Webhooks     │     │  - iOS/Android  │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
              ┌──────▼──────┐
              │   NestJS    │
              │     API     │
              └──────┬──────┘
                     │
         ┌───────────┴───────────┐
         │                       │
┌────────▼────────┐     ┌────────▼────────┐
│      SMTP       │     │     Sentry      │
│  - Emails       │     │  - Errors       │
│  - Templates    │     │  - Performance  │
└─────────────────┘     └─────────────────┘
```

### 6.2 Webhook Architecture

```
Stripe Webhook Flow:
1. Stripe sends POST /payments/webhook
2. Verify signature with STRIPE_WEBHOOK_SECRET
3. Parse event type (payment_intent.succeeded, etc.)
4. Process in transaction
5. Emit internal events for real-time updates
6. Return 200 OK
```

---

## 7. Deployment Architecture

### 7.1 Container Architecture

```yaml
# docker-compose.yml structure
services:
  api:
    image: festival-api:latest
    ports: ['3333:3333']
    depends_on: [postgres, redis]

  web:
    image: festival-web:latest
    ports: ['3000:3000']

  admin:
    image: festival-admin:latest
    ports: ['4200:4200']

  postgres:
    image: postgres:16
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine

  mailhog: # Dev only
    image: mailhog/mailhog
```

### 7.2 Kubernetes Deployment

```
k8s/
├── base/
│   ├── namespace.yaml
│   ├── deployments/
│   │   ├── api-deployment.yaml      # 3 replicas
│   │   ├── web-deployment.yaml      # 2 replicas
│   │   └── admin-deployment.yaml    # 2 replicas
│   ├── services/
│   ├── ingress/
│   └── statefulsets/
│       ├── postgresql.yaml          # Primary + replica
│       └── redis.yaml               # Cluster mode
└── overlays/
    ├── development/
    ├── staging/
    └── production/
```

### 7.3 CI/CD Pipeline

```
GitHub Actions:
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  Lint   │ ─▶ │  Build  │ ─▶ │  Test   │ ─▶ │ Deploy  │
│ ESLint  │    │   NX    │    │  Jest   │    │   K8s   │
│Prettier │    │ Docker  │    │Playwright│    │ Staging │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
```

---

## 8. Performance Architecture

### 8.1 Caching Strategy

| Layer            | Technology | TTL    | Use Case                 |
| ---------------- | ---------- | ------ | ------------------------ |
| **API Response** | Redis      | 5-60s  | Festival lists, programs |
| **Session**      | Redis      | 7 days | User sessions            |
| **Query**        | Prisma     | N/A    | Prepared statements      |
| **Static**       | CDN        | 1 year | Images, assets           |

### 8.2 Database Optimization

```sql
-- Critical indexes
CREATE INDEX idx_ticket_festival_status ON Ticket(festivalId, status);
CREATE INDEX idx_ticket_user ON Ticket(userId, status);
CREATE INDEX idx_payment_user_status ON Payment(userId, status);
CREATE INDEX idx_cashless_tx_account ON CashlessTransaction(accountId, createdAt);
```

### 8.3 Scalability Considerations

```
Load Balancing:
- NGINX/ALB for HTTP
- Sticky sessions for WebSocket

Horizontal Scaling:
- API: Stateless, scale freely
- Redis: Cluster mode for > 50K connections
- PostgreSQL: Read replicas for analytics

Vertical Limits:
- API pods: 2 CPU, 4GB RAM
- PostgreSQL: 8 CPU, 32GB RAM
```

---

## 9. Monitoring & Observability

### 9.1 Metrics Stack

```
┌─────────────────┐
│   Application   │
│   (NestJS)      │
└────────┬────────┘
         │ /metrics (Prometheus format)
         ▼
┌─────────────────┐
│   Prometheus    │
│   (Scraper)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Grafana      │
│  (Dashboards)   │
└─────────────────┘

Dashboards:
- API Overview (requests, latency, errors)
- Business Metrics (tickets, payments, cashless)
- Database (queries, connections, replication)
- Redis (memory, hits, connections)
```

### 9.2 Logging

```typescript
// Pino logger configuration
{
  level: 'info',
  transport: {
    target: 'pino-pretty'  // Dev only
  },
  redact: ['password', 'token', 'cardNumber']
}

// Log levels used:
- error: Exceptions, failures
- warn: Deprecated, potential issues
- info: Business events (login, purchase)
- debug: Technical details (queries)
```

---

## 10. Technical Decisions Log

| Decision               | Rationale                        | Date    |
| ---------------------- | -------------------------------- | ------- |
| NestJS over Express    | Built-in DI, modules, decorators | Initial |
| Prisma over TypeORM    | Better DX, type safety           | Initial |
| Zustand over Redux     | Simpler, less boilerplate        | Initial |
| httpOnly cookies       | XSS protection for tokens        | Initial |
| Multi-tenant single DB | Cost effective, simpler ops      | Initial |
| Socket.io over WS      | Fallback support, rooms          | Initial |
| BullMQ over Agenda     | Better Redis integration         | Initial |

---

## 11. Constraints & Limitations

### 11.1 Technical Constraints

- PostgreSQL 16+ required (JSON operators)
- Node.js 20 LTS (ESM support)
- Redis 7+ (streams for BullMQ)

### 11.2 Operational Constraints

- Single region deployment (EU)
- Max 100K concurrent WebSocket connections
- 10GB max file uploads

### 11.3 Known Limitations

- No offline sync for web (mobile only)
- Single currency per festival
- No real-time video streaming

---

_Document généré pour BMAD workflow - Architecture Brownfield_
