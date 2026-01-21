# Tâches En Cours & À Faire

_Dernière mise à jour: 2026-01-21_

---

## État Actuel du Projet

### Coverage Tests

| Metric     | Coverage   | Target | Status      |
| ---------- | ---------- | ------ | ----------- |
| Statements | **86.18%** | 80%    | ✅ Exceeded |
| Branches   | **73.17%** | 70%    | ✅ Exceeded |
| Functions  | **84.22%** | 80%    | ✅ Exceeded |
| Lines      | **86.06%** | 80%    | ✅ Exceeded |

**Total Tests: 5,300+** | **Test Suites: 96+**

---

## Tâches En Attente

### Moyenne Priorité

- [x] ~~**Mobile Offline/NFC Code Cleanup** (59 erreurs ESLint)~~ - **COMPLÉTÉ 2026-01-21**
  - Corrigé 175 warnings ESLint dans l'app mobile
  - console.log remplacés par console.info/warn/error/debug
  - any types ajoutés avec eslint-disable appropriés pour WatermelonDB
  - 0 erreurs, 0 warnings

- [ ] **ESLint Configuration Improvements**
  - Mettre à jour les règles ESLint
  - Corriger les nouveaux warnings
  - Assurer un style cohérent sur toutes les apps

### À Vérifier

- [ ] Mobile `/program` page - vérifier affichage des concerts
- [ ] Admin `/payments` page - tester fonctionnalité complète

---

## Fonctionnalités Récemment Complétées (2026-01-21)

### API Backend

- ✅ Program API - correction erreur 500 (dates cachées)
- ✅ Festival publication endpoints avec validation
- ✅ Zone save avec validation nom unique
- ✅ Staff save avec validation email/phone
- ✅ User save avec contrôle des rôles (admin only)
- ✅ Password change avec validation et invalidation tokens
- ✅ Stripe Connect integration
- ✅ Bulk delete implementation
- ✅ Export file download implementation
- ✅ Currency configuration dynamique

### Admin Dashboard

- ✅ Stripe Refund - RefundModal et MassRefundModal
- ✅ Export CSV/Excel - 6 pages (festivals, staff, users, payments, cashless, festival detail)
- ✅ Settings/Security - 2FA, sessions, API keys, webhooks
- ✅ Festival creation API connection
- ✅ Profile update API connection
- ✅ Zone delete functionality
- ✅ Promo codes pagination

### Web App

- ✅ Festival Program interactif (filtres jour/genre/scène)
- ✅ Contact form API avec email notifications
- ✅ Newsletter subscription avec welcome email
- ✅ Beta signup avec notifications équipe (Slack/Discord/Email)
- ✅ Festival data migration vers base de données
- ✅ Featured festivals endpoint

### Mobile App

- ✅ Theme selection (light/dark/system)
- ✅ Language selection (6 langues)
- ✅ Photo/Avatar change (expo-image-picker - camera & galerie)
- ✅ Ticket ownership validation (sécurité IDOR)
- ✅ **MOB-01 Performance Audit** - App bien optimisée, EventItem/HomeEventCard extraits
- ✅ Event reminders selection (5, 10, 15, 30, 60 min)
- ✅ Announcements toggle (push notifications séparées)
- ✅ GDPR data export request
- ✅ Live chat placeholder (WebSocket coming soon)
- ✅ **ESLint Mobile Cleanup** - 175 warnings corrigés, 0 erreurs

### Infrastructure

- ✅ Kubernetes production manifests
- ✅ Monitoring Prometheus/Grafana dashboards
- ✅ Currency module avec taux de change live

### UI Library (libs/ui)

- ✅ **Card Component** - Extracted to libs/ui with compound component pattern
  - Card, Card.Header, Card.Body, Card.Footer, Card.Image, Card.Title, Card.Description
  - Variants: default, elevated, outlined
  - Padding: none, sm, md, lg
  - Interactive mode with keyboard navigation (Enter/Space)
  - Image aspect ratios: auto, square, video, wide, portrait
  - Dark mode support
  - forwardRef for all components

---

## Notes Techniques

### Ports de Développement

- API: `http://localhost:3333` (Swagger: `/api/docs`)
- Web: `http://localhost:3000`
- Admin: `http://localhost:4201`
- MailDev: `http://localhost:1080`

### Commandes Utiles

```bash
# Démarrer les services
docker-compose up -d
npx nx serve api
npx nx serve web
npx nx serve admin

# Vérification
npm run lint:all
npm run verify-ci
npx nx build api --skip-nx-cache
```

---

## Historique des Sessions

Voir `.claude/DONE.md` pour l'historique complet des tâches terminées.
