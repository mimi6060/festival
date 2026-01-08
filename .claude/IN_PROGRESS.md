# Tâches En Cours & À Faire

---

## CTO Mission - 30 Développeurs Assignés

**Date**: 2026-01-08
**Objectif**: Améliorer la qualité et la complétude de la plateforme Festival

---

## Coverage Actuelle

| Metric     | Coverage   | Target | Status   |
| ---------- | ---------- | ------ | -------- |
| Statements | **83.09%** | 80%    | Exceeded |
| Branches   | **70.00%** | 70%    | Met      |
| Functions  | **81.59%** | 80%    | Exceeded |
| Lines      | **82.99%** | 80%    | Exceeded |

**Total Tests: 4,563** | **Test Suites: 89**

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

- **Fichier**: `apps/api-e2e/src/payments.e2e-spec.ts`
- **Status**: [ ] À faire
- **Description**: Aucun test E2E pour le module de paiement critique

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
- **Status**: [ ] À faire
- **Description**: SubscriptionService existe mais pas exposé en REST

### DEV-08: Implémenter les endpoints Stripe Connect

- **Fichier**: `apps/api/src/modules/payments/`
- **Status**: [ ] À faire
- **Description**: Onboarding et dashboard pour les vendors

### DEV-09: Ajouter la recherche dans le Programme

- **Fichier**: `apps/api/src/modules/program/program.controller.ts`
- **Status**: [ ] À faire
- **Description**: GET /program/search?q=&genre=&date=&stage=

### DEV-10: Implémenter l'export bulk pour Analytics

- **Fichier**: `apps/api/src/modules/analytics/`
- **Status**: [ ] À faire
- **Description**: POST /analytics/export avec génération CSV/PDF

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
- **Status**: [ ] À faire
- **Description**: Ajouter `select` explicite aux requêtes

### DEV-13: Ajouter la pagination partout

- **Fichier**: Tous les services avec `findMany()`
- **Status**: [ ] À faire
- **Description**: 145 requêtes findMany, certaines sans limite

### DEV-14: Implémenter le cache Redis pour les artistes

- **Fichier**: `apps/api/src/modules/program/program.service.ts`
- **Status**: [ ] À faire
- **Description**: Cache les données artistes avec TTL 1 heure

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
- **Status**: [ ] À faire
- **Description**: Valider les chevauchements de performances

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
- **Status**: [ ] À faire
- **Description**: POST /tickets/:id/transfer

### DEV-25: Limites de compte cashless

- **Fichier**: `apps/api/src/modules/cashless/cashless.service.ts`
- **Status**: [ ] À faire
- **Description**: Limites de solde et transactions configurables

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
