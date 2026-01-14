# Tâches En Cours & À Faire

---

## CTO Mission - TERMINÉE

**Date**: 2026-01-08
**Résultat**: 30/30 tâches complétées

Toutes les tâches ont été déplacées vers `DONE.md`.

---

## Coverage Finale

| Metric     | Coverage   | Target | Status   |
| ---------- | ---------- | ------ | -------- |
| Statements | **86.18%** | 80%    | Exceeded |
| Branches   | **73.17%** | 70%    | Exceeded |
| Functions  | **84.22%** | 80%    | Exceeded |
| Lines      | **86.06%** | 80%    | Exceeded |

**Total Tests: 5,061+** | **Test Suites: 96+**

---

## Session 2026-01-09 - Documentation CTO & Frontend Sprint 1

### Documentation CTO

- [x] **CTO_BRIEFING.md** - Technical overview complet
- [x] **TEAM_SCALING_PROPOSAL.md** - Proposition équipe 10 devs

### Frontend Sprint 1-2 (Plan CTO Q2)

- [x] **FE-01**: Storybook 10.x initialisé
  - 7 stories UI: Button, Card, Badge, Input, Modal, Spinner, Avatar
  - Design tokens documentation
- [x] **FE-02**: Design tokens (`apps/web/styles/tokens.css`)
  - Colors, spacing, typography, shadows, transitions
- [x] **FE-03**: Dark mode architecture
  - CSS custom properties theming
  - `useTheme` hook + `ThemeToggle` component
  - Light/Dark/System support

### Backend Sprint 1-2 (Plan CTO Q2)

- [x] **CORE-03**: Optimisation queries N+1 restantes
  - cashless.service.ts: aggregate() au lieu de findMany+reduce
  - vendors.service.ts: Map pour O(1) lookups
  - program.service.ts: Single OR query pour détection conflits

### Commits

- `ec54174` feat(web): implement Storybook, design tokens and dark mode
- `96334df` docs: add CTO technical briefing and team scaling proposal
- `9db48be` perf(api): optimize N+1 queries in cashless, vendors and program modules

---

## Session 2026-01-09 - Mobile Offline-First Architecture

### MOB-02: Architecture offline-first WatermelonDB

- [x] **Database Setup** (`src/database/`)
  - `index.ts` - Database initialization with SQLite adapter
  - `schema.ts` - WatermelonDB schema (10 tables)
  - `migrations.ts` - Database migrations framework

- [x] **Models** (`src/database/models/`)
  - `User.ts` - User model with roles/status
  - `Festival.ts` - Festival model with capacity tracking
  - `Ticket.ts` - Ticket model with QR code support
  - `Artist.ts` - Artist model with social links
  - `Performance.ts` - Performance model with scheduling
  - `CashlessAccount.ts` - Digital wallet with balance
  - `CashlessTransaction.ts` - Transaction history
  - `Notification.ts` - Push/in-app notifications
  - `SyncMetadata.ts` - Sync state tracking
  - `SyncQueueItem.ts` - Offline mutation queue

- [x] **Sync Service** (`src/services/sync/`)
  - `SyncService.ts` - Bidirectional sync with backend
  - `SyncQueue.ts` - Queue for offline mutations
  - `ConflictResolver.ts` - Handle sync conflicts (server-wins, client-wins, merge)

- [x] **Hooks** (`src/hooks/`)
  - `useDatabase.ts` - Database access hook
  - `useSync.ts` - Sync status and triggers
  - `useOfflineFirst.ts` - Offline-first data fetching

- [x] **Provider** (`src/providers/`)
  - `DatabaseProvider.tsx` - React context for database

- [x] **Dependencies**
  - Updated `package.json` with @nozbe/watermelondb, uuid, @react-native-community/netinfo
  - Updated `.babelrc.js` with decorator support

---

## Session 2026-01-09 - Currency Module Live Exchange Rates

### Enhanced Currency Module with Live Exchange Rate Fetching

- [x] **Exchange Rate Providers** (`apps/api/src/modules/currency/providers/`)
  - `exchange-rate-provider.interface.ts` - Provider interface with health monitoring
  - `ecb-provider.ts` - European Central Bank (free, EUR base)
  - `openexchange-provider.ts` - Open Exchange Rates (multi-currency)
  - `fixer-provider.ts` - Fixer.io provider
  - `fallback-provider.ts` - Static fallback rates

- [x] **Updated ExchangeRateService** (`services/exchange-rate.service.ts`)
  - Provider failover with priority ordering
  - Rate smoothing (30% weight, 5% max change threshold)
  - Rate confidence scoring
  - Historical rate tracking
  - Volatility metrics calculation

- [x] **ExchangeRateScheduler** (`services/exchange-rate-scheduler.ts`)
  - Scheduled rate updates (15 min default)
  - Business hours awareness (10 min during, 30 min off-hours)
  - Provider rate limit handling
  - Rate change logging

- [x] **RateAlertService** (`services/rate-alert.service.ts`)
  - Alert when rate changes > threshold (default 2%)
  - User subscriptions for rate alerts
  - Rate volatility tracking

- [x] **New API Endpoints**
  - `GET /currency/rates/live` - Live rates with metadata & 24h changes
  - `GET /currency/rates/history/:currency?days=30` - Historical rates
  - `POST /currency/rates/alerts` - Subscribe to rate alerts
  - `GET /currency/rates/volatility` - Volatility metrics
  - `GET /currency/rates/status` - Provider health (admin)

- [x] **Configuration** (`currency.config.ts`)
  - Provider API keys configuration
  - Rate limits per provider
  - Fallback order
  - Update intervals

- [x] **Prisma Schema**
  - Added `RateAlertSubscription` model

---

## Session 2026-01-09 - Mobile Offline Mode with Bidirectional Sync

### Enhanced Offline Sync Architecture

- [x] **SyncService Enhanced** (`src/services/sync/SyncService.ts`)
  - Delta sync (only sync changed records)
  - Status tracking per entity type
  - Background sync when app goes to foreground
  - Periodic sync interval (configurable, default 5 min)
  - Network reconnection auto-sync
  - Sync throttling to prevent excessive syncing
  - Abort controller for cancellable operations

- [x] **SyncManager** (`src/services/sync/SyncManager.ts`)
  - Sync lifecycle management
  - Sync priorities (CRITICAL, HIGH, MEDIUM, LOW, BACKGROUND)
  - Sync batching for large datasets
  - Progress reporting with time estimation
  - Task management (pending, running, completed, failed)
  - Retry failed sync

- [x] **OfflineMutationHandler** (`src/services/sync/OfflineMutationHandler.ts`)
  - Queue mutations when offline
  - Replay mutations when back online
  - Mutation ordering and dependencies
  - Conflict detection and resolution
  - Mutation merging for same entity
  - Auto-replay on reconnection

- [x] **Hooks**
  - `useOfflineStatus.ts` - Track online/offline state with connection quality
  - `useSyncProgress.ts` - Track detailed sync progress
  - `usePendingMutations.ts` - Show pending offline changes

- [x] **SyncIndicator Component** (`src/components/SyncIndicator.tsx`)
  - Show sync status in UI (minimal, compact, expanded variants)
  - Show pending changes count
  - Manual sync trigger button
  - Progress bar during sync
  - Error and conflict indicators
  - Dark/light theme support

- [x] **NetworkStatusProvider** (`src/providers/NetworkStatusProvider.tsx`)
  - Monitor network connectivity
  - Trigger sync on reconnection
  - Provide network context to app
  - Connection quality detection
  - Latency measurement
  - Background/foreground sync

---

## Session 2026-01-09 - Multi-Currency Invoicing System

### Invoice Module Implementation

- [x] **Prisma Schema** (`prisma/schema.prisma`)
  - Added `InvoiceStatus` enum (DRAFT, SENT, PAID, OVERDUE, CANCELLED)
  - Added `Invoice` model with multi-currency support
  - Added `InvoiceItem` model for line items

- [x] **DTOs** (`apps/api/src/modules/invoices/dto/`)
  - `create-invoice.dto.ts` - Create invoice with items validation
  - `update-invoice.dto.ts` - Partial update DTO
  - `invoice-response.dto.ts` - Response interfaces with formatted prices
  - `invoice-filter.dto.ts` - Filter options for listing
  - `invoice-stats.dto.ts` - Statistics aggregation DTO

- [x] **Services** (`apps/api/src/modules/invoices/services/`)
  - `invoice-generator.service.ts` - Invoice number generation (INV-YEAR-CODE-SEQ)
  - `tax.service.ts` - VAT rates by country, B2B reverse charge
  - `invoice-pdf.service.ts` - PDF generation with PDFKit, QR codes
  - `invoice-email.service.ts` - Send invoices, reminders, receipts

- [x] **Core Module**
  - `invoices.service.ts` - CRUD, status management, statistics
  - `invoices.controller.ts` - API endpoints with Swagger docs
  - `invoices.module.ts` - NestJS module configuration

- [x] **API Endpoints**
  - POST /invoices - Create invoice
  - GET /invoices - List with filters
  - GET /invoices/stats - Statistics
  - GET /invoices/tax-rates - VAT rates by country
  - GET /invoices/:id - Get by ID
  - GET /invoices/:id/pdf - Download PDF
  - POST /invoices/:id/send - Send to customer
  - POST /invoices/:id/pay - Mark as paid
  - POST /invoices/:id/cancel - Cancel invoice
  - PATCH /invoices/:id - Update invoice
  - DELETE /invoices/:id - Delete draft
  - POST /invoices/validate-vat - Validate VAT format
  - POST /invoices/calculate-tax - Calculate tax
  - POST /invoices/process-overdue - Process overdue invoices

- [x] **Error Codes** (added to `error-codes.ts`)
  - INVOICE_NOT_FOUND (ERR_15000)
  - INVOICE_ALREADY_PAID (ERR_15001)
  - INVOICE_ALREADY_CANCELLED (ERR_15002)
  - INVOICE_CANNOT_UPDATE (ERR_15003)
  - INVOICE_CANNOT_DELETE (ERR_15004)
  - INVOICE_SEND_FAILED (ERR_15005)
  - INVOICE_PDF_GENERATION_FAILED (ERR_15006)

---

## Session 2026-01-09 - Per-Festival Language Configuration

### Language Module Implementation

- [x] **Prisma Schema Updates** (`prisma/schema.prisma`)
  - Added `SupportedLanguage` enum (FR, EN, DE, ES, IT, NL)
  - Added `FestivalLanguageSettings` model with default/supported languages
  - Added `FestivalLocalizedContent` model for translations
  - Added relation from `Festival` to `FestivalLanguageSettings`

- [x] **DTOs** (`apps/api/src/modules/languages/dto/`)
  - `festival-language-settings.dto.ts` - Create/response DTOs with language info
  - `update-language-settings.dto.ts` - Partial update DTO
  - `language-content.dto.ts` - Localized content DTOs

- [x] **Services** (`apps/api/src/modules/languages/`)
  - `languages.service.ts` - Language settings CRUD, language resolution
  - `localized-content.service.ts` - Merge localized content with base festival

- [x] **Controller** (`apps/api/src/modules/languages/languages.controller.ts`)
  - Language settings endpoints (GET, POST, PUT, DELETE)
  - Localized content endpoints (GET, PUT, DELETE)
  - Supported languages endpoint

- [x] **Middleware** (`apps/api/src/common/middleware/language.middleware.ts`)
  - Accept-Language header detection
  - Query param language override
  - Cookie language support
  - Set Content-Language response header

- [x] **Decorator** (`apps/api/src/common/decorators/locale.decorator.ts`)
  - `@Locale()` - Get full locale info from request
  - `@LocaleCode()` - Get just the locale code
  - `@AcceptLanguage()` - Get Accept-Language header

- [x] **Festival Controller Updates** (`apps/api/src/modules/festivals/festivals.controller.ts`)
  - `GET /festivals/:id/localized` - Get festival with localized content
  - `GET /festivals/by-slug/:slug/localized` - Get by slug with localization

- [x] **API Endpoints Summary**
  - `GET /festivals/:festivalId/languages` - Get supported languages
  - `GET /festivals/:festivalId/languages/settings` - Get language settings
  - `POST /festivals/:festivalId/languages/settings` - Create settings
  - `PUT /festivals/:festivalId/languages/settings` - Update settings
  - `DELETE /festivals/:festivalId/languages/settings` - Delete settings
  - `GET /festivals/:festivalId/languages/content` - Get all localized content
  - `GET /festivals/:festivalId/languages/content/:lang` - Get content for language
  - `PUT /festivals/:festivalId/languages/content/:lang` - Upsert content
  - `DELETE /festivals/:festivalId/languages/content/:lang` - Delete content
  - `GET /festivals/:id/localized?lang=FR` - Get localized festival
  - `GET /festivals/by-slug/:slug/localized?lang=FR` - Get localized by slug

---

## Session 2026-01-09 - Multilingual Transactional Email Templates

### Email Template System Implementation

- [x] **Directory Structure** (`apps/api/src/modules/notifications/templates/emails/`)
  - Created template directories for 9 email types
  - Each type has 6 language subdirectories (fr, en, de, es, it, ar)
  - Each language folder contains: subject.txt, body.html, body.txt (162 files total)

- [x] **Template Types**
  - `welcome` - Welcome email for new users
  - `verify-email` - Email verification
  - `password-reset` - Password reset link
  - `ticket-confirmation` - Ticket purchase confirmation
  - `ticket-reminder` - Event reminder before festival
  - `payment-receipt` - Payment confirmation
  - `refund-confirmation` - Refund processing confirmation
  - `cashless-topup` - Cashless wallet top-up confirmation
  - `order-ready` - Vendor order ready for pickup

- [x] **EmailTemplateService** (`services/email-template.service.ts`)
  - Template loading from filesystem with caching
  - Handlebars variable interpolation
  - Custom helpers: ifEqual, formatCurrency, formatDate, eachWithIndex, isRtl
  - Language fallback to French (default)
  - Type-safe variable interfaces for each email type
  - Sample data generation for template previews

- [x] **EmailPreviewController** (`controllers/email-preview.controller.ts`)
  - Admin-only endpoints for previewing email templates
  - `GET /emails/templates` - List all template types
  - `GET /emails/languages` - List supported languages
  - `GET /emails/preview/:type/:lang` - Preview template as JSON
  - `GET /emails/preview/:type/:lang/html` - Preview raw HTML
  - `GET /emails/preview/:type/:lang/text` - Preview plain text
  - `GET /emails/cache/clear` - Clear template cache

- [x] **Prisma Schema Update** (`prisma/schema.prisma`)
  - Added `emailLanguage` field to `NotificationPreference` model
  - Default value: 'fr' (French)

- [x] **DTO Update** (`dto/notification.dto.ts`)
  - Added `emailLanguage` field to `UpdateNotificationPreferencesDto`
  - Validation for supported languages (fr, en, de, es, it, ar)

- [x] **NotificationsService Updates** (`services/notifications.service.ts`)
  - Integrated `EmailTemplateService`
  - `getUserEmailLanguage()` - Get user's preferred email language
  - `renderEmailForUser()` - Render template in user's language
  - `sendTransactionalEmail()` - Send multilingual transactional email
  - `sendBulkTransactionalEmails()` - Send to multiple users with individual languages
  - `getEmailTemplateTypes()` - List available template types
  - `getSupportedEmailLanguages()` - List supported languages

- [x] **Module Updates** (`notifications.module.ts`)
  - Registered `EmailTemplateService` provider
  - Registered `EmailPreviewController`
  - Exported `EmailTemplateService`

- [x] **Build Verification**: SUCCESS

### Email Template Features

- **RTL Support**: Arabic templates include `dir="rtl"` and appropriate styling
- **Responsive Design**: HTML templates with gradient headers, consistent styling
- **Handlebars Templating**: Conditionals ({{#if}}), loops ({{#each}}), helpers
- **Caching**: Templates cached in memory for performance
- **Fallback**: Automatic fallback to French if translation missing

---

## Session 2026-01-09 - Sprint 5-6: Internationalization Complete

### FE-07/08/09: Multi-language Support

- [x] **Spanish (ES)** - Complete translation files
- [x] **German (DE)** - Complete translation files
- [x] **Italian (IT)** - Complete translation files

### FE-10: RTL Support for Arabic

- [x] **RTL Utilities** (`apps/web/utils/rtl.ts`)
  - `isRtlLocale()` - Detect RTL languages
  - `getDirection()` - Get text direction
  - `getDirectionalPositions()` - Logical position mapping
  - `getMirrorTransform()` - Icon mirroring
- [x] **useDirection hook** - Direction-aware components
- [x] **DirectionProvider** - App-wide direction context
- [x] **Tailwind RTL plugins** - Logical properties utilities
  - `rtl:`, `ltr:` variants
  - `ms-*`, `me-*`, `ps-*`, `pe-*` spacing
  - `start-*`, `end-*` positioning
  - `text-start`, `text-end` alignment

### MOB-05: Mobile i18n with i18next

- [x] **i18next setup** with react-i18next and expo-localization
- [x] **LanguageProvider** - Language state management
- [x] **useTranslation hook** - Component translations
- [x] **LanguageSelector component** - Visual language picker
- [x] **6 language translations** (FR, EN, DE, ES, IT, AR)

### MOB-06: Locale-Aware Formatters

- [x] **Formatters library** (`libs/shared/i18n/src/lib/formatters/`)
  - `date-formatter.ts` - Localized date/time formatting
  - `number-formatter.ts` - Numbers, percentages, file sizes
  - `currency-formatter.ts` - Multi-currency with symbols
  - `relative-time.ts` - "5 minutes ago" style formatting
- [x] **Web hooks** - useFormatDate, useFormatNumber, useFormatCurrency, useRelativeTime
- [x] **Mobile hooks** - Same formatting hooks for React Native

### PLAT-01: Per-Festival Language Configuration

- [x] **Languages module** (`apps/api/src/modules/languages/`)
  - Language settings CRUD
  - Localized content service
- [x] **Middleware** - Accept-Language detection, query/cookie override
- [x] **Decorators** - @Locale, @LocaleCode, @AcceptLanguage
- [x] **Prisma schema** - FestivalLanguageSettings, FestivalLocalizedContent

### PLAT-02: Multilingual Email Templates

- [x] **9 email template types** (welcome, verify-email, password-reset, etc.)
- [x] **6 language versions each** (162 template files total)
- [x] **EmailTemplateService** - Handlebars rendering with caching
- [x] **EmailPreviewController** - Admin template preview
- [x] **RTL support** for Arabic templates

### Commits Sprint 5-6

- `51c66e4` feat(i18n): add Spanish, German, Italian and Arabic translations
- `efa31df` feat(web): implement RTL support for Arabic language
- `fe04b58` feat(mobile): implement i18n with i18next
- `be3b4e7` feat(i18n): add locale-aware formatting utilities
- `424c895` feat(api): implement per-festival language configuration
- `d987bd1` feat(notifications): add multilingual transactional email templates
- `ce8a65a` chore: update shared libs and dependencies for i18n

---

## Session 2026-01-09 - CORE-01: Kubernetes Production Deployment

### CD Pipeline (`.github/workflows/cd.yml`)

- [x] Multi-environment deployment (staging, production)
- [x] Docker image build and push to GHCR
- [x] Automatic database migrations
- [x] Rollout verification and health checks
- [x] Slack notifications
- [x] Manual rollback capability

### Database Jobs (`k8s/jobs/`)

- [x] Prisma migration job for deployments
- [x] Automated daily backup CronJob to S3/GCS
- [x] Manual backup job template
- [x] 30-day retention policy

### Monitoring (`k8s/monitoring/`)

- [x] ServiceMonitor for API, Web, PostgreSQL, Redis
- [x] PrometheusRule with 25+ alerting rules
- [x] Alerts for: error rates, latency, memory, connections
- [x] Business alerts for payments and tickets

### GitOps (`k8s/argocd/`)

- [x] ArgoCD Application for staging (auto-sync)
- [x] ArgoCD Application for production (manual sync)
- [x] AppProject with RBAC roles
- [x] ApplicationSet for multi-environment

### Local Development

- [x] Skaffold config for hot-reload (`skaffold.yaml`)
- [x] Port forwarding configuration
- [x] Custom actions for migrate/seed
- [x] Multi-profile support (dev, staging, production)

### Deployment Script (`scripts/deploy.sh`)

- [x] Unified deployment across environments
- [x] Build, migrate, dry-run, rollback options
- [x] Status verification and reporting

### Commit

- `f376411` feat(infra): complete Kubernetes production deployment (CORE-01)

---

## Session 2026-01-09 - CORE-02: Monitoring Prometheus/Grafana

### Grafana Dashboards (`k8s/monitoring/grafana/dashboards/`)

- [x] `api-overview.json` - API Overview Dashboard
  - Success rate, P95 latency, request rate, errors/min
  - HTTP traffic by method and status
  - Latency percentiles (p50, p90, p95, p99)
  - Top 10 endpoints by rate and slowest
  - Memory usage and Node.js handles

- [x] `database.json` - PostgreSQL Dashboard
  - Connection status, active connections, queries/sec
  - Query latency percentiles by operation
  - Top 10 models by query rate and slowest
  - Connection pool usage
  - Transactions and locks

- [x] `redis.json` - Redis Cache Dashboard
  - Cache hit rate, memory used, total keys
  - Hits vs misses over time
  - Memory fragmentation ratio
  - Client connections and commands/sec

- [x] `business-metrics.json` - Business Metrics Dashboard
  - Tickets sold/validated (24h)
  - Revenue and cashless spending
  - Current attendees and capacity
  - Payments by provider and status
  - Cashless flow and top vendors
  - Zone occupancy in real-time

### Prometheus Stack (`k8s/monitoring/`)

- [x] `prometheus-stack-values.yaml` - Helm values for kube-prometheus-stack
  - Grafana configuration with persistence and plugins
  - Prometheus with 30d retention, 50Gi storage
  - HA setup (2 replicas each)
  - Additional scrape configs for Festival API
  - Dashboard provisioning via ConfigMaps

- [x] `alertmanager-config.yaml` - Alertmanager configuration
  - Slack integration (5 channels: critical, warnings, business, database, infra)
  - PagerDuty integration for on-call
  - Email notifications for reports
  - Route-based alert routing by severity
  - Inhibition rules to reduce noise
  - Custom templates for Slack and email

- [x] `grafana-dashboards-configmap.yaml` - Dashboard provisioning

- [x] `README.md` - Documentation and quick start guide

---

## Prochaines Tâches (Plan CTO Q3)

### Infrastructure

- [x] **CORE-01**: Migration Kubernetes production ✅
- [x] **CORE-02**: Monitoring Prometheus/Grafana ✅

### Mobile

- [ ] **MOB-01**: Audit performance React Native

### Session 2026-01-09-10 - Corrections & Améliorations

- [x] **Cross-origin cookie fix**: Added Next.js proxy for web and admin apps
- [x] **2FA Module**: Implemented TOTP two-factor authentication
- [x] **Missing pages**: Created about, contact, faq, terms, privacy, artists pages
- [x] **Bug fixes**: Fixed admin error.tsx, profile page, image configuration

### Session 2026-01-10 - Button & Form Fixes (Web App)

- [x] **Header Sign Out**: Added `handleSignOut` function with `useAuthStore().logout()`
- [x] **Register OAuth buttons**: Changed from `<button>` to `<a>` with proper hrefs
- [x] **Register form**: Changed from fake setTimeout to real `useAuthStore().register()`
- [x] **Login OAuth links**: Fixed to use proxy route `/api/auth/google|github`
- [x] **LoginDto fix**: Added `rememberMe` optional field to fix validation error
- [x] **Forgot password page**: Created new `/auth/forgot-password` page
- [x] **Footer newsletter**: Added state management and form handler with success state
- [x] **Festivals page filters**: Converted to client component with working filters
  - Search by name/location/description
  - Status filter (upcoming/ongoing/completed)
  - Month filter
  - Sort by date/price/name
  - Load more pagination
  - Clear filters button
- [x] **Festival detail page**:
  - Created `FestivalShare` component with Twitter/Facebook/Web Share API
  - Created `FestivalLineup` component with expand/collapse functionality
  - Replaced static buttons with functional components
- [x] **OAuth Guards**: Added BadRequestException with clear error messages
  - Google OAuth guard now throws descriptive error when not configured
  - GitHub OAuth guard now throws descriptive error when not configured
  - Added GitHub OAuth config to .env.example
- [x] **Contact Form**: Converted to client component with full form handling
  - Form validation, loading states, success feedback
  - Proper error handling

### Session 2026-01-10 - Mock Data & Mobile Fixes

- [x] **Mobile App Entry Points**: Created missing App.tsx and index.js
  - Added proper GestureHandlerRootView and SafeAreaProvider
  - Configured package.json with correct main entry point
- [x] **Festivals Page Mock Data**: Added fallback mock data when API unavailable
  - 6 sample French festivals (Summer Vibes, Rock en Seine, Jazz à Vienne, Hellfest, Les Vieilles Charrues, Solidays)
  - Graceful fallback in catch block
- [x] **Mobile Web Platform Fixes**: Fixed import.meta error on web
  - Added resolveRequest to metro.config.js for web mocks
  - Alias react-native-push-notification to web mock
  - Alias @react-native-community/netinfo to web mock
  - Removed unused vite.config.mts (Expo uses Metro)
  - Installed @expo/metro-runtime for web support

### Commits

- `28375f1` fix(mobile): add missing App entry point for Expo bundling
- `f5a8b55` fix(web): add mock data fallback for festivals page when API unavailable
- `e09e027` fix(mobile): add web platform module aliases and remove vite config

### Completed (Q2)

- [x] **MOB-02**: Architecture offline-first WatermelonDB
- [x] **MOB-03**: Enhanced bidirectional sync with offline mutations
- [x] **Sprint 5-6**: Full internationalization (6 languages + RTL)
- [x] **CORE-01**: Kubernetes production deployment
- [x] **CORE-02**: Prometheus/Grafana monitoring

---

---

## Session 2026-01-14 - Story 1.1: Test Coverage API

### BMM Workflow Initialization

- [x] **Workflow Status**: Created `bmm-workflow-status.yaml` tracking file
- [x] **Sprint Status**: Updated epic-1 to "in-progress"

### Auth Module Test Coverage (Story 1.1 - Task 1)

**5 nouveaux fichiers de tests créés:**

- [x] `jwt.strategy.spec.ts` - 15 tests
  - Token validation, user retrieval, error handling
- [x] `google.strategy.spec.ts` - 23 tests
  - OAuth callback, profile extraction, missing email handling
- [x] `github.strategy.spec.ts` - 25 tests
  - OAuth callback, name parsing, missing email handling
- [x] `google-oauth.guard.spec.ts` - 19 tests
  - OAuth enabled/disabled, credentials validation, handleRequest
- [x] `github-oauth.guard.spec.ts` - 19 tests
  - OAuth enabled/disabled, credentials validation, handleRequest

**Test Results:**

- **Total Tests**: 5,157 (all passing)
- **Test Suites**: 101

### Story Status

- **Story**: 1-1-test-coverage-api
- **Status**: in-progress
- **Completed**: Task 1 (Auth module - 5 new test files)
- **Remaining**: Tasks 2-5 (edge cases for tickets, payments, cashless)

### Files Created

```
apps/api/src/modules/auth/strategies/
├── jwt.strategy.spec.ts          (NEW - 225 lines)
├── google.strategy.spec.ts       (NEW - 225 lines)
└── github.strategy.spec.ts       (NEW - 240 lines)

apps/api/src/modules/auth/guards/
├── google-oauth.guard.spec.ts    (NEW - 230 lines)
└── github-oauth.guard.spec.ts    (NEW - 230 lines)
```

---

_Dernière mise à jour: 2026-01-14_
