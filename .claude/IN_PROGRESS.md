# Tâches En Cours & À Faire

---

## Session 2026-01-08 - Tests Auth Module

### Tâches terminées cette session:

- [x] Comprehensive unit tests for auth module
  - auth.service.spec.ts: 39 tests passing
  - auth.controller.spec.ts: 37 tests passing (NEW)
  - Total: 76 auth module tests

---

## Prochaines étapes suggérées

- [ ] Enable OAuth providers with real credentials (Google Console, GitHub Developer)
- [ ] Test OAuth flow end-to-end
- [ ] Augmenter le test coverage à 90%
- [ ] Audit de sécurité externe final

---

# Claude Configuration – Festival Platform

## Role

You are a **senior full-stack engineer and technical lead**.

You work on a **production-grade festival management platform** with:

- Backend: NestJS, Prisma, PostgreSQL, Redis
- Frontend: Next.js (web + admin), Tailwind
- Mobile: React Native (Expo)
- Infra: Docker, Kubernetes, CI/CD
- Auth: JWT, RBAC
- Payments & cashless systems

---

## 📊 Métriques Actuelles

| Métrique                  | Valeur  | Cible  | Note                               |
| ------------------------- | ------- | ------ | ---------------------------------- |
| Backend Production Ready  | **98%** | 95%    | ✅ Tous issues résolus             |
| Frontend TypeScript Score | 9.2/10  | 9.5/10 | ⬆️ noUncheckedIndexedAccess activé |
| Test Coverage API         | ~80%    | 90%    |                                    |
| Test Coverage Libs        | ~40%    | 80%    | ⬆️ +30% (194 tests ajoutés)        |
| Security Issues CRITICAL  | **0**   | 0      | ✅ Tous résolus (C1-C6)            |
| Security Issues HIGH      | **0**   | 0      | ✅ Tous résolus (H1-H10)           |
| Security Issues MEDIUM    | **0**   | 0      | ✅ Tous résolus (M1-M12)           |
| Security Issues LOW       | **0**   | 0      | ✅ Tous résolus (L1-L8)            |
| CI Security Scanning      | Oui     | Oui    | ✅ (Trivy + CodeQL)                |

---

## ✅ Tâches Terminées - Résumé

### 🚨 PRIORITÉ CRITIQUE (6/6)

| ID  | Tâche                        | Résolution                                 |
| --- | ---------------------------- | ------------------------------------------ |
| C1  | Secrets par défaut hardcodés | `configService.getOrThrow()` sans fallback |
| C2  | Secret QR Code par défaut    | Validation longueur ≥ 32 chars             |
| C3  | Reset Password cassé         | Token hashé SHA-256 avec expiration        |
| C4  | Missing Error Boundaries     | `error.tsx` créés pour web/admin           |
| C5  | Missing Loading States       | `loading.tsx` créés pour web/admin         |
| C6  | Auth Token dans localStorage | Migré vers httpOnly cookies                |

### 🔴 PRIORITÉ HAUTE (10/10)

| ID  | Tâche                        | Résolution                            |
| --- | ---------------------------- | ------------------------------------- |
| H1  | Auth Controller non connecté | Toutes méthodes appellent AuthService |
| H2  | Health Checks statiques      | Vrais checks: DB, Redis, Memory, Disk |
| H3  | WebSocket anonymes           | Middleware JWT + safety check         |
| H4  | JWT Strategy manquante       | PassportStrategy avec getOrThrow      |
| H5  | Admin Layout 'use client'    | Déjà Server Component                 |
| H6  | Pas de Code Splitting        | `next/dynamic` pour charts lourds     |
| H7  | Pas de Form Library          | react-hook-form + zod installés       |
| H8  | Pas de scanning container CI | Trivy scanner ajouté                  |
| H9  | Pas de SAST/DAST CI          | CodeQL ajouté                         |
| H10 | N+1 Query tickets            | `createMany` + `findMany` batch       |

### 🟡 PRIORITÉ MOYENNE (12/12)

| ID  | Tâche                           | Résolution                                    |
| --- | ------------------------------- | --------------------------------------------- |
| M1  | ConfigModule sans validation    | Joi schema avec validation stricte            |
| M2  | Cache Memory Leak               | Cleanup périodique 5 min + onModuleDestroy    |
| M3  | Rate Limit non global           | RateLimitGuard via APP_GUARD                  |
| M4  | Compression Interceptor         | Migré vers middleware Express `compression()` |
| M5  | WAF mode COUNT                  | Auto-détection: BLOCK prod, COUNT dev         |
| M6  | Default credentials docker      | Variables d'environnement externalisées       |
| M7  | Analytics queries séquentielles | Prisma `groupBy` (1 query au lieu de N)       |
| M8  | Connection Pooling              | PrismaService avec pool params dynamiques     |
| M9  | Path Aliases manquants          | hooks, api-client, validation ajoutés         |
| M10 | Module Boundaries permissives   | depConstraints ESLint configurées             |
| M11 | Missing CSP Header              | Content-Security-Policy complet               |
| M12 | noUncheckedIndexedAccess        | Activé dans tsconfig.base.json                |

### 🟢 PRIORITÉ BASSE (8/8)

| ID  | Tâche                       | Résolution                                        |
| --- | --------------------------- | ------------------------------------------------- |
| L1  | Docker images non pinnées   | SHA256 digests pour tous les Dockerfiles          |
| L2  | Logger non configuré        | Pino avec JSON/pretty, redaction, correlation IDs |
| L3  | Graceful Shutdown           | enableShutdownHooks + signal handlers             |
| L4  | Network Policies K8s        | 4 fichiers: default-deny, api, web, database      |
| L5  | Tests shared libs manquants | 194 nouveaux tests (date, format, auth schemas)   |
| L6  | Demo credentials            | Supprimés, utilise API /auth/login                |
| L7  | User sans soft delete       | isDeleted + deletedAt + softDelete()/hardDelete() |
| L8  | Format erreur incohérent    | BusinessException pattern unifié                  |

---

## Améliorations apportées cette session

### Sécurité

- JWT secrets validés, QR codes sécurisés
- httpOnly cookies (plus de localStorage)
- WebSocket auth obligatoire
- CSP headers, WAF en mode BLOCK
- Credentials externalisés
- Network Policies K8s (zero-trust)

### Performance

- Connection pooling Prisma configuré
- Cache cleanup périodique (évite memory leak)
- Analytics groupBy (N→1 query)
- Compression middleware Express

### Qualité

- 194 nouveaux tests (shared libs: date, format, auth)
- noUncheckedIndexedAccess activé
- Module boundaries ESLint strictes
- Error format unifié (BusinessException)
- Production logger (Pino structured logging)

### Infrastructure

- Docker images pinnées (SHA256)
- Graceful shutdown
- Soft delete GDPR compliant

---

Dernière mise à jour: 2026-01-08 - Audit Complet Terminé (36 tâches)
