# Proposition d'Evolution - Equipe de 10 Developpeurs

**Document**: Scaling Team Proposal
**Date**: Janvier 2026
**Pour**: CTO
**De**: Engineering Team

---

## Executive Summary

La plateforme Festival a atteint un niveau de maturité technique solide (86% coverage, 5,061 tests, architecture complète). Pour passer à l'échelle commerciale et accélérer le time-to-market des nouvelles fonctionnalités, nous proposons une équipe de **10 développeurs** structurée en squads autonomes.

---

## 1. Etat Actuel de la Plateforme

### Forces

| Aspect        | Status                                        |
| ------------- | --------------------------------------------- |
| Architecture  | Solide, multi-tenant, scalable                |
| Tests         | 86% coverage, 5,061+ tests                    |
| Documentation | Complète (API, sécurité, compliance)          |
| Stack         | Moderne (NestJS 11, Next.js 15, React Native) |
| Sécurité      | GDPR ready, PCI-DSS scope reduction           |

### Limitations avec l'équipe actuelle

| Contrainte            | Impact                        |
| --------------------- | ----------------------------- |
| Vélocité limitée      | 1-2 features majeures/mois    |
| Pas de spécialisation | Devs généralistes surchargés  |
| Support réactif       | Peu de temps pour le proactif |
| Dette technique       | S'accumule faute de temps     |

---

## 2. Structure d'Equipe Proposee (10 devs)

```
                        ┌─────────────────┐
                        │   Tech Lead     │
                        │   (1 senior)    │
                        └────────┬────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│  Squad Core   │      │ Squad Growth  │      │ Squad Mobile  │
│  (4 devs)     │      │ (3 devs)      │      │ (2 devs)      │
└───────────────┘      └───────────────┘      └───────────────┘
```

### Squad Core - Backend & Infrastructure (4 devs)

| Role             | Seniority  | Responsabilités                      |
| ---------------- | ---------- | ------------------------------------ |
| **Backend Lead** | Senior     | Architecture API, reviews, mentoring |
| **Backend Dev**  | Mid        | Modules métier, intégrations         |
| **Backend Dev**  | Mid        | Payments, cashless, sécurité         |
| **DevOps/SRE**   | Mid-Senior | CI/CD, K8s, monitoring, scaling      |

**Périmètre** :

- API NestJS (25 modules)
- Base de données PostgreSQL
- Infrastructure (Redis, K8s, monitoring)
- Intégrations tierces (Stripe, FCM)
- Performance et scalabilité

### Squad Growth - Frontend & Features (3 devs)

| Role              | Seniority | Responsabilités                   |
| ----------------- | --------- | --------------------------------- |
| **Frontend Lead** | Senior    | Architecture Next.js, UX, reviews |
| **Fullstack Dev** | Mid       | Features web, admin dashboard     |
| **Fullstack Dev** | Mid       | Features web, analytics UI        |

**Périmètre** :

- Application Web (Next.js)
- Dashboard Admin (Next.js)
- Nouvelles fonctionnalités business
- A/B testing, analytics

### Squad Mobile (2 devs)

| Role            | Seniority | Responsabilités                 |
| --------------- | --------- | ------------------------------- |
| **Mobile Lead** | Senior    | Architecture RN, native bridges |
| **Mobile Dev**  | Mid       | Features, offline, push         |

**Périmètre** :

- Application React Native
- Offline-first features
- Push notifications
- App Store / Play Store releases

### Tech Lead (1 dev)

| Responsabilités               |
| ----------------------------- |
| Vision technique globale      |
| Coordination inter-squads     |
| Code reviews critiques        |
| Relation avec CTO/Product     |
| Gestion de la dette technique |
| Recrutement technique         |

---

## 3. Repartition du Temps

### Par Squad

```
Squad Core (4 devs)
├── 60% Features & maintenance
├── 20% Performance & scaling
├── 10% Dette technique
└── 10% Support & incidents

Squad Growth (3 devs)
├── 70% Nouvelles features
├── 15% Améliorations UX
├── 10% Tests & qualité
└── 5% Support

Squad Mobile (2 devs)
├── 60% Features mobile
├── 20% Offline & sync
├── 10% Store releases
└── 10% Tests devices
```

### Tech Lead

```
Tech Lead (1 dev)
├── 30% Architecture & design
├── 25% Code reviews
├── 20% Coordination squads
├── 15% Mentoring
└── 10% Veille technologique
```

---

## 4. Roadmap avec 10 Devs

### Q1 2026 - Consolidation (Mois 1-3)

| Objectif                | Squad  | Livrable               |
| ----------------------- | ------ | ---------------------- |
| Onboarding équipe       | All    | 10 devs opérationnels  |
| Mobile App v1.0         | Mobile | App Store + Play Store |
| Dashboard Analytics v2  | Growth | Real-time dashboards   |
| Auto-scaling production | Core   | K8s HPA configuré      |
| Monitoring complet      | Core   | APM + alerting         |

### Q2 2026 - Croissance (Mois 4-6)

| Objectif            | Squad  | Livrable              |
| ------------------- | ------ | --------------------- |
| Multi-festival      | Core   | 1 orga = N festivals  |
| Marketplace billets | Growth | Revente P2P           |
| Offline payments    | Mobile | Paiements sans réseau |
| API publique v1     | Core   | Partenaires externes  |
| Programme fidélité  | Growth | Points, rewards       |

### Q3 2026 - Scale (Mois 7-9)

| Objectif            | Squad  | Livrable             |
| ------------------- | ------ | -------------------- |
| White-label         | Core   | Plateforme brandable |
| Dynamic pricing     | Growth | Prix temps réel      |
| Wearables NFC       | Mobile | Bracelets connectés  |
| Intégration CRM     | Core   | Salesforce, HubSpot  |
| Analytics prédictif | Growth | ML attendance        |

### Q4 2026 - Enterprise (Mois 10-12)

| Objectif         | Squad  | Livrable              |
| ---------------- | ------ | --------------------- |
| Multi-région     | Core   | EU + US deployment    |
| SSO Enterprise   | Core   | SAML, OIDC            |
| App organizer    | Mobile | App dédiée staff      |
| Reporting avancé | Growth | BI export, dashboards |

---

## 5. Benefices Attendus

### Vélocité

| Métrique        | Actuel      | Avec 10 devs | Gain |
| --------------- | ----------- | ------------ | ---- |
| Features/mois   | 1-2         | 6-8          | x4   |
| Bug fix time    | 2-5 jours   | < 1 jour     | x5   |
| Time-to-market  | 3-4 mois    | 3-4 semaines | x4   |
| Releases mobile | 1/trimestre | 2/mois       | x6   |

### Qualité

| Métrique            | Actuel | Cible   |
| ------------------- | ------ | ------- |
| Test coverage       | 86%    | 90%+    |
| Incidents prod/mois | N/A    | < 2     |
| MTTR (recovery)     | N/A    | < 30min |
| Uptime SLA          | 99%    | 99.9%   |

### Business

| Impact              | Estimation                  |
| ------------------- | --------------------------- |
| Nouveaux clients/an | +200% capacité d'onboarding |
| Churn réduction     | -30% (features + support)   |
| Revenue features    | +3-5 modules monétisables   |
| Time-to-market      | Avantage concurrentiel      |

---

## 6. Budget Estimatif (Annuel)

### Salaires (France, brut annuel)

| Role               | Nombre | Salaire unitaire | Total    |
| ------------------ | ------ | ---------------- | -------- |
| Tech Lead          | 1      | 75-85k           | 80k      |
| Senior Dev         | 3      | 55-65k           | 180k     |
| Mid Dev            | 6      | 42-52k           | 282k     |
| **Total salaires** | **10** | -                | **542k** |

### Charges et overhead

| Poste                      | Estimation     |
| -------------------------- | -------------- |
| Charges patronales (~45%)  | 244k           |
| Équipement (Mac, écrans)   | 30k (one-time) |
| Licences & outils          | 15k/an         |
| Formation                  | 10k/an         |
| **Total année 1**          | **~841k**      |
| **Total années suivantes** | **~811k/an**   |

### Infrastructure additionnelle

| Poste                             | Estimation/an |
| --------------------------------- | ------------- |
| Cloud scaling (AWS/GCP)           | +20-40k       |
| Outils dev (GitHub, Sentry, etc.) | +5-10k        |
| Environnements de dev             | +10k          |

---

## 7. Plan de Recrutement

### Phase 1 - Fondations (Mois 1-2)

| Priorité | Role         | Justification        |
| -------- | ------------ | -------------------- |
| 1        | Tech Lead    | Leadership technique |
| 2        | Backend Lead | Stabilité API        |
| 3        | DevOps/SRE   | Infrastructure       |

### Phase 2 - Core Team (Mois 2-3)

| Priorité | Role          | Justification        |
| -------- | ------------- | -------------------- |
| 4        | Frontend Lead | Architecture web     |
| 5        | Mobile Lead   | Lancement app stores |
| 6        | Backend Dev   | Capacité API         |

### Phase 3 - Scale (Mois 3-4)

| Priorité | Role          | Justification     |
| -------- | ------------- | ----------------- |
| 7        | Backend Dev   | Features payments |
| 8        | Fullstack Dev | Dashboard admin   |
| 9        | Fullstack Dev | Features growth   |
| 10       | Mobile Dev    | Features mobile   |

### Canaux de recrutement

| Canal                 | Budget estimé    |
| --------------------- | ---------------- |
| LinkedIn Recruiter    | 8-10k/an         |
| Welcome to the Jungle | 3-5k/an          |
| Cooptation (prime)    | 2-4k/recrutement |
| Freelance transition  | Variable         |

---

## 8. Risques et Mitigation

| Risque                 | Probabilité | Impact | Mitigation                                |
| ---------------------- | ----------- | ------ | ----------------------------------------- |
| Recrutement difficile  | Haute       | Élevé  | Salaires compétitifs, remote-friendly     |
| Onboarding lent        | Moyenne     | Moyen  | Documentation existante, pair programming |
| Coordination complexe  | Moyenne     | Moyen  | Rituels agiles, Tech Lead dédié           |
| Dette technique accrue | Moyenne     | Moyen  | 10% temps dédié, code reviews             |
| Turnover               | Moyenne     | Élevé  | Culture tech, évolution carrière          |

---

## 9. Metriques de Succes

### KPIs Techniques (mesurés mensuellement)

| KPI                     | Cible M+3 | Cible M+6 | Cible M+12 |
| ----------------------- | --------- | --------- | ---------- |
| Vélocité (story points) | +50%      | +100%     | +150%      |
| Test coverage           | 88%       | 90%       | 92%        |
| Lead time (idea→prod)   | -30%      | -50%      | -60%       |
| Incidents P1/mois       | < 3       | < 2       | < 1        |
| MTTR                    | < 2h      | < 1h      | < 30min    |

### KPIs Business (impact équipe)

| KPI                        | Cible      |
| -------------------------- | ---------- |
| Features livrées/trimestre | 15-20      |
| Satisfaction client (NPS)  | +10 points |
| Clients onboardés/mois     | x2         |

---

## 10. Alternatives Considerees

### Option A : 5 devs (équipe réduite)

| Avantage            | Inconvénient          |
| ------------------- | --------------------- |
| Coût -50%           | Vélocité limitée      |
| Coordination simple | Pas de spécialisation |
|                     | Mobile retardé        |

**Verdict** : Insuffisant pour les ambitions de croissance

### Option B : 15 devs (équipe large)

| Avantage               | Inconvénient          |
| ---------------------- | --------------------- |
| Vélocité maximale      | Coût +50%             |
| Spécialisation poussée | Coordination complexe |
|                        | Overhead management   |

**Verdict** : Prématuré, envisageable à M+12

### Option C : Externalisation partielle

| Avantage           | Inconvénient          |
| ------------------ | --------------------- |
| Flexibilité        | Perte de contrôle     |
| Pas de recrutement | Qualité variable      |
|                    | Coût long-terme élevé |

**Verdict** : Acceptable pour pics ponctuels, pas pour le core

---

## Conclusion

L'investissement dans une équipe de 10 développeurs représente un coût annuel d'environ **850k** mais permet :

- **x4** sur la vélocité de développement
- **Lancement mobile** sur les stores
- **Capacité enterprise** (white-label, multi-région)
- **Réduction du risque** (bus factor, incidents)

Le ROI est estimé positif dès la 2ème année avec l'acquisition de **5-10 clients enterprise** supplémentaires que la vélocité accrue permet de servir.

---

## Prochaines Etapes

1. **Validation budget** par direction
2. **Définition des fiches de poste** détaillées
3. **Lancement recrutement** Tech Lead + Leads
4. **Setup environnements** de dev supplémentaires
5. **Onboarding plan** avec documentation

---

**Document préparé pour discussion CTO**
_Janvier 2026_
