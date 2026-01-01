# Tâches En Cours & À Faire

## En Cours 🔄

### Backend NestJS - Architecture modulaire
- [ ] Structure modulaire NestJS (modules, controllers, services)
- [ ] Module de configuration global
- [ ] Intercepteurs, guards, pipes globaux
- [ ] Gestion des erreurs centralisée

---

## À Faire - Phase 1: MVP Core 📋

### Module Auth
- [ ] Register avec validation email
- [ ] Login avec JWT + Refresh Token
- [ ] Logout avec invalidation token
- [ ] Reset password par email
- [ ] Guards RBAC (roles et permissions)
- [ ] Rate limiting sur auth endpoints

### Module Festival
- [ ] CRUD complet festivals
- [ ] Gestion des statuts (draft, published, ongoing, etc.)
- [ ] Upload images (logo, banner)
- [ ] Configuration par festival (timezone, currency)
- [ ] Slug unique pour URLs publiques

### Module Billetterie
- [ ] CRUD catégories de billets
- [ ] Achat de billets avec gestion des quotas
- [ ] Génération QR codes uniques
- [ ] Validation QR codes à l'entrée
- [ ] Historique des entrées/sorties
- [ ] Billets multi-jours

### Module Paiement
- [ ] Intégration Stripe (checkout, webhooks)
- [ ] Gestion des remboursements
- [ ] Factures PDF automatiques
- [ ] Historique des transactions
- [ ] Support multi-devises

---

## À Faire - Phase 2: Cashless & Mobile 📋

### Module Cashless
- [ ] Création compte cashless
- [ ] Recharge (topup) via paiement
- [ ] Paiement cashless (consommations)
- [ ] Transfert entre comptes
- [ ] Association NFC tag
- [ ] Remboursement solde fin festival
- [ ] Mode offline avec sync

### Application Mobile (React Native)
- [ ] Setup projet React Native
- [ ] Écran onboarding
- [ ] Authentification (login/register)
- [ ] Dashboard accueil
- [ ] Affichage billet QR
- [ ] Wallet cashless avec solde
- [ ] Historique transactions
- [ ] Push notifications
- [ ] Mode offline

---

## À Faire - Phase 3: Site Vitrine & Vente 📋

### Frontend Web (Next.js)
- [ ] Landing page festival
- [ ] Page programme/lineup
- [ ] Page infos pratiques
- [ ] Tunnel d'achat billets
- [ ] Compte utilisateur
- [ ] Historique commandes
- [ ] SEO optimisé
- [ ] i18n (FR/EN minimum)

---

## À Faire - Phase 4: Back-office Admin 📋

### Admin Dashboard
- [ ] Dashboard KPIs (ventes, affluence, CA)
- [ ] Gestion festivals (CRUD)
- [ ] Gestion billets et catégories
- [ ] Gestion utilisateurs
- [ ] Gestion staff et affectations
- [ ] Gestion zones et accès
- [ ] Exports comptables (CSV, Excel)
- [ ] Rapports de vente
- [ ] Logs d'audit

---

## À Faire - Phase 5: Fonctionnalités Avancées 📋

### Module Hébergement/Camping
- [ ] Gestion emplacements camping
- [ ] Réservation emplacements
- [ ] Types d'hébergement (tente, caravane, etc.)
- [ ] Check-in/check-out camping

### Module Programme/Artistes
- [ ] Gestion artistes
- [ ] Planning par scène
- [ ] Notifications artistes favoris
- [ ] Intégration Spotify/Deezer

### Module Food & Boissons
- [ ] Gestion stands/vendors
- [ ] Menu par stand
- [ ] Commande depuis app mobile
- [ ] File d'attente virtuelle

### Module Carte Interactive
- [ ] Carte du festival
- [ ] Points d'intérêt (scènes, toilettes, bars, etc.)
- [ ] Navigation GPS
- [ ] Localisation temps réel (opt-in)

### Module Support
- [ ] FAQ dynamique
- [ ] Chat support in-app
- [ ] Signalement problèmes
- [ ] Objets perdus/trouvés

### Module Analytics & IA
- [ ] Dashboard analytics temps réel
- [ ] Prévision affluence par zone
- [ ] Détection fraude paiements
- [ ] Recommandations personnalisées
- [ ] Chatbot NLP

### Sécurité & Conformité
- [ ] Audit sécurité complet
- [ ] Conformité RGPD
- [ ] Conformité PCI-DSS
- [ ] Tests de charge
- [ ] Plan de disaster recovery

---

## Priorité Actuelle
**Backend NestJS - Architecture modulaire**

---
Dernière mise à jour: 2026-01-02
