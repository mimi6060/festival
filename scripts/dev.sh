#!/bin/bash
# ==============================================
# Festival Platform - Development Script
# ==============================================
# Usage: ./scripts/dev.sh [start|stop|logs|status]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Start infrastructure services in Docker
start_infra() {
    log_info "Starting infrastructure services (Docker)..."
    docker-compose -f docker-compose.dev.yml up -d postgres redis minio mailpit

    log_info "Waiting for services to be healthy..."
    sleep 5

    # Check health
    if docker-compose -f docker-compose.dev.yml ps | grep -q "healthy"; then
        log_success "Infrastructure services started!"
    else
        log_warn "Some services may not be healthy yet. Check with: docker ps"
    fi
}

# Start apps locally
start_apps() {
    log_info "Starting apps locally..."

    # Check if npm install needed
    if [ ! -d "node_modules" ]; then
        log_info "Installing dependencies..."
        npm install
    fi

    # Generate Prisma client
    log_info "Generating Prisma client..."
    npx prisma generate

    # Run migrations if needed
    log_info "Running database migrations..."
    npx prisma db push --accept-data-loss 2>/dev/null || true

    log_info "Starting API on :3001, Web on :4200, Admin on :4201..."
    echo ""
    log_success "Services starting in background. Use './scripts/dev.sh logs' to see output."
    echo ""

    # Start all services
    npx nx run-many --target=serve --projects=api,web,admin --parallel=3
}

# Stop everything
stop_all() {
    log_info "Stopping all services..."

    # Kill local processes
    pkill -f "nx serve" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true

    # Stop Docker
    docker-compose -f docker-compose.dev.yml stop

    log_success "All services stopped."
}

# Show logs
show_logs() {
    docker-compose -f docker-compose.dev.yml logs -f postgres redis minio mailpit
}

# Show status
show_status() {
    echo ""
    log_info "Docker Infrastructure:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "festival|NAMES"
    echo ""
    log_info "URLs:"
    echo "  - API:      http://localhost:3001"
    echo "  - Web:      http://localhost:4200"
    echo "  - Admin:    http://localhost:4201"
    echo "  - Mailpit:  http://localhost:8026"
    echo "  - MinIO:    http://localhost:9001"
    echo ""
}

# Main
case "${1:-start}" in
    start)
        start_infra
        start_apps
        ;;
    infra)
        start_infra
        show_status
        ;;
    stop)
        stop_all
        ;;
    logs)
        show_logs
        ;;
    status)
        show_status
        ;;
    *)
        echo "Usage: $0 {start|infra|stop|logs|status}"
        echo ""
        echo "Commands:"
        echo "  start   - Start infra (Docker) + apps (local)"
        echo "  infra   - Start only infrastructure (Docker)"
        echo "  stop    - Stop all services"
        echo "  logs    - Show Docker logs"
        echo "  status  - Show status and URLs"
        exit 1
        ;;
esac
