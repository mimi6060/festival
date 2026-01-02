# Guide de Contribution - Festival Management Platform

Merci de votre interet pour contribuer a la Festival Management Platform! Ce document fournit les lignes directrices pour contribuer efficacement au projet.

## Table des Matieres

1. [Code de Conduite](#code-de-conduite)
2. [Comment Contribuer](#comment-contribuer)
3. [Configuration du Developpement](#configuration-du-developpement)
4. [Standards de Code](#standards-de-code)
5. [Workflow Git](#workflow-git)
6. [Tests](#tests)
7. [Documentation](#documentation)
8. [Review de Code](#review-de-code)
9. [Types de Contributions](#types-de-contributions)

---

## Code de Conduite

### Nos Engagements

- Traiter chacun avec respect et professionnalisme
- Accepter les critiques constructives avec grace
- Se concentrer sur ce qui est le mieux pour la communaute
- Faire preuve d'empathie envers les autres membres

### Comportements Inacceptables

- Langage ou images a caractere sexuel
- Trolling, insultes ou attaques personnelles
- Harcelement public ou prive
- Divulgation d'informations privees sans consentement

---

## Comment Contribuer

### Signaler un Bug

1. **Verifier les issues existantes** - Le bug a-t-il deja ete signale?
2. **Creer une issue** avec le template "Bug Report"
3. **Inclure les informations necessaires**:
   - Description claire du probleme
   - Etapes pour reproduire
   - Comportement attendu vs observe
   - Captures d'ecran si applicable
   - Environnement (OS, navigateur, versions)

### Proposer une Fonctionnalite

1. **Ouvrir une discussion** dans les GitHub Discussions
2. **Expliquer le besoin** et le cas d'usage
3. **Proposer une solution** si vous en avez une
4. **Attendre le feedback** avant de commencer l'implementation

### Soumettre du Code

1. **Fork le repository**
2. **Creer une branche** depuis `develop`
3. **Implementer les changements**
4. **Ecrire/mettre a jour les tests**
5. **Soumettre une Pull Request**

---

## Configuration du Developpement

### Prerequisites

```bash
# Versions requises
Node.js >= 20.0.0
pnpm >= 8.0.0
Docker >= 24.0.0
Docker Compose >= 2.20.0
```

### Installation

```bash
# 1. Cloner le repository
git clone https://github.com/your-org/festival-platform.git
cd festival-platform/festival

# 2. Installer les dependances
pnpm install

# 3. Copier la configuration
cp .env.example .env.development

# 4. Demarrer les services Docker
docker-compose up -d postgres redis minio

# 5. Configurer la base de donnees
npx prisma generate
npx prisma migrate dev

# 6. Demarrer le serveur de developpement
pnpm nx serve api
```

### Structure du Projet

```
festival/
├── apps/
│   ├── api/          # Backend NestJS
│   ├── web/          # Frontend public
│   ├── admin/        # Dashboard admin
│   ├── mobile/       # App React Native
│   └── api-e2e/      # Tests E2E
├── libs/
│   └── shared/       # Code partage
├── prisma/           # Schema BDD
├── docs/             # Documentation
└── k8s/              # Kubernetes manifests
```

### Scripts Utiles

```bash
# Developpement
pnpm nx serve api           # API en mode dev
pnpm nx serve web           # Web en mode dev
pnpm nx serve admin         # Admin en mode dev

# Tests
pnpm nx test api            # Tests unitaires API
pnpm nx e2e api-e2e         # Tests E2E
pnpm nx test --all          # Tous les tests

# Build
pnpm nx build api           # Build API
pnpm nx build web           # Build Web
pnpm nx build --all         # Build tout

# Qualite
pnpm nx lint --all          # Linting
pnpm nx format:check        # Verification formatage
pnpm nx format:write        # Correction formatage

# Base de donnees
npx prisma studio           # Interface visuelle
npx prisma migrate dev      # Creer migration
npx prisma db seed          # Seed donnees
```

---

## Standards de Code

### TypeScript

```typescript
// Utiliser des types explicites
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// Eviter 'any', preferer 'unknown' si necessaire
function processData(data: unknown): void {
  if (isValidData(data)) {
    // traitement
  }
}

// Utiliser des interfaces pour les objets
interface UserCreateDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

// Utiliser des enums pour les valeurs fixes
enum TicketStatus {
  AVAILABLE = 'AVAILABLE',
  SOLD = 'SOLD',
  USED = 'USED',
  CANCELLED = 'CANCELLED',
}
```

### Nommage

| Element | Convention | Exemple |
|---------|------------|---------|
| Variables | camelCase | `userEmail`, `ticketCount` |
| Constantes | SCREAMING_SNAKE_CASE | `MAX_TICKETS`, `API_URL` |
| Classes | PascalCase | `UserService`, `TicketController` |
| Interfaces | PascalCase avec 'I' prefix optionnel | `User`, `IUserService` |
| Types | PascalCase | `UserRole`, `PaymentStatus` |
| Fichiers | kebab-case | `user.service.ts`, `auth.guard.ts` |
| Composants React | PascalCase | `UserProfile.tsx`, `TicketCard.tsx` |

### Structure des Fichiers

```typescript
// 1. Imports externes
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@festival/prisma';

// 2. Imports internes
import { CreateUserDto } from './dto/create-user.dto';
import { UserEntity } from './entities/user.entity';

// 3. Types/Interfaces locaux
interface UserWithRelations extends UserEntity {
  tickets: Ticket[];
}

// 4. Constantes
const DEFAULT_PAGE_SIZE = 20;

// 5. Classe principale
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Methodes publiques en premier
  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  // Methodes privees ensuite
  private validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
```

### ESLint et Prettier

Le projet utilise ESLint et Prettier pour maintenir la qualite du code:

```bash
# Verifier le linting
pnpm nx lint --all

# Corriger automatiquement
pnpm nx lint --all --fix

# Verifier le formatage
pnpm nx format:check

# Corriger le formatage
pnpm nx format:write
```

### Regles ESLint Importantes

- Pas de `any` explicite
- Pas de variables non utilisees
- Pas de `console.log` (utiliser le logger)
- Imports tries et organises
- Maximum 500 lignes par fichier

---

## Workflow Git

### Branches

| Branche | Usage |
|---------|-------|
| `main` | Production stable |
| `develop` | Integration des features |
| `feature/*` | Nouvelles fonctionnalites |
| `fix/*` | Corrections de bugs |
| `hotfix/*` | Corrections urgentes production |
| `docs/*` | Documentation |
| `refactor/*` | Refactoring |

### Convention de Nommage des Branches

```
feature/add-user-authentication
fix/ticket-validation-error
hotfix/payment-timeout
docs/update-api-guide
refactor/optimize-database-queries
```

### Messages de Commit

Suivre la convention [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[body optionnel]

[footer optionnel]
```

#### Types

| Type | Description |
|------|-------------|
| `feat` | Nouvelle fonctionnalite |
| `fix` | Correction de bug |
| `docs` | Documentation |
| `style` | Formatage (pas de changement de code) |
| `refactor` | Refactoring |
| `perf` | Amelioration de performance |
| `test` | Ajout/modification de tests |
| `chore` | Maintenance, dependances |
| `ci` | Configuration CI/CD |

#### Exemples

```bash
# Feature
feat(auth): add OAuth2 Google authentication

# Bug fix
fix(tickets): resolve QR code validation timeout

# Documentation
docs(api): update authentication endpoints

# Refactoring
refactor(cashless): optimize transaction queries

# Tests
test(payments): add Stripe webhook unit tests
```

### Workflow de Pull Request

1. **Creer la branche**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/my-feature
   ```

2. **Developper et commiter**
   ```bash
   git add .
   git commit -m "feat(module): add new feature"
   ```

3. **Pousser la branche**
   ```bash
   git push origin feature/my-feature
   ```

4. **Creer la Pull Request**
   - Utiliser le template fourni
   - Lier les issues concernees
   - Demander une review

5. **Repondre aux commentaires**
   - Effectuer les modifications demandees
   - Pousser les corrections

6. **Merge**
   - Squash and merge pour features
   - Merge commit pour releases

---

## Tests

### Types de Tests

| Type | Localisation | Outil |
|------|--------------|-------|
| Unitaires | `*.spec.ts` | Jest |
| Integration | `*.int-spec.ts` | Jest + Supertest |
| E2E | `apps/api-e2e/` | Jest + Supertest |

### Ecrire des Tests Unitaires

```typescript
// users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '@festival/prisma';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockDeep<PrismaService>(),
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get(PrismaService);
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne('123');

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '123' },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('123')).rejects.toThrow(NotFoundException);
    });
  });
});
```

### Ecrire des Tests E2E

```typescript
// auth.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePassword123!',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.email).toBe('test@example.com');
        });
    });

    it('should reject weak passwords', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test2@example.com',
          password: '123',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(400);
    });
  });
});
```

### Couverture de Code

Le projet vise une couverture minimum de:

- **80%** global
- **85%** pour les services critiques (auth, payments, cashless)
- **90%** pour les utilitaires partages

```bash
# Generer le rapport de couverture
pnpm nx test api --coverage

# Voir le rapport HTML
open coverage/lcov-report/index.html
```

---

## Documentation

### Documentation du Code

```typescript
/**
 * Service de gestion des utilisateurs.
 * Gere les operations CRUD et la validation des utilisateurs.
 *
 * @example
 * ```typescript
 * const user = await usersService.create({
 *   email: 'user@example.com',
 *   password: 'SecurePass123!',
 *   firstName: 'John',
 *   lastName: 'Doe',
 * });
 * ```
 */
@Injectable()
export class UsersService {
  /**
   * Trouve un utilisateur par son identifiant.
   *
   * @param id - L'identifiant unique de l'utilisateur
   * @returns L'utilisateur trouve
   * @throws {NotFoundException} Si l'utilisateur n'existe pas
   *
   * @example
   * ```typescript
   * const user = await usersService.findOne('123e4567-e89b-12d3-a456-426614174000');
   * ```
   */
  async findOne(id: string): Promise<User> {
    // implementation
  }
}
```

### Documentation API (Swagger)

```typescript
@Controller('users')
@ApiTags('users')
@ApiBearerAuth()
export class UsersController {
  @Get(':id')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieves a user by their unique identifier',
  })
  @ApiParam({
    name: 'id',
    description: 'User unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'User found',
    type: UserEntity,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findOne(id);
  }
}
```

### Fichiers README

Chaque module devrait avoir un README.md expliquant:

- Son objectif
- Comment l'utiliser
- Les configurations disponibles
- Les dependances

---

## Review de Code

### Checklist pour les Reviewers

- [ ] Le code respecte les standards du projet
- [ ] Les tests sont presents et passent
- [ ] La documentation est a jour
- [ ] Pas de secrets ou donnees sensibles
- [ ] Les performances sont acceptables
- [ ] Le code est comprehensible et maintenable
- [ ] Les edge cases sont geres

### Checklist pour les Auteurs

- [ ] Les tests passent localement
- [ ] Le code est formate (`pnpm format:write`)
- [ ] Le linting passe (`pnpm lint`)
- [ ] La documentation est a jour
- [ ] Le commit message suit la convention
- [ ] La PR decrit les changements

### Temps de Review

- PRs petites (< 200 lignes): 24h
- PRs moyennes (200-500 lignes): 48h
- PRs grandes (> 500 lignes): Decomposer si possible

---

## Types de Contributions

### Code

- Nouvelles fonctionnalites
- Corrections de bugs
- Ameliorations de performance
- Refactoring

### Documentation

- Correction de typos
- Amelioration des guides
- Ajout d'exemples
- Traductions

### Tests

- Nouveaux tests unitaires
- Tests E2E
- Amelioration de la couverture

### Design

- Ameliorations UI/UX
- Composants accessibles
- Design system

### Revue

- Review de PRs
- Feedback sur les issues

---

## Questions?

- **GitHub Discussions**: Pour les questions generales
- **GitHub Issues**: Pour les bugs et features
- **Email**: dev@festival.example.com

---

*Merci de contribuer au projet!*
