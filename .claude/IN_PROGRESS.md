# Tâches En Cours & À Faire

---

## CTO Mission - 30 Développeurs Assignés

**Date**: 2026-01-08
**Objectif**: Améliorer la qualité et la complétude de la plateforme Festival

---

## Coverage Actuelle

| Metric     | Coverage   | Target | Status   |
| ---------- | ---------- | ------ | -------- |
| Statements | **82.56%** | 80%    | Exceeded |
| Branches   | **69.28%** | 70%    | Near     |
| Functions  | **81.84%** | 80%    | Exceeded |
| Lines      | **82.45%** | 80%    | Exceeded |

**Total Tests: 4,636** | **Test Suites: 89**

---

## PRIORITÉ CRITIQUE (P0) - Sécurité & Stabilité

### DEV-01: Implémenter l'envoi d'email de vérification

- **Fichier**: `apps/api/src/modules/auth/auth.service.ts:148`
- **Status**: [x] Terminé
- **Description**: Le TODO indique que l'email de vérification n'est pas envoyé
- **Impact**: HIGH - Les utilisateurs ne peuvent pas vérifier leur email
- **Solution**: Ajouté EmailService, generateVerificationToken() et sendVerificationEmailToUser()

### DEV-02: Implémenter l'envoi d'email de reset password

- **Fichier**: `apps/api/src/modules/auth/auth.service.ts:327`
- **Status**: [x] Terminé
- **Description**: Le token est généré mais l'email n'est pas envoyé
- **Impact**: HIGH - Les utilisateurs ne peuvent pas réinitialiser leur mot de passe
- **Solution**: Ajouté EmailModule import, EmailService injection, et appel à sendPasswordResetEmail() dans forgotPassword()

### DEV-03: Activer le Rate Limiting sur les controllers

- **Fichier**: Tous les controllers publics
- **Status**: [x] Terminé
- **Description**: Le guard existe mais n'est appliqué nulle part
- **Impact**: HIGH - Vulnérabilité DDoS
- **Solution**:
  - Ajouté `@RateLimit()` sur tous les endpoints publics de `AuthController` (5 req/min):
    - register, login, forgot-password, reset-password, verify-email, resend-verification
  - Ajouté `@RateLimit()` sur `PaymentsController` (10 req/min):
    - checkout, checkout/ticket, checkout/cashless-topup, intent, refunds, refunds/partial
    - bulk-refund (5 req/min car operation lourde)
    - `@SkipRateLimit()` sur webhook (protege par signature Stripe)
  - Ajouté `@RateLimit()` sur `FestivalsController` (100 req/min):
    - findAll, findOne, findBySlug
  - Ajouté `@RateLimit()` sur `TicketsController`:
    - guest-purchase (10 req/min), validate/scan (120 req/min pour scanning)
  - Ajouté `@RateLimit()` sur `ProgramController` (100 req/min):
    - getProgram, getProgramByDay, getArtists, getStages

### DEV-04: Ajouter des tests E2E pour les paiements

- **Fichier**: `apps/api-e2e/src/api/payments.e2e-spec.ts`
- **Status**: [x] Terminé
- **Description**: Tests E2E complets pour le module de paiement
- **Solution**:
  - Créé `payments.e2e-spec.ts` avec tests pour tous les endpoints principaux:
    - POST /payments/checkout - Create checkout session
    - GET /payments/checkout/:sessionId - Get checkout status
    - POST /payments/checkout/ticket - Ticket purchase checkout
    - POST /payments/checkout/cashless-topup - Cashless topup checkout
    - POST /payments/intent - Create payment intent
    - GET /payments/:paymentId - Get payment by ID
    - GET /payments/user/:userId - Get user payment history
    - POST /payments/:paymentId/cancel - Cancel payment
    - POST /payments/refunds - Create refund
    - GET /payments/refunds/eligibility/:paymentId - Check refund eligibility
  - Tests de validation pour les champs requis et formats invalides
  - Tests d'autorisation (401 sans authentification, 403 pour accès non autorisé)
  - Tests de flux complet (checkout lifecycle, ticket purchase, cashless topup)
  - Tests de rate limiting
  - Tests de gestion d'erreurs

### DEV-05: Améliorer la couverture de branches (70%+)

- **Fichiers**: Modules avec faible couverture de branches
- **Status**: [x] Terminé
- **Description**: Couverture atteinte: 70% (3,036/4,337 branches)
- **Solution**:
  - Ajouté tests memory DEGRADED/DOWN dans health-indicators.service.spec.ts
  - Ajouté test pour disk malformed output
  - Ajouté tests slack notification failure et unsupported channel type dans alerts.service.spec.ts
  - Corrigé flaky test de timing dans bulk-operation.service.spec.ts

---

## PRIORITÉ HAUTE (P1) - API Manquantes

### DEV-06: Créer le controller REST pour les notifications

- **Fichier**: `apps/api/src/modules/notifications/notifications.controller.ts`
- **Status**: [x] Terminé
- **Description**: Le service existe mais pas d'endpoints HTTP
- **Solution**:
  - Créé `NotificationsController` avec endpoints REST complets
  - GET /notifications - Liste paginée des notifications de l'utilisateur
  - GET /notifications/unread-count - Compteur de notifications non lues
  - GET /notifications/:id - Récupérer une notification par ID
  - PATCH /notifications/read-all - Marquer toutes comme lues
  - PATCH /notifications/:id/read - Marquer une notification comme lue
  - DELETE /notifications/:id - Supprimer une notification
  - Ajouté `NotificationEntity` et `PaginatedNotificationsResponse` pour Swagger
  - Ajouté méthode `findOne` au service pour lecture seule
  - Protection par `JwtAuthGuard` sur tous les endpoints

### DEV-07: Ajouter les endpoints de gestion des subscriptions

- **Fichier**: `apps/api/src/modules/payments/payments.controller.ts`
- **Status**: [x] Terminé
- **Description**: SubscriptionService existe mais pas exposé en REST
- **Solution**:
  - Endpoints REST pour la gestion des abonnements:
    - `POST /payments/subscriptions` - Créer un abonnement
    - `GET /payments/subscriptions/:id` - Récupérer un abonnement
    - `GET /payments/subscriptions/user/:userId` - Lister les abonnements d'un utilisateur
    - `PATCH /payments/subscriptions/:id` - Mettre à jour un abonnement (plan, pause, coupon)
    - `DELETE /payments/subscriptions/:id` - Annuler un abonnement
    - `POST /payments/subscriptions/:id/resume` - Reprendre un abonnement en pause
  - Endpoints pour les produits et prix:
    - `POST /payments/subscriptions/product` - Créer un produit
    - `POST /payments/subscriptions/price` - Créer un prix
    - `GET /payments/subscriptions/products` - Lister les produits
    - `GET /payments/subscriptions/prices/:productId` - Lister les prix d'un produit
  - Endpoints pour les factures:
    - `GET /payments/invoices/user/:userId` - Lister les factures d'un utilisateur
  - Documentation Swagger complète avec types de réponse (ProductResponseDto, PriceResponseDto, SubscriptionResponseDto, InvoiceResponseDto)
  - Protection par `JwtAuthGuard` sur tous les endpoints
  - Utilisation des méthodes HTTP RESTful (PATCH pour update, DELETE pour cancel)
  - Tests unitaires complets (25 nouveaux tests)

### DEV-08: Implémenter les endpoints Stripe Connect

- **Fichier**: `apps/api/src/modules/payments/`
- **Status**: [x] Terminé
- **Description**: Onboarding et dashboard pour les vendors
- **Solution**:
  - Ajouté les endpoints REST pour Stripe Connect dans `PaymentsController`:
    - `POST /payments/connect/accounts` - Créer un compte Connect pour un vendor
    - `GET /payments/connect/accounts/:accountId` - Récupérer les détails d'un compte
    - `POST /payments/connect/onboarding-link` - Générer un lien d'onboarding Stripe
    - `POST /payments/connect/dashboard-link` - Générer un lien vers le dashboard Express
    - `GET /payments/connect/accounts/:accountId/balance` - Récupérer le solde du compte
  - Ajouté `DashboardLinkResponseDto` dans `stripe-connect.dto.ts`
  - Documentation Swagger complète avec descriptions détaillées
  - Tous les endpoints protégés par `JwtAuthGuard`
  - Utilisation des méthodes existantes de `StripeConnectService`

### DEV-09: Ajouter la recherche dans le Programme

- **Fichier**: `apps/api/src/modules/program/program.controller.ts`
- **Status**: [x] Terminé
- **Description**: GET /program/search?q=&genre=&date=&stage=
- **Solution**:
  - Créé `ProgramSearchDto` avec validation pour tous les filtres:
    - `festivalId` (requis) - ID du festival
    - `q` (optionnel) - Recherche dans le nom et bio de l'artiste
    - `genre` (optionnel) - Filtre par genre (recherche partielle, insensible à la casse)
    - `date` (optionnel) - Filtre par date (format YYYY-MM-DD)
    - `stageId` (optionnel) - Filtre par scène
    - Pagination: `page`, `limit` (max 100)
    - Tri: `sortBy` (startTime, artistName, stageName), `sortOrder` (asc, desc)
  - Créé `PaginatedProgramSearchResponse` avec métadonnées de pagination
  - Ajouté méthode `searchProgram()` dans `ProgramService`:
    - Construction dynamique des filtres Prisma
    - Exécution parallèle de count et findMany pour performance
    - Support des favoris utilisateur optionnel
    - Mapping vers DTOs avec toutes les infos pertinentes
  - Ajouté endpoint `GET /api/program/search` dans `ProgramController`:
    - Documentation Swagger complète
    - Rate limiting (100 req/min)
    - Support authentification optionnelle pour les favoris

### DEV-10: Implémenter l'export bulk pour Analytics

- **Fichier**: `apps/api/src/modules/analytics/`
- **Status**: [x] Terminé
- **Description**: POST /analytics/export avec génération CSV/PDF
- **Solution**:
  - Créé `BulkExportDto` dans `analytics-query.dto.ts` avec:
    - `festivalId` (requis) - ID du festival
    - `format` (requis) - Format d'export: 'csv', 'pdf', 'xlsx'
    - `startDate`/`endDate` (requis) - Période d'export
    - `metrics` (requis) - Métriques à inclure: 'dashboard', 'sales', 'cashless', 'attendance', 'zones', 'vendors', 'revenue', 'comprehensive'
    - `includeRawData` (optionnel) - Inclure les données brutes
    - `includeCharts` (optionnel) - Inclure les graphiques (PDF/XLSX)
  - Ajouté méthode `exportBulk()` dans `ExportService`:
    - Validation du festival (NotFoundException si inexistant)
    - Validation des métriques (BadRequestException si invalides)
    - Validation des dates (BadRequestException si startDate > endDate)
    - Support de tous les formats: CSV, PDF, XLSX
    - Délégation à `exportComprehensiveReport()` pour le metric 'comprehensive'
  - Étendu `getMetricSection()` pour supporter tous les types de métriques:
    - 'cashless' - Statistiques des transactions cashless
    - 'attendance' - Statistiques de fréquentation par jour
    - 'zones' - Statistiques des zones (occupation, visiteurs)
    - 'vendors' - Statistiques des vendeurs (commandes, revenus)
    - 'revenue' - Breakdown des revenus par catégorie
  - Ajouté endpoint `POST /analytics/export` dans `AnalyticsController`:
    - Protection par `JwtAuthGuard` et `RolesGuard` (ADMIN/ORGANIZER uniquement)
    - Documentation Swagger complète avec exemples
    - Réponses binaires pour tous les formats
  - Ajouté 16 nouveaux tests unitaires dans `export.service.spec.ts`:
    - Tests de validation (festival inexistant, métriques invalides, dates invalides)
    - Tests pour chaque type de métrique
    - Tests pour tous les formats (CSV, PDF, XLSX)
    - Tests pour l'export multiple métriques

---

## PRIORITÉ HAUTE (P1) - Performance

### DEV-11: Ajouter le caching sur la liste des festivals

- **Fichier**: `apps/api/src/modules/festivals/festivals.controller.ts`
- **Status**: [x] Terminé
- **Description**: Endpoint à fort trafic sans cache
- **Implémentation**:
  - Ajout de `@Cacheable` sur `findAll` avec TTL de 5 minutes et tag `FESTIVAL`
  - Ajout de `@CacheEvict` sur `create`, `update`, `remove`, `publish`, `cancel`
  - Enregistrement du `CacheInterceptor` dans `FestivalsModule`

### DEV-12: Optimiser les requêtes Program avec sélection de champs

- **Fichier**: `apps/api/src/modules/program/program.service.ts`
- **Status**: [x] Terminé
- **Description**: Ajouter `select` explicite aux requêtes
- **Implémentation**:
  - Ajouté `select` explicite à `getProgram()` et `getProgramByDay()` pour ne charger que id, startTime, endTime
  - Optimisation des relations artist/stage avec sous-select des champs nécessaires uniquement
  - Ajouté `select` explicite à `getArtists()` pour charger uniquement id, name, genre, bio, imageUrl
  - Ajouté `select` explicite à `getStages()` pour charger uniquement id, name, description, capacity, location
  - Ajouté `select` explicite à `getArtistById()` avec les champs du DTO
  - Ajouté `select` explicite à `getArtistPerformances()` avec isCancelled pour dériver le status
  - Tests unitaires mis à jour pour valider les nouvelles structures de requête (76 tests passants)

### DEV-13: Ajouter la pagination partout

- **Fichier**: Tous les services avec `findMany()`
- **Status**: [ ] À faire
- **Description**: 145 requêtes findMany, certaines sans limite

### DEV-14: Implémenter le cache Redis pour les artistes

- **Fichier**: `apps/api/src/modules/program/program.service.ts`
- **Status**: [x] Terminé
- **Description**: Cache les données artistes avec TTL 1 heure
- **Implémentation**:
  - Ajout de cache tags `ARTIST` et `PROGRAM` dans `CacheService`
  - Cache sur `getArtists()` avec TTL 1 heure et tags `[ARTIST, FESTIVAL]`
  - Cache sur `getArtistById()` avec TTL 1 heure et tag `[ARTIST]`
  - Cache sur `getArtistPerformances()` avec TTL 1 heure et tags `[ARTIST, PROGRAM]` (ou `[ARTIST, PROGRAM, FESTIVAL]` si festivalId fourni)
  - Ajout de méthodes d'invalidation de cache: `invalidateArtistCache()`, `invalidateArtistListCache()`, `invalidateProgramCache()`
  - Tests unitaires complets pour toutes les nouvelles fonctionnalités de cache

### DEV-15: Prévenir les requêtes N+1

- **Fichier**: Services Prisma
- **Status**: [ ] À faire
- **Description**: Ajouter `include` et batch queries

---

## PRIORITÉ MOYENNE (P2) - Tests

### DEV-16: Tests d'intégration pour les webhooks Stripe

- **Fichier**: `apps/api/src/modules/payments/`
- **Status**: [ ] À faire
- **Description**: Tester tous les événements webhook

### DEV-17: Tests pour les templates de notification

- **Fichier**: `apps/api/src/modules/notifications/services/`
- **Status**: [ ] À faire
- **Description**: Tester le rendu des templates

### DEV-18: Tests GDPR pour l'export de données

- **Fichier**: `apps/api/src/modules/gdpr/gdpr.service.ts`
- **Status**: [ ] À faire
- **Description**: Tester l'export complet des données utilisateur

### DEV-19: Tests de charge pour la validation de tickets

- **Fichier**: `apps/api/src/modules/tickets/`
- **Status**: [ ] À faire
- **Description**: Tester 100+ validations concurrentes

### DEV-20: Tests WebSocket

- **Fichier**: `apps/api/src/gateways/`
- **Status**: [ ] À faire
- **Description**: Tester le cycle de vie des connexions

---

## PRIORITÉ MOYENNE (P2) - Fonctionnalités

### DEV-21: Détection des conflits de programmation

- **Fichier**: `apps/api/src/modules/program/program.service.ts`
- **Status**: [x] Terminé
- **Description**: Valider les chevauchements de performances
- **Solution**:
  - Ajouté `detectScheduleConflicts()` méthode qui vérifie:
    - Même artiste performant à des heures qui se chevauchent (sur n'importe quelle scène)
    - Même scène avec des performances qui se chevauchent
  - Créé types TypeScript pour les conflits: `ScheduleConflict`, `ScheduleConflictResult`
  - Créé DTOs pour CRUD: `CreatePerformanceDto`, `UpdatePerformanceDto`
  - Ajouté méthodes CRUD avec détection de conflits:
    - `createPerformance()` - vérifie les conflits avant création
    - `updatePerformance()` - vérifie les conflits en excluant la performance courante
    - `getPerformanceById()` - récupère une performance
    - `deletePerformance()` - supprime une performance
  - Ajouté codes d'erreur program-related dans `error-codes.ts` (12xxx)
  - Ajouté exceptions spécifiques utilisées: `ScheduleConflictException`, `StageNotFoundException`, `ArtistNotFoundException`, `PerformanceNotFoundException`
  - Invalidation du cache après chaque modification
  - Ajouté 31 nouveaux tests unitaires couvrant tous les cas de conflits
  - Total: 4636 tests passants, couverture program.service.ts: 81.19%

### DEV-22: Gestion d'inventaire pour les vendors

- **Fichier**: `apps/api/src/modules/vendors/vendors.service.ts`
- **Status**: [ ] À faire
- **Description**: Tracking du stock, prévention overselling

### DEV-23: Règles de cumul des codes promo

- **Fichier**: `apps/api/src/modules/promo-codes/promo-codes.service.ts`
- **Status**: [ ] À faire
- **Description**: Empêcher le cumul de codes promo

### DEV-24: Transfert de tickets

- **Fichier**: `apps/api/src/modules/tickets/tickets.service.ts`
- **Status**: [x] Terminé
- **Description**: POST /tickets/:id/transfer
- **Solution**:
  - Ajouté `TransferTicketDto` avec validation email dans `tickets.dto.ts`
  - Ajouté `TicketTransferFailedException` dans `business.exception.ts`
  - Ajouté méthode `transferTicket()` dans TicketsService avec:
    - Validation que le ticket appartient à l'expéditeur
    - Validation que le ticket n'est pas utilisé/annulé/remboursé
    - Validation que le festival n'est pas terminé/annulé
    - Prévention de l'auto-transfert
    - Création automatique du destinataire si inexistant
    - Vérification des quotas du destinataire
    - Mise à jour des champs `transferredFromUserId` et `transferredAt`
  - Ajouté endpoint `POST /tickets/:id/transfer` dans TicketsController
  - Ajouté `sendTicketTransferEmail()` dans EmailService
  - Mis à jour le schéma Prisma avec les champs `transferredFromUserId`, `transferredAt` et la relation `TicketTransfers`
  - Ajouté index sur `transferredFromUserId` pour les requêtes performantes
  - Mis à jour les tests unitaires avec mock EmailService

### DEV-25: Limites de compte cashless

- **Fichier**: `apps/api/src/modules/cashless/cashless.service.ts`
- **Status**: [x] Terminé
- **Description**: Limites de solde et transactions configurables
- **Solution**:
  - Ajouté `CashlessLimitsConfig` interface avec tous les paramètres configurables:
    - `minTopupAmount` - Montant minimum pour un rechargement (défaut: 5.00 EUR)
    - `maxTopupAmount` - Montant maximum pour un rechargement (défaut: 500.00 EUR)
    - `maxBalance` - Solde maximum du compte (défaut: 500.00 EUR)
    - `minPaymentAmount` - Montant minimum pour un paiement (défaut: 0.01 EUR)
    - `maxSingleTransactionAmount` - Montant maximum par transaction (défaut: 100.00 EUR)
    - `dailyTransactionLimit` - Limite quotidienne de transactions (défaut: 1000.00 EUR)
  - Ajouté `DailyTransactionLimitExceededException` et `MaxBalanceExceededException` dans business.exception.ts
  - Ajouté nouveaux codes d'erreur `CASHLESS_DAILY_LIMIT_EXCEEDED` (ERR_8008) et `CASHLESS_MAX_BALANCE_EXCEEDED` (ERR_8009)
  - Implémenté `getFestivalLimits()` pour charger les limites configurées par festival (via champ JSON `cashlessLimits`)
  - Implémenté `getDailyTransactionTotal()` pour calculer le total quotidien des transactions
  - Implémenté `validateTransactionLimits()` pour valider toutes les limites avant chaque transaction
  - Mis à jour `topup()` et `pay()` pour utiliser les limites spécifiques au festival
  - Ajouté 11 nouveaux tests unitaires pour la validation des limites
  - Total: 45 tests passants dans cashless.service.spec.ts

---

## PRIORITÉ BASSE (P3) - Qualité de Code

### DEV-26: Ajouter le versioning API

- **Fichier**: `apps/api/src/common/versioning/`
- **Status**: [ ] À faire
- **Description**: Appliquer le versioning à tous les controllers

### DEV-27: Refactorer les méthodes longues

- **Fichier**: Services avec méthodes 100+ lignes
- **Status**: [ ] À faire
- **Description**: Extraire en méthodes helper

### DEV-28: Ajouter le logging request/response

- **Fichier**: `apps/api/src/common/interceptors/`
- **Status**: [ ] À faire
- **Description**: Logger request ID, durée, status

### DEV-29: Implémenter le soft delete

- **Fichier**: Schéma Prisma, tous les services
- **Status**: [ ] À faire
- **Description**: Ajouter `deletedAt` aux modèles critiques

### DEV-30: Health check pour FCM

- **Fichier**: `apps/api/src/modules/health/`
- **Status**: [ ] À faire
- **Description**: Indicator santé pour push notifications

---

## Scripts de Vérification

```bash
# Vérification complète
./scripts/verify-all.sh

# Vérification API uniquement
./scripts/verify-api.sh

# Tests avec coverage
npx nx test api --coverage
```

---

_Dernière mise à jour: 2026-01-08_
_Assigné par: CTO Virtual_
