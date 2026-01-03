# Tâches En Cours & À Faire

---

# Claude Configuration – Festival Platform

## Model

- **Model to use**: Claude Sonnet
- **Do NOT use**: Haiku, Opus, or any other model

---

## Role

You are a **senior full-stack engineer and technical lead**.

You work on a **production-grade festival management platform** with:

- Backend: NestJS, Prisma, PostgreSQL, Redis
- Frontend: Next.js (web + admin), Tailwind
- Mobile: React Native (Expo)
- Infra: Docker, Kubernetes, CI/CD
- Auth: JWT, RBAC
- Payments & cashless systems

Your goal is to **improve code quality, architecture, security, and developer experience**.

---

## General Rules (IMPORTANT)

- Prefer **clear, structured, actionable answers**
- Avoid vague suggestions
- Always think **production first**
- Assume the project will be used by **real festivals**
- Follow **best practices** for SaaS applications
- Prefer **simple, maintainable solutions**
- Never introduce unnecessary abstractions

---

## Code Quality Rules

- Use **TypeScript strict mode**
- No `any` unless explicitly justified
- Follow NestJS / React / React Native best practices
- Respect existing project structure
- Prefer small, focused functions
- Always consider edge cases

---

## Backend Rules (NestJS)

- Controllers:
  - Thin controllers
  - No business logic
- Services:
  - Contain all business logic
- DTOs:
  - Explicit, validated
- Use `class-validator` & `class-transformer`
- Centralized error handling
- Proper HTTP status codes
- API must be **versioned (`/v1`)**

---

## Database & Prisma

- Always propose **schema migrations**
- Respect relational integrity
- Avoid N+1 queries
- Use transactions where needed
- Index critical fields
- Explain schema changes clearly

---

## API Design

- RESTful endpoints only
- Pagination, filtering, sorting by default
- Consistent response format
- Explicit error messages
- Swagger/OpenAPI compatibility

---

## Frontend Rules (Next.js)

- Accessibility first (WCAG)
- Responsive design mandatory
- No logic inside components if avoidable
- Use hooks properly
- Handle loading / error / empty states
- Forms must have validation + user feedback

---

## Mobile Rules (React Native)

- Optimize for low-end devices
- Support offline mode where possible
- Avoid heavy libraries
- Use platform-agnostic components
- Battery & performance aware

---

## Security Rules

- Never expose secrets
- Always consider:
  - rate limiting
  - input validation
  - authorization checks
- Follow OWASP best practices
- Prefer secure defaults

---

## Testing Rules

- Always suggest tests when adding features
- Unit tests for business logic
- E2E tests for critical flows
- Avoid flaky tests
- Explain what to test and why

---

## Documentation Rules

- Any significant change must include:
  - code
  - explanation
  - documentation update if needed
- Use Markdown
- Be concise but precise

---

## When Unsure

- Ask **one clear clarification question**
- Otherwise, make a **reasonable technical assumption** and state it explicitly

---

## Output Format

When responding:

1. Explain the reasoning briefly
2. Provide concrete steps
3. Provide code if relevant
4. Mention risks or trade-offs if any

---

## Forbidden Behaviors

- Do NOT suggest rewriting the whole project
- Do NOT introduce new frameworks without strong justification
- Do NOT over-engineer
- Do NOT ignore existing conventions

---

## Session 2026-01-03 - Internationalisation

### Traductions Complétées

- [x] Traduction italienne (it.json) - 1256 clés
- [x] Traduction néerlandaise (nl.json) - 1256 clés
- [x] Export des nouvelles locales dans libs/shared/i18n/src/index.ts

### Langues Disponibles

| Langue      | Fichier | Clés |
| ----------- | ------- | ---- |
| Français    | fr.json | 1256 |
| Anglais     | en.json | 1256 |
| Allemand    | de.json | 1256 |
| Espagnol    | es.json | 1256 |
| Italien     | it.json | 1256 |
| Néerlandais | nl.json | 1256 |

---

## Session 2026-01-03 - Audit Expert du Code

### Résumé Exécutif

5 experts ont analysé l'ensemble de la codebase:

- **NestJS Backend** - 70% production-ready
- **Next.js Frontend** - Bonne architecture, gaps critiques en error handling
- **Database/Prisma** - Excellent design, 1 problème N+1
- **DevOps/Infrastructure** - Note B+ (excellent sécurité, manque scanning CI)
- **TypeScript Quality** - 8.4/10

---

## 🚨 PRIORITÉ CRITIQUE - Sécurité (Semaine 1)

### ✅ C1: Secrets par Défaut Hardcodés - RÉSOLU

**Fichier:** `apps/api/src/modules/auth/auth.service.ts`
**Résolution:** Utilise `configService.getOrThrow()` sans fallback dangereux

### ✅ C2: Secret QR Code par Défaut - RÉSOLU

**Fichier:** `apps/api/src/modules/tickets/tickets.service.ts:85-92`
**Résolution:**

- Utilise `configService.getOrThrow('QR_CODE_SECRET')`
- Valide longueur ≥ 32 caractères
- Throw Error au démarrage si non conforme

### C3: Reset Password Cassé

**Fichier:** `apps/api/src/modules/auth/auth.service.ts:300-315`

```typescript
// Accepte N'IMPORTE QUEL token - placeholder non implémenté
const user = await this.prisma.user.findFirst({
  where: { status: UserStatus.ACTIVE },
});
```

**Action:** Implémenter vérification token depuis table password_reset_tokens
**Impact:** N'importe qui peut reset n'importe quel password

### ~~C4: Missing Error Boundaries (Frontend)~~ ✅ TERMINÉ

**Fichiers créés:**

- `apps/web/app/error.tsx` ✅
- `apps/admin/app/error.tsx` ✅
  **Action:** ✅ Error boundaries Next.js créées avec support dark mode
  **Commit:** f6d61b2

### ~~C5: Missing Loading States (Frontend)~~ ✅ TERMINÉ

**Fichiers créés:**

- `apps/web/app/loading.tsx` ✅
- `apps/admin/app/loading.tsx` ✅
  **Action:** ✅ Loading states créés avec skeletons et spinners
  **Commit:** f6d61b2

### ✅ C6: Auth Token dans localStorage (XSS Risk) - RÉSOLU

**Fichier:** `apps/web/lib/api.ts`

~~```typescript
const token = localStorage.getItem('auth_token');

````~~

**Action:** Migrer vers httpOnly cookies
**Impact:** Tokens accessibles via XSS
**Résolution:**
- Supprimé localStorage.getItem('auth_token') de api.ts
- Ajouté credentials: 'include' à toutes les requêtes fetch
- Modifié auth.store.ts pour ne plus stocker les tokens
- Créé middleware.ts pour gérer les redirections auth
- Les tokens sont maintenant gérés uniquement par le serveur via cookies httpOnly

---

## 🔴 PRIORITÉ HAUTE - À Faire Cette Semaine

### ✅ H1: Auth Controller Non Connecté au Service - RÉSOLU

**Fichier:** `apps/api/src/modules/auth/auth.controller.ts`
**Résolution:** Toutes les méthodes appellent correctement AuthService (register, login, logout, refresh, me, etc.)

### ✅ H2: Health Checks Statiques - RÉSOLU

**Fichier:** `apps/api/src/modules/health/health.controller.ts`
**Résolution:**
- Utilise @nestjs/terminus avec HealthCheckService
- PrismaHealthIndicator pour vérifier la DB
- MemoryHealthIndicator pour vérifier la mémoire
- Endpoints /health, /health/live, /health/ready

### ✅ H3: WebSocket Permet Connexions Anonymes - RÉSOLU

**Fichier:** `apps/api/src/gateways/events.gateway.ts`
**Résolution:** Rejette les connexions non authentifiées
**Commit:** bbae798

### ✅ H4: JWT Strategy Manquante - RÉSOLU

**Fichier:** `apps/api/src/modules/auth/strategies/jwt.strategy.ts`
**Résolution:**
- JwtStrategy étend PassportStrategy
- Utilise configService.getOrThrow() pour le secret
- Valide le payload avec authService.validateUser()

### H5: Root Admin Layout 'use client'

**Fichier:** `apps/admin/app/layout.tsx:1`

```typescript
'use client'; // Toute l'app devient client-side
```

**Action:** Séparer en Server Component layout + Client Component wrapper
**Impact:** Perte des bénéfices Server Components (SEO, bundle size)

### H6: Pas de Code Splitting

**Fichiers:** Toutes les apps frontend
**Action:** Utiliser `next/dynamic` et `React.lazy()` pour composants lourds
**Impact:** Bundle JS trop gros, chargement lent

### H7: Pas de Form Library

**Fichiers:** `apps/web/app/auth/login/page.tsx` et autres forms
**Action:** Adopter react-hook-form + zod
**Impact:** Validation manuelle, mauvaise UX, code dupliqué

### ✅ H8: Pas de Scanning Images Container en CI - RÉSOLU

**Fichier:** `.github/workflows/ci.yml`
**Action:** Ajouter Trivy/Grype scanning
**Impact:** Images vulnérables déployées
**Résolution:** Job `security-scan` ajouté avec Trivy scanner (CRITICAL,HIGH) et upload SARIF

### ✅ H9: Pas de SAST/DAST en CI - RÉSOLU

**Fichier:** `.github/workflows/ci.yml`
**Action:** Ajouter CodeQL, Snyk, ou Semgrep
**Impact:** Vulnérabilités code non détectées
**Résolution:** Job `codeql` ajouté avec analyse statique TypeScript

### ✅ H10: N+1 Query en Création de Tickets - RÉSOLU

**Fichier:** `apps/api/src/modules/tickets/tickets.service.ts:186-223`
**Résolution:**
- Utilise `createMany` pour batch insert
- Un seul `findMany` pour récupérer les tickets avec relations
- Plus de boucle avec create individuel

---

## 🟡 PRIORITÉ MOYENNE - À Faire Ce Mois

### M1: ConfigModule Sans Validation Schema

**Fichier:** `apps/api/src/app/app.module.ts`

```typescript
ConfigModule.forRoot({
  // Missing: validationSchema from config/validation.schema.ts
}),
```

**Action:** Ajouter `validationSchema` et `validationOptions`

### M2: Cache Service Memory Leak Potentiel

**Fichier:** `apps/api/src/modules/cache/cache.service.ts:590`
**Action:** Ajouter cleanup périodique avec setInterval

### M3: Rate Limit Guard Non Global

**Fichier:** `apps/api/src/main.ts`
**Action:** `app.useGlobalGuards(new RateLimitGuard(reflector, redis))`

### M4: Compression via Interceptor Problématique

**Fichier:** `apps/api/src/common/interceptors/compression.interceptor.ts`
**Action:** Utiliser middleware express `compression()` à la place

### M5: WAF Mode COUNT au lieu de BLOCK

**Fichier:** `infra/security/waf/waf.tf:44`
**Action:** Changer `waf_mode = "BLOCK"` en production

### M6: Default Credentials docker-compose

**Fichier:** `docker-compose.yml:29,157-159,215-216`
**Action:** Utiliser Docker secrets ou fichier .env séparé

### M7: Queries Catégories Séquentielles Analytics

**Fichier:** `apps/api/src/modules/analytics/services/analytics.service.ts:477-499`
**Action:** Utiliser `groupBy` au lieu de Promise.all avec map

### M8: Connection Pooling Non Configuré

**Fichier:** `apps/api/src/modules/prisma/prisma.service.ts`
**Action:** Ajouter params pool à DATABASE_URL: `?connection_limit=10&pool_timeout=10`

### M9: Path Aliases Manquants

**Fichier:** `tsconfig.base.json`
**Action:** Ajouter aliases pour `hooks`, `api-client`, `validation`

### M10: Module Boundary Rules Trop Permissives

**Fichier:** `eslint.config.mjs`
**Action:** Configurer `depConstraints` strictes par scope

### M11: Missing CSP Header

**Fichier:** `apps/admin/middleware.ts`
**Action:** Ajouter `Content-Security-Policy` header

### M12: `noUncheckedIndexedAccess` Désactivé

**Fichier:** `tsconfig.base.json:30`
**Action:** Activer pour accès array/object plus sûrs

---

## 🟢 PRIORITÉ BASSE - Backlog

### L1: Base Images Non Pinnées au Digest

**Fichiers:** `apps/*/Dockerfile`
**Action:** Utiliser `node:20-alpine@sha256:...`

### L2: Logger Non Configuré pour Production

**Fichier:** `apps/api/src/main.ts`
**Action:** Configurer Winston/Pino avec structured logging

### L3: Graceful Shutdown Manquant

**Fichier:** `apps/api/src/main.ts`
**Action:** Ajouter `app.enableShutdownHooks()`

### L4: No Network Policies K8s

**Fichier:** `k8s/`
**Action:** Ajouter NetworkPolicy pour isolation pod-to-pod

### L5: Tests Shared Libraries Manquants

**Fichiers:** `libs/shared/*/`
**Action:** Ajouter tests pour utils, hooks, api-client

### L6: Demo Credentials dans Code

**Fichier:** `apps/admin/lib/auth-context.tsx`

```typescript
if (email === 'admin@festival.com' && password === 'admin123')
```

**Action:** Supprimer avant production

### L7: User Model Sans Soft Delete

**Fichier:** `prisma/schema.prisma`
**Action:** Ajouter isDeleted/deletedAt (si pas intentionnel pour GDPR)

### L8: Format Erreur Incohérent

**Fichiers:** Services divers
**Action:** Unifier avec BusinessException partout

---

## 📊 Métriques Actuelles

| Métrique                  | Valeur | Cible  | Note                                    |
| ------------------------- | ------ | ------ | --------------------------------------- |
| Backend Production Ready  | 85%    | 95%    | ⬆️ +10% (C1-C3, H1-H4, H10 résolus)     |
| Frontend TypeScript Score | 8.4/10 | 9.5/10 |                                         |
| Test Coverage API         | ~80%   | 90%    |                                         |
| Test Coverage Libs        | <10%   | 80%    |                                         |
| Security Issues CRITICAL  | 0      | 0      | ✅ Tous résolus (C1, C2, C3, C4, C5, C6) |
| Security Issues HIGH      | 3      | 0      | ⬇️ -7 (H1-H4, H8-H10 résolus)           |
| CI Security Scanning      | Oui    | Oui    | ✅ (Trivy + CodeQL)                     |

---

## 🎯 Plan d'Action Recommandé

### Semaine 1 - Sécurité Critique ✅ COMPLÈTE

- [x] C1: Supprimer JWT secrets par défaut ✅
- [x] C2: Valider QR secret ✅
- [x] C3: Implémenter reset password correctement ✅
- [x] H1: Connecter AuthController au service ✅
- [x] H8: Ajouter Trivy scanning CI ✅

### Semaine 2 - Frontend & API ✅ COMPLÈTE

- [x] C4: Créer error boundaries ✅
- [x] C5: Créer loading states ✅
- [x] C6: Migrer tokens vers httpOnly cookies ✅
- [x] H2: Implémenter vrais health checks ✅
- [ ] H5: Refactorer admin layout

### Semaine 3 - Performance & Quality

- [x] H10: Fix N+1 query tickets ✅
- [ ] M1: Ajouter ConfigModule validation
- [ ] M8: Configurer connection pooling
- [ ] H6: Implémenter code splitting

### Semaine 4 - Infrastructure & Tests

- [x] H9: Ajouter SAST/DAST CI ✅
- [ ] M5: Passer WAF en mode BLOCK
- [ ] L5: Ajouter tests shared libraries
- [ ] Audit de sécurité final

---

## Fichiers Analysés

### Backend (NestJS)

- `apps/api/src/main.ts`
- `apps/api/src/app/app.module.ts`
- `apps/api/src/modules/auth/*`
- `apps/api/src/modules/tickets/*`
- `apps/api/src/modules/health/*`
- `apps/api/src/gateways/events.gateway.ts`
- `apps/api/src/common/*`

### Frontend (Next.js)

- `apps/web/app/layout.tsx`
- `apps/web/lib/api.ts`
- `apps/admin/app/layout.tsx`
- `apps/admin/middleware.ts`
- `apps/*/components/*`

### Infrastructure

- `.github/workflows/ci.yml`
- `docker-compose.yml`
- `k8s/api/*.yaml`
- `infra/security/waf/*`
- `infra/terraform/*`

### Shared Libraries

- `libs/shared/types/src/*`
- `libs/shared/utils/src/*`
- `libs/shared/validation/src/*`
- `tsconfig.base.json`
- `eslint.config.mjs`

---

Dernière mise à jour: 2026-01-03 - Audit Expert Complet (5 rapports)
````
