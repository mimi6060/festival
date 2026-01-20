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

## Epic 8: Staff Application (Sprint 3)

**Objective:** Créer une expérience dédiée pour le personnel du festival

**Business Value:** Réduire le temps de formation et améliorer l'efficacité opérationnelle

**Acceptance Criteria:**

- Mode staff dans l'app mobile
- Dashboard staff avec métriques clés
- Accès rapide aux fonctions critiques

### Story 8.1: Mode staff mobile dédié

**User Story:**
As a staff member,
I want a dedicated staff mode in the mobile app,
so that I can quickly access my work functions without navigation complexity.

**Acceptance Criteria:**

1. Login staff avec rôle automatiquement détecté
2. Dashboard staff avec stats du jour (scans, alertes, tâches)
3. Navigation simplifiée (Scan, Zones, Alertes, Profil)
4. Mode sombre par défaut pour économie batterie
5. Indicateur de shift actif avec heures restantes

**Technical Notes:**

- Réutiliser StaffValidationScreen existant
- Ajouter StaffDashboard et StaffZonesScreen
- Détection rôle via JWT claims

**Source:** [PRD Phase 3 - Application staff dédiée]

---

### Story 8.2: Dashboard staff avec KPIs

**User Story:**
As a staff manager,
I want a staff dashboard with key metrics,
so that I can monitor team performance and festival status.

**Acceptance Criteria:**

1. Nombre de validations par staff membre
2. Temps moyen de validation
3. Alertes actives par zone
4. Occupation zones assignées
5. Export rapport de shift

**Technical Notes:**

- Endpoint GET /staff/dashboard
- WebSocket pour updates temps réel
- Agrégations Prisma pour métriques

**Source:** [PRD Phase 3 - Application staff dédiée]

---

## Epic 9: Marketing & Public API (Sprint 3)

**Objective:** Ajouter des outils marketing et une API publique

**Business Value:** Permettre l'acquisition utilisateurs et intégrations tierces

**Acceptance Criteria:**

- Module email campaigns fonctionnel
- API publique documentée avec rate limiting
- SDK JavaScript pour intégrations

### Story 9.1: Module email campaigns

**User Story:**
As an organizer,
I want to send email campaigns to my festival attendees,
so that I can communicate updates and promotions.

**Acceptance Criteria:**

1. Création de campagne avec éditeur WYSIWYG
2. Segmentation par type de ticket, date d'achat
3. Templates prédéfinis (annonce, rappel, promo)
4. Planification envoi différé
5. Métriques (envoyés, ouverts, cliqués)

**Technical Notes:**

- Intégration SendGrid ou Mailchimp API
- BullMQ pour envois en lot
- Tracking pixels pour métriques

**Source:** [PRD Phase 3 - Module marketing]

---

### Story 9.2: API publique pour intégrations

**User Story:**
As a third-party developer,
I want a public API with documentation,
so that I can build integrations with the festival platform.

**Acceptance Criteria:**

1. Endpoints publics: festivals, artists, schedule
2. Authentification via API keys
3. Rate limiting par tier (free: 100/h, pro: 1000/h)
4. Documentation OpenAPI/Swagger publique
5. SDK JavaScript npm package

**Technical Notes:**

- Réutiliser ApiKeysModule existant
- Ajouter tier-based rate limiting
- Générer SDK avec openapi-generator

**Source:** [PRD Phase 3 - API publique]

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
| 8. Staff Application           | 2       | Medium   | Medium | 3      |
| 9. Marketing & Public API      | 2       | Medium   | High   | 3      |

**Total Stories:** 31 (Sprint 1: 14, Sprint 2: 5, Sprint 3: 4, Sprint 5: 8)

---

## Epic 10: Sprint 4 Stabilization (Sprint 4)

**Objective:** Stabiliser la plateforme après les développements des Sprints 1-3

**Business Value:** Assurer la fiabilité et la qualité avant d'ajouter de nouvelles fonctionnalités

**Acceptance Criteria:**

- Tous les tests passent en CI
- Build stable pour API, Web et Admin
- Documentation à jour

_Note: Epic 10 représente les travaux de stabilisation en cours du Sprint 4._

---

## Epic 11: Unified Design System (Sprint 5)

**Objective:** Créer une bibliothèque de composants UI partagée pour harmoniser l'interface utilisateur entre les applications web et admin

**Business Value:** Réduire la duplication de code, accélérer le développement frontend, assurer une expérience utilisateur cohérente

**Acceptance Criteria:**

- Bibliothèque libs/ui fonctionnelle avec Nx
- Design tokens centralisés et utilisés partout
- Composants Button, Card, Input, Modal extraits et partagés
- Applications web et admin migrées vers libs/ui
- Storybook documentant tous les composants

### Story 11.1: Create libs/ui Foundation

**User Story:**
As a frontend developer,
I want a shared UI component library,
so that I can reuse components across web and admin applications without code duplication.

**Acceptance Criteria:**

1. Créer `libs/ui` avec Nx generator (`nx g @nx/react:library ui`)
2. Configurer path alias `@festival/ui` dans tsconfig.base.json
3. Setup Storybook pour libs/ui avec configuration partagée
4. Créer structure de dossiers: `components/`, `hooks/`, `utils/`, `styles/`
5. Exporter index.ts avec barrel exports
6. Build de la lib réussit (`nx build ui`)
7. Tests de la lib réussissent (`nx test ui`)

**Technical Notes:**

- Utiliser `@nx/react:library` avec `--bundler=rollup` pour tree-shaking
- Configurer `compilerOptions.jsx: "react-jsx"` dans tsconfig
- Ajouter peer dependencies: react, react-dom, tailwindcss
- Setup Jest avec @testing-library/react
- Configurer ESLint avec règles partagées

**Source:** [Architecture - libs/shared structure]

---

### Story 11.2: Create Design Tokens Library

**User Story:**
As a designer/developer,
I want centralized design tokens,
so that colors, spacing, typography, and other design values are consistent across all applications.

**Acceptance Criteria:**

1. Créer `libs/ui/src/styles/tokens.css` avec CSS custom properties
2. Définir tokens pour: colors (primary, secondary, neutral, semantic), spacing (scale 0-96), typography (sizes, weights, line-heights), shadows, border-radius, transitions
3. Support dark mode via `[data-theme="dark"]` ou `prefers-color-scheme`
4. Créer `tokens.ts` pour export JavaScript des valeurs
5. Documenter tokens dans Storybook avec addon-docs
6. Créer Tailwind preset `libs/ui/tailwind.preset.js` utilisant les tokens

**Technical Notes:**

- Baser sur les tokens existants dans `apps/web/styles/tokens.css`
- Utiliser la convention `--festival-{category}-{name}` pour les custom properties
- Exemple: `--festival-color-primary-500`, `--festival-spacing-4`
- Créer un fichier `tokens.d.ts` pour TypeScript
- Prévoir support RTL avec logical properties

**Source:** [Design Tokens - apps/web/styles/tokens.css]

---

### Story 11.3: Extract Button Component

**User Story:**
As a frontend developer,
I want a reusable Button component,
so that all buttons across the platform have consistent styling and behavior.

**Acceptance Criteria:**

1. Créer `libs/ui/src/components/Button/Button.tsx`
2. Props supportées: variant (primary, secondary, outline, ghost, danger), size (sm, md, lg), disabled, loading, leftIcon, rightIcon, fullWidth
3. States visuels: default, hover, focus, active, disabled, loading
4. Accessibilité: focus visible, aria-disabled, aria-busy pour loading
5. Tests unitaires couvrant tous les variants et states
6. Stories Storybook pour chaque variant/size combinaison
7. Export depuis `@festival/ui`

**Technical Notes:**

- Utiliser `forwardRef` pour ref forwarding
- Utiliser `cva` (class-variance-authority) pour variants Tailwind
- Pattern: `<Button variant="primary" size="md" loading>Submit</Button>`
- Spinner interne pour état loading
- Extraire du composant existant dans `apps/web/components/ui/Button.tsx`

**Source:** [Web Button - apps/web/components/ui/Button.tsx]

---

### Story 11.4: Extract Card Component

**User Story:**
As a frontend developer,
I want a reusable Card component,
so that content containers have consistent styling across applications.

**Acceptance Criteria:**

1. Créer `libs/ui/src/components/Card/Card.tsx`
2. Composants: Card (container), Card.Header, Card.Body, Card.Footer
3. Props: variant (default, elevated, outlined), padding (none, sm, md, lg), interactive (hover effect)
4. Support pour Card.Image avec aspect ratio configurable
5. Tests unitaires pour composition et variants
6. Stories Storybook avec exemples de compositions
7. Export depuis `@festival/ui`

**Technical Notes:**

- Pattern compound component: `<Card><Card.Header>...</Card.Header></Card>`
- Utiliser context pour passer variant aux sous-composants
- Extraire des patterns existants dans `apps/web/components/` et `apps/admin/components/`
- Support clickable card avec keyboard navigation

**Source:** [Web Components - apps/web/components/festivals/]

---

### Story 11.5: Extract Input Component

**User Story:**
As a frontend developer,
I want a reusable Input component,
so that form fields are consistent and accessible.

**Acceptance Criteria:**

1. Créer `libs/ui/src/components/Input/Input.tsx`
2. Types supportés: text, email, password, number, search, tel, url
3. Props: label, placeholder, error, helperText, disabled, required, leftIcon, rightIcon, clearable
4. Validation visuelle: error state avec message, success state
5. Accessibilité: label lié via id/htmlFor, aria-describedby pour error/helper
6. Tests unitaires pour interactions et validation
7. Stories Storybook pour tous les états

**Technical Notes:**

- Utiliser `useId()` pour génération d'IDs uniques
- Intégrer avec react-hook-form via `forwardRef`
- Pattern: `<Input label="Email" type="email" error="Invalid email" />`
- Extraire de `apps/web/components/ui/` et harmoniser avec admin

**Source:** [Web Forms - apps/web/components/auth/]

---

### Story 11.6: Extract Modal Component

**User Story:**
As a frontend developer,
I want a reusable Modal component,
so that dialogs and overlays are consistent and accessible.

**Acceptance Criteria:**

1. Créer `libs/ui/src/components/Modal/Modal.tsx`
2. Composants: Modal, Modal.Header, Modal.Body, Modal.Footer
3. Props: isOpen, onClose, size (sm, md, lg, xl, full), closeOnOverlayClick, closeOnEscape
4. Animations: fade-in/out pour overlay, slide-in pour content
5. Focus trap et restoration après fermeture
6. Accessibilité: role="dialog", aria-modal, aria-labelledby
7. Tests unitaires pour open/close, focus trap, escape key
8. Stories Storybook avec exemples de tailles et contenus

**Technical Notes:**

- Utiliser `createPortal` pour render dans document.body
- Utiliser `@headlessui/react` Dialog ou implémenter focus trap manuellement
- Pattern: `<Modal isOpen={open} onClose={close}><Modal.Body>...</Modal.Body></Modal>`
- Bloquer scroll du body quand modal ouvert
- Support stack de modals (z-index management)

**Source:** [Headless UI - existing patterns in admin]

---

### Story 11.7: Migrate Web App to Use libs/ui

**User Story:**
As a frontend developer,
I want the web application to use the shared UI library,
so that we maintain a single source of truth for UI components.

**Acceptance Criteria:**

1. Remplacer imports locaux par `@festival/ui` pour Button, Card, Input, Modal
2. Supprimer composants dupliqués de `apps/web/components/ui/`
3. Importer design tokens de `@festival/ui/styles`
4. Mettre à jour Tailwind config pour utiliser preset `@festival/ui`
5. Tous les tests existants passent après migration
6. Aucune régression visuelle (vérification manuelle ou screenshot tests)
7. Build de production réussit

**Technical Notes:**

- Migration progressive: un composant à la fois
- Garder les composants métier (FestivalCard, TicketCard) dans apps/web
- Seuls les composants UI primitifs migrent vers libs/ui
- Mettre à jour les imports: `import { Button } from '@festival/ui'`
- Vérifier bundle size avant/après migration

**Source:** [Web App - apps/web/]

---

### Story 11.8: Migrate Admin App to Use libs/ui

**User Story:**
As a frontend developer,
I want the admin application to use the shared UI library,
so that admin and public interfaces share consistent components.

**Acceptance Criteria:**

1. Remplacer imports locaux par `@festival/ui` pour Button, Card, Input, Modal
2. Supprimer composants dupliqués de `apps/admin/components/ui/`
3. Importer design tokens de `@festival/ui/styles`
4. Mettre à jour Tailwind config pour utiliser preset `@festival/ui`
5. Tous les tests existants passent après migration
6. Aucune régression visuelle dans le dashboard admin
7. Build de production réussit
8. Thème admin (couleurs spécifiques) toujours fonctionnel

**Technical Notes:**

- L'admin peut avoir des overrides de tokens pour branding différent
- Migration progressive comme pour web app
- Garder composants admin-spécifiques (DataTable, Charts) dans apps/admin
- Pattern d'override: `libs/ui` fournit base, admin extends avec variables CSS
- Vérifier compatibilité dark mode

**Source:** [Admin App - apps/admin/]

---

## Summary (Final)

| Epic                           | Stories | Priority | Effort | Sprint |
| ------------------------------ | ------- | -------- | ------ | ------ |
| 1. Test Coverage               | 3       | High     | Medium | 1      |
| 2. API Performance             | 3       | High     | Medium | 1      |
| 3. Mobile Enhancements         | 2       | Medium   | High   | 1      |
| 4. Admin Dashboard             | 3       | Medium   | Medium | 1      |
| 5. Bug Fixes & Debt            | 3       | High     | Low    | 1      |
| 6. Advanced Analytics          | 3       | Medium   | Medium | 2      |
| 7. Staff & Vendor Improvements | 2       | Medium   | Medium | 2      |
| 8. Staff Application           | 2       | Medium   | Medium | 3      |
| 9. Marketing & Public API      | 2       | Medium   | High   | 3      |
| 10. Stabilization              | -       | High     | Medium | 4      |
| 11. Unified Design System      | 8       | High     | Medium | 5      |

**Total Stories:** 31 (Sprint 1: 14, Sprint 2: 5, Sprint 3: 4, Sprint 4: Stabilization, Sprint 5: 8)

---

_Document généré pour BMAD workflow_
