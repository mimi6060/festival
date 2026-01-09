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

## Prochaines Tâches (Plan CTO Q2)

- [ ] **CORE-01**: Migration Kubernetes production
- [ ] **CORE-02**: Monitoring Prometheus/Grafana
- [ ] **MOB-01**: Audit performance React Native
- [x] **MOB-02**: Architecture offline-first WatermelonDB
- [x] **MOB-03**: Enhanced bidirectional sync with offline mutations

---

_Dernière mise à jour: 2026-01-09_
