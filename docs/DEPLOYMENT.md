# Guide de Deploiement - Festival Management Platform

Ce guide detaille les procedures de deploiement de la plateforme Festival sur differents environnements.

## Table des Matieres

1. [Prerequisites](#prerequisites)
2. [Variables d'Environnement](#variables-denvironnement)
3. [Deploiement Local (Docker Compose)](#deploiement-local-docker-compose)
4. [Deploiement Kubernetes](#deploiement-kubernetes)
5. [Deploiement Cloud](#deploiement-cloud)
6. [CI/CD avec GitHub Actions](#cicd-avec-github-actions)
7. [Migrations de Base de Donnees](#migrations-de-base-de-donnees)
8. [SSL/TLS et Certificats](#ssltls-et-certificats)
9. [Monitoring et Logs](#monitoring-et-logs)
10. [Rollback et Recovery](#rollback-et-recovery)

---

## Prerequisites

### Outils Requis

| Outil          | Version Minimum | Description             |
| -------------- | --------------- | ----------------------- |
| Node.js        | 20 LTS          | Runtime JavaScript      |
| pnpm           | 8.x             | Gestionnaire de paquets |
| Docker         | 24.x            | Containerisation        |
| Docker Compose | 2.20+           | Orchestration locale    |
| kubectl        | 1.28+           | CLI Kubernetes          |
| Helm           | 3.12+           | Package manager K8s     |

### Services Externes

- **Stripe** - Compte test et production
- **Firebase** - Pour les notifications push
- **Sentry** - Pour le suivi des erreurs
- **AWS/GCP** - Compte cloud (optionnel)

---

## Variables d'Environnement

### Configuration Obligatoire

```bash
# Application
NODE_ENV=production
APP_URL=https://festival.example.com
API_URL=https://api.festival.example.com

# Base de donnees
DATABASE_URL=postgresql://user:password@host:5432/festival_db

# Redis
REDIS_URL=redis://host:6379

# JWT (Generer avec: openssl rand -base64 64)
JWT_SECRET=<votre_secret_jwt_64_caracteres_minimum>
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
SMTP_HOST=smtp.provider.com
SMTP_PORT=587
SMTP_USER=your_user
SMTP_PASSWORD=your_password
SMTP_FROM_EMAIL=noreply@festival.example.com
```

### Configuration par Environnement

| Variable            | Development | Staging | Production |
| ------------------- | ----------- | ------- | ---------- |
| `NODE_ENV`          | development | staging | production |
| `LOG_LEVEL`         | debug       | info    | warn       |
| `RATE_LIMIT_MAX`    | 1000        | 200     | 100        |
| `JWT_ACCESS_EXPIRY` | 1h          | 30m     | 15m        |

### Generation des Secrets

```bash
# JWT Secret (64 caracteres minimum)
openssl rand -base64 64

# QR Code Secret
openssl rand -hex 32

# Stripe Webhook Secret
# Obtenu via: stripe listen --forward-to localhost:3333/api/webhooks/stripe
```

---

## Deploiement Local (Docker Compose)

### Demarrage Rapide

```bash
# 1. Cloner le repository
git clone https://github.com/your-org/festival-platform.git
cd festival-platform/festival

# 2. Copier la configuration
cp .env.example .env.development

# 3. Demarrer les services d'infrastructure
docker-compose up -d postgres redis minio

# 4. Attendre que les services soient prets
docker-compose ps

# 5. Executer les migrations
npx prisma migrate deploy

# 6. Seed la base de donnees (optionnel)
npx prisma db seed

# 7. Demarrer l'API en mode dev
npx nx serve api
```

### Demarrage Complet (Production-like)

```bash
# Demarrer tous les services
docker-compose up -d

# Verifier les logs
docker-compose logs -f api

# Acceder aux services
# API: http://localhost:3000
# Web: http://localhost:4201
# Admin: http://localhost:4300
# MinIO Console: http://localhost:9001
# MailHog: http://localhost:8025
```

### Services Docker Compose

| Service      | Port      | Description       |
| ------------ | --------- | ----------------- |
| `api`        | 3000      | Backend NestJS    |
| `web`        | 4201      | Frontend public   |
| `admin`      | 4300      | Dashboard admin   |
| `postgres`   | 5432      | Base de donnees   |
| `redis`      | 6379      | Cache et sessions |
| `minio`      | 9000/9001 | Object storage    |
| `mailhog`    | 1025/8025 | Email testing     |
| `prometheus` | 9090      | Metriques         |
| `grafana`    | 3001      | Dashboards        |

### Profils Docker Compose

```bash
# Mode developpement (inclut MailHog)
docker-compose --profile dev up -d

# Mode monitoring (inclut Prometheus + Grafana)
docker-compose --profile monitoring up -d

# Tous les profils
docker-compose --profile dev --profile monitoring up -d
```

---

## Deploiement Kubernetes

### Structure des Manifests

```
k8s/
├── base/
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secrets.yaml
│   ├── api/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── hpa.yaml
│   ├── web/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── admin/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   └── ingress.yaml
└── overlays/
    ├── development/
    │   └── kustomization.yaml
    ├── staging/
    │   └── kustomization.yaml
    └── production/
        └── kustomization.yaml
```

### Deploiement avec Kustomize

```bash
# Development
kubectl apply -k k8s/overlays/development

# Staging
kubectl apply -k k8s/overlays/staging

# Production
kubectl apply -k k8s/overlays/production
```

### Configuration du Namespace

```yaml
# k8s/base/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: festival
  labels:
    app: festival
    environment: production
```

### Deployment API

```yaml
# k8s/base/api/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: festival-api
  namespace: festival
spec:
  replicas: 3
  selector:
    matchLabels:
      app: festival-api
  template:
    metadata:
      labels:
        app: festival-api
    spec:
      containers:
        - name: api
          image: festival/api:latest
          ports:
            - containerPort: 3000
          envFrom:
            - configMapRef:
                name: festival-config
            - secretRef:
                name: festival-secrets
          resources:
            requests:
              memory: '512Mi'
              cpu: '250m'
            limits:
              memory: '1Gi'
              cpu: '1000m'
          livenessProbe:
            httpGet:
              path: /api/health/live
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/health/ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
```

### Horizontal Pod Autoscaler

```yaml
# k8s/base/api/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: festival-api-hpa
  namespace: festival
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: festival-api
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### Ingress avec TLS

```yaml
# k8s/base/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: festival-ingress
  namespace: festival
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: '100'
    nginx.ingress.kubernetes.io/rate-limit-window: '1m'
spec:
  tls:
    - hosts:
        - api.festival.example.com
        - festival.example.com
        - admin.festival.example.com
      secretName: festival-tls
  rules:
    - host: api.festival.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: festival-api
                port:
                  number: 3000
    - host: festival.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: festival-web
                port:
                  number: 3000
    - host: admin.festival.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: festival-admin
                port:
                  number: 3000
```

### Secrets Kubernetes

```bash
# Creer les secrets
kubectl create secret generic festival-secrets \
  --from-literal=DATABASE_URL='postgresql://...' \
  --from-literal=JWT_SECRET='...' \
  --from-literal=STRIPE_SECRET_KEY='sk_live_...' \
  --namespace festival
```

---

## Deploiement Cloud

### AWS (EKS + RDS + ElastiCache)

```bash
# 1. Creer le cluster EKS
eksctl create cluster \
  --name festival-cluster \
  --region eu-west-3 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 10

# 2. Configurer kubectl
aws eks update-kubeconfig --name festival-cluster --region eu-west-3

# 3. Installer l'ingress controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/aws/deploy.yaml

# 4. Installer cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# 5. Deployer l'application
kubectl apply -k k8s/overlays/production
```

### GCP (GKE + Cloud SQL + Memorystore)

```bash
# 1. Creer le cluster GKE
gcloud container clusters create festival-cluster \
  --zone europe-west1-b \
  --num-nodes 3 \
  --machine-type e2-standard-4 \
  --enable-autoscaling \
  --min-nodes 2 \
  --max-nodes 10

# 2. Configurer kubectl
gcloud container clusters get-credentials festival-cluster --zone europe-west1-b

# 3. Deployer l'application
kubectl apply -k k8s/overlays/production
```

### Vercel (Frontend)

```bash
# Installation Vercel CLI
npm i -g vercel

# Deploiement Web
cd apps/web
vercel --prod

# Deploiement Admin
cd apps/admin
vercel --prod
```

Configuration `vercel.json`:

```json
{
  "buildCommand": "npx nx build web --prod",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_API_URL": "@api_url",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY": "@stripe_pk"
  }
}
```

### Railway (API)

```bash
# Installation Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploiement
railway up
```

Configuration `railway.toml`:

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "apps/api/Dockerfile"

[deploy]
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

---

## CI/CD avec GitHub Actions

### Workflow CI

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm nx lint --all

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
        ports:
          - 5432:5432
      redis:
        image: redis:7
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: npx prisma generate
      - run: pnpm nx test api --coverage
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: NODE_ENV=production pnpm nx build api
      - run: NODE_ENV=production pnpm nx build web
      - run: NODE_ENV=production pnpm nx build admin
```

### Workflow Deploy

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push API
        uses: docker/build-push-action@v5
        with:
          context: .
          file: apps/api/Dockerfile
          push: true
          tags: ghcr.io/${{ github.repository }}/api:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    runs-on: ubuntu-latest
    needs: build-and-push
    steps:
      - uses: actions/checkout@v4

      - name: Configure kubectl
        uses: azure/k8s-set-context@v3
        with:
          kubeconfig: ${{ secrets.KUBECONFIG }}

      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/festival-api \
            api=ghcr.io/${{ github.repository }}/api:${{ github.sha }} \
            -n festival
          kubectl rollout status deployment/festival-api -n festival
```

---

## Migrations de Base de Donnees

### Execution des Migrations

```bash
# Developement - Creer et appliquer les migrations
npx prisma migrate dev --name add_new_feature

# Production - Appliquer les migrations existantes
npx prisma migrate deploy

# Reset complet (ATTENTION: perte de donnees)
npx prisma migrate reset
```

### Migration en Production

```bash
# 1. Backup de la base de donnees
pg_dump -h host -U user -d festival_db > backup_$(date +%Y%m%d).sql

# 2. Appliquer les migrations
npx prisma migrate deploy

# 3. Verifier le status
npx prisma migrate status
```

### Rollback d'une Migration

```bash
# 1. Identifier la migration a rollback
npx prisma migrate status

# 2. Creer une migration inverse manuellement
# Editer le fichier SQL dans prisma/migrations/

# 3. Appliquer
npx prisma migrate deploy
```

---

## SSL/TLS et Certificats

### Let's Encrypt avec Cert-Manager

```yaml
# cluster-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@festival.example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

### Configuration NGINX pour HTTPS

```nginx
server {
    listen 443 ssl http2;
    server_name api.festival.example.com;

    ssl_certificate /etc/letsencrypt/live/festival.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/festival.example.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    add_header Strict-Transport-Security "max-age=63072000" always;

    location / {
        proxy_pass http://festival-api:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Monitoring et Logs

### Configuration Prometheus

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'festival-api'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        regex: festival-api
        action: keep
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        regex: 'true'
        action: keep
```

### Dashboards Grafana

1. **API Performance**
   - Request rate
   - Latency percentiles (p50, p95, p99)
   - Error rate
   - Active connections

2. **Business Metrics**
   - Tickets vendus par heure
   - Transactions cashless
   - Utilisateurs actifs
   - Revenue temps reel

3. **Infrastructure**
   - CPU/Memory usage
   - Database connections
   - Redis memory
   - Disk I/O

### Logging avec Winston

```typescript
// Configuration Winston
{
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp(),
    json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' })
  ]
}
```

### Integration Sentry

```typescript
// main.ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Prisma({ client: prisma }),
  ],
  tracesSampleRate: 0.1,
});
```

---

## Rollback et Recovery

### Rollback Kubernetes

```bash
# Voir l'historique des deployments
kubectl rollout history deployment/festival-api -n festival

# Rollback a la version precedente
kubectl rollout undo deployment/festival-api -n festival

# Rollback a une version specifique
kubectl rollout undo deployment/festival-api -n festival --to-revision=3

# Verifier le status
kubectl rollout status deployment/festival-api -n festival
```

### Backup et Restore PostgreSQL

```bash
# Backup
pg_dump -h host -U user -d festival_db -F c -f backup.dump

# Restore
pg_restore -h host -U user -d festival_db -c backup.dump

# Backup automatise avec CronJob K8s
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
spec:
  schedule: "0 2 * * *"  # 2h du matin tous les jours
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: postgres:16
              command:
                - /bin/sh
                - -c
                - pg_dump -h $DB_HOST -U $DB_USER $DB_NAME > /backup/$(date +%Y%m%d).sql
```

### Recovery Procedure

1. **Detection de l'incident**
   - Alertes Prometheus/Grafana
   - Notifications Sentry
   - Monitoring externe

2. **Evaluation de l'impact**
   - Services affectes
   - Nombre d'utilisateurs impactes
   - Perte de donnees potentielle

3. **Actions de remediation**
   - Rollback du deploiement si necessaire
   - Restauration de la base de donnees
   - Verification des services externes

4. **Post-mortem**
   - Documentation de l'incident
   - Analyse des causes
   - Actions preventives

---

## Checklist de Deploiement

### Pre-Deploiement

- [ ] Tests CI passes
- [ ] Review de code approuvee
- [ ] Variables d'environnement configurees
- [ ] Secrets crees dans le cluster
- [ ] Migrations testees en staging
- [ ] Backup de la base de donnees

### Deploiement

- [ ] Deploiement en staging
- [ ] Tests de smoke
- [ ] Deploiement en production
- [ ] Verification des health checks
- [ ] Monitoring actif

### Post-Deploiement

- [ ] Verification des metriques
- [ ] Verification des logs
- [ ] Tests fonctionnels
- [ ] Communication aux stakeholders

---

## Support

- **Documentation**: [docs/](../docs/)
- **Issues**: GitHub Issues
- **Urgences**: Contacter l'equipe DevOps

---

_Document mis a jour: Janvier 2026_
