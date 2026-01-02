# Architecture Technique - Festival Management Platform

Ce document decrit l'architecture complete de la plateforme de gestion de festivals, concue pour gerer de 10 000 a 500 000 utilisateurs simultanement.

## Table des Matieres

1. [Vue d'Ensemble](#vue-densemble)
2. [Architecture Logique](#architecture-logique)
3. [Architecture Technique](#architecture-technique)
4. [Stack Technologique](#stack-technologique)
5. [Structure du Monorepo](#structure-du-monorepo)
6. [Architecture Backend](#architecture-backend)
7. [Architecture Frontend](#architecture-frontend)
8. [Architecture Mobile](#architecture-mobile)
9. [Base de Donnees](#base-de-donnees)
10. [Cache et Performance](#cache-et-performance)
11. [Securite](#securite)
12. [Communication Temps Reel](#communication-temps-reel)
13. [Infrastructure](#infrastructure)
14. [Monitoring](#monitoring)

---

## Vue d'Ensemble

La Festival Management Platform est une solution multi-tenant complete pour la gestion d'evenements de grande envergure. Elle couvre l'ensemble du cycle de vie d'un festival:

- **Avant l'evenement**: Billetterie, reservations camping, programme
- **Pendant l'evenement**: Paiements cashless, controle d'acces, notifications temps reel
- **Apres l'evenement**: Analytics, exports comptables, remboursements

### Caracteristiques Principales

| Caracteristique | Description |
|-----------------|-------------|
| **Multi-tenant** | Plusieurs festivals peuvent etre geres simultanement |
| **Scalabilite** | Architecture concue pour 10K a 500K utilisateurs |
| **Temps reel** | WebSockets pour notifications et mises a jour live |
| **Offline-first** | Application mobile fonctionnelle sans connexion |
| **Securite** | Conformite RGPD et PCI-DSS |

---

## Architecture Logique

```
+-------------------+     +-------------------+     +-------------------+
|   Applications    |     |     Backend       |     |  Infrastructure   |
+-------------------+     +-------------------+     +-------------------+
|                   |     |                   |     |                   |
| - Web Public      |     | - API REST        |     | - PostgreSQL      |
| - Admin Dashboard |<--->| - WebSocket GW    |<--->| - Redis           |
| - Mobile App      |     | - Background Jobs |     | - MinIO (S3)      |
|                   |     | - Email Service   |     | - Prometheus      |
+-------------------+     +-------------------+     +-------------------+
         |                         |                         |
         |                         v                         |
         |               +-------------------+               |
         +-------------->|  Services Externes|<--------------+
                         +-------------------+
                         | - Stripe          |
                         | - Firebase (FCM)  |
                         | - Sentry          |
                         +-------------------+
```

### Flux de Donnees Principal

1. **Utilisateur** -> Application (Web/Mobile/Admin)
2. **Application** -> API Backend (REST/WebSocket)
3. **API** -> Services (Auth, Tickets, Paiements, etc.)
4. **Services** -> Base de donnees (PostgreSQL) / Cache (Redis)
5. **Services** -> Services externes (Stripe, Firebase, etc.)

---

## Architecture Technique

### Pattern Microservices Progressif

L'architecture suit un pattern de **microservices progressif**:

- **Phase 1**: Monolithe modulaire (actuel)
- **Phase 2**: Extraction des services critiques (paiements, notifications)
- **Phase 3**: Microservices complets avec event-driven architecture

### Principes Architecturaux

1. **Separation des responsabilites** - Chaque module a une responsabilite unique
2. **Domain-Driven Design** - Organisation par domaines metier
3. **API-First** - Toutes les fonctionnalites exposees via API
4. **Event-Driven** - Communication asynchrone entre modules
5. **Stateless** - Pas d'etat dans les services (sessions en Redis)

---

## Stack Technologique

### Backend

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Runtime | Node.js | 20 LTS |
| Framework | NestJS | 10.x |
| ORM | Prisma | 5.x |
| Base de donnees | PostgreSQL | 16 |
| Cache | Redis | 7 |
| Queue | Bull (Redis) | 4.x |
| WebSocket | Socket.io | 4.x |
| Validation | class-validator | 0.14.x |

### Frontend Web

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Framework | Next.js | 15.x |
| UI Library | React | 19.x |
| Styling | Tailwind CSS | 3.x |
| State | Zustand | 4.x |
| Forms | React Hook Form | 7.x |
| i18n | next-intl | 3.x |
| Charts | Recharts | 2.x |

### Mobile

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Framework | React Native | 0.73.x |
| Navigation | React Navigation | 6.x |
| Storage | AsyncStorage | 1.x |
| State | Zustand | 4.x |
| Push | Firebase FCM | - |

### Infrastructure

| Composant | Technologie |
|-----------|-------------|
| Containerisation | Docker |
| Orchestration | Kubernetes |
| CI/CD | GitHub Actions |
| Monitoring | Prometheus + Grafana |
| Logging | Winston + Sentry |
| Object Storage | MinIO (S3-compatible) |

---

## Structure du Monorepo

```
festival/
├── apps/                          # Applications
│   ├── api/                       # Backend NestJS
│   │   ├── src/
│   │   │   ├── modules/           # Modules metier
│   │   │   │   ├── auth/          # Authentification
│   │   │   │   ├── users/         # Gestion utilisateurs
│   │   │   │   ├── festivals/     # Gestion festivals
│   │   │   │   ├── tickets/       # Billetterie
│   │   │   │   ├── payments/      # Paiements
│   │   │   │   ├── cashless/      # Paiements cashless
│   │   │   │   ├── zones/         # Controle d'acces
│   │   │   │   ├── staff/         # Gestion staff
│   │   │   │   ├── vendors/       # Food & merchandising
│   │   │   │   ├── camping/       # Hebergement
│   │   │   │   ├── notifications/ # Push & in-app
│   │   │   │   ├── support/       # FAQ & tickets support
│   │   │   │   ├── analytics/     # Tableaux de bord
│   │   │   │   ├── map/           # Points d'interet
│   │   │   │   └── program/       # Artistes & scenes
│   │   │   ├── common/            # Utilitaires partages
│   │   │   │   ├── decorators/    # Decorateurs NestJS
│   │   │   │   ├── guards/        # Guards (Auth, RBAC)
│   │   │   │   ├── filters/       # Exception filters
│   │   │   │   ├── interceptors/  # Intercepteurs
│   │   │   │   ├── middleware/    # Middlewares
│   │   │   │   └── validators/    # Validateurs custom
│   │   │   ├── config/            # Configuration
│   │   │   └── main.ts            # Point d'entree
│   │   ├── Dockerfile
│   │   └── project.json
│   │
│   ├── web/                       # Frontend public Next.js
│   │   ├── app/                   # App Router Next.js 15
│   │   ├── components/            # Composants React
│   │   ├── hooks/                 # Hooks personnalises
│   │   ├── stores/                # Zustand stores
│   │   ├── providers/             # Context providers
│   │   └── messages/              # Traductions i18n
│   │
│   ├── admin/                     # Dashboard admin Next.js
│   │   ├── app/
│   │   ├── components/
│   │   └── ...
│   │
│   ├── mobile/                    # App React Native
│   │   ├── src/
│   │   │   ├── screens/           # Ecrans
│   │   │   ├── components/        # Composants
│   │   │   ├── hooks/             # Hooks
│   │   │   ├── services/          # Services (API, NFC, etc.)
│   │   │   └── navigation/        # Configuration navigation
│   │   └── ...
│   │
│   └── api-e2e/                   # Tests E2E
│
├── libs/                          # Librairies partagees
│   └── shared/
│       ├── types/                 # Types TypeScript
│       ├── utils/                 # Utilitaires
│       ├── constants/             # Constantes
│       ├── validation/            # Schemas Zod
│       ├── hooks/                 # Hooks React partages
│       └── i18n/                  # Configuration i18n
│
├── prisma/                        # Schema et migrations
│   ├── schema.prisma              # Schema BDD
│   ├── migrations/                # Migrations
│   └── seed.ts                    # Donnees de test
│
├── k8s/                           # Manifests Kubernetes
│   ├── base/                      # Configuration de base
│   └── overlays/                  # Overlays par environnement
│       ├── development/
│       ├── staging/
│       └── production/
│
├── infra/                         # Configuration infrastructure
│   ├── prometheus/
│   └── grafana/
│
├── docs/                          # Documentation
│   ├── api/                       # Documentation API
│   ├── security/                  # Documentation securite
│   └── compliance/                # Conformite RGPD/PCI-DSS
│
├── scripts/                       # Scripts utilitaires
│
├── docker-compose.yml             # Environnement local
├── docker-compose.override.yml    # Override developpement
├── nx.json                        # Configuration Nx
└── package.json
```

---

## Architecture Backend

### Modules NestJS

L'API backend est organisee en modules independants suivant les principes DDD:

```
+------------------+     +------------------+     +------------------+
|   Auth Module    |     | Tickets Module   |     | Payments Module  |
+------------------+     +------------------+     +------------------+
| - JWT Strategy   |     | - CRUD Categories|     | - Stripe Integ   |
| - RBAC Guards    |     | - Purchase Flow  |     | - Webhooks       |
| - Refresh Tokens |     | - QR Generation  |     | - Refunds        |
| - Password Reset |     | - Validation     |     | - Invoicing      |
+------------------+     +------------------+     +------------------+
         |                       |                        |
         +----------+------------+------------------------+
                    |
            +-------v--------+
            |  PrismaService |
            | (Database ORM) |
            +----------------+
```

### Guards et Decorateurs

```typescript
// Exemple d'utilisation des guards
@Controller('festivals')
@ApiTags('festivals')
@ApiBearerAuth()
export class FestivalsController {

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @UseGuards(JwtAuthGuard, RolesGuard, FestivalAccessGuard)
  async getFestival(@Param('id') id: string) {
    // ...
  }
}
```

### Guards Disponibles

| Guard | Description |
|-------|-------------|
| `JwtAuthGuard` | Verifie le token JWT |
| `RolesGuard` | Verifie les roles RBAC |
| `FestivalAccessGuard` | Verifie l'acces au festival |
| `OwnershipGuard` | Verifie la propriete de la ressource |
| `ThrottlerGuard` | Rate limiting |

### Intercepteurs

| Intercepteur | Fonction |
|--------------|----------|
| `TransformInterceptor` | Formate les reponses API |
| `LoggingInterceptor` | Log les requetes/reponses |
| `TimeoutInterceptor` | Timeout des requetes |
| `CacheInterceptor` | Mise en cache Redis |
| `AuditInterceptor` | Audit des actions |

---

## Architecture Frontend

### Application Web (Next.js 15)

```
app/
├── (public)/                    # Routes publiques
│   ├── page.tsx                 # Homepage
│   ├── festivals/
│   │   ├── page.tsx             # Liste festivals
│   │   └── [slug]/
│   │       ├── page.tsx         # Detail festival
│   │       └── tickets/
│   │           └── page.tsx     # Achat billets
│   └── login/
│       └── page.tsx
│
├── (protected)/                 # Routes protegees
│   ├── dashboard/
│   │   └── page.tsx
│   ├── tickets/
│   │   └── page.tsx             # Mes billets
│   └── cashless/
│       └── page.tsx             # Mon compte cashless
│
├── api/                         # API Routes Next.js
│   └── health/
│       └── route.ts
│
├── layout.tsx                   # Layout principal
└── globals.css
```

### State Management (Zustand)

```typescript
// stores/authStore.ts
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginDto) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

// stores/cartStore.ts
interface CartState {
  items: CartItem[];
  total: number;
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
}
```

---

## Architecture Mobile

### Ecrans Principaux

```
screens/
├── Auth/
│   ├── OnboardingScreen.tsx     # 3 slides d'introduction
│   ├── LoginScreen.tsx
│   └── RegisterScreen.tsx
│
├── Home/
│   └── HomeScreen.tsx           # Liste festivals
│
├── Festival/
│   ├── FestivalDetailScreen.tsx
│   ├── ProgramScreen.tsx        # Programme/Artistes
│   └── MapScreen.tsx            # Carte interactive
│
├── Tickets/
│   ├── MyTicketsScreen.tsx
│   └── TicketDetailScreen.tsx   # QR code plein ecran
│
├── Cashless/
│   ├── CashlessScreen.tsx       # Solde
│   ├── TopupScreen.tsx          # Recharge
│   └── HistoryScreen.tsx        # Historique
│
├── Support/
│   ├── FAQScreen.tsx
│   └── ChatScreen.tsx
│
└── Settings/
    └── SettingsScreen.tsx
```

### Offline-First Strategy

```typescript
// Service de synchronisation
class OfflineService {
  // File d'attente des operations en attente
  private pendingOperations: PendingOperation[] = [];

  // Sauvegarde locale
  async saveLocally(key: string, data: any) {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  }

  // Synchronisation au retour de connexion
  async sync() {
    for (const op of this.pendingOperations) {
      await this.executeOperation(op);
    }
    this.pendingOperations = [];
  }
}
```

---

## Base de Donnees

### Schema Simplifie

```
+----------------+       +-------------------+       +-----------------+
|     User       |       |     Festival      |       |    Ticket       |
+----------------+       +-------------------+       +-----------------+
| id (UUID)      |<---+  | id (UUID)         |<---+  | id (UUID)       |
| email          |    |  | organizerId (FK)  |    |  | festivalId (FK) |
| passwordHash   |    |  | name              |    |  | categoryId (FK) |
| firstName      |    |  | slug              |    |  | userId (FK)     |
| lastName       |    |  | startDate         |    |  | qrCode          |
| role           |    |  | endDate           |    |  | status          |
| status         |    |  | status            |    |  | purchasePrice   |
+----------------+    |  +-------------------+    |  +-----------------+
       |              |                           |
       |              +---------------------------+
       |
       v
+-------------------+       +-------------------+
| CashlessAccount   |       |    Payment        |
+-------------------+       +-------------------+
| id (UUID)         |       | id (UUID)         |
| userId (FK)       |       | userId (FK)       |
| balance           |       | amount            |
| nfcTagId          |       | status            |
| isActive          |       | provider          |
+-------------------+       | providerPaymentId |
                            +-------------------+
```

### Index de Performance

Des index composites optimises ont ete ajoutes pour les requetes frequentes:

```prisma
// Ticket indexes
@@index([festivalId, status])           // Analytics par festival
@@index([festivalId, categoryId])       // Rapports par categorie
@@index([userId, status])               // Billets utilisateur

// CashlessTransaction indexes
@@index([festivalId, type, createdAt])  // Analytics cashless
@@index([accountId, createdAt])         // Historique utilisateur
```

---

## Cache et Performance

### Strategie de Cache (Redis)

```
+------------------+     +------------------+     +------------------+
|   Cache L1       |     |   Cache L2       |     |   Database       |
| (In-Memory)      |     | (Redis)          |     | (PostgreSQL)     |
+------------------+     +------------------+     +------------------+
| TTL: 1 minute    |     | TTL: 5-60 min    |     | Source de verite |
| Hot data only    |     | Sessions         |     |                  |
|                  |     | Config festivals |     |                  |
+------------------+     +------------------+     +------------------+
        |                        |                        |
        +------------------------+------------------------+
                        Cache-Aside Pattern
```

### Strategies de Cache

| Type | Strategie | TTL |
|------|-----------|-----|
| Sessions | Write-Through | 7 jours |
| Config festivals | Cache-Aside | 5 minutes |
| Analytics | Refresh-Ahead | 1 minute |
| Donnees statiques | TTL Long | 1 heure |

### Tags de Cache

```typescript
enum CacheTag {
  FESTIVAL = 'festival',
  TICKET = 'ticket',
  USER = 'user',
  CASHLESS = 'cashless',
  VENDOR = 'vendor',
  ANALYTICS = 'analytics',
  CONFIG = 'config',
  SESSION = 'session',
}
```

---

## Securite

### Authentification

```
+------------+     +-------------+     +------------+
|   Client   | --> |  API Auth   | --> |   JWT      |
+------------+     +-------------+     +------------+
                          |
                   +------v------+
                   |  Passport   |
                   |  Strategies |
                   +-------------+
                   | - Local     |
                   | - JWT       |
                   +-------------+
```

### Tokens

| Token | Duree | Usage |
|-------|-------|-------|
| Access Token | 15 minutes | Authentification API |
| Refresh Token | 7 jours | Renouvellement access token |
| Email Token | 24 heures | Verification email |
| Reset Token | 1 heure | Reset mot de passe |

### RBAC (Role-Based Access Control)

| Role | Permissions |
|------|-------------|
| `ADMIN` | Acces complet a la plateforme |
| `ORGANIZER` | Gestion de ses propres festivals |
| `STAFF` | Scan billets, acces zones |
| `CASHIER` | Operations cashless |
| `SECURITY` | Controle d'acces |
| `USER` | Achat billets, cashless |

### Headers de Securite

```typescript
// Helmet configuration
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://js.stripe.com'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.stripe.com'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});
```

---

## Communication Temps Reel

### WebSocket Gateway

```
+------------+     +----------------+     +------------+
|  Client    |<--->| WebSocket GW   |<--->|   Redis    |
|  (Socket)  |     | (Socket.io)    |     | (Pub/Sub)  |
+------------+     +----------------+     +------------+
                          |
                   +------v------+
                   |   Rooms     |
                   +-------------+
                   | festival:{id}
                   | zone:{id}
                   | user:{id}
                   | ticket:{id}
                   +-------------+
```

### Events WebSocket

| Event | Direction | Description |
|-------|-----------|-------------|
| `notification` | Server -> Client | Nouvelle notification |
| `zone.update` | Server -> Client | Mise a jour capacite zone |
| `order.status` | Server -> Client | Statut commande vendor |
| `support.message` | Bidirectionnel | Chat support |

---

## Infrastructure

### Architecture Docker

```yaml
# Services principaux
services:
  api:        # NestJS Backend
  web:        # Next.js Public
  admin:      # Next.js Admin
  postgres:   # Base de donnees
  redis:      # Cache & Sessions
  minio:      # Object Storage
  mailhog:    # Email (dev)
  prometheus: # Metriques
  grafana:    # Dashboards
```

### Architecture Kubernetes

```
+-------------------+
|     Ingress       |
| (NGINX + TLS)     |
+-------------------+
         |
    +----+----+----+
    |         |    |
+---v---+ +---v---+ +---v---+
|  API  | |  Web  | | Admin |
| (HPA) | | (HPA) | | (HPA) |
+-------+ +-------+ +-------+
    |
+---v---+  +-------+  +-------+
|  PG   |  | Redis |  | MinIO |
| (STS) |  | (STS) |  | (STS) |
+-------+  +-------+  +-------+
```

### Horizontal Pod Autoscaling

```yaml
# HPA Configuration
spec:
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        targetAverageUtilization: 70
    - type: Resource
      resource:
        name: memory
        targetAverageUtilization: 80
```

---

## Monitoring

### Metriques Prometheus

| Categorie | Metriques |
|-----------|-----------|
| HTTP | `http_requests_total`, `http_request_duration_ms` |
| Database | `db_queries_total`, `db_query_duration_ms` |
| Cache | `cache_hits_total`, `cache_misses_total` |
| Business | `tickets_sold_total`, `cashless_topups_total` |
| System | `process_uptime_seconds`, `process_memory_bytes` |

### Endpoints de Monitoring

| Endpoint | Description |
|----------|-------------|
| `/api/health` | Health check global |
| `/api/health/live` | Liveness probe |
| `/api/health/ready` | Readiness probe |
| `/monitoring/metrics` | Metriques Prometheus |
| `/monitoring/metrics/json` | Metriques format JSON |

### Alerting

Les alertes sont configurees pour:

- **Latence API** > 500ms (p95)
- **Erreurs** > 1% des requetes
- **CPU** > 80% pendant 5 minutes
- **Memoire** > 85%
- **Disk** > 90%
- **Paiements echoues** > 5% en 15 minutes

---

## Diagramme de Deploiement

```
                    +------------------+
                    |    Cloudflare    |
                    |    (CDN + WAF)   |
                    +--------+---------+
                             |
                    +--------v---------+
                    |  Load Balancer   |
                    | (AWS ALB / GCP)  |
                    +--------+---------+
                             |
         +-------------------+-------------------+
         |                   |                   |
+--------v------+   +--------v------+   +--------v------+
|   API Pod 1   |   |   API Pod 2   |   |   API Pod N   |
+---------------+   +---------------+   +---------------+
         |                   |                   |
         +-------------------+-------------------+
                             |
              +--------------+---------------+
              |              |               |
     +--------v---+   +------v----+   +------v----+
     | PostgreSQL |   |   Redis   |   |   MinIO   |
     |  (Primary) |   |  Cluster  |   |  Cluster  |
     +------------+   +-----------+   +-----------+
              |
     +--------v---+
     | PostgreSQL |
     | (Replica)  |
     +------------+
```

---

## References

- [DOSSIER_FINAL_FESTIVAL_CTO.md](../DOSSIER_FINAL_FESTIVAL_CTO.md) - Specifications fonctionnelles
- [API_GUIDE.md](./api/API_GUIDE.md) - Guide d'integration API
- [WEBHOOKS.md](./api/WEBHOOKS.md) - Documentation webhooks
- [GDPR_AUDIT.md](./security/GDPR_AUDIT.md) - Conformite RGPD
- [SECRETS.md](./security/SECRETS.md) - Gestion des secrets

---

*Document mis a jour: Janvier 2026*
