# Perimetre des Tests de Penetration - Festival Management Platform

## 1. Vue d'Ensemble

Ce document definit le perimetre exact des tests de penetration pour la plateforme Festival Management.

## 2. Environnement de Test

### 2.1 Environnements

| Environnement | URL | Autorisation |
|---------------|-----|--------------|
| **Staging** | https://staging.festival-platform.com | OUI |
| **Preprod** | https://preprod.festival-platform.com | OUI |
| **Production** | https://festival-platform.com | NON |

### 2.2 Plages IP Autorisees

```
# Environnement Staging
10.0.1.0/24    - Subnet applications
10.0.2.0/24    - Subnet base de donnees
10.0.3.0/24    - Subnet cache/redis

# IP Publiques (Load Balancer)
203.0.113.10   - Web Frontend
203.0.113.11   - API Gateway
203.0.113.12   - Admin Panel
```

## 3. Applications dans le Perimetre

### 3.1 Application Web Frontend

| Composant | Details |
|-----------|---------|
| **URL** | https://staging.festival-platform.com |
| **Technologie** | Next.js, React, Tailwind CSS |
| **Authentification** | JWT + Refresh Token |
| **Fonctionnalites** | Billetterie, Cashless, Programme |

**Fonctionnalites a tester:**
- [ ] Inscription / Connexion utilisateur
- [ ] Achat de billets
- [ ] Rechargement cashless
- [ ] Consultation du programme
- [ ] Gestion du profil utilisateur
- [ ] Historique des transactions

### 3.2 Application Admin

| Composant | Details |
|-----------|---------|
| **URL** | https://admin.staging.festival-platform.com |
| **Technologie** | Next.js, React |
| **Authentification** | JWT + MFA |
| **Roles** | Super Admin, Admin Festival, Staff |

**Fonctionnalites a tester:**
- [ ] Gestion des festivals (CRUD)
- [ ] Gestion des utilisateurs et roles
- [ ] Gestion de la billetterie
- [ ] Dashboard et rapports
- [ ] Configuration des paiements
- [ ] Export de donnees

### 3.3 API Backend

| Composant | Details |
|-----------|---------|
| **URL** | https://api.staging.festival-platform.com |
| **Technologie** | NestJS, TypeScript |
| **Documentation** | /api/docs (Swagger) |
| **Authentification** | JWT Bearer Token |

**Endpoints a tester:**

```
# Authentication
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
GET  /api/v1/auth/me

# Users
GET    /api/v1/users
GET    /api/v1/users/:id
PUT    /api/v1/users/:id
DELETE /api/v1/users/:id
PATCH  /api/v1/users/:id/role

# Festivals
GET    /api/v1/festivals
POST   /api/v1/festivals
GET    /api/v1/festivals/:id
PUT    /api/v1/festivals/:id
DELETE /api/v1/festivals/:id

# Tickets
GET    /api/v1/tickets
POST   /api/v1/tickets/buy
GET    /api/v1/tickets/:id
GET    /api/v1/tickets/me
POST   /api/v1/tickets/:id/validate
POST   /api/v1/tickets/:id/refund

# Cashless
GET    /api/v1/cashless/balance
POST   /api/v1/cashless/topup
POST   /api/v1/cashless/pay
GET    /api/v1/cashless/transactions
POST   /api/v1/cashless/refund

# Payments
POST   /api/v1/payments/create
GET    /api/v1/payments/:id
POST   /api/v1/payments/webhook
GET    /api/v1/payments/history

# Admin
GET    /api/v1/admin/dashboard
GET    /api/v1/admin/reports
POST   /api/v1/admin/export
```

### 3.4 Application Mobile

| Composant | Details |
|-----------|---------|
| **Plateforme** | iOS et Android |
| **Technologie** | React Native |
| **Distribution** | TestFlight / Firebase App Distribution |

**Fonctionnalites a tester:**
- [ ] Authentification biometrique
- [ ] Stockage securise des tokens
- [ ] Mode offline et synchronisation
- [ ] Scan QR Code
- [ ] Push notifications
- [ ] Paiement cashless NFC

### 3.5 Infrastructure

| Composant | Details |
|-----------|---------|
| **Cloud** | AWS (eu-west-3) |
| **Container** | Docker / ECS |
| **Database** | PostgreSQL (RDS) |
| **Cache** | Redis (ElastiCache) |
| **CDN** | CloudFront |

**Elements a tester:**
- [ ] Configuration des security groups
- [ ] Headers de securite HTTP
- [ ] Certificats SSL/TLS
- [ ] Configuration CORS
- [ ] Rate limiting
- [ ] WAF (si present)

## 4. Hors Perimetre

### 4.1 Systemes Exclus

| Systeme | Raison |
|---------|--------|
| Services Stripe (production) | Service tiers, tests limites au sandbox |
| Services PayPal (production) | Service tiers, tests limites au sandbox |
| Infrastructure AWS geree | RDS, ElastiCache - gestion AWS |
| Services de messagerie | SendGrid, Twilio - services tiers |
| CDN CloudFront | Configuration AWS |

### 4.2 Types de Tests Exclus

- **Tests de deni de service (DoS/DDoS)**
- **Ingenierie sociale** (phishing, vishing)
- **Tests physiques** (intrusion physique)
- **Tests sur donnees de production reelles**

## 5. Donnees de Test

### 5.1 Comptes de Test Fournis

| Role | Email | Mot de passe | Description |
|------|-------|--------------|-------------|
| Super Admin | superadmin@test.local | [fourni] | Acces complet |
| Admin Festival | admin@test.local | [fourni] | Gestion d'un festival |
| Staff | staff@test.local | [fourni] | Operations terrain |
| Utilisateur | user@test.local | [fourni] | Utilisateur standard |
| Utilisateur 2 | user2@test.local | [fourni] | Test horizontal |

### 5.2 Donnees Sensibles

**ATTENTION**: Les donnees suivantes sont anonymisees/fictives:
- Numeros de carte de credit: Utiliser les cartes de test Stripe
- Donnees personnelles: Donnees fictives generees
- Adresses email: Domaine @test.local uniquement

### 5.3 Cartes de Test (Stripe Sandbox)

```
# Carte valide
4242 4242 4242 4242

# Carte refusee
4000 0000 0000 0002

# Carte 3D Secure
4000 0000 0000 3220

# Fonds insuffisants
4000 0000 0000 9995
```

## 6. Contraintes Temporelles

### 6.1 Plages Horaires Autorisees

| Jour | Horaires | Tests Intensifs |
|------|----------|-----------------|
| Lundi - Vendredi | 09:00 - 18:00 CET | Oui |
| Lundi - Vendredi | 18:00 - 22:00 CET | Leger uniquement |
| Week-end | Non autorise | Non |

### 6.2 Periodes d'Exclusion

- Pendant les deploiements planifies
- Pendant les periodes de maintenance
- Pendant les evenements majeurs de test utilisateur

## 7. Criteres de Succes

### 7.1 Couverture Minimale

- [ ] 100% des endpoints API testes
- [ ] 100% des fonctionnalites critiques testees
- [ ] Tests d'authentification sur toutes les applications
- [ ] Tests d'autorisation pour tous les roles
- [ ] Validation de la conformite OWASP Top 10

### 7.2 Documentation

- [ ] Chaque vulnerabilite documentee avec PoC
- [ ] Captures d'ecran/videos pour les vulnerabilites critiques
- [ ] Recommandations de remediation fournies
- [ ] Scoring CVSS pour chaque vulnerabilite

## 8. Points de Contact Techniques

| Domaine | Contact | Disponibilite |
|---------|---------|---------------|
| API Backend | [Dev Lead Backend] | 09:00 - 18:00 |
| Frontend Web | [Dev Lead Frontend] | 09:00 - 18:00 |
| Mobile | [Dev Lead Mobile] | 09:00 - 18:00 |
| Infrastructure | [DevOps Lead] | 09:00 - 22:00 |
| Securite | [RSSI] | 24/7 (urgences) |

## 9. Procedure d'Escalade

```
Vulnerabilite Detectee
        |
        v
    Critique/Haute?
    /           \
  OUI           NON
   |             |
   v             v
Contact RSSI   Documenter
immediat       dans rapport
   |             |
   v             v
Evaluation     Continuer
conjointe      les tests
   |
   v
Decision:
- Arreter les tests?
- Correction immediate?
- Continuer avec precaution?
```

## 10. Validation du Perimetre

| Partie | Validation | Date | Signature |
|--------|------------|------|-----------|
| Equipe Pentest | | | |
| RSSI | | | |
| CTO | | | |
| Chef de Projet | | | |
