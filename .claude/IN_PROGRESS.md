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

### Edge Cases Tests (Story 1.1 - Tasks 2-4)

**Tickets Module Edge Cases** - 18 tests ajoutés:

- Concurrent quota validation
- Simultaneous ticket purchases
- Invalid QR code format
- Expired QR signatures
- Double-scan prevention
- Transfer to non-existent user
- Self-transfer prevention
- Quota exceeded on recipient

**Payments Module Edge Cases** - 13 tests ajoutés:

- Webhook replay attack prevention
- Out-of-order event handling
- Idempotency validation
- Partial refund edge cases
- Refund on cancelled payment
- Multiple refund attempts
- Currency conversion (very small/large amounts)

**Cashless Module Edge Cases** - 23 tests ajoutés:

- Two transactions hitting daily limit simultaneously
- Race condition on balance update
- Exact max balance topup
- Daily limit at day boundary
- Min/max topup edge values
- Invalid NFC tag format
- Tag reassignment scenarios

### Story Status

- **Story**: 1-1-test-coverage-api
- **Status**: COMPLETED
- **Total Tests**: 5,210 (all passing)
- **Test Suites**: 101

### Files Created/Modified

```
apps/api/src/modules/auth/strategies/
├── jwt.strategy.spec.ts          (NEW - 225 lines)
├── google.strategy.spec.ts       (NEW - 225 lines)
└── github.strategy.spec.ts       (NEW - 240 lines)

apps/api/src/modules/auth/guards/
├── google-oauth.guard.spec.ts    (NEW - 230 lines)
└── github-oauth.guard.spec.ts    (NEW - 230 lines)

apps/api/src/modules/tickets/tickets.service.spec.ts     (MODIFIED - +18 tests)
apps/api/src/modules/payments/payments.service.spec.ts   (MODIFIED - +13 tests)
apps/api/src/modules/cashless/cashless.service.spec.ts   (MODIFIED - +23 tests)
```

---

## Session 2026-01-15 - Story 2.3: Granular Rate Limiting for Sensitive Endpoints

### Rate Limiting Implementation

- [x] **POST /auth/login**: 5 req/min per IP (already configured)
- [x] **POST /auth/register**: Updated from 5 to 3 req/min per IP
- [x] **POST /tickets/purchase**: Added 10 req/min per user rate limit
- [x] **POST /cashless/pay**: Added 60 req/min per user rate limit (high for POS usage)

### 429 Response Features

- [x] **Retry-After header**: Properly set when rate limit exceeded
- [x] **X-RateLimit-Limit**: Total requests allowed in window
- [x] **X-RateLimit-Remaining**: Remaining requests in current window
- [x] **X-RateLimit-Reset**: Unix timestamp when window resets
- [x] **X-RateLimit-Window**: Window duration in seconds
- [x] **IETF RateLimit headers**: Draft standard headers included

### Tests Added (27 new tests)

- [x] Login rate limiting tests (5 req/min per IP)
- [x] Register rate limiting tests (3 req/min per IP)
- [x] Ticket purchase rate limiting tests (10 req/min per user)
- [x] Cashless payment rate limiting tests (60 req/min per user)
- [x] Retry-After header verification tests
- [x] Per-IP vs per-user rate limit tracking tests
- [x] Rate limit reset after window expiry tests
- [x] 429 response format validation tests

### Files Modified

```
apps/api/src/modules/auth/auth.controller.ts           (MODIFIED - register rate limit 5->3)
apps/api/src/modules/tickets/tickets.controller.ts     (MODIFIED - added purchase rate limit)
apps/api/src/modules/cashless/cashless.controller.ts   (MODIFIED - added pay rate limit)
apps/api/src/common/guards/rate-limit.guard.spec.ts    (MODIFIED - +27 tests for Story 2.3)
```

---

## Session 2026-01-15 - Story 1.3: Critical E2E Tests for Main User Flows

### E2E Test Implementation

- [x] **Flow 1: Purchase Ticket Flow**
  - Create payment intent for ticket purchase
  - Create checkout session for ticket purchase
  - Complete ticket purchase via direct buy
  - Purchase multiple tickets in one transaction
  - Edge cases: sold out, max per user exceeded

- [x] **Flow 2: Login Flow**
  - Login and get tokens (access + refresh)
  - Access protected routes with Bearer token
  - Get complete user profile after login
  - View user tickets after login
  - Token refresh flow

- [x] **Flow 3: Admin Dashboard KPIs**
  - Admin login and role verification
  - Access admin-protected analytics endpoints
  - Fetch festival dashboard KPIs
  - Fetch sales, attendance, and cashless analytics
  - Admin-only endpoint access control

- [x] **Flow 4: Cashless Topup Flow**
  - Create cashless account
  - Create topup via payment checkout
  - Direct topup endpoint
  - Verify balance after topup
  - Track multiple topups correctly
  - Complete topup and spend flow
  - Edge cases: min/max amounts, max balance

- [x] **Cross-Flow Integration Tests**
  - User journey: Registration to Purchase to Spend

### Files Created

```
apps/api-e2e/src/api/user-flows.e2e-spec.ts    (NEW - ~750 lines)
```

### Test Coverage

- **Total Test Cases**: ~40+ new E2E tests
- **User Flows Covered**: 4 main flows + 1 integration flow
- **Edge Cases**: ~15 edge case scenarios

---

## Session 2026-01-15 - Story 2.2: Optimize Prisma N+1 Queries

### N+1 Query Optimizations

**Files Modified:**

- [x] `users.service.ts` - Optimized `getActivity()` to use `_count` aggregations in single query
- [x] `payments.service.ts` - Added `include: { user }` to `getPayment()` and `getUserPayments()`
- [x] `staff.service.ts` - Parallel fetch of user and festival in `createStaffMember()`
- [x] `zones.service.ts` - Added `select` for minimal data in `create()` and `findAllByFestival()`
- [x] `invoices.service.ts` - Parallel fetch of festival and user in `create()`
- [x] `camping.service.ts` - Parallel fetch in `createSpot()` and `getStatistics()`

### Optimizations Applied:

1. **users.service.ts (getActivity)**
   - Before: 3 sequential queries (user, tickets count, payments count)
   - After: Single query with `_count` aggregations

2. **payments.service.ts (getPayment, getUserPayments)**
   - Before: No includes, potential N+1 when accessing user data
   - After: Includes user relation with selected fields

3. **staff.service.ts (createStaffMember)**
   - Before: Sequential festival and user queries
   - After: Promise.all() for parallel fetching

4. **zones.service.ts (create, findAllByFestival)**
   - Before: Full festival fetch
   - After: Minimal select (only id, organizerId)

5. **invoices.service.ts (create)**
   - Before: Sequential festival and user queries
   - After: Promise.all() for parallel fetching

6. **camping.service.ts (createSpot, getStatistics)**
   - Before: Sequential zone and existing spot queries, loop for daily occupancy
   - After: Promise.all() for parallel queries, batch daily occupancy queries

### Story Status

- **Story**: 2-2-optimize-prisma-queries
- **Status**: COMPLETED (NOT COMMITTED per instructions)

---

## Session 2026-01-15 - Story 3.1: Improve Offline Synchronization for Mobile App

### Enhanced Offline Sync Implementation

- [x] **OfflineIndicator Component** (`src/components/OfflineIndicator.tsx`)
  - Prominent banner for offline mode
  - Animated slide-in/out when connectivity changes
  - Shows pending changes count
  - Connection quality indicator (signal bars)
  - Manual sync trigger button
  - Supports top/bottom positioning

- [x] **BackgroundSyncService** (`src/services/sync/BackgroundSyncService.ts`)
  - Background sync using Expo TaskManager (when available)
  - Automatic sync on network reconnection
  - App state monitoring (foreground/background)
  - Configurable sync intervals
  - Event-driven status updates
  - Graceful fallback when native modules unavailable

- [x] **TicketCacheService** (`src/services/sync/TicketCacheService.ts`)
  - Ensures tickets cached after first fetch
  - QR codes available offline
  - Cache status tracking
  - Preload functionality for offline preparation
  - Valid ticket filtering
  - Mark as used locally (syncs later)

- [x] **useBackgroundSync Hook** (`src/hooks/useBackgroundSync.ts`)
  - React hook for background sync management
  - Enable/disable functionality
  - Sync status monitoring
  - Time until next sync calculation

- [x] **useTicketCache Hook** (`src/hooks/useTicketCache.ts`)
  - React hook for ticket caching
  - Cache status and statistics
  - QR code retrieval for offline display
  - Preload and clear cache actions

### Already Implemented (Verified)

- [x] **Automatic sync on reconnection** - Already in SyncService.ts (lines 284-298)
  - Network listener triggers sync when coming back online
  - Debounced to prevent excessive syncing

- [x] **Conflict resolution (server wins)** - Already in ConflictResolver.ts
  - Default strategy: server-wins for most entities
  - Tickets: server-wins for status, usedAt, usedByStaffId
  - Artists: client-wins for isFavorite (preserves local favorites)
  - Notifications: merge strategy with custom rules

### Dependencies Added

- `expo-background-fetch: ~13.0.5`
- `expo-task-manager: ~12.0.5`

### Files Created/Modified

```
apps/mobile/src/components/OfflineIndicator.tsx       (NEW - ~270 lines)
apps/mobile/src/services/sync/BackgroundSyncService.ts (NEW - ~500 lines)
apps/mobile/src/services/sync/TicketCacheService.ts   (NEW - ~350 lines)
apps/mobile/src/hooks/useBackgroundSync.ts            (NEW - ~170 lines)
apps/mobile/src/hooks/useTicketCache.ts               (NEW - ~180 lines)
apps/mobile/src/components/index.ts                   (MODIFIED - exports)
apps/mobile/src/services/sync/index.ts                (MODIFIED - exports)
apps/mobile/src/hooks/index.ts                        (MODIFIED - exports)
apps/mobile/package.json                              (MODIFIED - dependencies)
```

### Story Status

- **Story**: 3-1-improve-offline-sync
- **Status**: COMPLETED (NOT COMMITTED per instructions)

---

## Session 2026-01-15 - Story 4.3: Notification Center for Admin Dashboard

### NotificationCenter Implementation

- [x] **useNotifications Hook** (`apps/admin/hooks/useNotifications.ts`)
  - State management for notifications
  - localStorage persistence for read state
  - Add/remove/mark as read functionality
  - Filter by category (purchase, refund, support, system, festival, security)
  - Filter by read/unread status
  - Sample notifications for initial demo

- [x] **useSocketNotifications Hook** (`apps/admin/hooks/useSocketNotifications.ts`)
  - Socket.io integration using existing useSocketIO hook
  - Real-time notification events from events gateway
  - Event handlers for: new_purchase, refund_request, support_ticket, zone_alert, system_alert
  - Connection state tracking
  - Room join/leave for festival-specific notifications

- [x] **NotificationCenter Component** (`apps/admin/components/notifications/NotificationCenter.tsx`)
  - Bell icon with unread count badge (red, shows 99+ for large counts)
  - Dropdown list with notifications and relative timestamps
  - Category badges with icons (purchase, refund, support, etc.)
  - Type-based styling (info, success, warning, error, alert)
  - Mark as read (individual and all)
  - Delete individual notifications
  - Connection status indicator (Live/Hors ligne)
  - Filter tabs (All/Unread)
  - Action links for each notification type
  - Dark mode support
  - Keyboard navigation (Escape to close)
  - Click outside to close

- [x] **AdminHeader Integration** (`apps/admin/components/layout/AdminHeader.tsx`)
  - Replaced inline notification system with NotificationCenter component
  - Added click-outside handling for profile dropdown
  - Cleaned up unused state and variables

### Notification Types Supported

| Event | Type | Category | Action URL |
|-------|------|----------|------------|
| new_purchase | success | purchase | /orders |
| refund_request | warning | refund | /refunds |
| support_ticket | info | support | /support |
| zone_alert | alert | festival | /zones |
| system_alert | warning/error | system | - |
| generic notification | varies | varies | varies |

### Files Created/Modified

```
apps/admin/hooks/useNotifications.ts          (NEW - ~260 lines)
apps/admin/hooks/useSocketNotifications.ts    (NEW - ~220 lines)
apps/admin/hooks/index.ts                     (MODIFIED - added exports)
apps/admin/components/notifications/NotificationCenter.tsx (MODIFIED - ~530 lines)
apps/admin/components/notifications/index.ts  (MODIFIED - added exports)
apps/admin/components/layout/AdminHeader.tsx  (MODIFIED - integrated NotificationCenter)
```

### Features Implemented

- Bell icon with unread count badge
- Dropdown list of notifications with timestamps
- Notification types: new purchase, refund request, support ticket
- Mark as read (individual and all)
- WebSocket real-time updates via events gateway
- Read state persistence in localStorage

### Story Status

- **Story**: 4-3-notification-center-admin
- **Status**: COMPLETED (NOT COMMITTED per instructions)

---

## Session 2026-01-15 - Story 4.1: Real-Time Dashboard Updates via WebSocket

### WebSocket Implementation

- [x] **useSocketIO Hook** (`apps/admin/hooks/useSocketIO.ts`)
  - Socket.IO client connection management
  - Auto-reconnection with configurable attempts
  - Connection state tracking (connected, connecting, reconnecting, disconnected, error)
  - Event subscription/unsubscription
  - Auth token from cookie for authenticated connections

- [x] **useRealTimeData Hook** (`apps/admin/hooks/useRealTimeData.ts`)
  - Dual WebSocket connections: /zones and /events namespaces
  - Real-time zone occupancy updates
  - Real-time transaction notifications
  - Ticket sales and revenue tracking
  - Fallback polling when WebSocket unavailable (configurable interval)
  - Alert acknowledgement functionality

- [x] **ConnectionStatusIndicator Component** (`apps/admin/components/dashboard/ConnectionStatusIndicator.tsx`)
  - Visual indicator for WebSocket connection status
  - States: connected (green pulse), connecting (yellow), reconnecting (orange), disconnected (gray), error (red)
  - Last update timestamp display
  - Reconnect button for error/disconnected states
  - Compact dot variant for headers/sidebars

- [x] **RealTimeStatCard Component** (`apps/admin/components/dashboard/RealTimeStatCard.tsx`)
  - Animated value updates with smooth transitions
  - Live indicator badge when connected
  - Trend indicators (up/down/stable)
  - Flash effect on value changes
  - Supports number, currency, percentage formats

- [x] **ZoneOccupancyWidget Component** (`apps/admin/components/dashboard/ZoneOccupancyWidget.tsx`)
  - Real-time zone capacity display
  - Progress bars with color-coded thresholds (<75% green, 75-90% yellow, 90-98% orange, >98% red)
  - Trend indicators per zone
  - Entry/exit counts per hour
  - Total occupancy summary

- [x] **RecentTransactionsWidget Component** (`apps/admin/components/dashboard/RecentTransactionsWidget.tsx`)
  - Live transaction feed (ticket sales, cashless topup, payments, refunds)
  - New transaction highlight animation
  - Transaction type icons and color coding
  - Revenue summary calculation
  - Transaction counts by type

### Dashboard Updates

- [x] **Main Dashboard Page** (`apps/admin/app/(dashboard)/page.tsx`)
  - Integrated useRealTimeData hook for WebSocket connection
  - Connection status indicator in header
  - Real-time stat cards with live updates
  - Zone occupancy widget
  - Recent transactions widget
  - Manual refresh button

- [x] **Realtime Dashboard Page** (`apps/admin/app/(dashboard)/realtime/page.tsx`)
  - Dedicated real-time monitoring page
  - 10-second polling interval as fallback
  - Alert display and acknowledgement
  - Activity charts with live data
  - Revenue per hour charts

### Dependencies Added

- `socket.io-client@^4.8.3` - Client library for Socket.IO

### Files Created/Modified

```
apps/admin/hooks/useSocketIO.ts                              (NEW - ~175 lines)
apps/admin/hooks/useRealTimeData.ts                          (MODIFIED - ~530 lines)
apps/admin/hooks/index.ts                                    (MODIFIED - added exports)
apps/admin/components/dashboard/ConnectionStatusIndicator.tsx (NEW - ~200 lines)
apps/admin/components/dashboard/RealTimeStatCard.tsx         (NEW - ~185 lines)
apps/admin/components/dashboard/ZoneOccupancyWidget.tsx      (NEW - ~230 lines)
apps/admin/components/dashboard/RecentTransactionsWidget.tsx (NEW - ~200 lines)
apps/admin/app/(dashboard)/page.tsx                          (MODIFIED - real-time integration)
apps/admin/app/(dashboard)/realtime/page.tsx                 (MODIFIED - use new components)
package.json                                                  (MODIFIED - socket.io-client)
```

### WebSocket Namespaces Used

- `/zones` - Zone occupancy updates, zone alerts
- `/events` - Transactions, notifications, general events

### Fallback Mechanism

When WebSocket is unavailable:
- Auto-detects connection failure
- Falls back to HTTP polling at configurable interval (default 30s on main dashboard, 10s on realtime page)
- Reconnects to WebSocket when available again
- Stops polling when WebSocket reconnects

### Story Status

- **Story**: 4-1-realtime-dashboard-websocket
- **Status**: COMPLETED (NOT COMMITTED per instructions)

---

## Session 2026-01-15 - Story 4.2: Excel Export Functionality for Admin

### Excel Export Implementation

- [x] **ExcelJS Package** - Added to package.json with class-transformer and class-validator
- [x] **ExcelExportService** (`apps/api/src/modules/analytics/services/excel-export.service.ts`)
  - Professional XLSX generation with ExcelJS library
  - Styled headers with indigo background
  - Column auto-width calculation
  - Currency, percentage, date formatting
  - Auto-filter support
  - Alternating row colors
  - Multiple worksheet support

- [x] **AdminExportController** (`apps/api/src/modules/analytics/controllers/admin-export.controller.ts`)
  - `GET /admin/export/tickets` - Export tickets to XLSX
  - `GET /admin/export/transactions` - Export cashless transactions to XLSX
  - `GET /admin/export/participants` - Export participants with filters
  - `GET /admin/export/jobs/:jobId` - Check async export job status
  - `GET /admin/export/download/:jobId` - Download completed export file
  - Async processing for large exports (>10K rows)
  - Returns job ID for progress tracking

- [x] **ExportProcessor** (`apps/api/src/modules/queue/processors/export.processor.ts`)
  - BullMQ job processor for async exports
  - Batch processing (1000 rows at a time)
  - Progress updates during export
  - Temporary file storage with 24h cleanup
  - Support for tickets, transactions, participants

- [x] **Admin Export Library** (`apps/admin/lib/export.ts`)
  - `exportTicketsToXlsx()` - Server-side ticket export
  - `exportTransactionsToXlsx()` - Server-side transaction export
  - `exportParticipantsToXlsx()` - Server-side participant export
  - `getExportJobStatus()` - Poll job status
  - `downloadExportFile()` - Download completed file
  - `pollExportJob()` - Auto-poll until completion

- [x] **ExportButton Component** (`apps/admin/components/export/ExportButton.tsx`)
  - Updated to support server-side XLSX exports
  - Progress bar for async exports
  - `ServerExportButton` variant for large datasets
  - Multiple format support (CSV, Excel XML, JSON, XLSX server)

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/export/tickets` | GET | Export tickets with filters |
| `/admin/export/transactions` | GET | Export cashless transactions |
| `/admin/export/participants` | GET | Export festival participants |
| `/admin/export/jobs/:jobId` | GET | Check export job status |
| `/admin/export/download/:jobId` | GET | Download completed export |

### Query Parameters

**Common filters:**
- `festivalId` (required) - Festival to export from
- `startDate` - Filter by date range start (ISO)
- `endDate` - Filter by date range end (ISO)

**Tickets:**
- `status` - SOLD, USED, CANCELLED, REFUNDED
- `categoryId` - Filter by ticket category

**Transactions:**
- `type` - TOPUP, PAYMENT, REFUND, TRANSFER

**Participants:**
- `hasTicket` - Only users with tickets
- `hasCashless` - Only users with cashless accounts

### Async Export Flow (>10K rows)

1. Request export -> Returns `{ async: true, jobId: "xxx", totalRows: N }`
2. Poll `/admin/export/jobs/:jobId` -> Returns progress 0-100%
3. When completed -> Download from `/admin/export/download/:jobId`
4. File automatically deleted after 24 hours

### Files Created/Modified

```
package.json                                             (MODIFIED - added exceljs, class-transformer, class-validator)
apps/api/src/modules/analytics/services/excel-export.service.ts    (NEW - ~400 lines)
apps/api/src/modules/analytics/services/index.ts                   (MODIFIED - exports)
apps/api/src/modules/analytics/controllers/admin-export.controller.ts (NEW - ~350 lines)
apps/api/src/modules/analytics/analytics.module.ts                 (MODIFIED - providers/controllers)
apps/api/src/modules/queue/processors/export.processor.ts          (NEW - ~450 lines)
apps/api/src/modules/queue/processors/index.ts                     (MODIFIED - export)
apps/api/src/modules/queue/queue.module.ts                         (MODIFIED - export processor)
apps/admin/lib/export.ts                                           (MODIFIED - +250 lines server export)
apps/admin/components/export/ExportButton.tsx                      (MODIFIED - server export support)
apps/admin/components/export/index.ts                              (MODIFIED - exports)
```

### Story Status

- **Story**: 4-2-excel-export-admin
- **Status**: COMPLETED (NOT COMMITTED per instructions)

---

## Session 2026-01-15 - Story 3.2: Optimize Mobile App Performance and Animations

### FlatList Optimizations

- [x] **ProgramScreen.tsx**
  - Added `windowSize={5}` (render 5 screens worth of content)
  - Added `getItemLayout` for fixed-height items (skip measurement)
  - Added `maxToRenderPerBatch={10}` and `initialNumToRender={8}`
  - Added `removeClippedSubviews={true}` for Android
  - Added `updateCellsBatchingPeriod={50}` for batched updates
  - Memoized `renderEvent` with `useCallback`
  - Memoized `EventItem` component with `React.memo`

- [x] **MyTicketsScreen.tsx**
  - Added FlatList optimizations (windowSize, getItemLayout, batching)
  - Memoized filter items with `React.memo`
  - Memoized callbacks with `useCallback`
  - Stable key extractors

- [x] **TransactionsScreen.tsx**
  - Added FlatList optimizations
  - Memoized `TransactionGroup` component
  - Stable key extractors with `useCallback`

- [x] **NotificationsScreen.tsx**
  - Added `getItemLayout` for fixed-height notification cards
  - Memoized `NotificationItem` component
  - Memoized utility functions (`getNotificationIcon`, `getNotificationColor`, `formatTime`)
  - Added performance props: `windowSize`, `maxToRenderPerBatch`, `removeClippedSubviews`

### Navigation Optimizations (Target: < 300ms)

- [x] **AppNavigator.tsx**
  - Added `animationDuration: 250` for all transitions
  - Created optimized screen option presets: `fastSlideOptions`, `fastFadeOptions`, `modalOptions`
  - Added `freezeOnBlur: true` to freeze inactive screens
  - Memoized navigation theme with `useMemo`
  - Memoized initial route name
  - Memoized `LoadingScreen` component

### QR Code Optimization (Target: < 100ms)

- [x] **QRCodeDisplay.tsx**
  - Memoized with `React.memo`
  - Added QR code generation optimizations:
    - `ecl="L"` (low error correction for faster render)
    - `quietZone={0}` (no quiet zone for faster render)
    - `enableLinearGradient={false}` (disable gradients for speed)
  - Memoized container styles with `useMemo`
  - Memoized QR placeholder component

### Hermes Engine Configuration

- [x] **app.config.js**
  - Added `ios.jsEngine: 'hermes'`
  - Added `android.jsEngine: 'hermes'`
  - Added `experiments.reactCompiler: true` for React Compiler optimization
  - Added `plugins: ['react-native-reanimated']` for optimized animations

### Image Loading Optimization (Expo Image)

- [x] **Added expo-image dependency** (`package.json`)
  - Version: `~2.0.9`

- [x] **Created OptimizedImage Component** (`components/common/OptimizedImage.tsx`)
  - Uses expo-image for native platforms (fast caching, blurhash placeholders)
  - Falls back to React Native Image on web
  - Memoized to prevent unnecessary re-renders
  - Configurable cache policy (`memory-disk` default)
  - Priority levels (low, normal, high)
  - Transition animations (200ms default)

- [x] **Updated ArtistCard.tsx**
  - Replaced `Image` with `OptimizedImage`
  - Added caching and priority for all image variants

- [x] **Updated EventCard.tsx**
  - Replaced `Image` with `OptimizedImage`
  - Added `ImagePlaceholder` component for fallback

### Component Memoization

- [x] **TicketCard.tsx**
  - Wrapped with `React.memo`
  - Memoized status colors, ticket type config, formatted date
  - Moved color maps outside component for static lookup

- [x] **TransactionItem.tsx**
  - Wrapped with `React.memo`
  - Memoized type config, status color, formatted amount, formatted date
  - Moved config maps outside component

- [x] **ArtistCard.tsx**
  - Wrapped with `React.memo`
  - Memoized genre color, initials, next event
  - Memoized callbacks with `useCallback`

- [x] **EventCard.tsx**
  - Wrapped with `React.memo`
  - Memoized time range, genre color
  - Memoized callbacks with `useCallback`

### Files Created/Modified

```
apps/mobile/app.config.js                              (MODIFIED - Hermes, plugins)
apps/mobile/package.json                               (MODIFIED - expo-image)
apps/mobile/src/components/common/OptimizedImage.tsx   (NEW - ~110 lines)
apps/mobile/src/components/common/index.ts             (MODIFIED - exports)
apps/mobile/src/components/navigation/AppNavigator.tsx (MODIFIED - optimizations)
apps/mobile/src/components/tickets/QRCodeDisplay.tsx   (MODIFIED - memoization)
apps/mobile/src/components/tickets/TicketCard.tsx      (MODIFIED - memoization)
apps/mobile/src/components/wallet/TransactionItem.tsx  (MODIFIED - memoization)
apps/mobile/src/components/events/ArtistCard.tsx       (MODIFIED - OptimizedImage, memo)
apps/mobile/src/components/events/EventCard.tsx        (MODIFIED - OptimizedImage, memo)
apps/mobile/src/screens/Program/ProgramScreen.tsx      (MODIFIED - FlatList optimizations)
apps/mobile/src/screens/Tickets/MyTicketsScreen.tsx    (MODIFIED - FlatList optimizations)
apps/mobile/src/screens/Wallet/TransactionsScreen.tsx  (MODIFIED - FlatList optimizations)
apps/mobile/src/screens/Notifications/NotificationsScreen.tsx (MODIFIED - FlatList optimizations)
```

### Performance Improvements Summary

| Optimization | Before | After |
|-------------|--------|-------|
| FlatList windowSize | Default (21) | 5 (memory efficient) |
| Navigation transitions | Default (~350ms) | 250ms |
| QR code render | Full quality | Low ECL, optimized |
| JS Engine | JavaScriptCore | Hermes (faster startup) |
| Image loading | RN Image | Expo Image (caching) |
| Component re-renders | Frequent | Minimized (memo) |

### Story Status

- **Story**: 3-2-mobile-performance-optimization
- **Status**: COMPLETED (NOT COMMITTED per instructions)

---

_Dernière mise à jour: 2026-01-15_
