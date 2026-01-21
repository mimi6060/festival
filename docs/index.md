# Index Complet de la Documentation - Festival Platform

> Index exhaustif de tous les fichiers markdown du projet
> Dernire mise jour: 2026-01-21

---

## Racine du Projet

| Fichier                   | Description                                        |
| ------------------------- | -------------------------------------------------- |
| [CLAUDE.md](../CLAUDE.md) | Instructions pour Claude Code et rgles de workflow |

---

## Documentation Principale (`docs/`)

### Guides Essentiels

| Fichier                                                            | Description                                 |
| ------------------------------------------------------------------ | ------------------------------------------- |
| [ARCHITECTURE.md](./ARCHITECTURE.md)                               | Architecture systme avec diagrammes Mermaid |
| [CONTRIBUTING.md](./CONTRIBUTING.md)                               | Guide de contribution au projet             |
| [CTO_BRIEFING.md](./CTO_BRIEFING.md)                               | Briefing technique pour CTO                 |
| [DATABASE_SEEDING.md](./DATABASE_SEEDING.md)                       | Guide de seeding de la base de donnes       |
| [DEPLOYMENT.md](./DEPLOYMENT.md)                                   | Guide de dploiement multi-environnements    |
| [DEVELOPMENT.md](./DEVELOPMENT.md)                                 | Guide de dmarrage rapide pour dveloppeurs   |
| [KUBERNETES_DEPLOYMENT.md](./KUBERNETES_DEPLOYMENT.md)             | Dploiement sur Kubernetes                   |
| [MOBILE_PERFORMANCE_AUDIT.md](./MOBILE_PERFORMANCE_AUDIT.md)       | Audit de performance application mobile     |
| [OAUTH_SETUP.md](./OAUTH_SETUP.md)                                 | Configuration OAuth (Google, GitHub)        |
| [TEAM_SCALING_PROPOSAL.md](./TEAM_SCALING_PROPOSAL.md)             | Proposition de scaling quipe                |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)                         | Guide de dpannage des problmes courants     |
| [sentry-alerts-configuration.md](./sentry-alerts-configuration.md) | Configuration des alertes Sentry            |
| [source-tree.md](./source-tree.md)                                 | Arborescence dtaille du code source         |

### API (`docs/api/`)

| Fichier                                        | Description                                     |
| ---------------------------------------------- | ----------------------------------------------- |
| [API_GUIDE.md](./api/API_GUIDE.md)             | Guide d'intgration API REST complet             |
| [API_REFERENCE/](./api/API_REFERENCE/index.md) | Rfrence complte des endpoints API (16 sections) |
| [WEBHOOKS.md](./api/WEBHOOKS.md)               | Documentation des webhooks                      |

### Scurit (`docs/security/`)

| Fichier                                                 | Description                                       |
| ------------------------------------------------------- | ------------------------------------------------- |
| [GDPR_AUDIT.md](./security/GDPR_AUDIT.md)               | Rapport d'audit de conformit RGPD                 |
| [PENTEST_GUIDE/](./security/PENTEST_GUIDE/index.md)     | Guide complet de tests de pntration (15 sections) |
| [PRODUCTION_CONFIG.md](./security/PRODUCTION_CONFIG.md) | Configuration scurise pour production             |
| [SECRETS.md](./security/SECRETS.md)                     | Gestion des secrets et variables sensibles        |
| [checklist.md](./security/checklist.md)                 | Checklist de scurit                               |
| [methodology.md](./security/methodology.md)             | Mthodologie de tests de scurit                    |
| [pentest-plan.md](./security/pentest-plan.md)           | Plan de tests de pntration                        |
| [scope.md](./security/scope.md)                         | Primtre des tests de scurit                       |

#### Authentification (`docs/security/authentication/`)

| Fichier                                                    | Description                                |
| ---------------------------------------------------------- | ------------------------------------------ |
| [README.md](./security/authentication/README.md)           | Vue d'ensemble de l'authentification       |
| [brute-force.md](./security/authentication/brute-force.md) | Protection contre les attaques brute-force |

### Conformit (`docs/compliance/`)

| Fichier                                             | Description                      |
| --------------------------------------------------- | -------------------------------- |
| [PCI_DSS.md](./compliance/PCI_DSS.md)               | Conformit PCI-DSS pour paiements |
| [SOC2_CHECKLIST.md](./compliance/SOC2_CHECKLIST.md) | Checklist de conformit SOC2      |

#### GDPR (`docs/compliance/gdpr/`)

| Fichier                                                        | Description                                   |
| -------------------------------------------------------------- | --------------------------------------------- |
| [data-mapping.md](./compliance/gdpr/data-mapping.md)           | Cartographie des donnes personnelles          |
| [dpia.md](./compliance/gdpr/dpia.md)                           | Analyse d'impact sur la protection des donnes |
| [gdpr-audit-report.md](./compliance/gdpr/gdpr-audit-report.md) | Rapport d'audit RGPD                          |
| [legal-basis.md](./compliance/gdpr/legal-basis.md)             | Bases lgales du traitement                    |
| [retention-policy.md](./compliance/gdpr/retention-policy.md)   | Politique de rtention des donnes              |

#### PCI-DSS (`docs/compliance/pci-dss/`)

| Fichier                                                               | Description                       |
| --------------------------------------------------------------------- | --------------------------------- |
| [evidence-collection.md](./compliance/pci-dss/evidence-collection.md) | Collecte des preuves de conformit |
| [pci-dss-overview.md](./compliance/pci-dss/pci-dss-overview.md)       | Vue d'ensemble PCI-DSS            |
| [saq-a-ep.md](./compliance/pci-dss/saq-a-ep.md)                       | Questionnaire d'auto-valuation    |
| [scope-reduction.md](./compliance/pci-dss/scope-reduction.md)         | Rduction du primtre PCI           |

### Lgal (`docs/legal/`)

| Fichier                                                  | Description                      |
| -------------------------------------------------------- | -------------------------------- |
| [COOKIE_POLICY.md](./legal/COOKIE_POLICY.md)             | Politique des cookies            |
| [PRIVACY_POLICY.md](./legal/PRIVACY_POLICY.md)           | Politique de confidentialit      |
| [TERMS_OF_SERVICE.md](./legal/TERMS_OF_SERVICE.md)       | Conditions gnrales d'utilisation |
| [cookie-policy-en.md](./legal/cookie-policy-en.md)       | Politique cookies (EN)           |
| [cookie-policy-fr.md](./legal/cookie-policy-fr.md)       | Politique cookies (FR)           |
| [privacy-policy-en.md](./legal/privacy-policy-en.md)     | Politique confidentialit (EN)    |
| [privacy-policy-fr.md](./legal/privacy-policy-fr.md)     | Politique confidentialit (FR)    |
| [terms-of-service-en.md](./legal/terms-of-service-en.md) | CGU (EN)                         |
| [terms-of-service-fr.md](./legal/terms-of-service-fr.md) | CGU (FR)                         |

---

## Applications (`apps/`)

### API NestJS (`apps/api/`)

| Fichier                                          | Description                  |
| ------------------------------------------------ | ---------------------------- |
| [REDIS_CACHING.md](../apps/api/REDIS_CACHING.md) | Implmentation du cache Redis |

### Application Web (`apps/web/`)

| Fichier                                          | Description                           |
| ------------------------------------------------ | ------------------------------------- |
| [README.md](../apps/web/README.md)               | Documentation application web Next.js |
| [ACCESSIBILITY.md](../apps/web/ACCESSIBILITY.md) | Guide d'accessibilit WCAG             |

### Dashboard Admin (`apps/admin/`)

| Fichier                              | Description                            |
| ------------------------------------ | -------------------------------------- |
| [README.md](../apps/admin/README.md) | Documentation dashboard administrateur |

### Application Mobile (`apps/mobile/`)

| Fichier                               | Description                            |
| ------------------------------------- | -------------------------------------- |
| [README.md](../apps/mobile/README.md) | Documentation application React Native |

---

## Bibliothques Partages (`libs/`)

| Fichier                                                       | Description              |
| ------------------------------------------------------------- | ------------------------ |
| [libs/shared/types/README.md](../libs/shared/types/README.md) | Types TypeScript partags |
| [libs/shared/utils/README.md](../libs/shared/utils/README.md) | Utilitaires partags      |

---

## Base de Donnes (`prisma/`)

| Fichier                              | Description                           |
| ------------------------------------ | ------------------------------------- |
| [DATABASE.md](../prisma/DATABASE.md) | Documentation complte du schma Prisma |

---

## Suivi de Projet (`.claude/`)

| Fichier                                                     | Description                  |
| ----------------------------------------------------------- | ---------------------------- |
| [BUSINESS_PLAN.md](../.claude/BUSINESS_PLAN.md)             | Plan business du projet      |
| [CTO_MISSION.md](../.claude/CTO_MISSION.md)                 | Mission et objectifs CTO     |
| [CTO_PLAN_Q2_Q3_2026.md](../.claude/CTO_PLAN_Q2_Q3_2026.md) | Roadmap technique Q2-Q3 2026 |
| [DONE.md](../.claude/DONE.md)                               | Tches compltes               |
| [IN_PROGRESS.md](../.claude/IN_PROGRESS.md)                 | Tches en cours               |

---

## Artefacts BMAD (`_bmad-output/`)

### Artefacts d'Implmentation

| Fichier                                                                                       | Description                        |
| --------------------------------------------------------------------------------------------- | ---------------------------------- |
| [1-1-test-coverage-api.md](../_bmad-output/implementation-artifacts/1-1-test-coverage-api.md) | Rapport de couverture de tests API |

### Artefacts de Planification

| Fichier                                                               | Description                |
| --------------------------------------------------------------------- | -------------------------- |
| [architecture.md](../_bmad-output/planning-artifacts/architecture.md) | Architecture planifie      |
| [epics.md](../_bmad-output/planning-artifacts/epics.md)               | Epics et stories planifies |

### Contexte Projet

| Fichier                                                  | Description                    |
| -------------------------------------------------------- | ------------------------------ |
| [project-context.md](../_bmad-output/project-context.md) | Contexte projet pour agents IA |

---

## Statistiques

| Catgorie                           | Nombre de fichiers |
| ---------------------------------- | ------------------ |
| Documentation principale (`docs/`) | 47                 |
| Applications (`apps/`)             | 5                  |
| Bibliothques (`libs/`)             | 2                  |
| Base de donnes (`prisma/`)         | 1                  |
| Suivi projet (`.claude/`)          | 5                  |
| Artefacts BMAD (`_bmad-output/`)   | 4                  |
| **Total**                          | **64**             |

---

## Stack Technologique

| Couche    | Technologies                                 |
| --------- | -------------------------------------------- |
| Backend   | NestJS 11, Prisma 6, PostgreSQL 16+, Redis 7 |
| Frontend  | Next.js 15, React 18/19, Tailwind CSS        |
| Mobile    | React Native, Expo 53, React Navigation 7    |
| Auth      | JWT + httpOnly cookies, Passport.js, RBAC    |
| Paiements | Stripe Checkout + Webhooks                   |
| Real-time | WebSocket (Socket.io)                        |
| Queues    | BullMQ (Redis)                               |

---

## Dmarrage Rapide

```bash
# Installation
npm install

# Infrastructure
docker-compose up -d

# Base de donnes
npx prisma generate && npx prisma migrate dev && npx prisma db seed

# Dmarrer les applications
npx nx serve api     # :3333
npx nx serve web     # :3000
npx nx serve admin   # :4201
```

### Comptes de test

| Email                    | Mot de passe  | Rle       |
| ------------------------ | ------------- | --------- |
| admin@festival.fr        | Festival2025! | ADMIN     |
| organisateur@festival.fr | Festival2025! | ORGANIZER |
| user@festival.fr         | Festival2025! | USER      |

---

_Index gnr par BMad Master - 2026-01-21_
