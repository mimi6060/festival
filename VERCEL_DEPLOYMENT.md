# Deploiement Vercel - Monorepo Nx Festival

Ce guide explique comment deployer le monorepo Nx sur Vercel.

## Prerequisites

- Compte Vercel (https://vercel.com)
- Vercel CLI installe: `npm i -g vercel`
- Acces au repository Git

## Structure du Monorepo

```
festival/
├── api/                    # Backend NestJS
├── apps/
│   └── web/               # Frontend Next.js
├── libs/
│   └── shared/            # Bibliotheques partagees
├── vercel.json            # Config Vercel racine
└── package.json
```

## Configuration Initiale

### 1. Connexion a Vercel

```bash
vercel login
```

### 2. Lier le projet

```bash
vercel link
```

### 3. Variables d'environnement

Configurez les variables suivantes dans le dashboard Vercel:

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DATABASE_URL` | URL de connexion PostgreSQL | `postgresql://...` |
| `JWT_SECRET` | Cle secrete pour JWT | `votre-cle-secrete` |
| `JWT_EXPIRES_IN` | Duree de validite JWT | `7d` |
| `STRIPE_SECRET_KEY` | Cle secrete Stripe | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Secret webhook Stripe | `whsec_...` |
| `NEXT_PUBLIC_API_URL` | URL de l'API | `https://api.festival.com` |
| `NX_CLOUD_ACCESS_TOKEN` | Token Nx Cloud (optionnel) | `...` |

```bash
# Via CLI
vercel env add DATABASE_URL production
vercel env add JWT_SECRET production
```

## Deploiement

### Deploiement automatique (recommande)

Le deploiement automatique se declenche a chaque push sur la branche principale.

### Deploiement manuel

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

### Deploiement via npm scripts

```bash
# Build local pour test
npm run vercel:build

# Developpement local
npm run vercel:dev
```

## Configuration Multi-Apps

Pour deployer separement le frontend et le backend:

### Frontend (apps/web)

1. Creer un nouveau projet Vercel
2. Pointer vers le dossier `apps/web`
3. Utiliser la configuration `apps/web/vercel.json`

```bash
cd apps/web
vercel --prod
```

### Backend (api)

Pour le backend NestJS, il est recommande d'utiliser:
- Vercel Functions (serverless)
- Ou un service separe (Railway, Render, Fly.io)

## Optimisations Nx pour Vercel

### Cache Nx Cloud

Activez Nx Cloud pour accelerer les builds:

```bash
npx nx connect
```

### Build incremental

Nx ne rebuild que les projets modifies:

```bash
npx nx affected:build --prod
```

## Commandes Utiles

```bash
# Verifier le build localement
npm run vercel:build

# Voir les logs de deploiement
vercel logs

# Lister les deploiements
vercel ls

# Rollback
vercel rollback

# Supprimer un deploiement
vercel remove [deployment-url]
```

## Troubleshooting

### Erreur de build Nx

```bash
# Nettoyer le cache
npx nx reset

# Rebuild complet
npx nx build web --prod --skip-nx-cache
```

### Problemes de dependances

```bash
# Reinstaller les dependances
rm -rf node_modules
npm ci
```

### Variables d'environnement manquantes

```bash
# Verifier les variables
vercel env ls

# Telecharger les variables localement
vercel env pull .env.local
```

## CI/CD avec GitHub Actions

Exemple de workflow `.github/workflows/vercel.yml`:

```yaml
name: Vercel Deployment

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npx nx build web --prod
        env:
          NX_CLOUD_ACCESS_TOKEN: ${{ secrets.NX_CLOUD_ACCESS_TOKEN }}

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## Ressources

- [Documentation Vercel](https://vercel.com/docs)
- [Documentation Nx](https://nx.dev)
- [Nx + Vercel Integration](https://nx.dev/recipes/vercel)
