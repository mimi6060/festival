# BUSINESS PLAN - Festival Platform SaaS B2B

**Date:** 3 Janvier 2026
**Version:** 1.0
**Statut:** Ready for Review

---

## EXECUTIVE SUMMARY

### Vision

Devenir **LA plateforme de référence** pour la gestion des festivals en Europe, couvrant l'intégralité du cycle de vie : billetterie, paiements cashless, hébergement, restauration, staff et analytics temps réel.

### Proposition de Valeur Unique

> "La seule plateforme tout-en-un qui unifie billetterie, cashless, hébergement et analytics en temps réel pour les festivals de 10K à 500K participants."

### Chiffres Clés

| Métrique    | Année 1 | Année 2 | Année 3 |
| ----------- | ------- | ------- | ------- |
| Clients     | 64      | 164     | 325     |
| Revenu      | 555K€   | 1.6M€   | 3.8M€   |
| Marge Brute | 56%     | 58%     | 56%     |
| Break-even  | Mois 18 | -       | -       |

### Investissement Requis

- **Phase 1 (features critiques):** 75K€
- **Marketing Y1:** 203K€
- **Total financement:** ~800K€

---

## 1. ÉTAT ACTUEL DU PRODUIT

### Score Production-Readiness: 72/100

| Catégorie     | Score  | État        |
| ------------- | ------ | ----------- |
| Sécurité      | 78/100 | Bon         |
| Performance   | 70/100 | Correct     |
| Scalabilité   | 75/100 | Bon         |
| Monitoring    | 65/100 | À améliorer |
| Tests         | 68/100 | À améliorer |
| Documentation | 80/100 | Excellent   |
| CI/CD         | 75/100 | Bon         |

### Points Forts Techniques

- Architecture multi-tenant production-ready
- Sécurité robuste (JWT, RBAC, rate limiting)
- Mobile offline-first
- WebSocket temps réel
- Stripe Connect intégré

### Blockers Critiques (à corriger avant lancement)

1. Email verification non implémentée
2. Password reset email manquant
3. Health checks Redis/Stripe TODO
4. Pagination queries absente
5. Database SSL non forcé en production

**Effort estimation:** 3-5 jours pour les blockers critiques

---

## 2. FEATURES MANQUANTES POUR COMMERCIALISATION

### Priorité MUST HAVE (Semaines 1-2)

| Feature               | Impact Business     | Effort |
| --------------------- | ------------------- | ------ |
| **Codes Promo**       | +15-20% conversions | 40h    |
| **CRM Base**          | Rétention +30%      | 120h   |
| **Guest Checkout**    | +25% conversion     | 15h    |
| **Email Marketing**   | Engagement +25%     | 90h    |
| **Transfert Billets** | Satisfaction +30%   | 50h    |

### Priorité SHOULD HAVE (Semaines 3-4)

| Feature          | Impact                 | Effort |
| ---------------- | ---------------------- | ------ |
| PayPal           | +10-15% CA             | 35h    |
| Apple/Google Pay | +25% conversion mobile | 60h    |
| Social Login     | -40% friction          | 45h    |
| Rapports Vendors | Rétention vendors +40% | 60h    |
| White-label      | Premium pricing        | 70h    |

### Budget Total Features: ~75K€

- Engineering: 50 jours x 800€ = 40K€
- QA: 10 jours x 600€ = 6K€
- PM: 30 jours x 700€ = 21K€
- Infra + APIs: 8K€

---

## 3. BUSINESS MODEL

### Structure de Revenus: Modèle Hybride

```
ABONNEMENT (récurrent) + COMMISSION (transactionnel) + MODULES (upsell)
```

### Grille Tarifaire

| Plan           | Participants | Abo/an    | Commission Billet | Commission Cashless |
| -------------- | ------------ | --------- | ----------------- | ------------------- |
| **Starter**    | < 1,000      | Gratuit   | 4.0% + 0.50€      | 2.5%                |
| **Pro**        | 1K - 10K     | 1,990€    | 2.5% + 0.30€      | 1.5%                |
| **Business**   | 10K - 50K    | 4,990€    | 1.8% + 0.20€      | 1.0%                |
| **Enterprise** | > 50K        | Sur devis | 1.2% + 0.15€      | 0.7%                |

### Modules Additionnels

| Module              | Prix/an |
| ------------------- | ------- |
| Cashless avancé     | 990€    |
| Camping/Hébergement | 490€    |
| Gestion Vendors     | 790€    |
| Analytics Premium   | 290€    |
| API White-label     | 1,990€  |
| Support 24/7        | 1,490€  |

### Revenus par Client Type

**Client Pro (5,000 participants):**

- Abonnement: 1,990€
- Commission billetterie: 6,500€
- Commission cashless: 3,413€
- **Total: 11,903€/an**

**Client Business (25,000 participants):**

- Abonnement: 4,990€
- Commission billetterie: 36,500€
- Commission cashless: 12,188€
- **Total: 53,678€/an**

### Métriques SaaS

| Métrique       | Valeur | Benchmark  |
| -------------- | ------ | ---------- |
| LTV/CAC (Pro)  | 25x    | >3x = sain |
| Churn annuel   | 15%    | <20%       |
| Gross Margin   | 56%    | >50%       |
| Payback Period | 6 mois | <12 mois   |

---

## 4. PROJECTIONS FINANCIÈRES

### Croissance Portefeuille Client

| Année | Starter | Pro | Business | Enterprise | Total |
| ----- | ------- | --- | -------- | ---------- | ----- |
| Y1    | 30      | 25  | 8        | 1          | 64    |
| Y2    | 80      | 60  | 20       | 4          | 164   |
| Y3    | 150     | 120 | 45       | 10         | 325   |

### Projection Revenus

| Année | Abonnements | Commissions | Modules | **Total**   |
| ----- | ----------- | ----------- | ------- | ----------- |
| Y1    | 98K€        | 412K€       | 45K€    | **555K€**   |
| Y2    | 268K€       | 1,180K€     | 156K€   | **1,604K€** |
| Y3    | 562K€       | 2,850K€     | 380K€   | **3,792K€** |

### Structure de Coûts (Y3)

| Poste                 | Montant     | % CA    |
| --------------------- | ----------- | ------- |
| Infrastructure        | 285K€       | 7.5%    |
| Équipe Tech (8 pers.) | 640K€       | 17%     |
| Sales & Marketing     | 450K€       | 12%     |
| Support Client        | 180K€       | 5%      |
| Admin & Juridique     | 120K€       | 3%      |
| **Total Coûts**       | **1,675K€** | **44%** |
| **Marge Brute**       | **2,117K€** | **56%** |

### Point de Rentabilité

- **Mois 18** avec ~90 clients actifs
- Investissement initial requis: ~800K€

---

## 5. ANALYSE CONCURRENTIELLE

### Positionnement

| Critère              | Notre Plateforme | Eventbrite | Weezevent | Festicket |
| -------------------- | ---------------- | ---------- | --------- | --------- |
| Billetterie          | ✅               | ✅         | ✅        | ✅        |
| Cashless intégré     | ✅               | ❌         | ✅        | ❌        |
| Hébergement          | ✅               | ❌         | ❌        | ✅        |
| Mode offline         | ✅               | ❌         | ❌        | ❌        |
| Analytics temps réel | ✅               | Basique    | Basique   | ❌        |
| Multi-festival       | ✅               | ✅         | ✅        | ❌        |
| **Prix**             | Compétitif       | €€€        | €€        | €€€       |

### Avantages Compétitifs

1. **Tout-en-un:** Seule solution intégrant billetterie + cashless + hébergement + F&B
2. **Offline-first:** Fonctionne sans réseau (crucial pour festivals)
3. **Scalabilité native:** 10K à 500K sans migration
4. **Multi-tenant:** Plusieurs festivals simultanés

---

## 6. STRATÉGIE MARKETING

### Budget Marketing Y1: 203K€

| Canal        | Budget | %   | Leads Cibles | CPL  |
| ------------ | ------ | --- | ------------ | ---- |
| SEO/Content  | 45K€   | 22% | 300          | 150€ |
| LinkedIn Ads | 60K€   | 30% | 200          | 300€ |
| Salons       | 51K€   | 25% | 180          | 283€ |
| Partenariats | 20K€   | 10% | 100          | 200€ |
| PR           | 15K€   | 7%  | 50           | 300€ |
| Outils       | 12K€   | 6%  | -            | -    |

### ROI Marketing Attendu

| Canal     | Leads   | Conv.     | Clients | Revenu Y1 | ROI      |
| --------- | ------- | --------- | ------- | --------- | -------- |
| SEO       | 300     | 8%        | 24      | 360K€     | 700%     |
| LinkedIn  | 200     | 10%       | 20      | 360K€     | 500%     |
| Salons    | 180     | 15%       | 27      | 540K€     | 959%     |
| **TOTAL** | **830** | **10.4%** | **86**  | **1.5M€** | **628%** |

### Partenariats Stratégiques

| Partenaire       | Type                    | Valeur                   |
| ---------------- | ----------------------- | ------------------------ |
| PRODISS          | Syndicat producteurs    | 350 adhérents            |
| CNM              | Centre National Musique | Légitimité + subventions |
| France Festivals | Fédération              | 100+ festivals           |
| SACEM            | Droits d'auteur         | Intégration déclarations |

### Salons Prioritaires

| Salon         | Date     | Budget | Leads |
| ------------- | -------- | ------ | ----- |
| MaMA Festival | Oct 2026 | 8K€    | 50    |
| WOMEX         | Oct 2026 | 15K€   | 40    |
| BIS de Nantes | Jan 2027 | 6K€    | 35    |

---

## 7. PLAN DE LANCEMENT

### Timeline 2026

```
JANVIER-FÉVRIER        MARS-AVRIL           MAI-JUIN
┌──────────────┐      ┌──────────────┐     ┌──────────────┐
│ BETA PRIVÉE  │      │EARLY ADOPTERS│     │  LANCEMENT   │
│ 5-10 festivals│      │ 20-30 clients│     │   PUBLIC     │
│ Tests terrain │      │ Prix -40%    │     │ PR campaign  │
│ Bug fixes     │      │ Case studies │     │ Salons été   │
└──────────────┘      └──────────────┘     └──────────────┘

JUILLET-SEPTEMBRE      OCTOBRE-DÉCEMBRE
┌──────────────┐      ┌──────────────┐
│SAISON HAUTE  │      │CONSOLIDATION │
│ Support live │      │ Bilan saison │
│ Success stories│     │ Renouvel.    │
│ Itérations   │      │ MaMA/WOMEX   │
└──────────────┘      └──────────────┘
```

### Phase 1: Beta Privée (Jan-Fév)

- 5-10 festivals sélectionnés
- Gratuité totale saison 2026
- Feedback hebdomadaire
- Bug fixes prioritaires

### Phase 2: Early Adopters (Mars-Avril)

- 50 premiers clients: -40% à vie
- Onboarding personnalisé (10h)
- Support prioritaire 24/7
- Engagement: témoignage + case study

### Phase 3: Lancement Public (Mai)

- Communiqué de presse
- Campagne LinkedIn Ads
- Webinaire démo public
- Contenu SEO massif

---

## 8. ÉQUIPE CIBLE

### Phase 1 (Y1)

| Rôle               | Coût/an   | Timing |
| ------------------ | --------- | ------ |
| CTO/Tech Lead      | 80K€      | M1     |
| Backend Dev Senior | 65K€      | M1     |
| Frontend Dev       | 55K€      | M2     |
| CMO/Head Marketing | 75K€      | M1     |
| Content Manager    | 45K€      | M3     |
| Sales (x2)         | 100K€     | M4     |
| Support            | 40K€      | M5     |
| **Total**          | **460K€** |        |

### Phase 2 (Y2)

- +3 développeurs
- +1 DevOps
- +2 Sales
- +1 Customer Success
- **Total équipe: 15 personnes**

---

## 9. RISQUES ET MITIGATIONS

| Risque                  | Probabilité | Impact   | Mitigation                         |
| ----------------------- | ----------- | -------- | ---------------------------------- |
| Saisonnalité forte      | Haute       | Moyen    | Diversifier vers salles de concert |
| Concurrence prix        | Haute       | Moyen    | Différencier par service           |
| Dépendance gros clients | Moyenne     | Haut     | Mix 70% PME / 30% Enterprise       |
| Scalabilité technique   | Faible      | Critique | Tests charge, monitoring           |
| RGPD/Compliance         | Faible      | Haut     | Audit régulier, DPO                |

---

## 10. PROCHAINES ÉTAPES IMMÉDIATES

### Semaine 1-2: Technique

- [ ] Corriger les 5 blockers critiques
- [ ] Implémenter codes promo
- [ ] Guest checkout
- [ ] Tests de charge

### Semaine 3-4: Features

- [ ] CRM base
- [ ] Email marketing
- [ ] Transfert billets
- [ ] PayPal

### Semaine 1: Marketing

- [ ] Landing page beta
- [ ] Configurer HubSpot
- [ ] Identifier 20 festivals beta
- [ ] Premier article blog

### Mois 1: Business

- [ ] Finaliser pricing
- [ ] Contrats type
- [ ] CGV/CGU
- [ ] RGPD compliance check

---

## CONCLUSION

La plateforme Festival dispose d'une **excellente base technique** (72/100 production-ready) et d'un **potentiel commercial significatif** avec un marché adressable de plusieurs milliers de festivals en Europe.

### Investissement Demandé: 800K€

**Utilisation:**

- 35% Développement produit (features + stabilisation)
- 25% Marketing & Sales
- 25% Équipe (salaires 12 mois)
- 15% Infrastructure + légal

### Retour Attendu

- Break-even: Mois 18
- ARR Y3: 3.8M€
- Marge brute: 56%
- LTV/CAC: 25x

### Go/No-Go Decision

✅ **GO** - Les fondations sont solides, le marché est mature, et les features manquantes sont identifiées et chiffrées. Avec 8 semaines de développement et un budget marketing de 200K€ Y1, la plateforme peut atteindre 86 clients et 1.5M€ de revenus.

---

_Rapport généré le 3 janvier 2026_
_Prochaine révision: Février 2026 (post-beta)_
