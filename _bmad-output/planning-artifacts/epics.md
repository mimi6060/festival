# Epics & Stories

# Festival Management Platform - Brownfield Improvements

**Date:** 2026-01-14
**Status:** Ready for Sprint Planning

---

## Epic 1: Test Coverage & Quality Improvements

**Objective:** Améliorer la couverture de tests et la qualité du code existant

**Business Value:** Réduire les régressions, faciliter les futures évolutions

**Acceptance Criteria:**

- Coverage API >= 80%
- Tous les tests passent en CI
- Aucun warning ESLint

### Story 1.1: Augmenter la couverture des tests API

**User Story:**
As a developer,
I want comprehensive test coverage on critical API modules,
so that I can refactor safely and catch regressions early.

**Acceptance Criteria:**

1. Module auth coverage >= 85%
2. Module tickets coverage >= 85%
3. Module payments coverage >= 80%
4. Module cashless coverage >= 80%
5. Tous les edge cases couverts (erreurs, limites)

**Technical Notes:**

- Utiliser jest-mock-extended pour Prisma
- Ajouter tests pour WebhookEventHelper dans tous les modules concernés
- Vérifier les mocks de services externes (Stripe, FCM)

**Source:** [Test Rules - project-context.md#testing-rules]

---

### Story 1.2: Corriger les warnings ESLint restants

**User Story:**
As a developer,
I want zero ESLint warnings in the codebase,
so that the code quality is consistent.

**Acceptance Criteria:**

1. Aucun warning `@typescript-eslint/no-unused-vars`
2. Aucun warning `@typescript-eslint/no-empty-function`
3. Aucun warning de dependencies non utilisées
4. Pre-commit hooks passent sans erreurs

**Technical Notes:**

- Fichiers récemment corrigés : auth-context.test.tsx, festivals.controller.spec.ts
- Préfixer variables inutilisées avec `_`
- Ajouter commentaires explicatifs pour fonctions vides intentionnelles

**Source:** [ESLint Config - eslint.config.mjs]

---

### Story 1.3: Ajouter tests E2E critiques manquants

**User Story:**
As a QA engineer,
I want E2E tests for critical user journeys,
so that we validate the complete flow works.

**Acceptance Criteria:**

1. E2E test: Purchase ticket flow (guest checkout)
2. E2E test: Login → View tickets → QR display
3. E2E test: Admin dashboard KPIs load
4. E2E test: Cashless topup flow
5. Tests exécutables en CI < 5 minutes

**Technical Notes:**

- Playwright pour tests navigateur
- Utiliser fixtures de test (prisma seed)
- Mock Stripe en mode test

**Source:** [E2E Testing - apps/api-e2e/]

---

## Epic 2: API Performance Optimization

**Objective:** Optimiser les performances de l'API pour les pics de charge

**Business Value:** Supporter 10x plus de validations de tickets simultanées

**Acceptance Criteria:**

- P95 latency < 200ms sur endpoints critiques
- Support 1000 validations/minute
- Cache Redis fonctionnel

### Story 2.1: Implémenter le cache Redis pour festivals

**User Story:**
As a festival-goer,
I want fast festival page loads,
so that I can browse smoothly during high traffic.

**Acceptance Criteria:**

1. GET /festivals cached 60s
2. GET /festivals/:slug cached 30s
3. Cache invalidé sur update festival
4. Metrics cache hit/miss disponibles
5. Response time < 50ms sur cache hit

**Technical Notes:**

- Utiliser `@CacheInterceptor()` NestJS
- Redis key pattern: `festival:{slug}:details`
- TTL configurable via env

**Source:** [Cache Module - modules/cache/]

---

### Story 2.2: Optimiser les requêtes Prisma N+1

**User Story:**
As an API consumer,
I want optimized database queries,
so that list endpoints are fast.

**Acceptance Criteria:**

1. Identifier les requêtes N+1 avec Prisma query logging
2. Ajouter `include` appropriés dans findMany
3. Benchmarker avant/après avec 1000 tickets
4. P95 < 100ms pour GET /tickets/me

**Technical Notes:**

- Activer `log: ['query']` en dev
- Utiliser Prisma middleware pour logging
- Index composites sur colonnes de filtre

**Source:** [Prisma Schema - prisma/schema.prisma]

---

### Story 2.3: Ajouter rate limiting granulaire

**User Story:**
As an API operator,
I want rate limiting on expensive endpoints,
so that the API stays available under attack.

**Acceptance Criteria:**

1. POST /auth/login: 5 req/min par IP
2. POST /auth/register: 3 req/min par IP
3. POST /tickets/purchase: 10 req/min par user
4. POST /cashless/pay: 60 req/min par user
5. Réponse 429 avec Retry-After header

**Technical Notes:**

- Utiliser `@RateLimit()` decorator existant
- Stocker compteurs dans Redis
- Bypass pour IPs whitelist

**Source:** [Rate Limit Service - common/services/rate-limit.service.ts]

---

## Epic 3: Mobile App Enhancements

**Objective:** Améliorer l'expérience utilisateur de l'app mobile

**Business Value:** Augmenter l'adoption et la rétention utilisateur mobile

**Acceptance Criteria:**

- Offline mode fonctionnel
- NFC payments testés
- Performance smooth (60 FPS)

### Story 3.1: Améliorer la synchronisation offline

**User Story:**
As a festival-goer,
I want my tickets available offline,
so that I can enter even without network.

**Acceptance Criteria:**

1. Tickets cachés localement après premier fetch
2. QR codes disponibles sans connexion
3. Indicator de mode offline visible
4. Sync automatique à la reconnexion
5. Conflit resolution: server wins

**Technical Notes:**

- WatermelonDB pour storage local
- NetInfo pour détecter connectivity
- Background sync avec Expo TaskManager

**Source:** [Offline Service - mobile/services/offline.ts]

---

### Story 3.2: Optimiser les animations et performances

**User Story:**
As a mobile user,
I want smooth animations,
so that the app feels native and responsive.

**Acceptance Criteria:**

1. Navigation transitions < 300ms
2. List scroll 60 FPS (pas de jank)
3. QR code render < 100ms
4. Splash screen < 2s
5. Taille APK < 50MB

**Technical Notes:**

- Utiliser `react-native-reanimated` v3
- FlatList avec `windowSize` optimisé
- Image caching avec Expo Image
- Hermes engine activé

**Source:** [Mobile App - apps/mobile/]

---

## Epic 4: Admin Dashboard Improvements

**Objective:** Enrichir le dashboard admin avec plus de fonctionnalités

**Business Value:** Permettre aux organisateurs de mieux gérer leurs événements

**Acceptance Criteria:**

- Dashboard temps réel fonctionnel
- Exports CSV/Excel
- Notifications admin

### Story 4.1: Dashboard temps réel avec WebSocket

**User Story:**
As an organizer,
I want real-time dashboard updates,
so that I can monitor the festival live.

**Acceptance Criteria:**

1. Compteur tickets vendus en temps réel
2. Revenus actualisés toutes les 5s
3. Occupation zones en direct
4. Alertes capacité visibles
5. Connection status indicator

**Technical Notes:**

- Connecter au gateway `zones`
- Utiliser hook `useWebSocket` existant
- Fallback polling si WS indisponible

**Source:** [WebSocket Gateway - gateways/zones.gateway.ts]

---

### Story 4.2: Améliorer les exports de données

**User Story:**
As an organizer,
I want to export all data to Excel,
so that I can analyze offline and share reports.

**Acceptance Criteria:**

1. Export tickets au format XLSX
2. Export transactions cashless au format XLSX
3. Export participants avec filtres
4. Progress indicator pour gros exports
5. Export asynchrone pour > 10K lignes

**Technical Notes:**

- Utiliser `exceljs` pour génération XLSX
- BullMQ job pour exports longs
- Storage temporaire S3/MinIO

**Source:** [Export Service - modules/analytics/export.service.ts]

---

### Story 4.3: Centre de notifications admin

**User Story:**
As an admin,
I want a notification center,
so that I stay informed of important events.

**Acceptance Criteria:**

1. Bell icon avec badge unread count
2. Liste notifications avec timestamps
3. Types: new purchase, refund, support ticket
4. Mark as read individually
5. Mark all as read

**Technical Notes:**

- Composant NotificationCenter existant
- Connect au gateway `events`
- Persist état read dans localStorage

**Source:** [Notification Center - admin/components/notifications/]

---

## Epic 5: Bug Fixes & Technical Debt

**Objective:** Corriger les bugs connus et réduire la dette technique

**Business Value:** Stabiliser la plateforme et faciliter la maintenance

**Acceptance Criteria:**

- Zero bugs critiques
- Build CI stable
- Documentation à jour

### Story 5.1: Corriger les tests flaky

**User Story:**
As a developer,
I want stable tests,
so that CI failures indicate real problems.

**Acceptance Criteria:**

1. Identifier tous les tests flaky (> 3 failures/semaine)
2. Corriger les race conditions
3. Ajouter retries où approprié
4. Stabilité 100% sur 10 runs consécutifs

**Technical Notes:**

- Jest `--detectOpenHandles` pour leaks
- Augmenter timeouts pour tests DB
- Mock time pour tests timing-sensitive

**Source:** [Test Setup - apps/api/src/test/setup.ts]

---

### Story 5.2: Nettoyer le code mort

**User Story:**
As a developer,
I want no dead code,
so that the codebase is maintainable.

**Acceptance Criteria:**

1. Supprimer imports inutilisés
2. Supprimer fonctions jamais appelées
3. Supprimer types non référencés
4. Aucun `// TODO` sans issue liée

**Technical Notes:**

- Utiliser `ts-prune` pour détecter exports inutilisés
- ESLint `no-unused-vars` strict
- Revue des fichiers > 500 LOC

**Source:** [Code Quality - project-context.md#code-quality]

---

### Story 5.3: Mettre à jour les dépendances critiques

**User Story:**
As a developer,
I want up-to-date dependencies,
so that we benefit from security patches and features.

**Acceptance Criteria:**

1. Audit npm: 0 vulnerabilities high/critical
2. Next.js 15.x latest patch
3. NestJS 11.x latest patch
4. Prisma 6.x latest patch
5. Tests passent après update

**Technical Notes:**

- `npm audit fix` pour patches automatiques
- Tester chaque update majeure isolément
- Changelog review avant update

**Source:** [package.json]

---

## Summary

| Epic                   | Stories | Priority | Effort |
| ---------------------- | ------- | -------- | ------ |
| 1. Test Coverage       | 3       | High     | Medium |
| 2. API Performance     | 3       | High     | Medium |
| 3. Mobile Enhancements | 2       | Medium   | High   |
| 4. Admin Dashboard     | 3       | Medium   | Medium |
| 5. Bug Fixes & Debt    | 3       | High     | Low    |

**Total Stories:** 14
**Recommended Sprint Size:** 3-4 stories

---

---

## Epic 6: Advanced Analytics & Integrations (Sprint 2)

**Objective:** Enrichir les analytics et ajouter des intégrations externes

**Business Value:** Permettre aux organisateurs de mieux analyser et planifier leurs événements

**Acceptance Criteria:**

- Dashboard analytics avec graphiques avancés
- Intégration calendrier externe (iCal export)
- Filtres et recherche avancés

### Story 6.1: Dashboard analytics avancé

**User Story:**
As an organizer,
I want advanced analytics visualizations,
so that I can understand trends and make data-driven decisions.

**Acceptance Criteria:**

1. Graphique évolution des ventes par jour/semaine
2. Répartition des revenus par catégorie de ticket
3. Heatmap des heures de pointe d'affluence
4. Comparaison avec éditions précédentes (si disponible)
5. Filtres par période et segment

**Technical Notes:**

- Utiliser Recharts ou Chart.js pour visualisations
- API endpoints pour données agrégées
- Pagination et lazy loading pour grands datasets

**Source:** [PRD Phase 2 - Dashboard analytics avancé]

---

### Story 6.2: Export calendrier iCal

**User Story:**
As a festival-goer,
I want to export festival events to my calendar,
so that I can plan my schedule with other commitments.

**Acceptance Criteria:**

1. Endpoint GET /festivals/:id/calendar.ics
2. Export performances avec stage et artiste
3. Filtrage par jour ou artistes favoris
4. Lien partageable pour subscription calendrier
5. Compatible Google Calendar, Apple Calendar, Outlook

**Technical Notes:**

- Utiliser librairie `ical-generator`
- Format standard RFC 5545
- Cache le fichier iCal généré (invalider sur update)

**Source:** [PRD Phase 2 - Intégration calendrier externe]

---

### Story 6.3: Filtres et recherche avancés admin

**User Story:**
As an admin,
I want advanced filtering and search capabilities,
so that I can quickly find specific tickets, users, or transactions.

**Acceptance Criteria:**

1. Recherche full-text sur tickets (nom, email, ID)
2. Filtres combinables (date, statut, catégorie, montant)
3. Sauvegarde des filtres favoris
4. Export des résultats filtrés en XLSX
5. Autocomplétion sur champs de recherche

**Technical Notes:**

- PostgreSQL full-text search ou Elasticsearch
- Debounce sur recherche live
- Stocker filtres sauvegardés en localStorage ou DB

**Source:** [PRD Phase 2 - Amélioration UX admin]

---

## Epic 7: Staff & Vendor Improvements (Sprint 2)

**Objective:** Améliorer les fonctionnalités staff et vendors

**Business Value:** Réduire le temps de formation et erreurs opérationnelles

**Acceptance Criteria:**

- Interface staff simplifiée
- Gestion inventaire vendors améliorée

### Story 7.1: Interface de validation tickets simplifiée

**User Story:**
As a staff member,
I want a streamlined ticket validation interface,
so that I can process entries faster during peak times.

**Acceptance Criteria:**

1. Scan QR → validation en < 2 secondes
2. Affichage clair du statut (vert/rouge/orange)
3. Mode hors-ligne avec sync ultérieure
4. Son et vibration pour feedback
5. Historique des 10 derniers scans

**Technical Notes:**

- Optimiser endpoint de validation
- Cache local des tickets déjà scannés
- WebSocket pour sync temps réel des scans

**Source:** [PRD NFR - Ticket validation < 3 secondes]

---

### Story 7.2: Gestion inventaire vendors temps réel

**User Story:**
As a vendor,
I want real-time inventory tracking,
so that I know when to restock and avoid stockouts.

**Acceptance Criteria:**

1. Dashboard inventaire par produit
2. Alertes stock bas configurable
3. Historique des ventes par produit
4. Bouton quick-restock
5. Notifications push pour alertes

**Technical Notes:**

- WebSocket pour updates temps réel
- Seuils d'alerte configurables par produit
- Intégration module notifications existant

**Source:** [PRD - Vendor Management]

---

## Summary (Updated)

| Epic                           | Stories | Priority | Effort | Sprint |
| ------------------------------ | ------- | -------- | ------ | ------ |
| 1. Test Coverage               | 3       | High     | Medium | 1      |
| 2. API Performance             | 3       | High     | Medium | 1      |
| 3. Mobile Enhancements         | 2       | Medium   | High   | 1      |
| 4. Admin Dashboard             | 3       | Medium   | Medium | 1      |
| 5. Bug Fixes & Debt            | 3       | High     | Low    | 1      |
| 6. Advanced Analytics          | 3       | Medium   | Medium | 2      |
| 7. Staff & Vendor Improvements | 2       | Medium   | Medium | 2      |

**Total Stories:** 19 (Sprint 1: 14, Sprint 2: 5)

---

_Document généré pour BMAD workflow_
