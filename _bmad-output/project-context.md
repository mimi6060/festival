---
project_name: 'festival'
user_name: 'Mac-m3-michel'
date: '2026-01-14'
sections_completed:
  [
    'technology_stack',
    'language_rules',
    'framework_rules',
    'testing_rules',
    'code_quality',
    'workflow_rules',
    'critical_rules',
  ]
status: 'complete'
rule_count: 85
optimized_for_llm: true
---

# Project Context for AI Agents

_Ce fichier contient les règles critiques et patterns que les agents IA doivent suivre lors de l'implémentation de code dans ce projet. Focus sur les détails non-évidents que les agents pourraient manquer._

---

## Technology Stack & Versions

### Core Platform

- **Node.js**: 20 LTS
- **NX**: 22.3.3 (monorepo workspace)
- **TypeScript**: 5.9.2 (strict mode)

### Backend (apps/api)

- **NestJS**: 11.x
- **Prisma**: 6.x (ORM)
- **PostgreSQL**: 16+
- **Redis**: 7.x (cache, sessions)
- **BullMQ**: 5.x (job queues)
- **Socket.io**: 4.8.3 (WebSocket)
- **Passport**: 0.7.0 (auth strategies)

### Frontend Web (apps/web, apps/admin)

- **Next.js**: 15.1.0
- **React**: 18.3.0
- **Tailwind CSS**: 3.4.x
- **Zustand**: 4.5.5 (state)
- **TanStack Query**: 5.x (data fetching)
- **next-intl**: 3.26.0 (i18n)

### Mobile (apps/mobile)

- **React Native**: 0.76.7
- **Expo**: 53.x
- **React Navigation**: 7.x

### Shared Libraries

- **Zod**: 4.3.4 (validation - 100+ schemas)
- **Axios**: 1.6.0 (HTTP client)

### Testing

- **Jest**: 29.7.0
- **Testing Library**: React 16.3.1, React Native 12.9.0
- **Playwright**: 1.57.0 (E2E)

## Language-Specific Rules

### TypeScript Strict Mode (OBLIGATOIRE)

- `strict: true` - Tous les checks stricts activés
- `noImplicitAny: true` - Jamais de `any` implicite
- `strictNullChecks: true` - Vérification null/undefined obligatoire
- `noUncheckedIndexedAccess: true` - Accès indexé retourne `T | undefined`
- `noUnusedLocals: true` / `noUnusedParameters: true` - Pas de code mort

### Import/Export Patterns

- Module resolution: `nodenext`
- Utiliser les alias de path définis:
  ```typescript
  import { ... } from '@festival/shared/types';
  import { ... } from '@festival/shared/utils';
  import { ... } from '@festival/shared/validation';
  import { ... } from '@festival/shared/i18n';
  import { ... } from '@festival/shared/api-client';
  ```
- INTERDIT: imports relatifs vers libs (`../../libs/...`)

### Error Handling

- Utiliser des types d'erreur explicites, jamais `catch (e: any)`
- Pattern: `catch (error: unknown)` puis type guard
- Codes d'erreur standardisés: `ERR_XXXX` (voir `common/exceptions/`)

### Null Safety

- Toujours vérifier `undefined` sur les accès indexés (arrays, objects)
- Utiliser optional chaining `?.` et nullish coalescing `??`
- Éviter les assertions non-null `!` sauf cas exceptionnels documentés

## Framework-Specific Rules

### NestJS (Backend API)

**Architecture des Modules:**

- Controllers: THIN - aucune logique métier, uniquement routing
- Services: TOUTE la logique métier ici
- Structure: `*.module.ts`, `*.service.ts`, `*.controller.ts`, `*.dto.ts`

**Multi-tenant (CRITIQUE):**

- TOUTES les requêtes Prisma DOIVENT être scoped à `festivalId`
- Pattern: `where: { festivalId, ...otherFilters }`
- Jamais de requête sans filtre festival (sauf endpoints admin globaux)

**Authentication:**

- JWT stocké en httpOnly cookies (JAMAIS localStorage)
- Utiliser `@UseGuards(JwtAuthGuard)` sur endpoints protégés
- Décorateur `@Public()` pour endpoints publics
- RBAC via `@Roles('ADMIN', 'ORGANIZER')` + `RolesGuard`

**Soft Delete:**

- Modèles critiques: `isDeleted: boolean`, `deletedAt: DateTime?`
- Middleware auto-filtre les supprimés
- Utiliser `SoftDeleteService` pour les opérations

**WebSocket Gateways:**

- Placer dans `gateways/` (pas dans modules)
- Hériter des patterns existants (events, presence, zones, broadcast)

### Next.js (Web/Admin)

**State Management:**

- Zustand pour état global (stores dans `stores/`)
- TanStack Query pour données serveur (avec hooks)
- JAMAIS de state lifting excessif

**API Calls:**

- TOUJOURS `credentials: 'include'` pour les cookies
- Utiliser `@festival/shared/api-client` pour les appels

**i18n:**

- next-intl avec fichiers dans `messages/`
- 6 langues: fr, en, de, es, it, nl

### React Native (Mobile)

**Navigation:**

- React Navigation 7.x avec typed routes
- Screens dans `screens/`, components dans `components/`

**Offline-First:**

- WatermelonDB pour données locales
- Sync avec API quand connecté

**Platform-Specific:**

- Utiliser `Platform.select()` pour code conditionnel
- NFC uniquement sur appareils compatibles

## Testing Rules

### Organisation des Tests

- **Unit tests**: `*.spec.ts` (dans le même dossier que le code)
- **Integration tests**: `*.int-spec.ts`
- **E2E tests**: `apps/api-e2e/` avec Playwright

### Coverage Requirements (API)

- **Lines**: 80% minimum
- **Statements**: 80% minimum
- **Functions**: 75% minimum
- **Branches**: 65% minimum

### Fichiers Exclus du Coverage

- `*.module.ts`, `*.dto.ts`, `*.entity.ts`
- `*.guard.ts`, `*.decorator.ts`, `*.strategy.ts`
- `*.filter.ts`, `*.interceptor.ts`, `*.pipe.ts`
- `index.ts`, `main.ts`, `test/**/*`

### Mocking Patterns

- Prisma: utiliser `jest-mock-extended` avec `mockDeep<PrismaClient>()`
- BullMQ: mock dans `src/test/__mocks__/bullmq.ts`
- PDFKit: mock dans `src/test/__mocks__/pdfkit.ts`
- Setup global: `src/test/setup.ts`

### Test Structure (NestJS)

```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ServiceName,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
      ],
    }).compile();

    service = module.get(ServiceName);
    prisma = module.get(PrismaService);
  });

  it('should ...', async () => {
    // Arrange
    prisma.model.findMany.mockResolvedValue([...]);
    // Act
    const result = await service.method();
    // Assert
    expect(result).toEqual(...);
  });
});
```

### Règles Critiques

- TOUS les tests existants doivent passer avant merge
- Chaque module doit avoir des tests
- Timeout: 10 secondes max par test
- `clearMocks`, `resetMocks`, `restoreMocks`: tous activés

## Code Quality & Style Rules

### Linting & Formatting

- ESLint avec `@nx/eslint-plugin` (flat config)
- Prettier pour formatage automatique
- Husky + lint-staged sur pre-commit

### NX Module Boundaries (CRITIQUE)

Hiérarchie stricte des imports entre libs:

```
types (base) → utils → validation → api-client → hooks
                  ↘ constants
                  ↘ i18n
```

- Apps peuvent importer de n'importe quelle lib `scope:shared`
- INTERDIT: lib qui importe d'une lib "supérieure"

### Naming Conventions

**Fichiers:**

- kebab-case: `user-profile.service.ts`, `auth.controller.ts`
- Suffixes obligatoires: `.service.ts`, `.controller.ts`, `.module.ts`, `.dto.ts`, `.guard.ts`

**Classes:**

- PascalCase: `UserProfileService`, `AuthController`
- Suffixes correspondants aux fichiers

**Variables/Functions:**

- camelCase: `getUserById`, `isAuthenticated`
- Constantes: SCREAMING_SNAKE_CASE pour valeurs globales

**Components React:**

- PascalCase: `UserCard`, `FestivalHeader`
- Un composant par fichier (sauf petits composants internes)

### Code Organization

**API Module Structure:**

```
modules/
└── feature-name/
    ├── feature-name.module.ts
    ├── feature-name.controller.ts
    ├── feature-name.service.ts
    ├── feature-name.service.spec.ts
    ├── dto/
    │   ├── create-feature.dto.ts
    │   └── update-feature.dto.ts
    └── entities/ (si nécessaire)
```

**Frontend Structure:**

```
app/               # Pages/routes
components/        # Composants réutilisables
hooks/             # Custom hooks
stores/            # Zustand stores
lib/               # Utilitaires locaux
```

### Documentation

- JSDoc uniquement pour fonctions publiques complexes
- Pas de commentaires évidents (le code doit être auto-documenté)
- README par module si logique complexe

## Development Workflow Rules

### Git Workflow

**Commits:**

- Convention: `type(scope): description`
- Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`
- INTERDIT: mots "Claude", "AI", "assistant" dans les messages
- 1 feature = 1 commit + 1 push immédiat

**Branches:**

- `main` - branche principale
- Feature branches depuis `main`

### Pre-Push Verification (OBLIGATOIRE)

```bash
# REQUIS avant chaque push
npx nx build api --skip-nx-cache

# RECOMMANDÉ: vérification complète
./scripts/verify-ci.sh
```

### Post-Modification Verification

Après modification d'une app, TOUJOURS vérifier :

```bash
# API
curl -s http://localhost:3333/api/health | grep -q "status"

# Web
curl -s http://localhost:3000 | grep -q "html"

# Admin
curl -s http://localhost:4201 | grep -q "html"
```

### Session Tracking

**Avant chaque session:**

- Lire `.claude/IN_PROGRESS.md` pour tâches en cours
- Lire `.claude/DONE.md` pour travail complété

**Pendant le travail:**

- Mettre à jour `.claude/IN_PROGRESS.md`
- Déplacer tâches terminées vers `.claude/DONE.md`

### CI/CD

- GitHub Actions pour CI
- Build API obligatoire avant push
- Si build échoue après push: corriger immédiatement

### Ports de Développement

| App     | Port          |
| ------- | ------------- |
| API     | 3333          |
| Web     | 3000          |
| Admin   | 4201          |
| Swagger | 3333/api/docs |

## Critical Don't-Miss Rules

### Anti-Patterns à ÉVITER

**Sécurité:**

- JAMAIS stocker JWT en localStorage (utiliser httpOnly cookies)
- JAMAIS exposer les secrets dans le code (utiliser .env)
- JAMAIS de requête Prisma sans `festivalId` (fuite multi-tenant)
- JAMAIS commit de fichiers .env ou credentials

**Architecture:**

- JAMAIS de logique métier dans les controllers
- JAMAIS d'import circulaire entre modules
- JAMAIS d'import relatif vers `libs/` depuis `apps/`
- JAMAIS de `any` explicite sans justification documentée

**Performance:**

- JAMAIS de `findMany()` sans pagination sur grandes tables
- JAMAIS de requêtes N+1 (utiliser `include` Prisma)
- JAMAIS oublier les index sur colonnes de recherche fréquentes

### Edge Cases Critiques

**Authentication:**

- Vérifier expiration JWT ET refresh token
- Gérer le cas où l'utilisateur est supprimé pendant session active
- Rate limiting sur endpoints publics (`@RateLimit()`)

**Multi-tenant:**

- TOUJOURS vérifier que l'utilisateur a accès au festival demandé
- Les admins globaux peuvent accéder à tous les festivals
- Les organisateurs uniquement à leurs festivals assignés

**Paiements (Stripe):**

- TOUJOURS valider les webhooks Stripe avec signature
- Gérer les paiements en double (idempotency keys)
- Ne jamais faire confiance aux montants côté client

### Sécurité (OWASP)

- **Injection SQL**: Prisma paramétré par défaut, mais attention aux `$queryRaw`
- **XSS**: Échapper les données utilisateur dans le frontend
- **CSRF**: Cookies SameSite=Strict pour les sessions
- **Rate Limiting**: Obligatoire sur login, register, forgot-password

### Conformité

**RGPD:**

- Module `gdpr/` pour export et suppression données
- Consentement utilisateur tracké
- Soft delete pour conservation légale

**PCI-DSS:**

- Jamais stocker de numéros de carte
- Stripe gère toutes les données de paiement
- Logs sans données sensibles

### Gotchas Spécifiques au Projet

1. **Zod v4**: Syntaxe différente de v3, vérifier la doc
2. **Next.js 15**: App Router obligatoire, pas de Pages Router
3. **React 18**: Strict mode = double render en dev (normal)
4. **Prisma 6**: Nouvelles APIs, vérifier la migration guide
5. **NX 22**: Utiliser `--skip-nx-cache` si comportement bizarre

---

## Usage Guidelines

**Pour les Agents IA:**

- Lire ce fichier AVANT d'implémenter du code
- Suivre TOUTES les règles exactement comme documenté
- En cas de doute, préférer l'option la plus restrictive
- Mettre à jour ce fichier si de nouveaux patterns émergent

**Pour les Humains:**

- Garder ce fichier lean et focalisé sur les besoins des agents
- Mettre à jour quand la stack technique change
- Revoir trimestriellement pour règles obsolètes
- Supprimer les règles devenues évidentes

---

_Dernière mise à jour: 2026-01-14_
_Généré par le workflow generate-project-context_
