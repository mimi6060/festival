#!/bin/bash
# ============================================
# Festival Platform - Kubernetes Deploy Script
# ============================================
# Deploy to Kubernetes cluster

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${ENVIRONMENT:-"development"}
DRY_RUN=${DRY_RUN:-"false"}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."

    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl not found. Please install kubectl."
        exit 1
    fi

    if ! command -v kustomize &> /dev/null; then
        print_warning "kustomize not found. Using kubectl kustomize instead."
    fi

    # Check kubectl connection
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster."
        exit 1
    fi

    print_success "Prerequisites check passed!"
}

# Deploy function
deploy() {
    local overlay="k8s/overlays/${ENVIRONMENT}"

    if [ ! -d "${overlay}" ]; then
        print_warning "Overlay ${overlay} not found, using base configuration."
        overlay="k8s"
    fi

    print_info "Deploying to ${ENVIRONMENT} environment..."
    print_info "Using overlay: ${overlay}"

    if [ "${DRY_RUN}" = "true" ]; then
        print_warning "DRY RUN - No changes will be applied"
        kubectl apply -k "${overlay}" --dry-run=client
    else
        kubectl apply -k "${overlay}"
    fi

    print_success "Deployment complete!"
}

# Rollback function
rollback() {
    local deployment=${1:-api}

    print_info "Rolling back ${deployment}..."
    kubectl rollout undo deployment/${deployment} -n festival
    print_success "Rollback complete!"
}

# Status function
status() {
    print_info "Deployment status:"
    echo ""
    kubectl get pods -n festival
    echo ""
    kubectl get services -n festival
    echo ""
    kubectl get ingress -n festival
}

# Logs function
logs() {
    local pod=${1:-}

    if [ -z "${pod}" ]; then
        print_info "Fetching logs from all pods..."
        kubectl logs -l app.kubernetes.io/part-of=festival-platform -n festival --tail=100
    else
        kubectl logs -f "${pod}" -n festival
    fi
}

# Main
main() {
    case "${1:-deploy}" in
        deploy)
            check_prerequisites
            deploy
            ;;
        rollback)
            rollback "${2:-}"
            ;;
        status)
            status
            ;;
        logs)
            logs "${2:-}"
            ;;
        delete)
            print_warning "Deleting all resources..."
            kubectl delete -k "k8s/overlays/${ENVIRONMENT}" || kubectl delete -k k8s
            print_success "Resources deleted!"
            ;;
        *)
            echo "Usage: $0 {deploy|rollback|status|logs|delete} [OPTIONS]"
            echo ""
            echo "Commands:"
            echo "  deploy    Deploy to Kubernetes"
            echo "  rollback  Rollback deployment (specify deployment name)"
            echo "  status    Show deployment status"
            echo "  logs      View logs (optionally specify pod)"
            echo "  delete    Delete all resources"
            echo ""
            echo "Environment variables:"
            echo "  ENVIRONMENT  Target environment (development|staging|production)"
            echo "  DRY_RUN      Dry run mode (true|false)"
            exit 1
            ;;
    esac
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        *)
            break
            ;;
    esac
done

main "$@"
