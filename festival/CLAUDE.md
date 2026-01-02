# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workflow CTO - RÈGLES OBLIGATOIRES

**Avant chaque session de travail:**
1. Lire `.claude/IN_PROGRESS.md` pour voir les tâches en cours et à faire
2. Lire `.claude/DONE.md` pour voir ce qui a été accompli

**Pendant le travail:**
1. Mettre à jour `.claude/IN_PROGRESS.md` avec les tâches en cours
2. Quand une tâche est terminée, la déplacer de `IN_PROGRESS.md` vers `DONE.md`
3. Ajouter de nouvelles tâches découvertes dans `IN_PROGRESS.md`

**Après chaque fonctionnalité ajoutée ou tâche terminée:**
1. Ajouter les fichiers modifiés/créés avec `git add`
2. Faire un commit avec un message descriptif expliquant ce qui a été fait
3. **INTERDIT: Ne JAMAIS inclure "Claude", "AI", "assistant" ou toute référence à l'IA dans les messages de commit**
4. Pousser immédiatement les changements avec `git push`
5. Ne pas accumuler plusieurs fonctionnalités avant de commit - **1 fonctionnalité = 1 commit + 1 push**

**Convention de messages de commit:**
- `feat(module): description` - nouvelle fonctionnalité
- `fix(module): description` - correction de bug
- `refactor(module): description` - refactoring
- `docs: description` - documentation
- `test: description` - ajout/modification de tests
- `chore: description` - maintenance, dépendances

**Objectif:** Créer la "Ferrari" des applications de gestion de festival - une plateforme complète couvrant tous les besoins d'un festival (billetterie, paiements, cashless, hébergement, programme, food & drinks, etc.)

## Project Overview

Festival Management Platform - a multi-tenant system for managing festivals (ticketing, payments, cashless, staff). Designed to handle 10,000 to 500,000 users across multiple simultaneous events.

## Tech Stack

- **Frontend**: React + Next.js, Tailwind CSS, i18n
- **Mobile**: React Native (offline-first, push notifications)
- **Backend**: Node.js with NestJS, PostgreSQL, Redis, Prisma ORM
- **AI/ML**: Python service (Scikit-learn, TensorFlow)
- **Infrastructure**: AWS, Docker, GitHub Actions CI/CD, Prometheus monitoring

## Architecture

- Monorepo structure (Nx or Turbo)
- Progressive microservices with REST API + Webhooks
- Event-driven architecture with message queues

### Core Data Models

- **User**: UUID, email, role (RBAC), status
- **Festival**: Multi-tenant, dates, location, status
- **Ticket**: Festival-linked, type, price, quota, QR code
- **Payment**: User-linked, amount, provider, status (webhook-driven)
- **CashlessAccount**: Prepaid wallet with balance

### Key API Endpoints

- Auth: `POST /auth/login`, `POST /auth/register`, `GET /auth/me`
- Festivals: `POST /festivals`, `GET /festivals/{id}`
- Tickets: `POST /tickets/buy`, `GET /tickets/me`
- Cashless: `POST /cashless/topup`, `POST /cashless/pay`

## Security Requirements

- JWT + Refresh Tokens for authentication
- Strict RBAC (Role-Based Access Control)
- GDPR compliance for user data
- PCI-DSS compliance for payment processing
- AES encryption for sensitive data
- Comprehensive audit logging

## Development Notes

- This is a payment-critical platform; always validate transactions and handle edge cases
- Multi-tenant architecture: all queries must be scoped to the appropriate festival
- Mobile app requires offline-first design with sync capabilities
- QR codes are used for ticket validation at entry points

## Reference Document

`DOSSIER_FINAL_FESTIVAL_CTO.md` is the contractual basis for development - consult it for detailed specifications.

## Règles d'Orchestration Automatique d'Agents

**Lancement automatique d'agents pour les tâches IN_PROGRESS:**

1. Au début de chaque session, après lecture de `IN_PROGRESS.md`:
   - Identifier toutes les tâches marquées `[ ]` (non complétées)
   - Pour chaque tâche sans agent assigné, lancer un agent approprié
   - Lancer plusieurs agents en parallèle (minimum 5, jusqu'à 30 selon la charge)

2. Types d'agents à utiliser:
   - **Agent Fix**: Pour les corrections de bugs et erreurs TypeScript
   - **Agent Test**: Pour vérifier que les fonctionnalités marchent
   - **Agent Doc**: Pour la documentation
   - **Agent Build**: Pour les problèmes de compilation

3. Quand un agent termine une tâche:
   - Marquer la tâche comme `[x]` dans `IN_PROGRESS.md`
   - Déplacer la tâche vers `DONE.md` avec la date
   - Vérifier s'il reste des tâches à faire dans `IN_PROGRESS.md`
   - Si oui, prendre la prochaine tâche

4. Script de démarrage (`scripts/start.sh`):
   - Démarre tous les services Docker
   - Lance l'API, Web et Admin
   - Exécute les tests curl
   - Itère jusqu'à 0 erreur

**Commande pour lancer l'orchestration:**
```bash
./scripts/start.sh
```
