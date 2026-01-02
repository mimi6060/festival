# Bases Legales par Traitement

**Festival Management Platform**

**Date:** 2026-01-02
**Version:** 1.0
**Reference RGPD:** Article 6 - Liceite du traitement

---

## 1. Introduction

Ce document detaille les bases legales utilisees pour chaque traitement de donnees personnelles effectue par la plateforme Festival Management Platform, conformement a l'Article 6 du RGPD.

---

## 2. Bases legales disponibles (Article 6.1)

| Code | Base legale | Article | Description |
|------|-------------|---------|-------------|
| **a** | Consentement | 6.1.a | La personne a consenti au traitement |
| **b** | Contrat | 6.1.b | Necessaire a l'execution d'un contrat |
| **c** | Obligation legale | 6.1.c | Necessaire au respect d'une obligation legale |
| **d** | Interets vitaux | 6.1.d | Protection des interets vitaux |
| **e** | Mission publique | 6.1.e | Execution d'une mission d'interet public |
| **f** | Interet legitime | 6.1.f | Interets legitimes du responsable |

---

## 3. Traitements et bases legales

### 3.1 Gestion des comptes utilisateurs

**Code traitement:** T01

| Sous-traitement | Base | Justification |
|-----------------|------|---------------|
| Creation compte | Contrat (b) | Necessaire pour fournir le service |
| Verification email | Contrat (b) | Securite du compte |
| Stockage mot de passe | Contrat (b) | Authentification |
| Mise a jour profil | Contrat (b) | Gestion du compte |
| Suppression compte | Contrat (b) + Obligation (c) | Droit a l'effacement |

**Donnees traitees:** Email, nom, prenom, telephone, mot de passe (hashe)

**Duree de conservation:** Duree du compte + 3 ans

---

### 3.2 Vente et gestion des billets

**Code traitement:** T02

| Sous-traitement | Base | Justification |
|-----------------|------|---------------|
| Achat billet | Contrat (b) | Execution vente |
| Generation QR code | Contrat (b) | Acces au festival |
| Envoi confirmation | Contrat (b) | Information client |
| Historique achats | Obligation (c) | Obligations comptables (10 ans) |
| Annulation/Remboursement | Contrat (b) | Gestion commande |

**Donnees traitees:** Identite, coordonnees, details achat, QR code

**Duree de conservation:** 10 ans (obligation fiscale)

**Reference legale:** Article L.123-22 Code de commerce

---

### 3.3 Traitement des paiements

**Code traitement:** T03

| Sous-traitement | Base | Justification |
|-----------------|------|---------------|
| Paiement par carte | Contrat (b) | Transaction |
| Tokenisation Stripe | Contrat (b) | Securite PCI-DSS |
| Historique transactions | Obligation (c) | Comptabilite |
| Remboursements | Contrat (b) | Gestion litiges |
| Detection fraude | Interet legitime (f) | Prevention fraude |

**Donnees traitees:** Montant, devise, reference transaction, timestamp

**Note:** Aucune donnee de carte bancaire stockee - tokenisation Stripe

**Duree de conservation:** 10 ans

---

### 3.4 Systeme Cashless

**Code traitement:** T04

| Sous-traitement | Base | Justification |
|-----------------|------|---------------|
| Creation compte cashless | Contrat (b) | Service optionnel demande |
| Rechargement | Contrat (b) | Alimentation compte |
| Paiement cashless | Contrat (b) | Utilisation service |
| Association NFC | Contrat (b) | Facilite d'usage |
| Historique transactions | Obligation (c) | Tracabilite financiere |
| Remboursement solde | Obligation (c) | Obligation legale |

**Donnees traitees:** Solde, transactions, identifiant NFC

**Duree de conservation:** 10 ans

---

### 3.5 Controle d'acces aux zones

**Code traitement:** T05

| Sous-traitement | Base | Justification |
|-----------------|------|---------------|
| Scan QR entree | Interet legitime (f) | Securite, capacite |
| Log entree/sortie | Interet legitime (f) | Gestion flux |
| Comptage temps reel | Interet legitime (f) | Securite incendie |
| Verification acces VIP | Contrat (b) | Service achete |

**Balance des interets (Article 6.1.f):**
- Interet du responsable: Securite des participants, gestion des flux
- Attente raisonnable: Les festivaliers s'attendent a des controles
- Impact sur la personne: Minimal, pas de surveillance continue
- Garanties: Anonymisation apres 1 an, pas de profiling

**Donnees traitees:** ID billet, zone, horodatage

**Duree de conservation:** 1 an

---

### 3.6 Gestion du personnel/staff

**Code traitement:** T06

| Sous-traitement | Base | Justification |
|-----------------|------|---------------|
| Creation profil staff | Contrat (b) | Contrat de travail/benevole |
| Planning shifts | Contrat (b) | Organisation travail |
| Pointage | Contrat (b) | Gestion temps de travail |
| Contact urgence | Interet legitime (f) | Securite personnel |
| Badge acces | Contrat (b) | Acces zones de travail |

**Donnees traitees:** Identite, contact, planning, pointages, badge

**Duree de conservation:** Duree mission + 5 ans (obligations sociales)

**Reference legale:** Code du travail

---

### 3.7 Support client

**Code traitement:** T07

| Sous-traitement | Base | Justification |
|-----------------|------|---------------|
| Creation ticket | Contrat (b) | Service apres-vente |
| Historique echanges | Contrat (b) | Suivi demande |
| Chat temps reel | Contrat (b) | Assistance |
| Stockage pieces jointes | Contrat (b) | Resolution probleme |

**Donnees traitees:** Identite, contenu echanges, pieces jointes

**Duree de conservation:** 3 ans

---

### 3.8 Hebergement/Camping

**Code traitement:** T08

| Sous-traitement | Base | Justification |
|-----------------|------|---------------|
| Reservation emplacement | Contrat (b) | Service reserve |
| Enregistrement vehicule | Contrat (b) | Acces camping |
| Check-in/Check-out | Contrat (b) | Gestion sejour |
| QR acces camping | Contrat (b) | Controle acces |

**Donnees traitees:** Identite, dates sejour, plaque vehicule

**Duree de conservation:** Festival + 1 an

---

### 3.9 Notifications et communications

**Code traitement:** T09

| Sous-traitement | Base | Justification |
|-----------------|------|---------------|
| Notifications service | Contrat (b) | Information essentielle |
| Rappel horaire artiste | Contrat (b) | Service programme |
| Alertes securite | Interet legitime (f) | Protection personnes |
| Newsletter marketing | Consentement (a) | Prospection commerciale |
| Offres partenaires | Consentement (a) | Marketing tiers |

**Gestion du consentement:**
- Consentement explicite requis pour marketing
- Opt-in separe pour chaque type de communication
- Retrait facile via preferences ou lien desinscription

**Donnees traitees:** Email, preferences, tokens push

---

### 3.10 Analytics et statistiques

**Code traitement:** T10

| Sous-traitement | Base | Justification |
|-----------------|------|---------------|
| Statistiques agregees | Interet legitime (f) | Amelioration service |
| Analyse affluence | Interet legitime (f) | Planification |
| Reporting ventes | Obligation (c) | Comptabilite |

**Balance des interets:**
- Les statistiques sont anonymisees ou agregees
- Pas de profiling individuel
- Benefice: amelioration de l'experience

**Donnees traitees:** Donnees anonymisees/agregees

**Duree de conservation:** 2 ans

---

### 3.11 Securite et audit

**Code traitement:** T11

| Sous-traitement | Base | Justification |
|-----------------|------|---------------|
| Logs de connexion | Interet legitime (f) | Securite |
| Logs d'audit actions | Interet legitime (f) | Tracabilite |
| Detection anomalies | Interet legitime (f) | Prevention fraude |
| Conservation preuves | Obligation (c) | Obligations legales |

**Balance des interets:**
- Securite des utilisateurs et du systeme
- Logs minimaux necessaires
- Acces restreint aux logs

**Donnees traitees:** Actions, timestamps, IP, user-agent

**Duree de conservation:** 2 ans

---

### 3.12 Objets perdus/trouves

**Code traitement:** T12

| Sous-traitement | Base | Justification |
|-----------------|------|---------------|
| Declaration perte | Interet legitime (f) | Service festivaliers |
| Enregistrement objet trouve | Interet legitime (f) | Restitution |
| Mise en relation | Interet legitime (f) | Restitution |

**Donnees traitees:** Description, contact, photos

**Duree de conservation:** Festival + 1 an

---

## 4. Tableau recapitulatif

| ID | Traitement | Base principale | Bases secondaires |
|----|------------|-----------------|-------------------|
| T01 | Comptes utilisateurs | Contrat (b) | Obligation (c) |
| T02 | Billetterie | Contrat (b) | Obligation (c) |
| T03 | Paiements | Contrat (b) | Obligation (c), Interet (f) |
| T04 | Cashless | Contrat (b) | Obligation (c) |
| T05 | Controle acces | Interet legitime (f) | Contrat (b) |
| T06 | Staff | Contrat (b) | Interet (f) |
| T07 | Support | Contrat (b) | - |
| T08 | Camping | Contrat (b) | - |
| T09 | Notifications | Contrat (b) | Consentement (a), Interet (f) |
| T10 | Analytics | Interet legitime (f) | Obligation (c) |
| T11 | Securite | Interet legitime (f) | Obligation (c) |
| T12 | Objets perdus | Interet legitime (f) | - |

---

## 5. Gestion du consentement

### 5.1 Traitements necessitant un consentement

| Traitement | Type consentement | Retrait |
|------------|-------------------|---------|
| Newsletter | Opt-in explicite | Email + preferences |
| Marketing partenaires | Opt-in explicite | Email + preferences |
| Notifications push | Permission OS + opt-in | Preferences |
| Cookies analytics | Bandeau cookie | Preferences cookie |
| Cookies marketing | Bandeau cookie | Preferences cookie |

### 5.2 Caracteristiques du consentement valide

- **Libre:** Pas de prejudice en cas de refus
- **Specifique:** Un consentement par finalite
- **Eclaire:** Information claire prealable
- **Univoque:** Action positive (case non pre-cochee)
- **Retirable:** Aussi simple que de le donner

### 5.3 Preuve du consentement

Stockage dans la table `NotificationPreference` et logs d'audit:
- Date/heure du consentement
- Version des CGU/politique acceptees
- Moyen d'obtention (web, mobile)
- Historique des modifications

---

## 6. Interets legitimes - Analyses detaillees

### 6.1 Test de mise en balance

Pour chaque traitement base sur l'interet legitime:

#### Securite et controle d'acces (T05, T11)

**1. Interet poursuivi:**
- Securite des personnes presentes au festival
- Prevention des intrusions et fraudes
- Gestion des capacites (securite incendie)

**2. Necessite:**
- Pas d'alternative moins intrusive pour assurer la securite
- Controles visuels insuffisants pour 500,000 personnes

**3. Balance:**
- Impact limite sur les personnes (scans ponctuels)
- Attente raisonnable de controle dans un evenement
- Benefice collectif important

**4. Garanties:**
- Retention limitee (1 an)
- Pas de surveillance continue
- Anonymisation des donnees anciennes

#### Analytics et amelioration (T10)

**1. Interet poursuivi:**
- Amelioration de l'experience utilisateur
- Optimisation des services
- Planification future

**2. Necessite:**
- Analytics essentiels pour comprendre l'usage
- Permet d'ameliorer le service

**3. Balance:**
- Donnees agregees/anonymisees
- Pas d'impact sur les individus
- Benefice pour tous les utilisateurs

**4. Garanties:**
- Anonymisation systematique
- Pas de decisions automatisees
- Retention limitee

---

## 7. Changement de base legale

### 7.1 Principe

Un changement de base legale pour un traitement existant est possible mais doit etre:
- Documente avec justification
- Communique aux personnes concernees
- Conforme aux attentes initiales

### 7.2 Procedure

1. Analyse de la nouvelle base legale
2. Verification de la compatibilite avec la finalite
3. Mise a jour de la documentation
4. Information des personnes (si necessaire)
5. Mise a jour du registre des traitements

---

## 8. References juridiques

- Reglement (UE) 2016/679 - RGPD
- Loi n°78-17 du 6 janvier 1978 modifiee (Informatique et Libertes)
- Guidelines EDPB sur les bases legales
- Deliberations CNIL

---

*Document mis a jour le 2026-01-02 - Version 1.0*
