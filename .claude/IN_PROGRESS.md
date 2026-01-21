# Tâches En Cours & À Faire

_Dernière mise à jour: 2026-01-21_

---

## État Actuel du Projet

### Coverage Tests

| Metric     | Coverage   | Target | Status      |
| ---------- | ---------- | ------ | ----------- |
| Statements | **65.40%** | 65%    | ✅ Met      |
| Branches   | **53.71%** | 50%    | ✅ Exceeded |
| Functions  | **64.92%** | 65%    | ⚠️ Close    |
| Lines      | **65.50%** | 65%    | ✅ Exceeded |

**Total Tests: 5,308** | **Test Suites: 102** | **Stability: 100% (10/10 consecutive runs)**

---

## Tâche En Cours

_Aucune tache en cours_

---

## Recemment Complete (2026-01-21)

### Web App - Header & Footer Festive Design

- [x] **Header Component** (`apps/web/components/layout/Header.tsx`)
  - Tomorrowland-inspired design with gradient accents (purple/pink/cyan)
  - Logo with animated glow effect on hover
  - Navigation with icons and active state highlighting
  - Scroll-aware styling (transparent -> solid background)
  - Animated hamburger menu for mobile
  - Theme toggle integration
  - Mobile menu with staggered animation
  - WCAG 2.1 AA accessibility (focus indicators, semantic markup)

- [x] **Footer Component** (`apps/web/components/layout/Footer.tsx`)
  - Cohesive festive design with gradient decorative orbs
  - Logo with gradient text
  - Four-column link layout (Discover, Company, Support, Legal)
  - Social media links (Twitter/X, Instagram, Facebook, YouTube, TikTok)
  - Newsletter subscription with API integration
  - Animated gradient submit button
  - Success/error state handling
  - French localization

- [x] **Layout Integration** (`apps/web/app/layout.tsx`)
  - Header and Footer imported and integrated
  - Proper padding for fixed header (pt-16 lg:pt-20)
  - Flex column layout for sticky footer
  - Updated comments for layout structure

---

### UX Design - Festive Tomorrowland Theme

- [x] Enhanced tokens.css with festive gradients and glow variables
  - Festive color palette (purple, pink, cyan, orange, magenta)
  - 8 gradient presets (primary, aurora, sunset, neon, cosmic, warm, cool, hero)
  - Glow effects (single-color and multi-color festive glows)
  - Text glow shadows
  - Glassmorphism tokens (bg, border, blur variants)
  - Animation tokens
- [x] Added 40+ festive utility classes to globals.css
  - Animated gradient backgrounds (.gradient-festive, .gradient-aurora, etc.)
  - Glow effects (.glow-purple, .glow-pink, .glow-cyan, .glow-festive)
  - Text glow classes (.text-glow-purple, .text-glow-festive)
  - Glassmorphism cards (.glass-card, .glass-card-festive, .glass-card-strong)
  - Pulse animations (.animate-pulse-glow, .animate-text-glow)
  - Float animations (.animate-float, .animate-float-slow)
  - Shimmer effect (.animate-shimmer)
  - Festive buttons (.btn-festive-gradient, .btn-festive-outline, .btn-festive-glow)
  - Decorative orbs (.orb, .orb-purple, .orb-pink, .orb-cyan)
  - Hero section styles (.hero-festive)
  - Interactive hover states (.hover-lift, .hover-glow-festive)
- [x] Redesigned homepage with Tomorrowland-inspired design
  - Immersive hero section with animated gradient background
  - Floating decorative orbs with blur effect
  - Animated title with text glow effect
  - Stats section with gradient text
  - Glass card feature sections with hover glow
  - Gradient dividers
  - CTA section with glassmorphism
  - Mobile-first responsive design

---

## Tâches En Attente

### Moyenne Priorité

- [x] ~~**Mobile Offline/NFC Code Cleanup** (59 erreurs ESLint)~~ - **COMPLÉTÉ 2026-01-21**
  - Corrigé 175 warnings ESLint dans l'app mobile
  - console.log remplacés par console.info/warn/error/debug
  - any types ajoutés avec eslint-disable appropriés pour WatermelonDB
  - 0 erreurs, 0 warnings

- [ ] **ESLint Configuration Improvements**
  - Mettre à jour les règles ESLint
  - Corriger les nouveaux warnings
  - Assurer un style cohérent sur toutes les apps

### À Vérifier

- [ ] Mobile `/program` page - vérifier affichage des concerts
- [ ] Admin `/payments` page - tester fonctionnalité complète

---

## Fonctionnalités Récemment Complétées (2026-01-21)

### API Backend

- ✅ Program API - correction erreur 500 (dates cachées)
- ✅ Festival publication endpoints avec validation
- ✅ Zone save avec validation nom unique
- ✅ Staff save avec validation email/phone
- ✅ User save avec contrôle des rôles (admin only)
- ✅ Password change avec validation et invalidation tokens
- ✅ Stripe Connect integration
- ✅ Bulk delete implementation
- ✅ Export file download implementation
- ✅ Currency configuration dynamique

### Admin Dashboard

- ✅ Stripe Refund - RefundModal et MassRefundModal
- ✅ Export CSV/Excel - 6 pages (festivals, staff, users, payments, cashless, festival detail)
- ✅ Settings/Security - 2FA, sessions, API keys, webhooks
- ✅ Festival creation API connection
- ✅ Profile update API connection
- ✅ Zone delete functionality
- ✅ Promo codes pagination

### Web App

- ✅ Festival Program interactif (filtres jour/genre/scène)
- ✅ Contact form API avec email notifications
- ✅ Newsletter subscription avec welcome email
- ✅ Beta signup avec notifications équipe (Slack/Discord/Email)
- ✅ Festival data migration vers base de données
- ✅ Featured festivals endpoint

### Mobile App

- ✅ Theme selection (light/dark/system)
- ✅ Language selection (6 langues)
- ✅ Photo/Avatar change (expo-image-picker - camera & galerie)
- ✅ Ticket ownership validation (sécurité IDOR)
- ✅ **MOB-01 Performance Audit** - App bien optimisée, EventItem/HomeEventCard extraits
- ✅ Event reminders selection (5, 10, 15, 30, 60 min)
- ✅ Announcements toggle (push notifications séparées)
- ✅ GDPR data export request
- ✅ Live chat placeholder (WebSocket coming soon)
- ✅ **ESLint Mobile Cleanup** - 175 warnings corrigés, 0 erreurs

### Infrastructure

- ✅ Kubernetes production manifests
- ✅ Monitoring Prometheus/Grafana dashboards
- ✅ Currency module avec taux de change live

### Tests Stability (Story 10-2)

- ✅ **Test Stability Fix** - 100% stability achieved (10/10 consecutive runs)
  - Fixed missing PrismaService mock in `bulk-operation.controller.spec.ts`
  - Fixed flaky timing assertions in health indicator tests
  - Fixed memory-dependent tests with proper mocks
  - Files fixed:
    - `apps/api/src/common/bulk/bulk-operation.controller.spec.ts`
    - `apps/api/src/modules/health/indicators/redis.health.spec.ts`
    - `apps/api/src/modules/health/indicators/prisma.health.spec.ts`
    - `apps/api/src/modules/monitoring/health-indicators.service.spec.ts`

### UI Library (libs/ui)

- ✅ **Admin App Migration to libs/ui** (2026-01-21)
  - Added `@festival/ui` path alias to admin tsconfig.json
  - Migrated Avatar imports in: staff/page.tsx, profile/page.tsx, users/page.tsx
  - Migrated Spinner import in: loading.tsx
  - Added 'use client' directive to libs/ui/src/components/index.ts for SSR compatibility
  - Build verified: `npx nx build admin --skip-nx-cache` passes
  - Note: Original components in apps/admin/components/ui/ kept for gradual migration

- ✅ **Web App Migration to libs/ui** (Started 2026-01-21)
  - Added `@festival/ui` path alias to web tsconfig.json
  - Added ui library reference for TypeScript project references
  - Migrated Spinner import in `FestivalProgram.tsx`
  - **Pending**: Button, Card, Input migrations require libs/ui API updates
    - Button: libs/ui uses `as="link" + LinkComponent` vs web uses `as="link"` auto-importing Link
    - Card: libs/ui variants (`default`, `elevated`, `outlined`) differ from web (`glow`, `solid`, `gradient`)
    - Input: libs/ui uses `size` vs web uses `inputSize`, different styling

- ✅ **Card Component** - Extracted to libs/ui with compound component pattern
  - Card, Card.Header, Card.Body, Card.Footer, Card.Image, Card.Title, Card.Description
  - Variants: default, elevated, outlined
  - Padding: none, sm, md, lg
  - Interactive mode with keyboard navigation (Enter/Space)
  - Image aspect ratios: auto, square, video, wide, portrait
  - Dark mode support
  - forwardRef for all components

- ✅ **Button Component Enhancement** - Enhanced with polymorphism and accessibility
  - Polymorphism: `as` prop for rendering as button, a, or custom Link component
  - Variants: primary, secondary, outline, ghost, danger
  - Sizes: sm, md, lg with WCAG 2.5.5 touch target sizes
  - States: disabled, loading with spinner and loadingText
  - Icons: leftIcon, rightIcon props
  - fullWidth prop for responsive layouts
  - WCAG 2.1 AA compliance: aria-busy, aria-disabled, focus-visible
  - cn() utility for class merging
  - forwardRef for ref forwarding to all element types

- ✅ **EmptyState Component** - Extracted to libs/ui with flexible variants
  - Variants: default, card, page, compact (different spacing for contexts)
  - Icon sizes: sm, md, lg with responsive sizing
  - Props: icon, illustration (custom), title, description, action, secondaryAction
  - EmptyStateIcons: search, noData, inbox, folder, calendar, ticket, users, bell, error, table, chart, plus, document, image, music, shoppingBag, creditCard
  - Dark mode support with proper color handling
  - forwardRef and testId support

---

## Notes Techniques

### Ports de Développement

- API: `http://localhost:3333` (Swagger: `/api/docs`)
- Web: `http://localhost:3000`
- Admin: `http://localhost:4201`
- MailDev: `http://localhost:1080`

### Commandes Utiles

```bash
# Démarrer les services
docker-compose up -d
npx nx serve api
npx nx serve web
npx nx serve admin

# Vérification
npm run lint:all
npm run verify-ci
npx nx build api --skip-nx-cache
```

---

## Historique des Sessions

Voir `.claude/DONE.md` pour l'historique complet des tâches terminées.
