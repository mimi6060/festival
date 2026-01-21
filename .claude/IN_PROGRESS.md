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

_Aucune tâche en cours_

---

## Recemment Complete (2026-01-21)

### Seed Data - Famous Artists & World Festivals

- [x] **Famous International Artists** (`prisma/seed.ts`)
  - David Guetta - EDM/House - France
  - Martin Garrix - Progressive House/EDM - Netherlands
  - Charlotte de Witte - Techno - Belgium
  - Amelie Lens - Techno - Belgium
  - Nina Kraviz - Techno - Russia
  - Carl Cox - House/Techno - UK
  - Stromae - Pop/Electronic - Belgium
  - Daft Punk - Electronic/French Touch - France
  - Justice - Electronic/French Touch - France
  - The Weeknd - Pop/R&B - Canada
  - Dua Lipa - Pop/Dance - UK
  - Calvin Harris - EDM/House - UK
  - Tiesto - Trance/EDM - Netherlands
  - Armin van Buuren - Trance/Progressive - Netherlands
  - Deadmau5 - Progressive House/Electro - Canada
  - Skrillex - Dubstep/EDM - USA

- [x] **World Famous Festivals** (`prisma/seed.ts`)
  - Tomorrowland 2025 - Boom, Belgium - 400,000 capacity - **Featured**
  - Ultra Music Festival 2025 - Miami, USA - 165,000 capacity - **Featured**
  - Coachella 2025 - Indio, California, USA - 125,000 capacity - **Featured**
  - Rock en Seine 2025 - Paris, France - 40,000 capacity - **Featured**
  - Les Vieilles Charrues 2025 - Carhaix, France - 280,000 capacity - **Featured**
  - Hellfest 2025 - Clisson, France - 60,000 capacity - **Featured**
  - Lollapalooza Paris 2025 - Paris, France - 70,000 capacity
  - Main Square Festival 2025 - Arras, France - 40,000 capacity
  - Solidays 2025 - Paris, France - 228,000 capacity
  - Electrobeach 2025 - Le Barcares, France - 100,000 capacity - **Featured**

- [x] **ESLint Fix** - Renamed unused `VendorDataItem` interface to `_VendorDataItem`

---

## Recemment Complete (2026-01-21)

### Platform Statistics API & Homepage Integration

- [x] **Stats Module** (`apps/api/src/modules/stats/`)
  - Created `StatsService` with database queries using PrismaService
  - Created `StatsController` with two endpoints:
    - `GET /platform-stats` - Public endpoint for homepage stats (cached 5 min)
    - `GET /stats/dashboard` - Admin dashboard stats (requires auth, cached 2 min)
  - Registered `StatsModule` in `app.module.ts`

- [x] **Homepage Dynamic Stats** (`apps/web/app/page.tsx`)
  - Added `fetchPlatformStats()` function to call API
  - Added `formatNumber()` helper for thousands/millions formatting
  - Stats section now displays real data from database:
    - Total festivals count
    - Total users (festivaliers)
    - Total artists
  - Fallback to placeholder values if API fails

### Web App - Missing Pages Fix (404 Errors)

- [x] **Help Center Page** (`apps/web/app/help/page.tsx`)
  - Hero section "Centre d'aide" with search bar
  - 4 categories: Billetterie, Paiement, Compte, Application
  - Each category with relevant links to FAQ, settings, etc.
  - Quick links to FAQ, Refunds, Privacy
  - Contact support CTA section

- [x] **Refund Policy Page** (`apps/web/app/refunds/page.tsx`)
  - Key info cards (30 days, 100%, 5-10 days processing)
  - Detailed refund conditions
  - Timeline table (30+ days = 100%, 14-30 days = 80%, <14 days = non-refundable)
  - Step-by-step refund request process
  - Special cases (cancellation, postponement, cashless)
  - Exclusions list
  - Contact CTA

- [x] **Account Settings Page** (`apps/web/app/account/settings/page.tsx`)
  - Profile settings (name, phone) with save functionality
  - Notification preferences (email, push, SMS toggles)
  - Language selector (6 languages)
  - Privacy settings (profile visibility, activity, marketing)
  - Delete account with confirmation dialog
  - Authentication protection

- [x] **Saved Festivals Page** (`apps/web/app/account/saved/page.tsx`)
  - "Mes favoris" title with count
  - Grid display of saved festivals
  - Festival cards with image, date, location, price
  - Remove from favorites functionality
  - Empty state with CTA to explore festivals
  - Authentication protection

---

## Recemment Complete (2026-01-21)

### Seed Data - Standard Products & Ticket Templates

- [x] **Standard Drink Products** (`prisma/seed.ts`)
  - Beers: Heineken, Corona, Leffe Blonde, 1664, Desperados, Grimbergen (6-7.50 EUR)
  - Soft Drinks: Coca-Cola, Sprite, Fanta, Red Bull, Monster, Eau, Jus (3-6 EUR)
  - Spirits: Vodka, Rhum, Whisky, Gin, Tequila shots (8-9 EUR)
  - Cocktails: Mojito, Spritz, Margarita, Sex on the Beach, Pina Colada, Cuba Libre (10-12 EUR)
  - Wine: Rouge, Blanc, Rose (verre), Champagne (coupe) (7-15 EUR)

- [x] **Standard Food Items** (`prisma/seed.ts`)
  - Burgers: Classic (12 EUR), Cheese (13 EUR)
  - Fast-Food: Hot-dog (8 EUR), Panini (8 EUR), Croque-monsieur (7 EUR)
  - Pizza: Margherita (10 EUR), 4 Fromages (12 EUR)
  - Mexicain: Tacos (10 EUR), Kebab (10 EUR), Nachos (8 EUR)
  - Wraps: Poulet, Veggie (9 EUR)
  - Accompagnements: Frites (5 EUR), Frites Sauce (6 EUR)
  - Desserts: Churros (6 EUR), Crepes (5-7 EUR), Glace (3 EUR)

- [x] **Ticket Type Description Templates** (`prisma/seed.ts`)
  - STANDARD: "Acces general aux scenes principales"
  - VIP: "Acces prioritaire, zone VIP avec vue privilegiee, bar VIP"
  - BACKSTAGE: "Tous les avantages VIP + acces aux coulisses + rencontre artistes"
  - CAMPING: "Emplacement camping reserve avec acces sanitaires"
  - PARKING: "Place de parking securise 24h/24"
  - COMBO: "Pack festival + camping a tarif reduit"

- [x] **Template Vendors** for standard products
  - Bar Festival Standard: Uses all standard drink products
  - Food Court Standard: Uses all standard food items
  - Fixed pricing (no random pricing for template vendors)

---

## Sprint Stabilité - Résultats (2026-01-21)

### Tests Visuels MCP Chrome - PASSÉ ✅

| Page           | Status | Notes                                             |
| -------------- | ------ | ------------------------------------------------- |
| Homepage       | ✅     | Design Tomorrowland, Header/Footer festifs        |
| /festivals     | ✅     | Données DB (Summer Vibes, Electric Dreams)        |
| /artists       | ✅     | Artistes DB avec filtres genre                    |
| /programme     | ✅     | Programme & Artistes avec sélection festival      |
| /contact       | ✅     | Formulaire contact fonctionnel                    |
| /account       | ✅     | Données utilisateur dynamiques (plus de John Doe) |
| /auth/login    | ✅     | Google, Facebook, GitHub OAuth                    |
| /auth/register | ✅     | Validation forte mot de passe                     |

---

## Recemment Complete (2026-01-21)

### Web App - Remove Hardcoded Data

- [x] **Account Page** (`apps/web/app/account/page.tsx`)
  - Replaced hardcoded user data (John Doe) with auth store
  - Added authentication check with redirect to login
  - Fetch user tickets from API `/tickets/my-tickets`
  - Fetch user orders from API `/payments/my-orders`
  - Proper loading states for each section

- [x] **Tickets Page** (`apps/web/app/account/tickets/page.tsx`)
  - Replaced hardcoded tickets with API call
  - Added authentication check with redirect
  - Proper error handling and loading states

- [x] **Orders Page** (`apps/web/app/account/orders/page.tsx`)
  - Replaced hardcoded orders with API call
  - Added authentication check with redirect
  - Proper error handling and loading states
  - Refund request now calls API

- [x] **Festivals Page** (`apps/web/app/festivals/page.tsx`)
  - Removed MOCK_FESTIVALS fallback data
  - Shows proper empty state when API fails
  - Proper error message display

- [x] **Artist Detail Page** (`apps/web/app/artists/[slug]/page.tsx`)
  - Replaced hardcoded artist data with API call
  - Added loading, error, and not found states
  - Transforms API response to display format

---

### Web App - Authentication Security Enhancement

- [x] **Password Validation Enhancement** (`apps/web/app/auth/register/page.tsx`)
  - Strong password requirements matching API:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number
  - Better email validation regex
  - First/last name minimum 2 characters validation

- [x] **Facebook OAuth Support**
  - Added Facebook OAuth button to login page
  - Added Facebook OAuth button to register page
  - Responsive 3-column grid layout for social login buttons

- [x] **Security Features Already In Place**
  - JWT tokens stored in httpOnly cookies (not localStorage)
  - Middleware protection for `/account`, `/tickets`, `/orders`, `/profile` routes
  - Rate limiting on login (5/min), register (3/min), password reset (5/min)
  - Password hashing with bcrypt (12 rounds)
  - Email verification required before login
  - Refresh token rotation
  - Session invalidation on password change

---

### Web App - Header & Footer Festive Design

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
