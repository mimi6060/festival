# Tâches En Cours & À Faire

---

## CTO Mission - 30 Développeurs Assignés

**Date**: 2026-01-08
**Objectif**: Améliorer la qualité et la complétude de la plateforme Festival

---

## Coverage Actuelle

| Metric     | Coverage   | Target | Status   |
| ---------- | ---------- | ------ | -------- |
| Statements | **82.80%** | 80%    | Exceeded |
| Branches   | **69.62%** | 70%    | Near     |
| Functions  | **81.91%** | 80%    | Exceeded |
| Lines      | **82.67%** | 80%    | Exceeded |

**Total Tests: 4,711** | **Test Suites: 90**

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
- **Status**: [x] Terminé
- **Description**: Ajouté la pagination aux modules high-traffic
- **Solution**:
  - Ajouté pagination à `TicketsService.getUserTickets()`:
    - Nouveau DTO `GetUserTicketsDto` avec page/limit/festivalId
    - Retourne paginated response avec items, total, totalPages, hasNextPage, hasPrevPage
    - Default limit: 20, max: 100
  - Ajouté pagination à `VendorsService.findAllProducts()`:
    - Nouveau DTO `QueryProductsDto` avec page/limit
    - Retourne paginated response avec data et meta
  - Ajouté pagination à `VendorsService.findPayouts()`:
    - Nouveau DTO `QueryPayoutsDto` avec page/limit
    - Retourne paginated response avec data et meta
  - Ajouté pagination à `VendorsService.exportVendorData()`:
    - Nouveau DTO `QueryExportDto` avec startDate/endDate/page/limit
    - Max limit: 1000 pour bulk export
  - Ajouté pagination à `StaffService.getShifts()`:
    - Options page/limit dans les parametres
    - Retourne paginated response avec items et meta
  - Ajouté pagination à `UsersService.getActivity()`:
    - Options page/limit dans les parametres
    - Retourne paginated response avec items et meta
  - Mis a jour tous les controllers pour accepter les query params de pagination
  - Mis a jour tous les tests (4711 tests passants)

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
- **Status**: [x] Terminé
- **Description**: Ajouter `include` et batch queries
- **Solution**:
  - **VendorsService.createOrder**: Remplacé boucle for sequentielle par `Promise.all()` pour mise à jour stock produits
  - **VendorsService.verifyVendorOwnership**: Parallélisé fetch vendor et user avec `Promise.all()`
  - **VendorsService.refundCashlessPayment**: Parallélisé fetch cashlessAccount et vendor avec `Promise.all()`
  - **ZonesService.logAccess**: Parallélisé fetch zone et ticket avec `Promise.all()`
  - Tests: 4772 tests passants, build API OK

---

## PRIORITÉ MOYENNE (P2) - Tests

### DEV-16: Tests d'intégration pour les webhooks Stripe

- **Fichier**: `apps/api/src/modules/payments/webhook.integration.spec.ts`
- **Status**: [x] Terminé
- **Description**: Tester tous les événements webhook
- **Solution**:
  - Créé `webhook.integration.spec.ts` avec tests complets pour tous les événements Stripe:
    - `checkout.session.completed` - Mise à jour du paiement en COMPLETED
    - `payment_intent.succeeded` - Mise à jour du paiement en COMPLETED avec méthode de paiement
    - `payment_intent.payment_failed` - Mise à jour du paiement en FAILED avec détails d'erreur
    - `refund.created` - Mise à jour du paiement en REFUNDED avec détails du remboursement
    - `charge.refunded` - Gestion gracieuse (événement non géré)
  - Tests de vérification de signature webhook:
    - Signature invalide -> `InvalidWebhookException`
    - Signature manquante -> `InvalidWebhookException`
    - Timestamp expiré -> `InvalidWebhookException`
    - Vérification des paramètres passés à Stripe
  - Tests des types d'événements non reconnus:
    - Événements inconnus gérés gracieusement
    - Événements `customer.created`, `invoice.paid` non traités
  - Tests de service indisponible:
    - `ServiceUnavailableException` quand Stripe non configuré
  - Tests des cas limites:
    - Payload vide, JSON malformé
    - Paiement avec `providerData` null
    - Événements séquentiels rapides
  - **26 tests passants** couvrant tous les scénarios critiques
  - Note: Les tests des handlers de checkout (`handleCheckoutCompleted`, `handleCheckoutExpired`) sont dans `checkout.service.spec.ts`

### DEV-17: Tests pour les templates de notification

- **Fichier**: `apps/api/src/modules/notifications/services/notification-template.service.spec.ts`
- **Status**: [x] Terminé
- **Description**: Tester le rendu des templates
- **Solution**:
  - Ajouté 54 nouveaux tests de rendu de templates Handlebars:
    - **Email Template Rendering (3 tests)**: Tickets, paiements, reset password
    - **Push Notification Template Rendering (5 tests)**: Artist reminder, cashless topup, schedule change, vendor order, security alert
    - **SMS Template Rendering (3 tests)**: Ticket validation, payment confirmation, emergency SMS
    - **Missing Variables Handling (6 tests)**: Missing, undefined, null variables, nested missing variables
    - **Edge Cases - Empty Data (6 tests)**: Empty strings, empty template, zero values, false values
    - **Edge Cases - Special Characters (10 tests)**: HTML escaping, XSS prevention, accents, emoji, newlines, Unicode, long values
    - **Template Type Specific Rendering (10 tests)**: All 10 notification types (TICKET_PURCHASED, PAYMENT_SUCCESS, PAYMENT_FAILED, CASHLESS_TOPUP, ARTIST_REMINDER, SCHEDULE_CHANGE, FESTIVAL_UPDATE, SECURITY_ALERT, VENDOR_ORDER, PROMO)
    - **Complex Variable Scenarios (6 tests)**: Multiple occurrences, numeric variables, array access, nested objects, mixed types, dates
    - **Error Handling (3 tests)**: Malformed syntax, triple braces (unescaped), bracket notation
    - **Performance Edge Cases (2 tests)**: 100 variables, 1000 iterations
  - Total tests dans notification-template.service.spec.ts: 112 (58 existants + 54 nouveaux)

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
- **Status**: [x] Terminé
- **Description**: Tracking du stock, prévention overselling
- **Solution**:
  - Ajouté `checkStockAvailability(productId, quantity)` - Vérifie la disponibilité du stock avant achat
  - Ajouté `decrementStock(productId, quantity)` - Décrémente le stock après achat avec alerte stock faible
  - Ajouté `validateOrderStock(items)` - Validation en masse du stock pour commande multi-produits
  - Ajouté `getLowStockProducts(vendorId, threshold?)` - Liste les produits en rupture de stock imminente
  - Ajouté `getOutOfStockProducts(vendorId)` - Liste les produits en rupture totale
  - Ajouté `restoreStock(productId, quantity)` - Restaure le stock (annulation commande)
  - Ajouté `setStock(vendorId, productId, userId, stock)` - Mise à jour manuelle du stock
  - Ajouté `getInventorySummary(vendorId)` - Résumé de l'inventaire (total, ruptures, alertes)
  - Ajouté codes d'erreur: `VENDOR_INSUFFICIENT_STOCK` (ERR_9005), `VENDOR_OUT_OF_STOCK` (ERR_9006), `VENDOR_LOW_STOCK_ALERT` (ERR_9007)
  - Ajouté exceptions: `InsufficientStockException`, `OutOfStockException`, `LowStockAlertException`
  - Seuil d'alerte stock faible par défaut: 10 unités
  - Support stock illimité (null = unlimited)
  - 29 nouveaux tests unitaires couvrant tous les cas d'inventaire

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
- **Status**: [x] Terminé
- **Description**: Appliquer le versioning à tous les controllers
- **Solution**:
  - Activé le versioning global dans `main.ts`:
    - Ajouté `ApiVersionGuard` pour valider les versions demandées
    - Ajouté `ApiVersionHeaderInterceptor` pour inclure `X-API-Version` dans toutes les réponses
    - Ajouté documentation versioning dans Swagger (`X-API-Version` header global)
  - Appliqué le versioning aux controllers principaux:
    - `AuthController` - `@AllVersions()` + `@ApiHeader(X-API-Version)`
    - `UsersController` - `@AllVersions()` + `@ApiHeader(X-API-Version)`
    - `FestivalsController` - `@AllVersions()` + `@ApiHeader(X-API-Version)`
    - `TicketsController` - `@AllVersions()` + `@ApiHeader(X-API-Version)`
  - Documentation Swagger mise à jour:
    - Section "API Versioning" ajoutée à la description
    - Header global `X-API-Version` avec enum v1/v2 et default v1
  - Méthodes de spécification de version supportées:
    - Header: `X-API-Version: v1` ou `X-API-Version: v2`
    - Query parameter: `?api-version=1` ou `?api-version=2`
    - URL path: `/api/v1/...` ou `/api/v2/...`
  - Version par défaut: v1 (pour compatibilité descendante)
  - Tous les tests passent (4772 tests)

### DEV-27: Refactorer les méthodes longues

- **Fichier**: Services avec méthodes 100+ lignes
- **Status**: [x] Terminé
- **Description**: Extraire en méthodes helper
- **Solution**:
  - Refactorisé `TicketsService.purchaseTickets()` (~140 lignes -> ~30 lignes):
    - `validatePurchaseQuantity()` - Valide que quantity >= 1
    - `fetchFestivalAndCategory()` - Récupère festival et catégorie en parallèle
    - `validateFestivalForPurchase()` - Valide le statut du festival
    - `validateCategoryForPurchase()` - Valide la catégorie et son appartenance
    - `validateSalePeriod()` - Valide les dates de vente
    - `validateTicketAvailability()` - Valide la disponibilité des tickets
    - `validateUserQuota()` - Valide le quota utilisateur
    - `createTicketsInTransaction()` - Crée les tickets en transaction
    - `generateTicketDataArray()` - Génère les données de tickets pour insertion
  - Refactorisé `TicketsService.transferTicket()` (~140 lignes -> ~25 lignes):
    - `fetchTicketForTransfer()` - Récupère le ticket avec relations
    - `validateTicketOwnership()` - Valide la propriété du ticket
    - `validateTicketStatusForTransfer()` - Valide le statut du ticket
    - `validateFestivalStatusForTransfer()` - Valide le statut du festival
    - `validateNotSelfTransfer()` - Empêche l'auto-transfert
    - `findOrCreateRecipient()` - Trouve ou crée le destinataire
    - `validateRecipientQuota()` - Valide le quota du destinataire
    - `executeTicketTransfer()` - Exécute le transfert
    - `sendTransferNotification()` - Envoie la notification email
  - Refactorisé `VendorsService.createOrder()` (~180 lignes -> ~35 lignes):
    - `fetchAndValidateVendor()` - Récupère et valide le vendor
    - `fetchAndValidateProducts()` - Récupère et valide les produits
    - `calculateOrderTotals()` - Calcule les totaux et valide le stock
    - `calculateCommission()` - Calcule la commission
    - `processCashlessPaymentIfNeeded()` - Traite le paiement cashless
    - `createOrderInTransaction()` - Crée la commande en transaction
  - Refactorisé `CheckoutService.createCheckoutSession()` (~160 lignes -> ~45 lignes):
    - `validateUser()` - Valide que l'utilisateur existe
    - `calculateTotalsWithPromo()` - Calcule les totaux avec code promo
    - `buildStripeLineItems()` - Construit les line items Stripe
    - `buildSessionParams()` - Construit les paramètres de session
    - `buildConnectOptions()` - Construit les options Stripe Connect
    - `createPaymentRecord()` - Crée l'enregistrement de paiement
  - Refactorisé `RefundService.checkRefundEligibility()` (~115 lignes -> ~40 lignes):
    - `fetchPaymentWithTickets()` - Récupère le paiement avec tickets
    - `checkBasicEligibility()` - Vérifie l'éligibilité de base
    - `calculateEventBasedEligibility()` - Calcule l'éligibilité basée sur l'événement
    - `buildFinalEligibility()` - Construit la réponse finale
  - API publique préservée (aucune modification des signatures de méthodes publiques)
  - 4772 tests passants (aucune régression)

### DEV-28: Ajouter le logging request/response

- **Fichier**: `apps/api/src/common/interceptors/logging.interceptor.ts`
- **Status**: [x] Terminé
- **Description**: Logger request ID, durée, status
- **Solution**:
  - Amélioré `LoggingInterceptor` avec génération automatique de request ID (UUID)
  - Request ID extrait du header `X-Request-ID` ou généré automatiquement via `crypto.randomUUID()`
  - Request ID inclus dans le header de réponse `X-Request-ID` pour le tracing client
  - Logging de la méthode HTTP, URL et user ID à chaque requête entrante
  - Logging du status code et durée (en ms) à chaque réponse
  - Sanitization des URLs pour masquer les données sensibles (passwords, tokens, apiKey, etc.)
  - Niveaux de log appropriés: info (2xx/3xx), warn (4xx), error (5xx)
  - Support du correlation ID pour le tracing distribué
  - Enregistrement global dans `main.ts` pour tous les endpoints API
  - 36 tests unitaires couvrant tous les cas

### DEV-29: Implémenter le soft delete

- **Fichier**: Schéma Prisma, tous les services
- **Status**: [ ] À faire
- **Description**: Ajouter `deletedAt` aux modèles critiques

### DEV-30: Health check pour FCM

- **Fichier**: `apps/api/src/modules/health/`
- **Status**: [x] Terminé
- **Description**: Indicator santé pour push notifications
- **Solution**:
  - Créé `FcmHealthIndicator` dans `apps/api/src/modules/health/indicators/fcm.health.ts`
  - L'indicateur utilise `FcmService.isEnabled()` pour vérifier si FCM est configuré
  - Retourne statut `up` si FCM est initialisé et fonctionnel
  - Retourne statut `not_configured` si FCM n'est pas configuré (acceptable en dev)
  - Retourne statut `down` avec message d'erreur en cas d'échec
  - Mis à jour `HealthModule` pour importer `NotificationsModule` et fournir `FcmHealthIndicator`
  - Mis à jour `HealthController`:
    - Ajouté FCM au check complet (`GET /health`)
    - Ajouté FCM à la sonde de readiness (`GET /health/ready`)
    - FCM `not_configured` est acceptable pour les sondes (comme Stripe)
  - Mis à jour les DTOs de réponse pour inclure FCM
  - Documentation Swagger mise à jour avec exemples FCM
  - Ajouté tests unitaires complets dans `fcm.health.spec.ts` (100% coverage)
  - Mis à jour les tests du controller pour inclure FCM mock

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
