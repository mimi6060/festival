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
