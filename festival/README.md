# Festival Management Platform

Une plateforme complete et multi-tenant de gestion de festivals, concue pour gerer des evenements de 10 000 a 500 000+ participants. Solution professionnelle couvrant la billetterie, les paiements cashless, le controle d'acces, la gestion du staff et bien plus.

## Fonctionnalites

### Billetterie
- Categories de billets multiples (Standard, VIP, Backstage, Camping)
- Generation de QR codes signes cryptographiquement
- Validation en temps reel aux points d'entree
- Gestion des quotas et limites par utilisateur

### Paiements Cashless
- Portefeuille numerique pour chaque participant
- Support des bracelets NFC
- Recharge via Stripe
- Historique des transactions en temps reel

### Controle d'Acces
- Gestion des zones par niveau d'acces
- Suivi de la capacite en temps reel
- Scan QR par le staff de securite
- Alertes de depassement de capacite

### Gestion du Staff
- Planification des shifts par zone
- Pointage arrivee/depart
- Generation de badges PDF avec QR
- Statistiques des heures travaillees

### Programme
- Gestion des artistes avec biographies
- Scenes avec specifications techniques
- Calendrier des performances
- Detection des conflits horaires
- Systeme de favoris pour les utilisateurs

### Camping & Hebergement
- Zones de camping par type (tente, caravane, glamping)
- Reservation d'emplacements avec paiement
- Check-in/Check-out
- Gestion des vehicules

### Vendeurs (Food & Merchandising)
- Gestion des stands par festival
- Catalogue produits avec stock
- Commandes via paiement cashless
- Commission plateforme configurable
- Demande de versement

### Notifications
- Push notifications (Firebase FCM)
- Notifications in-app en temps reel (WebSocket)
- Segmentation par festival, billet, role
- Preferences utilisateur

### Analytics
- Dashboard KPIs en temps reel
- Ventes de billets et revenus
- Transactions cashless
- Affluence par zone
- Export CSV/PDF

## Stack Technique

| Couche | Technologies |
|--------|--------------|
| **Frontend Web** | Next.js 15, React 19, Tailwind CSS, next-intl |
| **Dashboard Admin** | Next.js, React, Recharts, DataTables |
| **Application Mobile** | React Native, Expo, AsyncStorage |
| **Backend API** | NestJS, Prisma, PostgreSQL, Redis |
| **Authentification** | JWT, Passport.js, RBAC |
| **Paiements** | Stripe Checkout, Webhooks |
| **Temps Reel** | WebSocket, Socket.io |
| **Email** | Nodemailer, Handlebars templates |
| **PDF** | PDFKit |
| **Monitoring** | Prometheus, Sentry, Grafana |
| **CI/CD** | GitHub Actions |
| **Infrastructure** | Docker, Kubernetes |

## Architecture

```
festival/
|-- apps/
|   |-- api/                 # Backend NestJS
|   |-- web/                 # Site public Next.js
|   |-- admin/               # Dashboard admin Next.js
|   |-- mobile/              # App React Native
|   |-- api-e2e/             # Tests end-to-end
|
|-- libs/
|   |-- shared/
|       |-- types/           # Types TypeScript partages
|       |-- utils/           # Fonctions utilitaires
|       |-- constants/       # Constantes
|       |-- validation/      # Schemas Zod
|       |-- hooks/           # Hooks React partages
|       |-- i18n/            # Internationalisation
|
|-- prisma/
|   |-- schema.prisma        # Schema base de donnees
|   |-- seed.ts              # Donnees de test
|
|-- k8s/                     # Manifests Kubernetes
|-- docs/                    # Documentation
|-- docker-compose.yml       # Environnement local
```

## Demarrage Rapide

### Prerequisites

- Node.js 20+
- pnpm 8+ (recommande) ou npm
- Docker & Docker Compose
- PostgreSQL 16+ (ou via Docker)
- Redis 7+ (ou via Docker)

### Installation

```bash
# Cloner le repository
git clone https://github.com/your-org/festival-platform.git
cd festival-platform/festival

# Installer les dependances
pnpm install
# ou
npm install

# Copier la configuration
cp .env.example .env.development

# Demarrer les services d'infrastructure
docker-compose up -d postgres redis minio

# Generer le client Prisma
npx prisma generate

# Executer les migrations
npx prisma migrate dev

# Seed la base de donnees (optionnel)
npx prisma db seed
```

### Demarrer les Serveurs

```bash
# API (port 3333)
npx nx serve api

# Site web (port 3000) - dans un autre terminal
npx nx serve web

# Admin (port 4200) - dans un autre terminal
npx nx serve admin
```

### Acces aux Applications

| Application | URL | Description |
|-------------|-----|-------------|
| API | http://localhost:3333/api | Backend API REST |
| API Docs | http://localhost:3333/api/docs | Documentation Swagger |
| Web | http://localhost:3000 | Site public |
| Admin | http://localhost:4200 | Dashboard admin |
| MailDev | http://localhost:8025 | Interface email de test |

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture technique complete |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Guide de deploiement |
| [CONTRIBUTING.md](docs/CONTRIBUTING.md) | Guide de contribution |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Guide de depannage |
| [API_GUIDE.md](docs/api/API_GUIDE.md) | Documentation API |
| [WEBHOOKS.md](docs/api/WEBHOOKS.md) | Documentation webhooks |

## Scripts Disponibles

```bash
# Developpement
npx nx serve api           # API en mode dev
npx nx serve web           # Web en mode dev
npx nx serve admin         # Admin en mode dev

# Build
npx nx build api           # Build API
npx nx build web           # Build Web
npx nx build admin         # Build Admin

# Tests
npx nx test api            # Tests unitaires API
npx nx e2e api-e2e         # Tests E2E
npx nx test api --coverage # Tests avec couverture

# Base de donnees
npx prisma generate        # Generer client Prisma
npx prisma migrate dev     # Creer migration
npx prisma db seed         # Seed donnees
npx prisma studio          # Interface visuelle BDD

# Qualite de code
npx nx lint --all          # Linting
npx nx format:check        # Verification formatage
npx nx format:write        # Correction formatage

# Docker
docker-compose up -d       # Demarrer services
docker-compose down        # Arreter services
docker-compose logs -f     # Voir les logs
```

## Variables d'Environnement

Variables principales (voir `.env.example` pour la liste complete):

```bash
# Application
NODE_ENV=development
API_URL=http://localhost:3333

# Base de donnees
DATABASE_URL=postgresql://user:pass@localhost:5432/festival_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=votre-secret-jwt-64-caracteres-minimum
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Roles Utilisateur

| Role | Description | Permissions |
|------|-------------|-------------|
| `ADMIN` | Administrateur plateforme | Acces complet |
| `ORGANIZER` | Organisateur de festival | Gestion de ses festivals |
| `STAFF` | Personnel | Scan billets, acces zones |
| `CASHIER` | Caissier | Operations cashless |
| `SECURITY` | Securite | Controle d'acces |
| `USER` | Participant | Achat billets, cashless |

## Securite

- **Authentification**: JWT avec rotation access/refresh tokens
- **Autorisation**: Controle d'acces base sur les roles (RBAC)
- **Protection des donnees**: Conformite RGPD, chiffrement des donnees
- **Paiements**: Conformite PCI-DSS via Stripe
- **API**: Rate limiting, CORS, headers Helmet
- **Audit**: Journalisation de toutes les operations sensibles

Voir [docs/security/](docs/security/) pour la documentation securite complete.

## Deploiement

### Docker

```bash
# Build image production
docker build -t festival-api -f apps/api/Dockerfile .

# Lancer container
docker run -p 3333:3333 \
  -e DATABASE_URL=... \
  -e REDIS_URL=... \
  festival-api
```

### Kubernetes

```bash
# Appliquer les manifests
kubectl apply -k k8s/overlays/production
```

### Cloud

- **Vercel**: Dashboards Web et Admin
- **Railway/Render**: Serveur API
- **AWS/GCP**: Infrastructure complete

Voir [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) pour le guide complet.

## Monitoring

| Endpoint | Description |
|----------|-------------|
| `/api/health` | Health check global |
| `/api/health/live` | Liveness probe |
| `/api/health/ready` | Readiness probe |
| `/monitoring/metrics` | Metriques Prometheus |

## Contribution

Les contributions sont les bienvenues! Voir [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) pour les guidelines.

1. Fork le repository
2. Creer une branche (`git checkout -b feature/amazing-feature`)
3. Commiter les changements (`git commit -m 'feat: add amazing feature'`)
4. Pousser la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

## Support

- **Documentation**: [docs/](docs/)
- **API Reference**: http://localhost:3333/api/docs
- **Issues**: GitHub Issues
- **Depannage**: [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

## Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de details.

---

Construit avec NestJS, Next.js et React Native.
