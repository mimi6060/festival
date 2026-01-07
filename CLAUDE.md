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

## Pre-Push Verification (MANDATORY)

**Before `git push`:**

```bash
# REQUIRED: Build API
npx nx build api --skip-nx-cache

# RECOMMENDED: Full verification
./scripts/verify-ci.sh
```

If build fails after push: fix immediately, no other changes until CI is green.

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
npx nx serve admin                  # Admin on :4200
cd apps/mobile && npx expo start    # Mobile app

# Building
npx nx build api --skip-nx-cache    # Build API (required before push)
NODE_ENV=production npx nx build web
NODE_ENV=production npx nx build admin
npm run build:all                   # Build everything

# Testing
npx nx test api                     # API tests
npm run test:all                    # All tests
npm run test:coverage               # With coverage

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
```

## Project Architecture

```
festival/
├── apps/
│   ├── api/           # NestJS backend (port 3333)
│   ├── web/           # Next.js public site (port 3000)
│   ├── admin/         # Next.js admin dashboard (port 4200)
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

| Layer     | Technologies                                  |
| --------- | --------------------------------------------- |
| Backend   | NestJS 11, Prisma 6, PostgreSQL 15+, Redis 7  |
| Frontend  | Next.js 15, React 18, Tailwind CSS, next-intl |
| Mobile    | React Native, Expo, AsyncStorage              |
| Auth      | JWT + httpOnly cookies, Passport.js, RBAC     |
| Payments  | Stripe Checkout + Webhooks                    |
| Real-time | WebSocket (Socket.io)                         |

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
├── payments/    # Stripe integration
├── cashless/    # Digital wallet, NFC
├── zones/       # Access control, capacity
├── staff/       # Shifts, badges
├── program/     # Artists, stages, performances
├── vendors/     # Food, merchandise
├── camping/     # Accommodation booking
├── notifications/ # Push, email, SMS
└── analytics/   # KPIs, real-time stats

common/
├── guards/      # JwtAuthGuard, RolesGuard
├── decorators/  # @Public(), @Roles(), @User()
├── dto/         # Shared DTOs
└── interceptors/
```

## Backend Patterns

- **Controllers**: Thin, no business logic
- **Services**: All business logic here
- **DTOs**: Use class-validator + class-transformer
- **Multi-tenant**: All queries scoped to festivalId
- **Auth**: JWT in httpOnly cookies, validate via JwtStrategy

## Frontend Patterns (Next.js)

- **State**: Zustand stores in `stores/`
- **Data fetching**: React Query with hooks
- **Forms**: react-hook-form + zod validation
- **API calls**: Include `credentials: 'include'` for cookies

## Database (Prisma)

Core models: User, Festival, Ticket, Payment, CashlessAccount, Zone, Staff, Artist, Stage, Performance, Vendor, Notification

User roles: ADMIN, ORGANIZER, STAFF, CASHIER, SECURITY, USER

## Security Requirements

- JWT tokens stored in httpOnly cookies (not localStorage)
- All sensitive endpoints protected with guards
- Multi-tenant: scope all queries to festival
- Payment processing via Stripe (PCI-DSS compliant)
- GDPR: consent tracking, data export/deletion

## Environment Variables

Required in `.env.development`:

- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `JWT_ACCESS_SECRET` - Min 32 chars
- `JWT_REFRESH_SECRET` - Different from access secret
- `QR_CODE_SECRET` - Min 32 chars
- `STRIPE_SECRET_KEY` - sk*test*... or sk*live*...

## Reference

- API Docs: `http://localhost:3333/api/docs` (Swagger)
- API Guide: `docs/api/API_GUIDE.md`
- Database Docs: `prisma/DATABASE.md`
- Security: `docs/security/`
