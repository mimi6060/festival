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

## Prochaines Tâches (Plan CTO Q2)

- [ ] **CORE-01**: Migration Kubernetes production
- [ ] **CORE-02**: Monitoring Prometheus/Grafana
- [ ] **MOB-01**: Audit performance React Native
- [x] **MOB-02**: Architecture offline-first WatermelonDB

---

_Dernière mise à jour: 2026-01-09_
