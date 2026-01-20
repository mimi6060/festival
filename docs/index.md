# Documentation du Projet Festival

> Index principal de la documentation technique
> Dernière mise à jour: 2026-01-14

## Vue d'ensemble

**Festival** est une plateforme complète de gestion de festivals musicaux multi-tenant. Le projet est structuré en monorepo NX avec 5 applications interconnectées.

### Statistiques du Projet

| Métrique              | Valeur                              |
| --------------------- | ----------------------------------- |
| Applications          | 5 (API, Web, Admin, Mobile, Shared) |
| Modèles de données    | 52                                  |
| Endpoints API         | 130+                                |
| Langues supportées    | 6 (FR, EN, DE, ES, IT, NL)          |
| Schémas de validation | 100+                                |
| Composants UI         | 133+                                |

---

## Applications

### Backend API (NestJS)

- **Port**: 3333
- **Documentation**: [API Guide](./api/API_GUIDE.md)
- **Swagger**: `http://localhost:3333/api/docs`
- **25+ modules** : auth, festivals, tickets, payments, cashless, zones, staff, program, vendors, etc.

### Application Web (Next.js)

- **Port**: 3000
- **20 pages** pour les festivaliers
- **3 stores Zustand** (auth, cart, UI)
- Support RTL, thème clair/sombre, WCAG 2.1 AA

### Dashboard Admin (Next.js)

- **Port**: 4201
- **25 pages** de gestion
- Tableaux de bord temps réel avec WebSocket
- Graphiques Recharts pour analytics

### Application Mobile (React Native + Expo)

- **15+ écrans** natifs
- Mode offline-first avec WatermelonDB
- NFC pour paiements cashless
- Push notifications (FCM/APNs)

### Bibliothèques Partagées

- `@festival/shared/types` - 30+ interfaces TypeScript
- `@festival/shared/utils` - 50+ fonctions utilitaires
- `@festival/shared/validation` - 100+ schémas Zod
- `@festival/shared/i18n` - 6 langues
- `@festival/shared/api-client` - Client HTTP avec retry

---

## Documentation Technique

### Getting Started

| Document                                | Description                  |
| --------------------------------------- | ---------------------------- |
| [Development Guide](./DEVELOPMENT.md)   | Quick start, commands, ports |
| [Troubleshooting](./TROUBLESHOOTING.md) | Common issues and solutions  |

### Architecture

| Document                                 | Description                        |
| ---------------------------------------- | ---------------------------------- |
| [Architecture](./ARCHITECTURE.md)        | Diagrammes Mermaid et flux système |
| [Arborescence Source](./source-tree.md)  | Structure détaillée du code        |
| [Base de données](../prisma/DATABASE.md) | Schéma Prisma et modèles           |

### API

| Document                        | Description                 |
| ------------------------------- | --------------------------- |
| [API Guide](./api/API_GUIDE.md) | Guide complet de l'API REST |
| [Webhooks](./api/WEBHOOKS.md)   | Intégration des webhooks    |
| [Errors](./api/ERRORS.md)       | Codes d'erreur standardisés |

### Sécurité & Conformité

| Document                                         | Description               |
| ------------------------------------------------ | ------------------------- |
| [GDPR Compliance](./security/GDPR_COMPLIANCE.md) | Conformité RGPD           |
| [PCI-DSS](./security/PCI_DSS.md)                 | Conformité paiements      |
| [Security Guide](./security/SECURITY_GUIDE.md)   | Bonnes pratiques sécurité |
| [GDPR Audit](./security/GDPR_AUDIT.md)           | Rapport d'audit RGPD      |

### Légal

| Document                                                  | Description             |
| --------------------------------------------------------- | ----------------------- |
| [Conditions Générales](./legal/CGV.md)                    | CGV de la plateforme    |
| [Politique de Confidentialité](./legal/PRIVACY_POLICY.md) | Protection des données  |
| [Politique Cookies](./legal/COOKIE_POLICY.md)             | Utilisation des cookies |

---

## Stack Technologique

### Backend

| Technologie | Version | Rôle             |
| ----------- | ------- | ---------------- |
| Node.js     | 20 LTS  | Runtime          |
| NestJS      | 11.x    | Framework        |
| Prisma      | 6.x     | ORM              |
| PostgreSQL  | 16+     | Base de données  |
| Redis       | 7.x     | Cache & sessions |
| BullMQ      | latest  | Job queue        |
| Socket.io   | latest  | WebSocket        |
| Stripe      | 17.x    | Paiements        |

### Frontend

| Technologie    | Version | Rôle               |
| -------------- | ------- | ------------------ |
| Next.js        | 15.1.0  | Framework React    |
| React          | 18.3.0  | UI Library         |
| Tailwind CSS   | 3.4.19  | Styling            |
| Zustand        | 4.5.5   | State management   |
| TanStack Query | 5.90.16 | Data fetching      |
| next-intl      | 3.26.0  | i18n               |
| Recharts       | 3.6.0   | Graphiques (Admin) |

### Mobile

| Technologie      | Version | Rôle        |
| ---------------- | ------- | ----------- |
| React Native     | 0.76.7  | Framework   |
| Expo             | 53.x    | SDK         |
| React Navigation | 7.x     | Navigation  |
| WatermelonDB     | 0.27.x  | Base locale |
| i18next          | 23.x    | i18n        |

### Infrastructure

| Technologie          | Rôle             |
| -------------------- | ---------------- |
| Docker               | Conteneurisation |
| Kubernetes           | Orchestration    |
| GitHub Actions       | CI/CD            |
| Prometheus + Grafana | Monitoring       |
| Sentry               | Error tracking   |

---

## Démarrage Rapide

### Prérequis

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16+ (ou via Docker)
- Redis 7+ (ou via Docker)

### Installation

```bash
# Cloner le repo
git clone <repository-url>
cd festival

# Installer les dépendances
npm install

# Démarrer l'infrastructure
docker-compose up -d

# Configurer l'environnement
cp .env.example .env.development

# Initialiser la base de données
npx prisma generate
npx prisma migrate dev
npx prisma db seed

# Démarrer les applications
npx nx serve api              # API sur :3333
npx nx serve web              # Web sur :3000
npx nx serve admin            # Admin sur :4201
cd apps/mobile && npx expo start  # Mobile
```

### Comptes de test (après seed)

| Email                    | Mot de passe  | Rôle      |
| ------------------------ | ------------- | --------- |
| admin@festival.fr        | Festival2025! | ADMIN     |
| organisateur@festival.fr | Festival2025! | ORGANIZER |
| staff@festival.fr        | Festival2025! | STAFF     |
| user@festival.fr         | Festival2025! | USER      |

---

## Commandes Utiles

### Développement

```bash
# Serveurs de développement
npx nx serve api
npx nx serve web
npx nx serve admin

# Build
npx nx build api --skip-nx-cache
npm run build:all

# Tests
npx nx test api
npm run test:all

# Linting
npm run lint:all
npm run lint:fix
```

### Base de données

```bash
npx prisma generate     # Générer le client
npx prisma migrate dev  # Appliquer les migrations
npx prisma db seed      # Données de test
npx prisma studio       # Interface visuelle
```

### Docker

```bash
docker-compose up -d    # Démarrer PostgreSQL, Redis, MailHog
docker-compose down     # Arrêter les services
docker-compose logs -f  # Voir les logs
```

---

## Workflows BMAD Disponibles

Ce projet utilise le framework BMAD pour l'assistance au développement.

| Workflow         | Description                                    |
| ---------------- | ---------------------------------------------- |
| `/quick-spec`    | Créer une spécification technique              |
| `/quick-dev`     | Développement rapide avec spec ou instructions |
| `/dev-story`     | Implémenter une user story                     |
| `/code-review`   | Review de code adversariale                    |
| `/create-story`  | Créer une nouvelle story                       |
| `/sprint-status` | Statut du sprint                               |

---

## Support

- **Documentation API**: `http://localhost:3333/api/docs`
- **Issues**: Créer une issue sur le repository
- **Contribuer**: Voir [CONTRIBUTING.md](../CONTRIBUTING.md) si disponible

---

_Documentation générée par le workflow document-project_
