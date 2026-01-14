# Product Requirements Document (PRD)

# Festival Management Platform

**Version:** 1.0.0
**Date:** 2026-01-14
**Status:** Brownfield Documentation
**Type:** Existing System Documentation

---

## 1. Executive Summary

### 1.1 Product Vision

Festival est une plateforme complète de gestion de festivals musicaux multi-tenant permettant aux organisateurs de gérer tous les aspects de leurs événements : billetterie, paiements cashless, programmation, gestion du personnel, et analytics en temps réel.

### 1.2 Business Context

- **Marché cible:** Organisateurs de festivals musicaux (Europe)
- **Taille du marché:** Festivals de 1 000 à 100 000 participants
- **Différenciateurs:** Solution tout-en-un, multi-tenant, offline-first mobile

### 1.3 Success Metrics

- Festivals actifs gérés sur la plateforme
- Tickets vendus par an
- Volume de transactions cashless
- Temps moyen de validation d'entrée < 3 secondes

---

## 2. Product Overview

### 2.1 Core Capabilities

| Capability           | Description                                   | Status     |
| -------------------- | --------------------------------------------- | ---------- |
| **Billetterie**      | Vente de tickets avec QR codes sécurisés      | Implémenté |
| **Paiements Stripe** | Checkout sécurisé avec webhooks               | Implémenté |
| **Cashless**         | Portefeuille digital NFC pour achats sur site | Implémenté |
| **Programmation**    | Gestion artistes, scènes, performances        | Implémenté |
| **Zones & Accès**    | Contrôle d'accès par zone avec capacités      | Implémenté |
| **Staff**            | Gestion personnel et shifts                   | Implémenté |
| **Vendors**          | Gestion vendeurs et inventaire                | Implémenté |
| **Analytics**        | KPIs temps réel et exports                    | Implémenté |
| **Notifications**    | Push, email, SMS multi-canal                  | Implémenté |
| **Support**          | Tickets support et FAQ                        | Implémenté |

### 2.2 User Personas

#### Festival-goer (Utilisateur Final)

- Achète des tickets en ligne
- Utilise l'app mobile pour accéder à son ticket
- Recharge son compte cashless
- Consulte la programmation

#### Organizer (Organisateur)

- Crée et configure des festivals
- Gère la billetterie (catégories, quotas, prix)
- Supervise les ventes et analytics
- Gère la programmation et les vendeurs

#### Staff (Personnel)

- Valide les tickets à l'entrée
- Effectue les paiements cashless aux points de vente
- Gère les zones et capacités

#### Admin (Administrateur)

- Gère tous les festivals de la plateforme
- Administre les utilisateurs
- Accède aux analytics globaux
- Configure les paramètres système

---

## 3. Functional Requirements

### 3.1 Authentication & Authorization

| ID       | Requirement                            | Priority | Status     |
| -------- | -------------------------------------- | -------- | ---------- |
| AUTH-001 | Login email/password avec JWT httpOnly | P0       | Implémenté |
| AUTH-002 | OAuth (Google, GitHub)                 | P1       | Implémenté |
| AUTH-003 | Refresh token rotation                 | P0       | Implémenté |
| AUTH-004 | Password reset par email               | P0       | Implémenté |
| AUTH-005 | Email verification                     | P0       | Implémenté |
| AUTH-006 | 2FA (Two-Factor Authentication)        | P1       | Implémenté |
| AUTH-007 | RBAC (6 rôles)                         | P0       | Implémenté |

### 3.2 Festival Management

| ID       | Requirement                                       | Priority | Status     |
| -------- | ------------------------------------------------- | -------- | ---------- |
| FEST-001 | CRUD festivals multi-tenant                       | P0       | Implémenté |
| FEST-002 | Workflow: Draft → Published → Ongoing → Completed | P0       | Implémenté |
| FEST-003 | Gestion capacité maximale                         | P0       | Implémenté |
| FEST-004 | Configuration multi-langue                        | P1       | Implémenté |
| FEST-005 | Media management (images, logos)                  | P1       | Implémenté |

### 3.3 Ticketing

| ID       | Requirement                                            | Priority | Status     |
| -------- | ------------------------------------------------------ | -------- | ---------- |
| TICK-001 | Catégories de tickets (Standard, VIP, Backstage, etc.) | P0       | Implémenté |
| TICK-002 | Quotas et limites par catégorie                        | P0       | Implémenté |
| TICK-003 | QR codes sécurisés (HMAC-SHA256)                       | P0       | Implémenté |
| TICK-004 | Validation single-use                                  | P0       | Implémenté |
| TICK-005 | Transfert de tickets                                   | P1       | Implémenté |
| TICK-006 | Annulation et remboursement                            | P0       | Implémenté |
| TICK-007 | Codes promo avec règles de cumul                       | P1       | Implémenté |

### 3.4 Payments

| ID      | Requirement                 | Priority | Status     |
| ------- | --------------------------- | -------- | ---------- |
| PAY-001 | Stripe Checkout intégration | P0       | Implémenté |
| PAY-002 | Webhooks payment lifecycle  | P0       | Implémenté |
| PAY-003 | Refunds automatisés         | P0       | Implémenté |
| PAY-004 | Multi-currency support      | P1       | Implémenté |
| PAY-005 | Factures PDF                | P1       | Implémenté |

### 3.5 Cashless System

| ID       | Requirement                                         | Priority | Status     |
| -------- | --------------------------------------------------- | -------- | ---------- |
| CASH-001 | Wallet digital par utilisateur                      | P0       | Implémenté |
| CASH-002 | Top-up via Stripe                                   | P0       | Implémenté |
| CASH-003 | Paiements NFC                                       | P0       | Implémenté |
| CASH-004 | Limites configurables (min/max top-up, balance max) | P0       | Implémenté |
| CASH-005 | Historique transactions                             | P0       | Implémenté |
| CASH-006 | Remboursement solde post-festival                   | P1       | Implémenté |

### 3.6 Program Management

| ID       | Requirement                             | Priority | Status     |
| -------- | --------------------------------------- | -------- | ---------- |
| PROG-001 | Gestion artistes (bio, genre, media)    | P0       | Implémenté |
| PROG-002 | Gestion scènes (capacité, localisation) | P0       | Implémenté |
| PROG-003 | Planning performances                   | P0       | Implémenté |
| PROG-004 | Détection conflits horaires             | P1       | Implémenté |
| PROG-005 | Favoris utilisateur                     | P1       | Implémenté |

### 3.7 Zones & Access Control

| ID       | Requirement                      | Priority | Status     |
| -------- | -------------------------------- | -------- | ---------- |
| ZONE-001 | Définition zones avec capacités  | P0       | Implémenté |
| ZONE-002 | Accès par catégorie de ticket    | P0       | Implémenté |
| ZONE-003 | Monitoring occupation temps réel | P0       | Implémenté |
| ZONE-004 | Alertes capacité                 | P1       | Implémenté |
| ZONE-005 | Logs d'accès                     | P0       | Implémenté |

### 3.8 Real-time Features

| ID     | Requirement             | Priority | Status     |
| ------ | ----------------------- | -------- | ---------- |
| RT-001 | WebSocket notifications | P0       | Implémenté |
| RT-002 | Presence utilisateurs   | P1       | Implémenté |
| RT-003 | Zone occupancy updates  | P0       | Implémenté |
| RT-004 | Broadcast announcements | P0       | Implémenté |
| RT-005 | Support chat temps réel | P1       | Implémenté |

---

## 4. Non-Functional Requirements

### 4.1 Performance

- **Response time:** < 200ms pour API standard
- **Throughput:** 10 000 requêtes/minute
- **Ticket validation:** < 3 secondes end-to-end
- **WebSocket:** Support 50 000 connexions simultanées

### 4.2 Security

- **OWASP Top 10** compliance
- **PCI-DSS** compliance via Stripe
- **RGPD** compliance avec module dédié
- **JWT** avec rotation de tokens
- **Rate limiting** sur endpoints publics

### 4.3 Availability

- **Uptime:** 99.9% SLA
- **Failover:** PostgreSQL replication
- **Backup:** Daily avec rétention 30 jours

### 4.4 Scalability

- **Horizontal:** Kubernetes auto-scaling
- **Database:** Connection pooling avec PgBouncer
- **Cache:** Redis cluster

### 4.5 i18n / a11y

- **Langues:** 6 (FR, EN, DE, ES, IT, NL)
- **RTL:** Support arabe
- **WCAG:** 2.1 AA compliance

---

## 5. Technical Constraints

### 5.1 Stack Fixe

- **Backend:** NestJS 11, Prisma 6, PostgreSQL 16
- **Frontend:** Next.js 15, React 18, Tailwind CSS
- **Mobile:** React Native 0.76, Expo 53
- **Infrastructure:** Docker, Kubernetes, GitHub Actions

### 5.2 Integration Requirements

- **Stripe:** Payments + Connect pour marketplaces
- **Firebase:** Push notifications (FCM)
- **SMTP:** Emails transactionnels
- **Sentry:** Error tracking

---

## 6. Future Enhancements (Roadmap)

### Phase 1 - Immediate (Sprint actuel)

- Amélioration des tests unitaires
- Optimisation des performances API
- Corrections de bugs mineurs

### Phase 2 - Court terme

- Dashboard analytics avancé
- Export CSV/Excel amélioré
- Intégration calendrier externe

### Phase 3 - Moyen terme

- Application staff dédiée
- Module marketing (email campaigns)
- API publique pour intégrations tierces

### Phase 4 - Long terme

- Multi-event ticketing packages
- AI-powered recommendations
- Blockchain ticketing (NFT)

---

## 7. Success Criteria

| Metric                | Target  | Current |
| --------------------- | ------- | ------- |
| Test Coverage API     | 80%+    | ~75%    |
| Build Success Rate    | 100%    | 95%     |
| API Response Time p95 | < 500ms | ~200ms  |
| Zero Critical Bugs    | Yes     | Yes     |

---

## Appendix

### A. Glossary

- **Multi-tenant:** Architecture où une instance gère plusieurs festivals isolés
- **Cashless:** Système de paiement sans espèces basé sur wallet digital
- **NFC:** Near Field Communication pour paiements par contact

### B. References

- [Architecture Documentation](../docs/architecture.md)
- [API Guide](../docs/api/API_GUIDE.md)
- [Database Schema](../prisma/DATABASE.md)

---

_Document généré pour BMAD workflow - Brownfield Project_
