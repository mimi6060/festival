# Cartographie des Donnees Personnelles

**Festival Management Platform**

**Date:** 2026-01-02
**Version:** 1.0

---

## 1. Vue d'ensemble

Ce document presente la cartographie complete des donnees personnelles traitees par la plateforme Festival Management Platform, conformement aux exigences de l'Article 30 du RGPD.

---

## 2. Flux de donnees

### 2.1 Schema global

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SOURCES DE DONNEES                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │   Web    │  │  Mobile  │  │  Admin   │  │  Staff   │  │   API    │      │
│  │   App    │  │   App    │  │  Portal  │  │   App    │  │ Partners │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       │             │             │             │             │             │
│       └─────────────┴──────┬──────┴─────────────┴─────────────┘             │
│                            │                                                 │
│                            ▼                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                        API BACKEND (NestJS)                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │    Auth     │ │   Tickets   │ │  Cashless   │ │    GDPR     │           │
│  │   Module    │ │   Module    │ │   Module    │ │   Module    │           │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘           │
├─────────────────────────────────────────────────────────────────────────────┤
│                        STOCKAGE DES DONNEES                                  │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌───────────────────┐   │
│  │     PostgreSQL      │  │       Redis         │  │        S3         │   │
│  │  (Donnees metier)   │  │  (Cache/Sessions)   │  │  (Fichiers/Media) │   │
│  └─────────────────────┘  └─────────────────────┘  └───────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│                        SERVICES TIERS                                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  Stripe  │  │ Firebase │  │ SendGrid │  │  Sentry  │  │   AWS    │      │
│  │(Paiement)│  │  (Push)  │  │ (Emails) │  │ (Errors) │  │(Hosting) │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Cartographie par entite

### 3.1 Utilisateur (User)

| Champ | Type | Sensibilite | Obligatoire | Source | Retention |
|-------|------|-------------|-------------|--------|-----------|
| id | UUID | Faible | Oui | Systeme | Vie compte |
| email | String | Moyenne | Oui | Inscription | Vie compte + 3 ans |
| passwordHash | String | Haute | Oui | Inscription | Vie compte |
| firstName | String | Moyenne | Oui | Inscription | Vie compte + 3 ans |
| lastName | String | Moyenne | Oui | Inscription | Vie compte + 3 ans |
| phone | String | Moyenne | Non | Profil | Vie compte |
| role | Enum | Faible | Oui | Systeme | Vie compte |
| status | Enum | Faible | Oui | Systeme | Vie compte |
| emailVerified | Boolean | Faible | Oui | Systeme | Vie compte |
| refreshToken | String | Haute | Non | Auth | Session |
| lastLoginAt | DateTime | Faible | Non | Systeme | 1 an |
| createdAt | DateTime | Faible | Oui | Systeme | Vie compte + 3 ans |

**Base legale:** Execution du contrat (Article 6.1.b)

**Finalites:**
- Gestion du compte utilisateur
- Authentification et securite
- Communication service

### 3.2 Billet (Ticket)

| Champ | Type | Sensibilite | Obligatoire | Source | Retention |
|-------|------|-------------|-------------|--------|-----------|
| id | UUID | Faible | Oui | Systeme | 10 ans |
| userId | UUID | Faible | Oui | Achat | 10 ans |
| festivalId | UUID | Faible | Oui | Achat | 10 ans |
| qrCode | String | Moyenne | Oui | Systeme | 10 ans |
| qrCodeData | String | Moyenne | Oui | Systeme | 10 ans |
| status | Enum | Faible | Oui | Systeme | 10 ans |
| purchasePrice | Decimal | Faible | Oui | Achat | 10 ans |
| usedAt | DateTime | Faible | Non | Scan | 1 an |
| createdAt | DateTime | Faible | Oui | Systeme | 10 ans |

**Base legale:** Execution du contrat (Article 6.1.b), Obligation legale (Article 6.1.c)

**Finalites:**
- Acces au festival
- Comptabilite et fiscalite
- Controle anti-fraude

### 3.3 Paiement (Payment)

| Champ | Type | Sensibilite | Obligatoire | Source | Retention |
|-------|------|-------------|-------------|--------|-----------|
| id | UUID | Faible | Oui | Systeme | 10 ans |
| userId | UUID | Faible | Oui | Transaction | 10 ans |
| amount | Decimal | Faible | Oui | Transaction | 10 ans |
| currency | String | Faible | Oui | Transaction | 10 ans |
| status | Enum | Faible | Oui | Stripe | 10 ans |
| provider | Enum | Faible | Oui | Transaction | 10 ans |
| providerPaymentId | String | Faible | Non | Stripe | 10 ans |
| providerData | JSON | Moyenne | Non | Stripe | 10 ans |

**Base legale:** Execution du contrat (Article 6.1.b), Obligation legale (Article 6.1.c)

**Finalites:**
- Traitement des paiements
- Remboursements
- Obligations fiscales

### 3.4 Compte Cashless (CashlessAccount)

| Champ | Type | Sensibilite | Obligatoire | Source | Retention |
|-------|------|-------------|-------------|--------|-----------|
| id | UUID | Faible | Oui | Systeme | 10 ans |
| userId | UUID | Faible | Oui | Creation | 10 ans |
| balance | Decimal | Moyenne | Oui | Transactions | 10 ans |
| nfcTagId | String | Faible | Non | Association | Festival + 1 an |
| isActive | Boolean | Faible | Oui | Systeme | 10 ans |

**Base legale:** Execution du contrat (Article 6.1.b)

**Finalites:**
- Paiement sur site
- Gestion portefeuille prepaye

### 3.5 Transaction Cashless (CashlessTransaction)

| Champ | Type | Sensibilite | Obligatoire | Source | Retention |
|-------|------|-------------|-------------|--------|-----------|
| id | UUID | Faible | Oui | Systeme | 10 ans |
| accountId | UUID | Faible | Oui | Transaction | 10 ans |
| festivalId | UUID | Faible | Oui | Transaction | 10 ans |
| type | Enum | Faible | Oui | Transaction | 10 ans |
| amount | Decimal | Faible | Oui | Transaction | 10 ans |
| balanceBefore | Decimal | Faible | Oui | Systeme | 10 ans |
| balanceAfter | Decimal | Faible | Oui | Systeme | 10 ans |
| description | String | Faible | Non | Transaction | 10 ans |

**Base legale:** Execution du contrat (Article 6.1.b), Obligation legale (Article 6.1.c)

### 3.6 Zone Access Log

| Champ | Type | Sensibilite | Obligatoire | Source | Retention |
|-------|------|-------------|-------------|--------|-----------|
| id | UUID | Faible | Oui | Systeme | 1 an |
| zoneId | UUID | Faible | Oui | Scan | 1 an |
| ticketId | UUID | Faible | Oui | Scan | 1 an |
| action | Enum | Faible | Oui | Scan | 1 an |
| timestamp | DateTime | Faible | Oui | Systeme | 1 an |

**Base legale:** Interet legitime (Article 6.1.f) - Securite et gestion des flux

### 3.7 Notification

| Champ | Type | Sensibilite | Obligatoire | Source | Retention |
|-------|------|-------------|-------------|--------|-----------|
| id | UUID | Faible | Oui | Systeme | 1 an |
| userId | UUID | Faible | Oui | Systeme | 1 an |
| title | String | Faible | Oui | Systeme | 1 an |
| body | String | Faible | Oui | Systeme | 1 an |
| type | Enum | Faible | Oui | Systeme | 1 an |
| isRead | Boolean | Faible | Oui | User | 1 an |

**Base legale:** Consentement (Article 6.1.a) pour marketing, Contrat (Article 6.1.b) pour service

### 3.8 Push Token

| Champ | Type | Sensibilite | Obligatoire | Source | Retention |
|-------|------|-------------|-------------|--------|-----------|
| id | UUID | Faible | Oui | Systeme | Session |
| userId | UUID | Faible | Oui | Systeme | Session |
| token | String | Moyenne | Oui | Device | Session |
| platform | Enum | Faible | Oui | Device | Session |
| deviceName | String | Faible | Non | Device | Session |

**Base legale:** Consentement (Article 6.1.a)

### 3.9 Staff Member

| Champ | Type | Sensibilite | Obligatoire | Source | Retention |
|-------|------|-------------|-------------|--------|-----------|
| id | UUID | Faible | Oui | Systeme | Emploi + 5 ans |
| userId | UUID | Faible | Oui | Creation | Emploi + 5 ans |
| festivalId | UUID | Faible | Oui | Creation | Emploi + 5 ans |
| department | Enum | Faible | Oui | Affectation | Emploi + 5 ans |
| employeeCode | String | Faible | Non | Creation | Emploi + 5 ans |
| phone | String | Moyenne | Non | Creation | Emploi + 5 ans |
| emergencyContact | JSON | Haute | Non | Creation | Emploi + 5 ans |
| badgeNumber | String | Faible | Non | Badge | Emploi + 5 ans |

**Base legale:** Execution du contrat de travail (Article 6.1.b)

### 3.10 Camping Booking

| Champ | Type | Sensibilite | Obligatoire | Source | Retention |
|-------|------|-------------|-------------|--------|-----------|
| id | UUID | Faible | Oui | Systeme | 1 an |
| userId | UUID | Faible | Oui | Reservation | 1 an |
| bookingNumber | String | Faible | Oui | Systeme | 1 an |
| vehiclePlate | String | Moyenne | Non | User | Festival + 30 jours |
| vehicleType | String | Faible | Non | User | Festival + 30 jours |
| qrCode | String | Moyenne | Non | Systeme | 1 an |

**Base legale:** Execution du contrat (Article 6.1.b)

### 3.11 Support Ticket

| Champ | Type | Sensibilite | Obligatoire | Source | Retention |
|-------|------|-------------|-------------|--------|-----------|
| id | UUID | Faible | Oui | Systeme | 3 ans |
| userId | UUID | Faible | Oui | Creation | 3 ans |
| subject | String | Faible | Oui | User | 3 ans |
| description | String | Variable | Oui | User | 3 ans |
| status | Enum | Faible | Oui | Systeme | 3 ans |

**Base legale:** Execution du contrat (Article 6.1.b)

### 3.12 Audit Log

| Champ | Type | Sensibilite | Obligatoire | Source | Retention |
|-------|------|-------------|-------------|--------|-----------|
| id | UUID | Faible | Oui | Systeme | 2 ans |
| userId | UUID | Faible | Non | Systeme | 2 ans |
| action | String | Faible | Oui | Systeme | 2 ans |
| entityType | String | Faible | Oui | Systeme | 2 ans |
| entityId | UUID | Faible | Non | Systeme | 2 ans |
| oldValue | JSON | Variable | Non | Systeme | 2 ans |
| newValue | JSON | Variable | Non | Systeme | 2 ans |
| ipAddress | String | Moyenne | Non | Request | 2 ans |
| userAgent | String | Faible | Non | Request | 2 ans |

**Base legale:** Interet legitime (Article 6.1.f) - Securite et tracabilite

---

## 4. Donnees sensibles (Article 9)

### 4.1 Categories particulieres identifiees

La plateforme ne traite **aucune categorie particuliere** de donnees au sens de l'Article 9 RGPD:
- Pas de donnees de sante (sauf urgence medicale via support)
- Pas de donnees biometriques (NFC = identifiant, pas biometrie)
- Pas de donnees raciales/ethniques
- Pas de donnees politiques/syndicales
- Pas de donnees religieuses
- Pas de donnees sur la vie sexuelle

### 4.2 Donnees a risque particulier

| Categorie | Donnees | Mesures de protection |
|-----------|---------|----------------------|
| Financieres | Transactions | Tokenisation, pas de stockage CB |
| Authentification | Mots de passe | Hachage bcrypt, jamais en clair |
| Localisation | Logs zones | Anonymisation apres 1 an |

---

## 5. Transferts de donnees

### 5.1 Transferts intra-UE

| Destinataire | Pays | Donnees | Base |
|--------------|------|---------|------|
| AWS Ireland | Irlande | Toutes | Adequation UE |
| Stripe Europe | Irlande | Paiements | Adequation UE |

### 5.2 Transferts hors-UE

| Destinataire | Pays | Donnees | Garanties |
|--------------|------|---------|-----------|
| Firebase/Google | USA | Push tokens | SCC + DPF |
| SendGrid | USA | Emails | SCC |
| Stripe Inc. | USA | Paiements | BCR + SCC |
| Sentry | USA | Logs erreurs | SCC |

---

## 6. Cycle de vie des donnees

### 6.1 Collecte

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Inscription │ ──▶ │ Validation  │ ──▶ │  Stockage   │
│    Form     │     │   Schema    │     │   Prisma    │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Audit Log  │
                    └─────────────┘
```

### 6.2 Utilisation

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Requete    │ ──▶ │    RBAC     │ ──▶ │   Donnees   │
│    API      │     │   Check     │     │   Filtrees  │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 6.3 Suppression

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Demande    │ ──▶ │ Validation  │ ──▶ │  Execution  │
│   User/Job  │     │   Droits    │     │  Cascade    │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ Anonymisation│
                    │  (si requis) │
                    └─────────────┘
```

---

## 7. Points d'acces aux donnees

### 7.1 API Endpoints

| Endpoint | Methode | Donnees | Authentification |
|----------|---------|---------|------------------|
| /auth/me | GET | Profil complet | JWT |
| /users/:id | GET | Profil user | JWT + RBAC |
| /gdpr/export | GET | Export complet | JWT |
| /gdpr/consents | GET/PUT | Consentements | JWT |

### 7.2 Acces administratif

| Role | Acces | Justification |
|------|-------|---------------|
| ADMIN | Complet | Gestion plateforme |
| ORGANIZER | Festival | Multi-tenant |
| STAFF | Zone/Festival | Operations |
| USER | Self | Self-service |

---

## 8. Matrice des donnees par finalite

| Finalite | Identite | Contact | Paiement | Location | Technique |
|----------|----------|---------|----------|----------|-----------|
| Compte utilisateur | X | X | - | - | X |
| Billetterie | X | X | X | - | X |
| Cashless | X | - | X | - | X |
| Controle acces | X | - | - | X | X |
| Marketing | X | X | - | - | - |
| Support | X | X | - | - | X |
| Analytics | - | - | - | - | X |

---

## 9. Annexes

### Annexe A - Schema base de donnees

Voir `/prisma/schema.prisma` pour le schema complet.

### Annexe B - Dictionnaire des donnees

Disponible dans la documentation technique API.

---

*Document mis a jour le 2026-01-02 - Version 1.0*
