# Tâches En Cours & À Faire

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

### C1: Secrets par Défaut Hardcodés

**Fichier:** `apps/api/src/modules/auth/auth.service.ts:417-420`

```typescript
// DANGEREUX: secret par défaut utilisé si env non défini
secret: this.configService.get<string>('JWT_ACCESS_SECRET', 'access-secret');
```

**Action:** Supprimer le fallback, fail si secret non configuré
**Impact:** Forge de tokens JWT possible

### C2: Secret QR Code par Défaut

**Fichier:** `apps/api/src/modules/tickets/tickets.service.ts:87`

```typescript
this.qrSecret = process.env.QR_CODE_SECRET || 'default-qr-secret-change-in-production';
```

**Action:** Valider présence et longueur minimale (32 chars)
**Impact:** Falsification de billets possible

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

### C4: Missing Error Boundaries (Frontend)

**Fichiers manquants:**

- `apps/web/app/error.tsx`
- `apps/web/app/global-error.tsx`
- `apps/admin/app/error.tsx`
  **Action:** Créer error boundaries Next.js
  **Impact:** Crash propagés, mauvaise UX

### C5: Missing Loading States (Frontend)

**Fichiers manquants:** `apps/*/app/loading.tsx`
**Action:** Créer loading.tsx pour streaming UI
**Impact:** Pas de feedback pendant chargement

### C6: Auth Token dans localStorage (XSS Risk)

**Fichier:** `apps/web/lib/api.ts`

```typescript
const token = localStorage.getItem('auth_token');
```

**Action:** Migrer vers httpOnly cookies
**Impact:** Tokens accessibles via XSS

---

## 🔴 PRIORITÉ HAUTE - À Faire Cette Semaine

### H1: Auth Controller Non Connecté au Service

**Fichier:** `apps/api/src/modules/auth/auth.controller.ts:129-145`

```typescript
// Retourne des mock data au lieu d'appeler le service
return {
  user: {
    /* hardcoded mock data */
  },
  message: 'Registration successful...',
};
```

**Action:** Connecter register, login, logout, refresh, me au AuthService
**Impact:** L'API auth ne fonctionne pas réellement

### H2: Health Checks Statiques

**Fichier:** `apps/api/src/modules/health/health.controller.ts:102-117`

```typescript
// Retourne des valeurs hardcodées, ne vérifie pas vraiment les services
return {
  status: 'ok',
  checks: {
    database: { status: 'up', responseTime: 5 }, // Hardcoded
  },
};
```

**Action:** Utiliser @nestjs/terminus avec vrais health indicators
**Impact:** Pas de monitoring réel de la santé des services

### H3: WebSocket Permet Connexions Anonymes

**Fichier:** `apps/api/src/gateways/events.gateway.ts:96-99`

```typescript
} catch (error) {
  next(); // Allow connection but without user context
}
```

**Action:** Rejeter les connexions non authentifiées: `next(new Error('Authentication required'))`
**Impact:** Utilisateurs anonymes peuvent se connecter aux WebSockets

### H4: JWT Strategy Manquante

**Fichier manquant:** `apps/api/src/modules/auth/strategies/jwt.strategy.ts`
**Action:** Créer JwtStrategy qui étend PassportStrategy
**Impact:** JwtAuthGuard ne fonctionne pas correctement

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

### H8: Pas de Scanning Images Container en CI

**Fichier:** `.github/workflows/ci.yml`
**Action:** Ajouter Trivy/Grype scanning

```yaml
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
```

**Impact:** Images vulnérables déployées

### H9: Pas de SAST/DAST en CI

**Fichier:** `.github/workflows/ci.yml`
**Action:** Ajouter CodeQL, Snyk, ou Semgrep
**Impact:** Vulnérabilités code non détectées

### H10: N+1 Query en Création de Tickets

**Fichier:** `apps/api/src/modules/tickets/tickets.service.ts:187-214`

```typescript
// Crée les tickets un par un en boucle
for (let i = 0; i < quantity; i++) {
  const ticket = await tx.ticket.create({...});
}
```

**Action:** Utiliser `createMany` + batch fetch
**Impact:** Performance dégradée pour achats multiples

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

| Métrique                  | Valeur | Cible  |
| ------------------------- | ------ | ------ |
| Backend Production Ready  | 70%    | 95%    |
| Frontend TypeScript Score | 8.4/10 | 9.5/10 |
| Test Coverage API         | ~80%   | 90%    |
| Test Coverage Libs        | <10%   | 80%    |
| Security Issues CRITICAL  | 6      | 0      |
| Security Issues HIGH      | 10     | 0      |
| CI Security Scanning      | Non    | Oui    |

---

## 🎯 Plan d'Action Recommandé

### Semaine 1 - Sécurité Critique

- [ ] C1: Supprimer JWT secrets par défaut
- [ ] C2: Valider QR secret
- [ ] C3: Implémenter reset password correctement
- [ ] H1: Connecter AuthController au service
- [ ] H8: Ajouter Trivy scanning CI

### Semaine 2 - Frontend & API

- [ ] C4: Créer error boundaries
- [ ] C5: Créer loading states
- [ ] C6: Migrer tokens vers httpOnly cookies
- [ ] H2: Implémenter vrais health checks
- [ ] H5: Refactorer admin layout

### Semaine 3 - Performance & Quality

- [ ] H10: Fix N+1 query tickets
- [ ] M1: Ajouter ConfigModule validation
- [ ] M8: Configurer connection pooling
- [ ] H6: Implémenter code splitting

### Semaine 4 - Infrastructure & Tests

- [ ] H9: Ajouter SAST/DAST CI
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
