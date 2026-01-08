# Kubernetes Deployment Guide

This guide provides comprehensive instructions for deploying the Festival Platform to Kubernetes.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Secrets Setup](#2-secrets-setup)
3. [Database Setup](#3-database-setup)
4. [Deployment Steps](#4-deployment-steps)
5. [Scaling](#5-scaling)
6. [Monitoring](#6-monitoring)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Prerequisites

### Required Tools

Ensure the following tools are installed on your local machine:

```bash
# kubectl - Kubernetes CLI
# macOS
brew install kubectl

# Linux
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/

# Verify installation
kubectl version --client
```

```bash
# Helm - Kubernetes package manager
# macOS
brew install helm

# Linux
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Verify installation
helm version
```

```bash
# kustomize (optional, built into kubectl)
# macOS
brew install kustomize

# Linux
curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
sudo mv kustomize /usr/local/bin/

# Verify installation
kustomize version
```

### Kubernetes Cluster

You need access to a Kubernetes cluster. Choose one of the following options:

#### Option A: Amazon EKS

```bash
# Install eksctl
brew install eksctl

# Create EKS cluster
eksctl create cluster \
  --name festival-cluster \
  --region eu-west-1 \
  --version 1.28 \
  --nodegroup-name workers \
  --node-type t3.large \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 10 \
  --managed

# Configure kubectl
aws eks update-kubeconfig --name festival-cluster --region eu-west-1
```

#### Option B: Google GKE

```bash
# Install gcloud CLI
# https://cloud.google.com/sdk/docs/install

# Create GKE cluster
gcloud container clusters create festival-cluster \
  --zone europe-west1-b \
  --num-nodes 3 \
  --machine-type e2-standard-4 \
  --enable-autoscaling \
  --min-nodes 2 \
  --max-nodes 10

# Configure kubectl
gcloud container clusters get-credentials festival-cluster --zone europe-west1-b
```

#### Option C: Local Development (Minikube/Kind)

```bash
# Minikube
brew install minikube
minikube start --cpus 4 --memory 8192 --driver docker

# Or Kind (Kubernetes in Docker)
brew install kind
kind create cluster --name festival
```

### Docker Registry Access

Configure access to your Docker registry:

```bash
# Docker Hub
kubectl create secret docker-registry regcred \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=<your-username> \
  --docker-password=<your-password> \
  --docker-email=<your-email> \
  -n festival

# AWS ECR
aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.eu-west-1.amazonaws.com

# GCP Artifact Registry
gcloud auth configure-docker europe-west1-docker.pkg.dev
```

### Verify Cluster Access

```bash
# Check cluster connectivity
kubectl cluster-info

# Check nodes
kubectl get nodes

# Expected output:
# NAME                 STATUS   ROLES    AGE   VERSION
# node-1               Ready    <none>   1d    v1.28.0
# node-2               Ready    <none>   1d    v1.28.0
# node-3               Ready    <none>   1d    v1.28.0
```

---

## 2. Secrets Setup

### Overview of Required Secrets

The Festival Platform requires the following secrets:

| Secret Name          | Description             | Keys                                                         |
| -------------------- | ----------------------- | ------------------------------------------------------------ |
| `api-secrets`        | API application secrets | DATABASE_URL, REDIS_URL, JWT_SECRET, STRIPE_SECRET_KEY, etc. |
| `postgresql-secrets` | PostgreSQL credentials  | POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB                |
| `redis-secrets`      | Redis authentication    | REDIS_PASSWORD                                               |
| `tls-secrets`        | TLS certificates        | tls.crt, tls.key                                             |

### Method 1: kubectl Direct (Development Only)

> **Warning**: Do not use this method for production. Secrets will be stored in shell history.

```bash
# Create namespace first
kubectl apply -f k8s/base/namespace.yaml

# Create API secrets
kubectl create secret generic api-secrets \
  --namespace=festival \
  --from-literal=DATABASE_URL="postgresql://festival:secretpassword@postgresql:5432/festival?sslmode=require" \
  --from-literal=REDIS_URL="redis://:redispassword@redis:6379/0" \
  --from-literal=JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters-long" \
  --from-literal=JWT_REFRESH_SECRET="your-super-secret-refresh-key-minimum-32-chars" \
  --from-literal=ENCRYPTION_KEY="your-32-byte-aes-encryption-key!" \
  --from-literal=STRIPE_SECRET_KEY="sk_test_xxxxx" \
  --from-literal=STRIPE_WEBHOOK_SECRET="whsec_xxxxx" \
  --from-literal=SENDGRID_API_KEY="SG.xxxxx" \
  --from-literal=SENTRY_DSN="https://xxxxx@sentry.io/xxxxx"

# Create PostgreSQL secrets
kubectl create secret generic postgresql-secrets \
  --namespace=festival \
  --from-literal=POSTGRES_USER="festival" \
  --from-literal=POSTGRES_PASSWORD="your-secure-db-password" \
  --from-literal=POSTGRES_DB="festival"

# Create Redis secrets
kubectl create secret generic redis-secrets \
  --namespace=festival \
  --from-literal=REDIS_PASSWORD="your-secure-redis-password"
```

### Method 2: Sealed Secrets (Recommended for GitOps)

[Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets) allows you to encrypt secrets and store them safely in Git.

#### Install Sealed Secrets Controller

```bash
# Add Helm repo
helm repo add sealed-secrets https://bitnami-labs.github.io/sealed-secrets
helm repo update

# Install controller
helm install sealed-secrets sealed-secrets/sealed-secrets \
  --namespace kube-system \
  --set secretName=sealed-secrets-key

# Install kubeseal CLI
brew install kubeseal
```

#### Create Sealed Secrets

```bash
# Create a plain secret YAML (DO NOT commit this)
cat > /tmp/api-secrets-plain.yaml << EOF
apiVersion: v1
kind: Secret
metadata:
  name: api-secrets
  namespace: festival
type: Opaque
stringData:
  DATABASE_URL: "postgresql://festival:password@postgresql:5432/festival?sslmode=require"
  REDIS_URL: "redis://:password@redis:6379/0"
  JWT_SECRET: "your-super-secret-jwt-key-minimum-32-characters-long"
  JWT_REFRESH_SECRET: "your-super-secret-refresh-key-minimum-32-chars"
  ENCRYPTION_KEY: "your-32-byte-aes-encryption-key!"
  STRIPE_SECRET_KEY: "sk_live_xxxxx"
  STRIPE_WEBHOOK_SECRET: "whsec_xxxxx"
  SENDGRID_API_KEY: "SG.xxxxx"
  SENTRY_DSN: "https://xxxxx@sentry.io/xxxxx"
EOF

# Seal the secret
kubeseal --format yaml < /tmp/api-secrets-plain.yaml > k8s/secrets/api-secrets-sealed.yaml

# Clean up plain secret
rm /tmp/api-secrets-plain.yaml

# Apply sealed secret
kubectl apply -f k8s/secrets/api-secrets-sealed.yaml
```

### Method 3: External Secrets Operator (Production)

[External Secrets Operator](https://external-secrets.io/) syncs secrets from external providers like AWS Secrets Manager, HashiCorp Vault, or GCP Secret Manager.

#### Install External Secrets Operator

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace \
  --set installCRDs=true
```

#### Configure AWS Secrets Manager

```yaml
# external-secret-store.yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: aws-secrets-manager
spec:
  provider:
    aws:
      service: SecretsManager
      region: eu-west-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
            namespace: external-secrets
---
# external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: api-secrets
  namespace: festival
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: api-secrets
    creationPolicy: Owner
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: festival/production
        property: DATABASE_URL
    - secretKey: JWT_SECRET
      remoteRef:
        key: festival/production
        property: JWT_SECRET
    # ... other keys
```

```bash
kubectl apply -f external-secret-store.yaml
kubectl apply -f external-secret.yaml
```

#### Configure HashiCorp Vault

```yaml
# vault-secret-store.yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: vault-backend
spec:
  provider:
    vault:
      server: 'https://vault.example.com'
      path: 'secret'
      version: 'v2'
      auth:
        kubernetes:
          mountPath: 'kubernetes'
          role: 'external-secrets'
          serviceAccountRef:
            name: external-secrets-sa
            namespace: external-secrets
```

### Generate Strong Secrets

Use these commands to generate cryptographically secure secrets:

```bash
# Generate JWT Secret (64 bytes base64)
openssl rand -base64 64 | tr -d '\n'

# Generate Encryption Key (32 bytes for AES-256)
openssl rand -base64 32 | tr -d '\n'

# Generate Database Password
openssl rand -base64 24 | tr -d '\n'

# Generate Redis Password
openssl rand -base64 24 | tr -d '\n'
```

---

## 3. Database Setup

### Option A: Deploy PostgreSQL in Kubernetes

The project includes a production-ready PostgreSQL StatefulSet configuration.

```bash
# Apply PostgreSQL configuration
kubectl apply -f k8s/configmaps/postgresql-config.yaml
kubectl apply -f k8s/secrets/postgresql-secrets.yaml
kubectl apply -f k8s/postgresql/statefulset.yaml
kubectl apply -f k8s/postgresql/service.yaml
kubectl apply -f k8s/postgresql/pdb.yaml

# Wait for PostgreSQL to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=postgresql -n festival --timeout=300s

# Verify PostgreSQL is running
kubectl get pods -l app.kubernetes.io/name=postgresql -n festival
```

### Option B: Use Managed Database (Recommended for Production)

#### AWS RDS

```bash
# Create RDS instance via AWS CLI
aws rds create-db-instance \
  --db-instance-identifier festival-db \
  --db-instance-class db.r6g.large \
  --engine postgres \
  --engine-version 16 \
  --master-username festival \
  --master-user-password <secure-password> \
  --allocated-storage 100 \
  --storage-type gp3 \
  --vpc-security-group-ids sg-xxxxx \
  --db-subnet-group-name festival-subnet-group \
  --backup-retention-period 7 \
  --multi-az \
  --storage-encrypted \
  --kms-key-id alias/aws/rds
```

#### GCP Cloud SQL

```bash
gcloud sql instances create festival-db \
  --database-version=POSTGRES_16 \
  --tier=db-custom-4-16384 \
  --region=europe-west1 \
  --root-password=<secure-password> \
  --storage-size=100GB \
  --storage-type=SSD \
  --availability-type=REGIONAL \
  --backup-start-time=02:00 \
  --enable-bin-log
```

### Run Database Migrations

Create a Kubernetes Job to run Prisma migrations:

```yaml
# migration-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: prisma-migrate
  namespace: festival
spec:
  ttlSecondsAfterFinished: 300
  backoffLimit: 3
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: migrate
          image: festival/api:latest
          command: ['npx', 'prisma', 'migrate', 'deploy']
          envFrom:
            - secretRef:
                name: api-secrets
          resources:
            requests:
              cpu: '100m'
              memory: '256Mi'
            limits:
              cpu: '500m'
              memory: '512Mi'
```

```bash
# Apply migration job
kubectl apply -f migration-job.yaml

# Watch migration progress
kubectl logs -f job/prisma-migrate -n festival

# Verify migration completed
kubectl get jobs -n festival

# Clean up completed job
kubectl delete job prisma-migrate -n festival
```

### Seed Database (Optional)

```yaml
# seed-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: prisma-seed
  namespace: festival
spec:
  ttlSecondsAfterFinished: 300
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: seed
          image: festival/api:latest
          command: ['npx', 'prisma', 'db', 'seed']
          envFrom:
            - secretRef:
                name: api-secrets
```

---

## 4. Deployment Steps

### Quick Deploy (Using Kustomize)

```bash
# Deploy everything with kustomize
kubectl apply -k k8s/

# Or for specific environment
kubectl apply -k k8s/overlays/development/
kubectl apply -k k8s/overlays/staging/
kubectl apply -k k8s/overlays/production/
```

### Step-by-Step Deployment

#### Step 1: Apply Namespace and Resource Quotas

```bash
kubectl apply -f k8s/base/namespace.yaml

# Verify namespace
kubectl get namespace festival
kubectl describe resourcequota festival-quota -n festival
```

#### Step 2: Apply ConfigMaps

```bash
# Apply all ConfigMaps
kubectl apply -f k8s/configmaps/

# Verify ConfigMaps
kubectl get configmaps -n festival
```

ConfigMaps included:

- `api-config.yaml` - API application configuration
- `web-config.yaml` - Web frontend configuration
- `admin-config.yaml` - Admin dashboard configuration
- `postgresql-config.yaml` - PostgreSQL configuration
- `redis-config.yaml` - Redis configuration

#### Step 3: Apply Secrets

```bash
# Apply secrets (ensure they are sealed or use external secrets)
kubectl apply -f k8s/secrets/

# Verify secrets exist (values are hidden)
kubectl get secrets -n festival
```

#### Step 4: Deploy Redis

```bash
# Apply Redis configuration and deployment
kubectl apply -f k8s/configmaps/redis-config.yaml
kubectl apply -f k8s/secrets/redis-secrets.yaml
kubectl apply -f k8s/redis/statefulset.yaml
kubectl apply -f k8s/redis/service.yaml

# Wait for Redis to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=redis -n festival --timeout=180s

# Verify Redis is running
kubectl get pods -l app.kubernetes.io/name=redis -n festival
```

#### Step 5: Deploy PostgreSQL (if not using managed)

```bash
kubectl apply -f k8s/postgresql/

# Wait for PostgreSQL
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=postgresql -n festival --timeout=300s
```

#### Step 6: Deploy API

```bash
# Apply API deployment
kubectl apply -f k8s/api/deployment.yaml
kubectl apply -f k8s/api/service.yaml
kubectl apply -f k8s/api/hpa.yaml
kubectl apply -f k8s/api/pdb.yaml

# Wait for API pods
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=api -n festival --timeout=180s

# Check deployment status
kubectl get deployment api -n festival
kubectl get pods -l app.kubernetes.io/name=api -n festival
```

#### Step 7: Deploy Web Frontend

```bash
kubectl apply -f k8s/web/deployment.yaml
kubectl apply -f k8s/web/service.yaml
kubectl apply -f k8s/web/hpa.yaml

# Wait for Web pods
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=web -n festival --timeout=180s
```

#### Step 8: Deploy Admin Dashboard

```bash
kubectl apply -f k8s/admin/deployment.yaml
kubectl apply -f k8s/admin/service.yaml

# Wait for Admin pods
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=admin -n festival --timeout=180s
```

#### Step 9: Apply Network Policies

```bash
# Apply zero-trust network policies
kubectl apply -f k8s/network-policies/

# Verify network policies
kubectl get networkpolicies -n festival
```

Network policies enforce:

- Default deny all ingress traffic
- Allow DNS resolution
- API can receive traffic from ingress and web/admin
- Web/Admin can only communicate with API
- Database only accessible from API

#### Step 10: Deploy Ingress and TLS

```bash
# Install NGINX Ingress Controller (if not installed)
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace

# Install cert-manager for TLS (if not installed)
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true

# Apply cluster issuer and certificates
kubectl apply -f k8s/cert-manager/cluster-issuer.yaml
kubectl apply -f k8s/cert-manager/certificates.yaml

# Apply ingress
kubectl apply -f k8s/ingress/ingress.yaml
kubectl apply -f k8s/ingress/nginx-config.yaml

# Get ingress IP
kubectl get ingress -n festival
```

#### Step 11: Configure DNS

Point your domain to the ingress IP/hostname:

```
festival.example.com      -> Ingress IP
www.festival.example.com  -> Ingress IP
api.festival.example.com  -> Ingress IP
admin.festival.example.com -> Ingress IP
ws.festival.example.com   -> Ingress IP (WebSocket)
```

### Verify Deployment

```bash
# Check all resources
kubectl get all -n festival

# Check pods status
kubectl get pods -n festival -o wide

# Check services
kubectl get svc -n festival

# Check ingress
kubectl get ingress -n festival

# Test API health endpoint
kubectl port-forward svc/api 3000:3000 -n festival
curl http://localhost:3000/health
```

---

## 5. Scaling

### Horizontal Pod Autoscaler (HPA)

The project includes HPA configurations for automatic scaling based on CPU, memory, and custom metrics.

#### API HPA Configuration

```yaml
# k8s/api/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
  namespace: festival
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3
  maxReplicas: 50
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
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: '1000'
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
```

#### Check HPA Status

```bash
# View HPA status
kubectl get hpa -n festival

# Detailed HPA info
kubectl describe hpa api-hpa -n festival

# Watch HPA metrics
kubectl get hpa api-hpa -n festival --watch
```

### Manual Scaling

```bash
# Scale deployment manually
kubectl scale deployment api --replicas=10 -n festival

# Scale StatefulSet (database/cache)
kubectl scale statefulset postgresql --replicas=3 -n festival
```

### Resource Requests and Limits

Resource configuration in deployment manifests:

```yaml
resources:
  requests:
    cpu: '250m' # 0.25 CPU cores
    memory: '512Mi' # 512 MB RAM
  limits:
    cpu: '1000m' # 1 CPU core
    memory: '1Gi' # 1 GB RAM
```

#### Environment-Specific Resources

| Component  | Environment | CPU Request | CPU Limit | Memory Request | Memory Limit |
| ---------- | ----------- | ----------- | --------- | -------------- | ------------ |
| API        | Development | 100m        | 500m      | 256Mi          | 512Mi        |
| API        | Staging     | 250m        | 1000m     | 512Mi          | 1Gi          |
| API        | Production  | 500m        | 2000m     | 1Gi            | 2Gi          |
| Web        | Development | 100m        | 500m      | 256Mi          | 512Mi        |
| Web        | Production  | 250m        | 1000m     | 512Mi          | 1Gi          |
| PostgreSQL | Production  | 500m        | 2000m     | 1Gi            | 4Gi          |
| Redis      | Production  | 250m        | 1000m     | 512Mi          | 2Gi          |

### Vertical Pod Autoscaler (VPA)

Optional VPA configuration for automatic resource tuning:

```bash
# Install VPA
git clone https://github.com/kubernetes/autoscaler.git
cd autoscaler/vertical-pod-autoscaler
./hack/vpa-up.sh

# Apply VPA for API
kubectl apply -f k8s/api/hpa.yaml  # Contains VPA config
```

### Pod Disruption Budget (PDB)

Ensure high availability during updates:

```yaml
# k8s/api/pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-pdb
  namespace: festival
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: api
```

---

## 6. Monitoring

### Prometheus Metrics

The API exposes Prometheus metrics at `/metrics`:

```bash
# Port-forward to access metrics
kubectl port-forward svc/api 3000:3000 -n festival

# View metrics
curl http://localhost:3000/metrics
```

#### Key Metrics Exposed

| Metric                         | Type      | Description                  |
| ------------------------------ | --------- | ---------------------------- |
| `http_requests_total`          | Counter   | Total HTTP requests          |
| `http_request_duration_ms`     | Histogram | Request latency              |
| `http_errors_total`            | Counter   | Total HTTP errors            |
| `db_queries_total`             | Counter   | Database queries             |
| `db_query_duration_ms`         | Histogram | Query latency                |
| `cache_hits_total`             | Counter   | Cache hits                   |
| `cache_misses_total`           | Counter   | Cache misses                 |
| `websocket_connections_active` | Gauge     | Active WebSocket connections |
| `tickets_sold_total`           | Counter   | Tickets sold                 |
| `cashless_payments_total`      | Counter   | Cashless payments            |

### Deploy Prometheus Stack

```bash
# Add Prometheus community Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install kube-prometheus-stack
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false

# Create ServiceMonitor for Festival API
cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: festival-api
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: api
  namespaceSelector:
    matchNames:
      - festival
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
EOF
```

### Health Check Endpoints

The API provides the following health endpoints:

```bash
# Liveness probe - Is the application alive?
GET /health/live
# Response: { "status": "ok" }

# Readiness probe - Is the application ready to receive traffic?
GET /health/ready
# Response: { "status": "ok", "checks": { "database": "ok", "redis": "ok" } }

# Full health check
GET /health
# Response: { "status": "ok", "uptime": 12345, "timestamp": "2026-01-08T..." }
```

#### Kubernetes Probe Configuration

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: http
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health/ready
    port: http
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3

startupProbe:
  httpGet:
    path: /health/live
    port: http
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 30
```

### Log Aggregation

#### Deploy Loki Stack

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

helm install loki grafana/loki-stack \
  --namespace monitoring \
  --set promtail.enabled=true \
  --set grafana.enabled=false  # Use existing Grafana
```

#### Configure Application Logging

The API uses structured JSON logging (Pino):

```json
{
  "level": "info",
  "time": "2026-01-08T10:30:00.000Z",
  "pid": 1,
  "hostname": "api-xxxxx",
  "correlationId": "abc-123",
  "method": "GET",
  "url": "/api/festivals",
  "statusCode": 200,
  "responseTime": 45,
  "msg": "Request completed"
}
```

#### View Logs

```bash
# View API logs
kubectl logs -f deployment/api -n festival

# View logs with specific label
kubectl logs -l app.kubernetes.io/name=api -n festival --tail=100

# Stream logs from all API pods
kubectl logs -f -l app.kubernetes.io/name=api -n festival --all-containers
```

### Grafana Dashboards

Access Grafana:

```bash
# Get admin password
kubectl get secret prometheus-grafana -n monitoring -o jsonpath="{.data.admin-password}" | base64 --decode

# Port-forward to Grafana
kubectl port-forward svc/prometheus-grafana 3001:80 -n monitoring

# Access at http://localhost:3001
```

Import these dashboards:

- **Node Exporter Full** (ID: 1860)
- **Kubernetes Cluster** (ID: 6417)
- **NGINX Ingress Controller** (ID: 9614)
- **PostgreSQL** (ID: 9628)
- **Redis** (ID: 11835)

### Alerting

Example Prometheus alert rules:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: festival-alerts
  namespace: monitoring
spec:
  groups:
    - name: festival-api
      rules:
        - alert: APIHighLatency
          expr: histogram_quantile(0.95, http_request_duration_ms_bucket{app="api"}) > 500
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: 'API p95 latency above 500ms'

        - alert: APIHighErrorRate
          expr: rate(http_errors_total{app="api"}[5m]) / rate(http_requests_total{app="api"}[5m]) > 0.01
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: 'API error rate above 1%'

        - alert: PodNotReady
          expr: kube_pod_status_ready{namespace="festival", condition="false"} == 1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: 'Pod {{ $labels.pod }} not ready'
```

---

## 7. Troubleshooting

### Common Issues and Solutions

#### Issue: Pods Stuck in Pending State

```bash
# Check pod events
kubectl describe pod <pod-name> -n festival

# Common causes:
# 1. Insufficient resources
kubectl describe nodes | grep -A 5 "Allocated resources"

# 2. PVC not bound
kubectl get pvc -n festival

# 3. Image pull errors
kubectl get events -n festival --field-selector reason=Failed
```

**Solutions:**

- Scale up cluster nodes
- Adjust resource requests
- Check image registry credentials
- Verify storage class exists

#### Issue: CrashLoopBackOff

```bash
# Check pod logs
kubectl logs <pod-name> -n festival --previous

# Check container exit code
kubectl describe pod <pod-name> -n festival | grep -A 10 "Last State"
```

**Common causes:**

- Missing environment variables
- Database connection failures
- Permission issues

**Solutions:**

```bash
# Verify secrets are mounted
kubectl exec -it <pod-name> -n festival -- env | grep -i secret

# Test database connectivity
kubectl exec -it <pod-name> -n festival -- nc -zv postgresql 5432
```

#### Issue: Service Not Accessible

```bash
# Check service endpoints
kubectl get endpoints <service-name> -n festival

# Test service DNS
kubectl run -it --rm debug --image=busybox --restart=Never -n festival -- nslookup api

# Test service connectivity
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -n festival -- curl http://api:3000/health
```

#### Issue: Ingress Not Working

```bash
# Check ingress status
kubectl describe ingress festival-ingress -n festival

# Check ingress controller logs
kubectl logs -l app.kubernetes.io/name=ingress-nginx -n ingress-nginx

# Verify TLS certificate
kubectl get certificate -n festival
kubectl describe certificate web-tls-secret -n festival
```

#### Issue: Database Connection Failures

```bash
# Check PostgreSQL pod status
kubectl get pods -l app.kubernetes.io/name=postgresql -n festival

# Check PostgreSQL logs
kubectl logs -l app.kubernetes.io/name=postgresql -n festival

# Test connection from API pod
kubectl exec -it <api-pod> -n festival -- \
  psql $DATABASE_URL -c "SELECT 1"

# Check network policy
kubectl get networkpolicy -n festival
```

#### Issue: Redis Connection Failures

```bash
# Check Redis status
kubectl get pods -l app.kubernetes.io/name=redis -n festival

# Test Redis connection
kubectl exec -it <api-pod> -n festival -- \
  redis-cli -h redis -a $REDIS_PASSWORD ping
```

#### Issue: High Memory Usage / OOMKilled

```bash
# Check memory usage
kubectl top pods -n festival

# Check OOMKilled events
kubectl get events -n festival | grep OOMKilled

# Increase memory limits
kubectl patch deployment api -n festival -p \
  '{"spec":{"template":{"spec":{"containers":[{"name":"api","resources":{"limits":{"memory":"2Gi"}}}]}}}}'
```

#### Issue: Slow Performance

```bash
# Check HPA status
kubectl get hpa -n festival

# View resource utilization
kubectl top pods -n festival
kubectl top nodes

# Check for throttling
kubectl describe pod <pod-name> -n festival | grep -i throttl
```

### Debug Commands Cheat Sheet

```bash
# Get all resources in namespace
kubectl get all -n festival

# Watch pods in real-time
kubectl get pods -n festival -w

# Get pod YAML
kubectl get pod <pod-name> -n festival -o yaml

# Execute command in pod
kubectl exec -it <pod-name> -n festival -- /bin/sh

# Port forward to pod
kubectl port-forward <pod-name> 3000:3000 -n festival

# Copy files from/to pod
kubectl cp festival/<pod-name>:/path/to/file ./local-file

# View resource usage
kubectl top pods -n festival
kubectl top nodes

# Check cluster events
kubectl get events -n festival --sort-by='.lastTimestamp'

# Check API server logs
kubectl logs -n kube-system -l component=kube-apiserver
```

### Recovery Procedures

#### Rolling Back a Deployment

```bash
# View rollout history
kubectl rollout history deployment/api -n festival

# Rollback to previous version
kubectl rollout undo deployment/api -n festival

# Rollback to specific revision
kubectl rollout undo deployment/api -n festival --to-revision=2
```

#### Database Recovery

```bash
# Scale down API to prevent writes
kubectl scale deployment api --replicas=0 -n festival

# Restore from backup (example with pg_restore)
kubectl exec -it postgresql-0 -n festival -- \
  pg_restore -U festival -d festival /backup/latest.dump

# Scale API back up
kubectl scale deployment api --replicas=3 -n festival
```

#### Force Delete Stuck Resources

```bash
# Delete stuck pod
kubectl delete pod <pod-name> -n festival --grace-period=0 --force

# Delete stuck PVC
kubectl patch pvc <pvc-name> -n festival -p '{"metadata":{"finalizers":null}}'
kubectl delete pvc <pvc-name> -n festival
```

---

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [cert-manager Documentation](https://cert-manager.io/docs/)
- [Prometheus Operator](https://prometheus-operator.dev/)
- [External Secrets Operator](https://external-secrets.io/)
- [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets)

---

## Project K8s Directory Structure

```
k8s/
├── base/
│   └── namespace.yaml          # Namespace, ResourceQuota, LimitRange
├── configmaps/
│   ├── api-config.yaml
│   ├── web-config.yaml
│   ├── admin-config.yaml
│   ├── postgresql-config.yaml
│   └── redis-config.yaml
├── secrets/
│   ├── api-secrets.yaml        # SealedSecret template
│   ├── postgresql-secrets.yaml
│   ├── redis-secrets.yaml
│   └── tls-secrets.yaml
├── api/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── hpa.yaml                # HPA + VPA
│   └── pdb.yaml                # Pod Disruption Budget
├── web/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── hpa.yaml
├── admin/
│   ├── deployment.yaml
│   └── service.yaml
├── postgresql/
│   ├── statefulset.yaml
│   ├── service.yaml
│   └── pdb.yaml
├── redis/
│   ├── statefulset.yaml
│   ├── service.yaml
│   └── redis-cluster.yaml
├── ingress/
│   ├── ingress.yaml            # Main + WebSocket ingress
│   └── nginx-config.yaml
├── network-policies/
│   ├── default-deny.yaml
│   ├── api-policy.yaml
│   ├── web-policy.yaml
│   └── database-policy.yaml
├── cert-manager/
│   ├── cluster-issuer.yaml
│   └── certificates.yaml
├── overlays/
│   ├── development/
│   │   └── kustomization.yaml
│   ├── staging/
│   │   └── kustomization.yaml
│   └── production/
│       ├── kustomization.yaml
│       ├── loadbalancer.yaml
│       └── nginx-ingress-config.yaml
└── kustomization.yaml          # Base kustomization
```

---

Last updated: 2026-01-08
