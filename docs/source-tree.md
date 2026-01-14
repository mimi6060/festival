# Arborescence Source du Projet Festival

> Analyse détaillée de la structure du code
> Générée automatiquement - 2026-01-14

## Structure Racine

```
festival/
├── apps/                    # Applications
│   ├── api/                 # Backend NestJS
│   ├── web/                 # Site public Next.js
│   ├── admin/               # Dashboard admin Next.js
│   ├── mobile/              # Application React Native
│   └── api-e2e/             # Tests E2E
├── libs/shared/             # Bibliothèques partagées
│   ├── types/               # Types TypeScript
│   ├── utils/               # Utilitaires
│   ├── constants/           # Constantes
│   ├── i18n/                # Internationalisation
│   ├── validation/          # Schémas Zod
│   ├── hooks/               # Hooks React
│   └── api-client/          # Client HTTP
├── prisma/                  # Schema et migrations
├── k8s/                     # Kubernetes
├── infra/                   # Infrastructure
├── scripts/                 # Scripts utilitaires
├── docs/                    # Documentation
└── .github/                 # CI/CD
```

---

## 1. API Backend (`apps/api/`)

```
apps/api/
├── src/
│   ├── main.ts                    # Point d'entrée
│   ├── app/
│   │   ├── app.module.ts          # Module racine
│   │   └── app.controller.ts      # Health check
│   ├── config/
│   │   ├── index.ts               # Exports config
│   │   └── validation.schema.ts   # Validation Joi des env vars
│   ├── modules/
│   │   ├── auth/                  # Authentification
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/        # JWT, Google, GitHub
│   │   │   ├── guards/            # JwtAuthGuard, RolesGuard
│   │   │   └── dto/               # LoginDto, RegisterDto
│   │   ├── users/                 # Gestion utilisateurs
│   │   ├── festivals/             # Gestion festivals
│   │   ├── tickets/               # Billetterie
│   │   ├── payments/              # Paiements Stripe
│   │   ├── cashless/              # Portefeuille digital
│   │   ├── zones/                 # Contrôle d'accès
│   │   ├── staff/                 # Personnel
│   │   ├── program/               # Programmation
│   │   ├── vendors/               # Vendeurs
│   │   ├── camping/               # Camping
│   │   ├── notifications/         # Push, Email, SMS
│   │   ├── analytics/             # KPIs et rapports
│   │   ├── health/                # Health checks K8s
│   │   ├── cache/                 # Cache Redis
│   │   ├── support/               # Tickets support
│   │   ├── languages/             # Multi-langue
│   │   ├── gdpr/                  # Conformité RGPD
│   │   ├── invoices/              # Factures PDF
│   │   ├── promo-codes/           # Codes promo
│   │   ├── webhooks/              # Webhooks sortants
│   │   ├── currency/              # Taux de change
│   │   ├── two-factor/            # 2FA
│   │   ├── api-keys/              # Clés API
│   │   ├── queue/                 # BullMQ jobs
│   │   └── prisma/                # Prisma client
│   ├── gateways/
│   │   ├── events.gateway.ts      # Notifications temps réel
│   │   ├── presence.gateway.ts    # Statut en ligne
│   │   ├── zones.gateway.ts       # Occupation zones
│   │   ├── broadcast.gateway.ts   # Annonces
│   │   └── support-chat.gateway.ts # Chat support
│   ├── common/
│   │   ├── guards/                # Guards globaux
│   │   ├── decorators/            # @Public, @Roles, @User
│   │   ├── dto/                   # DTOs partagés
│   │   ├── exceptions/            # Exceptions métier
│   │   ├── interceptors/          # Logging, Cache, Metrics
│   │   ├── middleware/            # Soft delete filter
│   │   └── services/              # Services utilitaires
│   └── test/
│       ├── setup.ts               # Configuration tests
│       └── fixtures/              # Données de test
├── Dockerfile
└── project.json                   # Config NX
```

### Modules API Détaillés

| Module        | Controllers             | Services                           | Entités                              |
| ------------- | ----------------------- | ---------------------------------- | ------------------------------------ |
| auth          | AuthController          | AuthService                        | RefreshToken                         |
| users         | UsersController         | UsersService                       | User                                 |
| festivals     | FestivalsController     | FestivalsService                   | Festival                             |
| tickets       | TicketsController       | TicketsService                     | Ticket, TicketCategory               |
| payments      | PaymentsController      | PaymentsService                    | Payment, Subscription                |
| cashless      | CashlessController      | CashlessService                    | CashlessAccount, CashlessTransaction |
| zones         | ZonesController         | ZonesService                       | Zone                                 |
| staff         | StaffController         | StaffService                       | Staff, Shift                         |
| program       | ProgramController       | ProgramService                     | Artist, Stage, Performance           |
| vendors       | VendorsController       | VendorsService                     | Vendor, VendorProduct, VendorOrder   |
| camping       | CampingController       | CampingService                     | CampingZone, CampingSpot             |
| notifications | NotificationsController | NotificationsService, FcmService   | Notification                         |
| analytics     | AnalyticsController     | AnalyticsService, ExportService    | -                                    |
| support       | SupportTicketController | SupportTicketService               | SupportTicket, FAQItem, LostItem     |
| invoices      | InvoicesController      | InvoicesService, InvoicePdfService | Invoice                              |
| promo-codes   | PromoCodesController    | PromoCodesService                  | PromoCode                            |
| webhooks      | WebhooksController      | WebhooksService                    | WebhookEvent                         |

---

## 2. Application Web (`apps/web/`)

```
apps/web/
├── app/
│   ├── layout.tsx                 # Layout racine
│   ├── page.tsx                   # Page d'accueil
│   ├── error.tsx                  # Gestion erreurs
│   ├── loading.tsx                # État loading
│   ├── globals.css                # Styles globaux
│   ├── festivals/
│   │   ├── page.tsx               # Liste festivals
│   │   └── [slug]/
│   │       ├── page.tsx           # Détail festival
│   │       └── tickets/
│   │           └── page.tsx       # Achat billets
│   ├── auth/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── callback/page.tsx      # OAuth callback
│   ├── account/
│   │   ├── page.tsx               # Dashboard utilisateur
│   │   ├── tickets/page.tsx       # Mes billets
│   │   └── orders/page.tsx        # Historique
│   ├── programme/page.tsx
│   ├── artists/page.tsx
│   ├── cashless/page.tsx
│   ├── beta/page.tsx
│   ├── contact/page.tsx
│   ├── faq/page.tsx
│   ├── about/page.tsx
│   ├── privacy/page.tsx
│   ├── terms/page.tsx
│   └── api/
│       ├── health/route.ts
│       ├── hello/route.ts
│       └── beta-signup/route.ts
├── components/
│   ├── ui/                        # Composants UI (22+)
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Tabs.tsx
│   │   ├── Select.tsx
│   │   ├── Checkbox.tsx
│   │   ├── Alert.tsx
│   │   ├── Badge.tsx
│   │   ├── Pagination.tsx
│   │   ├── Skeleton.tsx
│   │   ├── Spinner.tsx
│   │   ├── Table.tsx
│   │   ├── Tooltip.tsx
│   │   ├── QRCode.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── AnimatedComponents.tsx
│   ├── festivals/
│   │   ├── FestivalCard.tsx
│   │   ├── FestivalHero.tsx
│   │   ├── FestivalLineup.tsx
│   │   ├── FestivalShare.tsx
│   │   └── TicketSelector.tsx
│   ├── checkout/
│   │   ├── CheckoutForm.tsx
│   │   ├── StripeCheckout.tsx
│   │   ├── GuestCheckout.tsx
│   │   └── PromoCodeInput.tsx
│   ├── filters/
│   │   └── FestivalFilters.tsx
│   ├── search/
│   │   └── FestivalSearch.tsx
│   ├── calendar/
│   │   └── EventCalendar.tsx
│   ├── cart/
│   │   └── CartModal.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── LanguageSwitcher.tsx
│   ├── providers/
│   │   ├── ThemeProvider.tsx
│   │   └── DirectionProvider.tsx
│   └── a11y/
│       ├── SkipLink.tsx
│       ├── LiveRegion.tsx
│       ├── VisuallyHidden.tsx
│       └── FocusTrap.tsx
├── stores/
│   ├── auth.store.ts              # Authentification
│   ├── cart.store.ts              # Panier (15 min expiry)
│   └── ui.store.ts                # Thème, langue, UI
├── lib/
│   └── api.ts                     # Client API
├── hooks/
│   └── (hooks React Query)
├── providers/
│   ├── AuthProvider.tsx
│   └── QueryProvider.tsx
├── i18n/
│   ├── config.ts
│   ├── request.ts
│   └── messages/
│       ├── fr.json
│       ├── en.json
│       ├── ar.json
│       └── ...
├── middleware.ts                   # Auth middleware
├── tailwind.config.js
├── next.config.js
├── Dockerfile
└── project.json
```

### Pages Web

| Route                       | Fichier                           | Auth | Description     |
| --------------------------- | --------------------------------- | ---- | --------------- |
| `/`                         | page.tsx                          | Non  | Accueil         |
| `/festivals`                | festivals/page.tsx                | Non  | Liste festivals |
| `/festivals/[slug]`         | festivals/[slug]/page.tsx         | Non  | Détail festival |
| `/festivals/[slug]/tickets` | festivals/[slug]/tickets/page.tsx | Non  | Achat billets   |
| `/auth/login`               | auth/login/page.tsx               | Non  | Connexion       |
| `/auth/register`            | auth/register/page.tsx            | Non  | Inscription     |
| `/account`                  | account/page.tsx                  | Oui  | Dashboard       |
| `/account/tickets`          | account/tickets/page.tsx          | Oui  | Mes billets     |
| `/account/orders`           | account/orders/page.tsx           | Oui  | Commandes       |

---

## 3. Dashboard Admin (`apps/admin/`)

```
apps/admin/
├── app/
│   ├── layout.tsx
│   ├── (auth)/
│   │   └── login/page.tsx
│   └── (dashboard)/
│       ├── page.tsx               # Dashboard principal
│       ├── festivals/
│       │   ├── page.tsx           # Liste festivals
│       │   ├── new/page.tsx       # Créer festival
│       │   └── [id]/
│       │       ├── page.tsx       # Détail festival
│       │       ├── tickets/page.tsx
│       │       ├── stats/page.tsx
│       │       ├── lineup/page.tsx
│       │       ├── stages/page.tsx
│       │       ├── vendors/page.tsx
│       │       ├── camping/page.tsx
│       │       └── pois/page.tsx
│       ├── users/page.tsx
│       ├── payments/page.tsx
│       ├── staff/page.tsx
│       ├── zones/page.tsx
│       ├── cashless/page.tsx
│       ├── promo-codes/page.tsx
│       ├── notifications/page.tsx
│       ├── realtime/page.tsx      # Dashboard temps réel
│       ├── activity/page.tsx
│       ├── reports/page.tsx
│       ├── exports/page.tsx
│       ├── profile/page.tsx
│       └── settings/page.tsx
├── components/
│   ├── layout/
│   │   ├── AdminShell.tsx
│   │   ├── AdminHeader.tsx
│   │   └── Sidebar.tsx
│   ├── tables/
│   │   └── DataTable.tsx
│   ├── dashboard/
│   │   ├── StatCard.tsx
│   │   ├── RevenueChart.tsx
│   │   ├── TicketSalesChart.tsx
│   │   ├── TopFestivals.tsx
│   │   └── RecentActivity.tsx
│   ├── forms/
│   │   ├── FestivalForm.tsx
│   │   └── TicketCategoryForm.tsx
│   ├── modals/
│   │   └── ConfirmModal.tsx
│   ├── notifications/
│   │   └── NotificationCenter.tsx
│   ├── export/
│   │   └── ExportButton.tsx
│   ├── ThemeToggle.tsx
│   └── Providers.tsx
├── lib/
│   ├── api.ts
│   └── auth-context.tsx
├── hooks/
│   ├── api/
│   │   ├── useFestivals.ts
│   │   ├── useTicketCategories.ts
│   │   ├── useUsers.ts
│   │   ├── useProgram.ts
│   │   ├── useVendors.ts
│   │   ├── useCamping.ts
│   │   └── usePois.ts
│   ├── useRealTimeData.ts
│   ├── useWebSocket.ts
│   ├── useDebounce.ts
│   └── usePagination.ts
├── tailwind.config.js
├── next.config.js
├── Dockerfile
└── project.json
```

### Pages Admin

| Route             | Rôles requis     | Description           |
| ----------------- | ---------------- | --------------------- |
| `/`               | ADMIN, ORGANIZER | Dashboard KPIs        |
| `/festivals`      | ADMIN, ORGANIZER | Gestion festivals     |
| `/festivals/[id]` | ADMIN, ORGANIZER | Détail festival       |
| `/users`          | ADMIN            | Gestion utilisateurs  |
| `/payments`       | ADMIN, ORGANIZER | Transactions          |
| `/realtime`       | ADMIN, ORGANIZER | Monitoring temps réel |
| `/settings`       | ADMIN            | Configuration système |

### Widgets Dashboard

| Widget           | Type       | Données                                                 |
| ---------------- | ---------- | ------------------------------------------------------- |
| StatCard         | KPI        | Festivals actifs, billets vendus, revenus, utilisateurs |
| RevenueChart     | Area Chart | Tendance revenus (7j, 30j, 90j, 1y)                     |
| TicketSalesChart | Chart      | Ventes par catégorie                                    |
| TopFestivals     | Liste      | Top performers                                          |
| RecentActivity   | Feed       | Dernières actions                                       |
| ZoneOccupancyBar | Progress   | Occupation des zones                                    |

---

## 4. Application Mobile (`apps/mobile/`)

```
apps/mobile/
├── App.tsx                        # Point d'entrée
├── index.js                       # Registre app
├── app.json                       # Config Expo
├── app.config.js                  # Config dynamique
├── src/
│   ├── main.tsx                   # Entry native
│   ├── main-web.tsx               # Entry web
│   ├── screens/
│   │   ├── Home/
│   │   │   └── HomeScreen.tsx
│   │   ├── Auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── RegisterScreen.tsx
│   │   │   └── OnboardingScreen.tsx
│   │   ├── Tickets/
│   │   │   ├── MyTicketsScreen.tsx
│   │   │   └── TicketDetailScreen.tsx
│   │   ├── Wallet/
│   │   │   ├── WalletScreen.tsx
│   │   │   ├── TopupScreen.tsx
│   │   │   └── TransactionsScreen.tsx
│   │   ├── Program/
│   │   │   └── ProgramScreen.tsx
│   │   ├── Profile/
│   │   │   ├── ProfileScreen.tsx
│   │   │   ├── EditProfileScreen.tsx
│   │   │   └── ChangePasswordScreen.tsx
│   │   ├── Map/
│   │   │   └── MapScreen.tsx
│   │   ├── Settings/
│   │   │   └── SettingsScreen.tsx
│   │   ├── Notifications/
│   │   │   └── NotificationsScreen.tsx
│   │   ├── Support/
│   │   │   ├── HelpCenterScreen.tsx
│   │   │   └── ContactUsScreen.tsx
│   │   └── Scanner/
│   │       └── QRScannerScreen.tsx
│   ├── components/
│   │   ├── navigation/
│   │   │   ├── AppNavigator.tsx
│   │   │   ├── AuthNavigator.tsx
│   │   │   └── MainTabs.tsx
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Card.tsx
│   │   ├── tickets/
│   │   │   ├── TicketCard.tsx
│   │   │   └── QRCodeDisplay.tsx
│   │   ├── wallet/
│   │   │   ├── BalanceCard.tsx
│   │   │   └── TransactionItem.tsx
│   │   ├── nfc/
│   │   │   ├── NFCScanner.tsx
│   │   │   ├── NFCAnimation.tsx
│   │   │   └── NFCStatus.tsx
│   │   ├── maps/
│   │   │   └── OfflineMapManager.tsx
│   │   ├── SyncIndicator.tsx
│   │   ├── LanguageSelector.tsx
│   │   └── dev/
│   │       └── CacheDebugger.tsx
│   ├── store/
│   │   ├── authStore.ts
│   │   ├── ticketStore.ts
│   │   ├── walletStore.ts
│   │   ├── programStore.ts
│   │   ├── notificationStore.ts
│   │   └── settingsStore.ts
│   ├── services/
│   │   ├── api.ts                 # Client API
│   │   ├── offline.ts             # Sync offline
│   │   ├── push.ts                # Push notifications
│   │   ├── nfc/
│   │   │   ├── NFCManager.ts
│   │   │   ├── NFCReader.ts
│   │   │   ├── NFCWriter.ts
│   │   │   └── NFCFormatter.ts
│   │   ├── cache/
│   │   │   └── CacheManager.ts
│   │   ├── location/
│   │   │   └── IndoorLocationManager.ts
│   │   └── wallet/
│   │       └── WalletManager.ts
│   ├── database/
│   │   ├── schema.ts              # WatermelonDB schema
│   │   └── migrations/
│   ├── hooks/
│   │   └── useOffline.ts
│   ├── i18n/
│   │   ├── index.ts
│   │   └── locales/
│   │       ├── en.json
│   │       ├── fr.json
│   │       ├── de.json
│   │       ├── es.json
│   │       ├── it.json
│   │       └── ar.json
│   ├── theme/
│   │   └── index.ts
│   ├── types/
│   ├── utils/
│   ├── providers/
│   └── mocks/                     # Mocks pour web
│       ├── push-notification.web.ts
│       └── netinfo.web.ts
├── metro.config.js
├── babel.config.js
├── tsconfig.json
├── jest.config.ts
└── project.json
```

### Navigation Mobile

```
RootStack
├── Onboarding
├── Auth (Stack)
│   ├── Login
│   └── Register
├── Main (BottomTabs)
│   ├── Home
│   ├── Tickets
│   ├── Wallet
│   ├── Program
│   └── Profile
├── TicketDetail
├── Topup
├── Transactions
├── Map
├── Settings
├── EditProfile
├── ChangePassword
├── HelpCenter
├── ContactUs
└── Scanner
```

### Stores Zustand Mobile

| Store             | State                                           | Persistence              |
| ----------------- | ----------------------------------------------- | ------------------------ |
| authStore         | user, token, isAuthenticated, hasSeenOnboarding | AsyncStorage             |
| ticketStore       | tickets, loading, error                         | In-memory + sync         |
| walletStore       | balance, transactions                           | In-memory + sync         |
| programStore      | events, favorites                               | AsyncStorage (favorites) |
| notificationStore | notifications, unreadCount                      | In-memory                |
| settingsStore     | language, theme, notifications                  | AsyncStorage             |

---

## 5. Bibliothèques Partagées (`libs/shared/`)

```
libs/shared/
├── types/
│   └── src/lib/
│       ├── user.types.ts          # User, UserRole, UserStatus
│       ├── festival.types.ts      # Festival, FestivalStatus
│       ├── ticket.types.ts        # Ticket, TicketCategory, Order
│       ├── payment.types.ts       # Payment, PaymentStatus
│       ├── cashless.types.ts      # CashlessAccount, CashlessTransaction
│       ├── zone.types.ts          # Zone, ZoneType
│       ├── program.types.ts       # Artist, Stage, Performance
│       ├── notification.types.ts  # Notification, NotificationType
│       ├── map.types.ts           # MapPoi, PoiType
│       ├── vendor.types.ts        # Vendor, VendorOrder, Product
│       ├── staff.types.ts         # StaffMember, StaffRole, Shift
│       ├── camping.types.ts       # CampingZone, CampingReservation
│       ├── support.types.ts       # SupportTicket, LostItem
│       └── api-responses.ts       # ApiResponse, PaginatedResponse
├── utils/
│   └── src/lib/
│       ├── date.utils.ts          # Formatage, calculs dates
│       ├── currency.utils.ts      # Formatage monétaire
│       ├── geo.utils.ts           # Distance, POI
│       ├── validation.utils.ts    # NFC ID, PIN, IBAN
│       ├── qrcode.utils.ts        # Génération QR
│       ├── crypto.utils.ts        # Chiffrement AES
│       ├── pagination.utils.ts    # Calculs pagination
│       ├── file.utils.ts          # Taille fichiers
│       └── phone.utils.ts         # Formatage téléphone
├── constants/
│   └── src/lib/
│       ├── app.constants.ts       # Config app
│       ├── api.constants.ts       # Config API
│       ├── auth.constants.ts      # Config auth
│       ├── cashless.constants.ts  # Limites cashless
│       ├── error.constants.ts     # Codes erreur
│       ├── festival.constants.ts  # Config festivals
│       ├── payment.constants.ts   # Config paiements
│       ├── regex.constants.ts     # Patterns regex
│       ├── ui.constants.ts        # Config UI
│       └── validation.constants.ts # Limites validation
├── i18n/
│   └── src/lib/
│       ├── locales/
│       │   ├── fr.json
│       │   ├── en.json
│       │   ├── de.json
│       │   ├── es.json
│       │   ├── it.json
│       │   └── nl.json
│       └── formatters/
│           ├── date.ts
│           ├── number.ts
│           ├── currency.ts
│           └── relative-time.ts
├── validation/
│   └── src/lib/
│       ├── common.schemas.ts      # UUID, email, phone, etc.
│       ├── auth.schemas.ts        # Login, register
│       ├── user.schemas.ts        # CRUD user
│       ├── festival.schemas.ts    # CRUD festival
│       ├── ticket.schemas.ts      # Achat, validation
│       ├── payment.schemas.ts     # Checkout, refund
│       └── cashless.schemas.ts    # Topup, payment
├── hooks/
│   └── src/lib/
│       ├── useAuth.ts
│       ├── useUser.ts
│       ├── usePermissions.ts
│       ├── useTheme.ts
│       ├── useDebounce.ts
│       ├── useLocalStorage.ts
│       └── useMediaQuery.ts
└── api-client/
    └── src/lib/
        ├── client.ts              # FestivalApiClient
        ├── errors.ts              # ApiError
        └── storage.ts             # TokenStorage
```

### Imports Partagés

```typescript
// Types
import { User, Festival, Ticket } from '@festival/shared/types';

// Utilitaires
import { formatDate, calculateDistance } from '@festival/shared/utils';

// Constantes
import { APP_NAME, AUTH, FILE_UPLOAD } from '@festival/shared/constants';

// i18n
import { frLocale, formatCurrency } from '@festival/shared/i18n';

// Validation
import { loginSchema, createFestivalSchema } from '@festival/shared/validation';

// Hooks
import { useAuth, useTheme } from '@festival/shared/hooks';

// Client API
import { getApiClient } from '@festival/shared/api-client';
```

---

## 6. Infrastructure

```
infra/
├── docker/
│   ├── api/Dockerfile
│   ├── web/Dockerfile
│   └── admin/Dockerfile
├── database/
│   ├── docker-compose.replication.yml
│   └── patroni/
│       └── docker-compose.patroni.yml
├── redis/
│   ├── docker-compose.redis.yml
│   └── cluster/
│       └── docker-compose.redis-cluster.yml
├── monitoring/
│   ├── docker-compose.monitoring.yml
│   ├── prometheus/
│   │   ├── prometheus.yml
│   │   ├── alerts.yml
│   │   └── recording_rules.yml
│   └── grafana/
│       └── dashboards/
│           ├── api-overview.json
│           ├── business-metrics.json
│           ├── database.json
│           └── redis.json
└── services/
    └── ai/
        └── docker-compose.ai.yml

k8s/
├── base/
│   ├── namespace.yaml
│   ├── configmaps/
│   ├── secrets/
│   ├── deployments/
│   │   ├── api-deployment.yaml
│   │   ├── web-deployment.yaml
│   │   └── admin-deployment.yaml
│   ├── services/
│   ├── ingress/
│   │   ├── festival-ingress.yaml
│   │   └── websocket-ingress.yaml
│   ├── statefulsets/
│   │   ├── postgresql.yaml
│   │   └── redis.yaml
│   ├── jobs/
│   │   ├── prisma-migrate.yaml
│   │   └── database-backup.yaml
│   └── network-policies/
├── overlays/
│   ├── development/
│   ├── staging/
│   └── production/
└── monitoring/
    ├── servicemonitor.yaml
    ├── prometheusrule.yaml
    └── alertmanager-config.yaml

scripts/
├── start-dev.sh
├── dev.sh
├── docker-dev.sh
├── docker-build.sh
├── verify-ci.sh
├── verify-api.sh
├── verify-frontend.sh
├── verify-all.sh
├── health-check.sh
├── check-env.sh
├── seed-if-empty.sh
├── verify-data.sh
├── k8s-deploy.sh
├── deploy.sh
├── rotate-secrets.sh
└── sentry-upload-sourcemaps.sh

.github/workflows/
├── ci.yml                         # Lint, build, test, security
└── cd.yml                         # Deploy staging/production
```

---

## 7. Base de Données (Prisma)

```
prisma/
├── schema.prisma                  # 52 modèles, 27 enums
├── migrations/
│   ├── 0001_initial_schema/
│   ├── 20260103160928_add_promo_codes/
│   ├── 20260103161500_add_email_verification_fields/
│   ├── 20260107235000_add_user_soft_delete/
│   └── 20260108_add_performance_indexes/
├── seed.ts                        # Données de test (2300+ records)
└── DATABASE.md                    # Documentation schema
```

### Statistiques Seed

| Entité            | Nombre | Notes                                    |
| ----------------- | ------ | ---------------------------------------- |
| Users             | 55     | 3 admin, 4 organizer, 13 staff, etc.     |
| Festivals         | 4      | Electric Dreams, Nuits Electriques, etc. |
| Ticket Categories | 60     | 15 par festival                          |
| Zones             | 60     | 15 par festival                          |
| Artists           | 25     | DJ Snake, PNL, Angele, etc.              |
| Performances      | 120    | 30 par festival                          |
| Vendors           | 60     | 15 par festival                          |
| Vendor Products   | 900    | 15 par vendeur                           |
| Tickets           | 450    | Distribution selon statut festival       |
| Payments          | 450    | Stripe, PayPal                           |
| Cashless Accounts | 44     | 80% des users                            |
| FAQ Items         | 25     | 5 catégories                             |
| Support Tickets   | 15     | Divers statuts                           |
| Lost Items        | 40     | 5-12 par festival                        |
| Staff Assignments | 126    | 3 shifts x 8-15 staff                    |

---

_Documentation générée par le workflow document-project BMAD_
