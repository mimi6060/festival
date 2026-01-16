#!/usr/bin/env bash
# ============================================
# Festival Platform - Unified Start Script
# ============================================
# Supports: Docker Compose, Kubernetes (minikube/kind), and Local Dev
#
# Usage:
#   ./scripts/start.sh                    # Interactive menu
#   ./scripts/start.sh docker             # Docker Compose mode
#   ./scripts/start.sh k8s                # Kubernetes mode
#   ./scripts/start.sh local              # Local dev mode (no containers)
#   ./scripts/start.sh status             # Show all services status
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# Service definitions (compatible with bash 3.x)
SERVICE_NAMES="api web admin mobile postgres redis minio mailhog prometheus grafana"
SERVICE_api="3333:API Backend (NestJS)"
SERVICE_web="3000:Web Frontend (Next.js)"
SERVICE_admin="4201:Admin Dashboard (Next.js)"
SERVICE_mobile="8081:Mobile Dev Server (Expo)"
SERVICE_postgres="5432:PostgreSQL Database"
SERVICE_redis="6379:Redis Cache"
SERVICE_minio="9000:MinIO Storage"
SERVICE_mailhog="8025:MailHog (Email)"
SERVICE_prometheus="9090:Prometheus Metrics"
SERVICE_grafana="3001:Grafana Dashboards"

get_service_info() {
    local service=$1
    eval echo "\$SERVICE_$service"
}

# ============================================
# Utility Functions
# ============================================

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }

print_header() {
    echo ""
    echo -e "${MAGENTA}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║${NC}  ${BOLD}🎪 Festival Platform - Unified Launcher${NC}                   ${MAGENTA}║${NC}"
    echo -e "${MAGENTA}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

get_local_ip() {
    ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost"
}

check_port() {
    local port=$1
    nc -z localhost "$port" 2>/dev/null
}

check_command() {
    command -v "$1" >/dev/null 2>&1
}

# ============================================
# Docker Functions
# ============================================

check_docker() {
    if docker info >/dev/null 2>&1; then
        return 0
    fi
    return 1
}

docker_start() {
    local profile="${1:-}"

    log_step "Starting Docker Compose services..."

    if ! check_docker; then
        log_error "Docker is not running!"
        log_warn "Please start Docker Desktop and try again."
        return 1
    fi

    local compose_cmd="docker compose"
    if ! $compose_cmd version >/dev/null 2>&1; then
        compose_cmd="docker-compose"
    fi

    case "$profile" in
        full)
            log_info "Starting all services including monitoring..."
            $compose_cmd --profile dev --profile monitoring up -d
            ;;
        monitoring)
            log_info "Starting with monitoring (Prometheus + Grafana)..."
            $compose_cmd --profile monitoring up -d
            ;;
        *)
            log_info "Starting core services..."
            $compose_cmd up -d postgres redis minio
            sleep 5
            ;;
    esac

    log_success "Docker services started!"
}

docker_stop() {
    log_step "Stopping Docker services..."
    docker compose down 2>/dev/null || docker-compose down 2>/dev/null || true
    log_success "Docker services stopped"
}

docker_status() {
    echo ""
    echo -e "${BOLD}Docker Containers:${NC}"
    echo ""
    docker compose ps 2>/dev/null || docker-compose ps 2>/dev/null || echo "No containers running"
    echo ""
}

# ============================================
# Kubernetes Functions
# ============================================

check_k8s_context() {
    if ! check_command kubectl; then
        log_error "kubectl not found. Please install kubectl."
        return 1
    fi

    local context=$(kubectl config current-context 2>/dev/null)
    if [ -z "$context" ]; then
        log_error "No Kubernetes context found."
        return 1
    fi

    echo "$context"
}

check_k8s_cluster() {
    local context=$(check_k8s_context)

    case "$context" in
        minikube*)
            echo "minikube"
            ;;
        docker-desktop*)
            echo "docker-desktop"
            ;;
        kind-*)
            echo "kind"
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

k8s_start() {
    local cluster_type=$(check_k8s_cluster)

    log_step "Starting Kubernetes cluster ($cluster_type)..."

    case "$cluster_type" in
        minikube)
            if ! minikube status >/dev/null 2>&1; then
                log_info "Starting Minikube..."
                minikube start --cpus=4 --memory=8192 --driver=docker
            fi
            log_info "Enabling ingress addon..."
            minikube addons enable ingress 2>/dev/null || true
            ;;
        docker-desktop)
            log_info "Using Docker Desktop Kubernetes..."
            ;;
        kind)
            if ! kind get clusters 2>/dev/null | grep -q "festival"; then
                log_info "Creating Kind cluster 'festival'..."
                kind create cluster --name festival --config=k8s/kind-config.yaml 2>/dev/null || \
                kind create cluster --name festival
            fi
            ;;
        *)
            log_warn "Unknown cluster type. Assuming cluster is ready."
            ;;
    esac

    # Create namespace
    kubectl create namespace festival-dev 2>/dev/null || true

    # Check if Skaffold is available
    if check_command skaffold; then
        log_step "Starting Skaffold dev mode..."
        log_info "This will build and deploy to Kubernetes with hot reload"
        echo ""
        skaffold dev --port-forward --tail
    else
        log_warn "Skaffold not found. Using kubectl apply..."
        kubectl apply -k k8s/overlays/development
        k8s_port_forward
    fi
}

k8s_port_forward() {
    log_step "Setting up port forwarding..."

    # Background port forwards
    kubectl port-forward -n festival-dev svc/api 3333:3333 &
    kubectl port-forward -n festival-dev svc/web 3000:3000 &
    kubectl port-forward -n festival-dev svc/admin 4201:4201 &
    kubectl port-forward -n festival-dev svc/postgresql 5432:5432 &
    kubectl port-forward -n festival-dev svc/redis 6379:6379 &

    log_success "Port forwarding active"
}

k8s_stop() {
    log_step "Stopping Kubernetes resources..."

    # Kill port forwards
    pkill -f "kubectl port-forward" 2>/dev/null || true

    # Delete namespace (optional)
    read -p "Delete festival-dev namespace? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kubectl delete namespace festival-dev 2>/dev/null || true
    fi

    log_success "Kubernetes stopped"
}

k8s_status() {
    echo ""
    echo -e "${BOLD}Kubernetes Cluster:${NC}"
    local context=$(kubectl config current-context 2>/dev/null || echo "Not configured")
    echo -e "  Context: ${CYAN}$context${NC}"
    echo ""

    echo -e "${BOLD}Pods in festival-dev:${NC}"
    kubectl get pods -n festival-dev 2>/dev/null || echo "  No pods found"
    echo ""

    echo -e "${BOLD}Services:${NC}"
    kubectl get svc -n festival-dev 2>/dev/null || echo "  No services found"
    echo ""
}

# ============================================
# Local Dev Functions
# ============================================

local_start() {
    log_step "Starting local development mode..."

    # Start infrastructure with Docker
    if check_docker; then
        docker_start
    else
        log_warn "Docker not available. Ensure PostgreSQL and Redis are running locally."
    fi

    # Run database migrations
    log_step "Running Prisma migrations..."
    npx prisma generate >/dev/null 2>&1
    npx prisma db push --accept-data-loss >/dev/null 2>&1 || true

    # Start services in background
    log_step "Starting development servers..."

    # API
    log_info "Starting API on port 3333..."
    NODE_ENV=development npx nx serve api &

    # Web
    log_info "Starting Web on port 3000..."
    npx nx serve web &

    # Admin
    log_info "Starting Admin on port 4201..."
    npx nx serve admin &

    # Wait for services
    sleep 10

    log_success "All services starting..."
    show_status
}

local_stop() {
    log_step "Stopping local services..."

    # Kill Node processes
    pkill -f "nx serve" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "node.*festival" 2>/dev/null || true

    # Stop Docker infra
    docker_stop

    log_success "All services stopped"
}

# ============================================
# Status Dashboard
# ============================================

show_status() {
    local LOCAL_IP=$(get_local_ip)

    clear
    print_header

    echo -e "${BOLD}📊 Service Status Dashboard${NC}"
    echo ""
    echo -e "┌────────────────┬────────┬────────────────────────────────────────┐"
    echo -e "│ ${BOLD}Service${NC}        │ ${BOLD}Port${NC}   │ ${BOLD}URL${NC}                                    │"
    echo -e "├────────────────┼────────┼────────────────────────────────────────┤"

    # Check each service
    for service in $SERVICE_NAMES; do
        local info=$(get_service_info "$service")
        local port="${info%%:*}"
        local name="${info#*:}"
        local status_icon
        local url

        if check_port "$port"; then
            status_icon="${GREEN}●${NC}"
        else
            status_icon="${RED}○${NC}"
        fi

        case "$service" in
            api)      url="http://localhost:$port/api/docs" ;;
            web)      url="http://localhost:$port" ;;
            admin)    url="http://localhost:$port" ;;
            mobile)   url="http://$LOCAL_IP:$port" ;;
            minio)    url="http://localhost:9001 (console)" ;;
            mailhog)  url="http://localhost:$port" ;;
            grafana)  url="http://localhost:$port" ;;
            *)        url="-" ;;
        esac

        printf "│ %b %-12s │ %-6s │ %-38s │\n" "$status_icon" "$service" "$port" "$url"
    done

    echo -e "└────────────────┴────────┴────────────────────────────────────────┘"
    echo ""

    # Docker status
    if check_docker; then
        local running=$(docker ps -q 2>/dev/null | wc -l | tr -d ' ')
        echo -e "${BOLD}🐳 Docker:${NC} ${GREEN}Running${NC} ($running containers)"
    else
        echo -e "${BOLD}🐳 Docker:${NC} ${RED}Not running${NC}"
    fi

    # Kubernetes status
    if check_command kubectl; then
        local k8s_context=$(kubectl config current-context 2>/dev/null || echo "None")
        local k8s_pods=$(kubectl get pods -n festival-dev --no-headers 2>/dev/null | wc -l | tr -d ' ')
        echo -e "${BOLD}☸️  Kubernetes:${NC} Context: ${CYAN}$k8s_context${NC} ($k8s_pods pods)"
    else
        echo -e "${BOLD}☸️  Kubernetes:${NC} ${YELLOW}kubectl not installed${NC}"
    fi

    echo ""
    echo -e "${BOLD}📋 Quick Commands:${NC}"
    echo "  ./scripts/start.sh docker    - Start with Docker Compose"
    echo "  ./scripts/start.sh k8s       - Start with Kubernetes"
    echo "  ./scripts/start.sh local     - Start local dev servers"
    echo "  ./scripts/start.sh stop      - Stop all services"
    echo "  ./scripts/start.sh logs      - View logs"
    echo ""
}

show_logs() {
    local service="${1:-all}"

    case "$service" in
        docker)
            docker compose logs -f
            ;;
        k8s)
            kubectl logs -n festival-dev -l app=festival --all-containers -f
            ;;
        *)
            if [ -f /tmp/festival-api.log ]; then
                tail -f /tmp/festival-*.log
            else
                docker compose logs -f 2>/dev/null || kubectl logs -n festival-dev -l app=festival -f
            fi
            ;;
    esac
}

# ============================================
# Interactive Menu
# ============================================

show_menu() {
    clear
    print_header

    echo -e "${BOLD}Select startup mode:${NC}"
    echo ""
    echo -e "  ${CYAN}1)${NC} 🐳 Docker Compose    - Simple, all services in containers"
    echo -e "  ${CYAN}2)${NC} 🐳 Docker + Monitor  - With Prometheus & Grafana"
    echo -e "  ${CYAN}3)${NC} ☸️  Kubernetes Local  - Minikube/Kind/Docker Desktop"
    echo -e "  ${CYAN}4)${NC} 💻 Local Dev         - NX serve (fastest iteration)"
    echo -e "  ${CYAN}5)${NC} 📊 Status Dashboard  - View all services"
    echo -e "  ${CYAN}6)${NC} 🛑 Stop All          - Stop everything"
    echo -e "  ${CYAN}7)${NC} 📜 View Logs         - Tail service logs"
    echo -e "  ${CYAN}q)${NC} Exit"
    echo ""
    read -p "Enter choice [1-7]: " choice

    case $choice in
        1) docker_start && show_status ;;
        2) docker_start full && show_status ;;
        3) k8s_start ;;
        4) local_start ;;
        5) show_status ;;
        6) local_stop; docker_stop; k8s_stop 2>/dev/null || true ;;
        7) show_logs ;;
        q|Q) exit 0 ;;
        *) log_error "Invalid choice"; sleep 1; show_menu ;;
    esac
}

# ============================================
# Main Entry Point
# ============================================

main() {
    case "${1:-menu}" in
        docker|compose)
            docker_start "${2:-}"
            show_status
            ;;
        k8s|kubernetes)
            k8s_start
            ;;
        local|dev)
            local_start
            ;;
        stop)
            local_stop
            docker_stop
            k8s_stop 2>/dev/null || true
            ;;
        status|dashboard)
            show_status
            ;;
        logs)
            show_logs "${2:-all}"
            ;;
        menu|"")
            show_menu
            ;;
        help|--help|-h)
            echo ""
            echo "Festival Platform - Unified Start Script"
            echo ""
            echo "Usage: $0 <command> [options]"
            echo ""
            echo "Commands:"
            echo "  docker [full]     Start with Docker Compose (full includes monitoring)"
            echo "  k8s               Start with Kubernetes (Skaffold)"
            echo "  local             Start local dev servers (nx serve)"
            echo "  stop              Stop all services"
            echo "  status            Show service status dashboard"
            echo "  logs [service]    View logs (docker|k8s|service name)"
            echo "  menu              Interactive menu (default)"
            echo ""
            echo "Examples:"
            echo "  $0                    # Interactive menu"
            echo "  $0 docker             # Start Docker services"
            echo "  $0 docker full        # Docker with monitoring"
            echo "  $0 k8s                # Kubernetes with Skaffold"
            echo "  $0 status             # View all services"
            echo ""
            ;;
        *)
            log_error "Unknown command: $1"
            echo "Run '$0 help' for usage information"
            exit 1
            ;;
    esac
}

main "$@"
