#!/bin/bash

# ============================================
# Festival Platform - Deployment Script
# ============================================
# Usage:
#   ./scripts/deploy.sh [environment] [options]
#
# Environments:
#   dev         - Local development (minikube/docker-desktop)
#   staging     - Staging environment
#   production  - Production environment
#
# Options:
#   --build     - Build images before deploying
#   --migrate   - Run database migrations
#   --dry-run   - Show what would be applied
#   --rollback  - Rollback to previous version
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default values
ENVIRONMENT="${1:-dev}"
BUILD=false
MIGRATE=false
DRY_RUN=false
ROLLBACK=false

# Parse arguments
shift || true
while [[ $# -gt 0 ]]; do
    case $1 in
        --build)
            BUILD=true
            shift
            ;;
        --migrate)
            MIGRATE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --rollback)
            ROLLBACK=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Set namespace based on environment
case $ENVIRONMENT in
    dev)
        NAMESPACE="festival-dev"
        OVERLAY="development"
        ;;
    staging)
        NAMESPACE="festival-staging"
        OVERLAY="staging"
        ;;
    production)
        NAMESPACE="festival-prod"
        OVERLAY="production"
        ;;
    *)
        echo -e "${RED}Unknown environment: $ENVIRONMENT${NC}"
        echo "Valid environments: dev, staging, production"
        exit 1
        ;;
esac

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Festival Platform Deployment${NC}"
echo -e "${BLUE}============================================${NC}"
echo -e "Environment: ${GREEN}$ENVIRONMENT${NC}"
echo -e "Namespace:   ${GREEN}$NAMESPACE${NC}"
echo -e "Overlay:     ${GREEN}$OVERLAY${NC}"
echo ""

# Check prerequisites
command -v kubectl >/dev/null 2>&1 || { echo -e "${RED}kubectl is required but not installed.${NC}" >&2; exit 1; }
command -v kustomize >/dev/null 2>&1 || { echo -e "${RED}kustomize is required but not installed.${NC}" >&2; exit 1; }

# Check cluster connection
if ! kubectl cluster-info &>/dev/null; then
    echo -e "${RED}Cannot connect to Kubernetes cluster. Check your kubeconfig.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Connected to cluster${NC}"

# Rollback if requested
if [ "$ROLLBACK" = true ]; then
    echo -e "${YELLOW}Rolling back deployments...${NC}"
    kubectl rollout undo deployment/api -n "$NAMESPACE" || true
    kubectl rollout undo deployment/web -n "$NAMESPACE" || true
    kubectl rollout undo deployment/admin -n "$NAMESPACE" || true
    echo -e "${GREEN}✓ Rollback initiated${NC}"
    kubectl rollout status deployment/api -n "$NAMESPACE" --timeout=300s
    exit 0
fi

# Build images if requested
if [ "$BUILD" = true ]; then
    echo -e "${YELLOW}Building Docker images...${NC}"

    # Build API
    echo "Building API..."
    docker build -t festival/api:latest -f "$PROJECT_ROOT/apps/api/Dockerfile" "$PROJECT_ROOT"

    # Build Web
    echo "Building Web..."
    docker build -t festival/web:latest -f "$PROJECT_ROOT/apps/web/Dockerfile" "$PROJECT_ROOT"

    # Build Admin
    echo "Building Admin..."
    docker build -t festival/admin:latest -f "$PROJECT_ROOT/apps/admin/Dockerfile" "$PROJECT_ROOT"

    echo -e "${GREEN}✓ Images built${NC}"
fi

# Create namespace if it doesn't exist
if ! kubectl get namespace "$NAMESPACE" &>/dev/null; then
    echo -e "${YELLOW}Creating namespace $NAMESPACE...${NC}"
    kubectl create namespace "$NAMESPACE"
fi

# Apply kustomization
echo -e "${YELLOW}Applying Kubernetes manifests...${NC}"

if [ "$DRY_RUN" = true ]; then
    echo -e "${BLUE}DRY RUN - Showing what would be applied:${NC}"
    kustomize build "$PROJECT_ROOT/k8s/overlays/$OVERLAY"
    exit 0
fi

kustomize build "$PROJECT_ROOT/k8s/overlays/$OVERLAY" | kubectl apply -f -

echo -e "${GREEN}✓ Manifests applied${NC}"

# Run migrations if requested
if [ "$MIGRATE" = true ]; then
    echo -e "${YELLOW}Running database migrations...${NC}"

    # Generate unique job name
    JOB_NAME="prisma-migrate-$(date +%s)"

    # Create migration job
    kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: $JOB_NAME
  namespace: $NAMESPACE
spec:
  ttlSecondsAfterFinished: 300
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: festival/api:latest
          command: ["npx", "prisma", "migrate", "deploy"]
          envFrom:
            - configMapRef:
                name: festival-config
            - secretRef:
                name: festival-secrets
EOF

    # Wait for migration to complete
    kubectl wait --for=condition=complete --timeout=300s "job/$JOB_NAME" -n "$NAMESPACE"
    echo -e "${GREEN}✓ Migrations completed${NC}"
fi

# Wait for rollout
echo -e "${YELLOW}Waiting for deployments to be ready...${NC}"

kubectl rollout status deployment/api -n "$NAMESPACE" --timeout=300s
echo -e "${GREEN}✓ API deployment ready${NC}"

kubectl rollout status deployment/web -n "$NAMESPACE" --timeout=300s
echo -e "${GREEN}✓ Web deployment ready${NC}"

kubectl rollout status deployment/admin -n "$NAMESPACE" --timeout=300s
echo -e "${GREEN}✓ Admin deployment ready${NC}"

# Show status
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Deployment Status${NC}"
echo -e "${BLUE}============================================${NC}"
kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/part-of=festival-platform

echo ""
echo -e "${GREEN}✓ Deployment complete!${NC}"

# Show URLs
if [ "$ENVIRONMENT" = "dev" ]; then
    echo ""
    echo -e "${BLUE}Local URLs (port-forward required):${NC}"
    echo "  API:   http://localhost:3333"
    echo "  Web:   http://localhost:3000"
    echo "  Admin: http://localhost:4200"
    echo ""
    echo "Run: kubectl port-forward -n $NAMESPACE svc/api 3333:3333"
fi
