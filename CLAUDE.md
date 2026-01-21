# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workflow Rules (MANDATORY)

**Before each session:**

1. Read `.claude/IN_PROGRESS.md` for current and pending tasks
2. Read `.claude/DONE.md` for completed work

**During work:**

1. Update `.claude/IN_PROGRESS.md` with current tasks
2. Move completed tasks to `.claude/DONE.md`

**After each feature/task:**

1. `git add` modified files
2. Commit with descriptive message
3. **FORBIDDEN: Never include "Claude", "AI", "assistant" in commit messages**
4. Push immediately - **1 feature = 1 commit + 1 push**

## Post-Modification Verification (MANDATORY)

**After modifying or rebuilding any app, ALWAYS verify it works:**

```bash
# API verification
curl -s http://localhost:3333/api/health | grep -q "status" && echo "API OK" || echo "API FAILED"

# Web verification (port 3000 in dev)
curl -s http://localhost:3000 | grep -q "html" && echo "Web OK" || echo "Web FAILED"

# Admin verification (port 4201 in dev)
curl -s http://localhost:4201 | grep -q "html" && echo "Admin OK" || echo "Admin FAILED"
```

**If verification fails:**

1. Check logs: `docker logs <container>` or terminal output
2. Fix the issue before moving on
3. Re-verify after fix

## Code Quality Verification (MANDATORY)

**After any code modification, ALWAYS verify:**

```bash
# ESLint check (REQUIRED after any TypeScript/JavaScript changes)
npm run lint:all

# Quick build verification for modified apps
npx nx build <app-name> --skip-nx-cache

# If ESLint fails: fix issues before committing
npm run lint:fix
```

**This is NON-NEGOTIABLE:**

- Never commit code with ESLint errors
- Never introduce new ESLint warnings
- When modifying a file that has existing warnings or errors, fix ALL of them before committing
- Run `npx eslint <file>` on each modified file to verify zero issues
- If a file has too many pre-existing issues, fix them in a separate commit first

## Pre-Push Verification (MANDATORY)

**Before `git push`:**

```bash
# REQUIRED: Build API
npx nx build api --skip-nx-cache

# REQUIRED: ESLint check
npm run lint:all

# RECOMMENDED: Full verification
./scripts/verify-ci.sh
```

If build or lint fails after push: fix immediately, no other changes until CI is green.

## Commit Convention

- `feat(module):` - new feature
- `fix(module):` - bug fix
- `refactor(module):` - refactoring
- `docs:` - documentation
- `test:` - tests
- `chore:` - maintenance

## Quick Reference Commands

```bash
# Development servers
npx nx serve api                    # API on :3333 (Swagger: /api/docs)
npx nx serve web                    # Web on :3000
npx nx serve admin                  # Admin on :4201
cd apps/mobile && npx expo start    # Mobile app

# Building
npx nx build api --skip-nx-cache    # Build API (required before push)
NODE_ENV=production npx nx build web
NODE_ENV=production npx nx build admin
npm run build:all                   # Build everything

# Testing (file naming: *.spec.ts for unit, *.int-spec.ts for integration)
npx nx test api                     # API tests
npx nx test api --testPathPattern=auth        # Single module tests
npx nx test api --testPathPattern=auth.service.spec  # Single file
npm run test:all                    # All tests
npm run test:coverage               # With coverage

# E2E Testing
npx nx e2e api-e2e                  # Run all E2E tests
npx nx e2e api-e2e --spec=**/auth*  # Single E2E spec

# Linting & Formatting
npm run lint:all
npm run lint:fix
npm run format

# Database (Prisma)
npx prisma generate                 # Generate client
npx prisma migrate dev              # Run migrations
npx prisma db seed                  # Seed data
npx prisma studio                   # Interactive viewer

# Docker
docker-compose up -d                # Start PostgreSQL, Redis, MailHog
docker-compose down                 # Stop services

# Typecheck (faster than full build)
npm run typecheck                   # All projects
npx tsc --noEmit --project apps/api/tsconfig.json  # Single project

# Affected commands (for large PRs)
npm run affected:build              # Build only affected projects
npm run affected:test               # Test only affected projects
npm run affected:lint               # Lint only affected projects

# Storybook
npm run storybook                   # Dev server on :6006
npm run build-storybook             # Production build

# Quick npm aliases (from package.json)
npm run start:api                   # Same as nx serve api
npm run build:api                   # Same as nx build api
npm run verify-ci                   # Run ./scripts/verify-ci.sh
```

## Project Architecture

```
festival/
├── apps/
│   ├── api/           # NestJS backend (port 3333)
│   ├── web/           # Next.js public site (port 3000)
│   ├── admin/         # Next.js admin dashboard (port 4201)
│   ├── mobile/        # React Native + Expo
│   └── api-e2e/       # E2E tests
├── libs/shared/
│   ├── types/         # @festival/shared/types
│   ├── utils/         # @festival/shared/utils
│   ├── constants/     # @festival/shared/constants
│   ├── i18n/          # @festival/shared/i18n (6 languages)
│   └── validation/    # Zod schemas
├── prisma/
│   ├── schema.prisma  # 40+ models, 25+ enums
│   └── seed.ts        # Sample data
└── docs/              # API, security, compliance docs
```

## Tech Stack

| Layer     | Technologies                                     |
| --------- | ------------------------------------------------ |
| Backend   | NestJS 11, Prisma 6, PostgreSQL 15+, Redis 7     |
| Frontend  | Next.js 15, React 18/19, Tailwind CSS, next-intl |
| Mobile    | React Native, Expo, AsyncStorage                 |
| Auth      | JWT + httpOnly cookies, Passport.js, RBAC        |
| Payments  | Stripe Checkout + Webhooks                       |
| Real-time | WebSocket (Socket.io)                            |
| Queues    | BullMQ (Redis-based job processing)              |
| Logging   | Pino (nestjs-pino)                               |

## Key Path Aliases

```typescript
import { ... } from '@festival/shared/types';
import { ... } from '@festival/shared/utils';
import { ... } from '@festival/shared/constants';
import { ... } from '@festival/shared/i18n';
```

## API Module Structure (apps/api/src/)

```
modules/
├── auth/        # JWT, OAuth (Google, GitHub), strategies
├── users/       # User management, RBAC
├── festivals/   # Multi-tenant festivals
├── tickets/     # Categories, QR codes, validation
├── payments/    # Stripe integration, subscriptions, Connect
├── cashless/    # Digital wallet, NFC, configurable limits
├── zones/       # Access control, capacity
├── staff/       # Shifts, badges
├── program/     # Artists, stages, performances, conflict detection
├── vendors/     # Food, merchandise, inventory management
├── camping/     # Accommodation booking
├── notifications/ # Push (FCM), email, SMS, templates
├── promo-codes/ # Discount codes, stacking rules
├── analytics/   # KPIs, real-time stats, bulk export
└── gdpr/        # Data export, right to be forgotten

gateways/        # WebSocket real-time communication
├── events.gateway.ts      # General events, notifications
├── presence.gateway.ts    # User online status, typing
├── zones.gateway.ts       # Zone occupancy, alerts
├── broadcast.gateway.ts   # Announcements, emergencies
└── support-chat.gateway.ts # Support ticket messaging

common/
├── guards/      # JwtAuthGuard, RolesGuard, RateLimitGuard
├── decorators/  # @Public(), @Roles(), @User(), @RateLimit()
├── dto/         # Shared DTOs
├── exceptions/  # Business exceptions, error codes (ERR_XXXX)
├── interceptors/ # Logging, caching, versioning
├── middleware/  # Soft delete filtering
└── services/    # SoftDeleteService, RetryService, RateLimitService
```

## Backend Patterns

- **Controllers**: Thin, no business logic
- **Services**: All business logic here
- **DTOs**: Use class-validator + class-transformer
- **Multi-tenant**: All queries scoped to festivalId
- **Auth**: JWT in httpOnly cookies, validate via JwtStrategy
- **Soft Delete**: Critical models use `isDeleted`/`deletedAt` fields (auto-filtered via middleware)
- **Error Codes**: Standardized format `ERR_XXXX` (1xxx=general, 2xxx=auth, 3xxx=authz, etc.)
- **Rate Limiting**: Use `@RateLimit(limit, window)` decorator on public endpoints
- **API Versioning**: `X-API-Version` header, defaults to v1
- **WebSocket**: Gateways in `gateways/` use Socket.io, test with `@nestjs/testing` + socket.io-client

## Frontend Patterns (Next.js)

- **State**: Zustand stores in `stores/`
- **Data fetching**: React Query with hooks
- **Forms**: react-hook-form + zod validation
- **API calls**: Include `credentials: 'include'` for cookies

## Database (Prisma)

Core models: User, Festival, Ticket, Payment, CashlessAccount, Zone, Staff, Artist, Stage, Performance, Vendor, Notification

User roles: ADMIN, ORGANIZER, STAFF, CASHIER, SECURITY, USER

Soft-deletable models: User, Festival, Ticket, TicketCategory, Payment, Artist, Vendor, VendorOrder

## Security Requirements

- JWT tokens stored in httpOnly cookies (not localStorage)
- All sensitive endpoints protected with guards
- Multi-tenant: scope all queries to festival
- Payment processing via Stripe (PCI-DSS compliant)
- GDPR: consent tracking, data export/deletion

## Environment Variables

Required in `.env.development` (copy from `.env.example`):

- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `JWT_SECRET` - Min 32 chars (access token)
- `JWT_REFRESH_SECRET` - Different from access secret
- `QR_SECRET` - Min 32 chars (QR code signing)
- `STRIPE_SECRET_KEY` - sk*test*... or sk*live*...

Test credentials (after `npx prisma db seed`):

- Admin: `admin@festival.fr` / `Festival2025!`
- Organizer: `organisateur@festival.fr` / `Festival2025!`
- User: `user@festival.fr` / `Festival2025!`

## Reference

- API Docs: `http://localhost:3333/api/docs` (Swagger)
- API Guide: `docs/api/API_GUIDE.md`
- Database Docs: `prisma/DATABASE.md`
- Security: `docs/security/`
