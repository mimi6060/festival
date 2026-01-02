#!/bin/bash
# ============================================
# Festival Platform - Docker Development Script
# ============================================
# Start development environment with Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Commands
case "${1:-up}" in
    up)
        print_info "Starting development environment..."
        docker compose --profile dev up -d
        print_success "Development environment started!"
        echo ""
        print_info "Services:"
        echo "  - API:          http://localhost:3000"
        echo "  - Web:          http://localhost:4200"
        echo "  - Admin:        http://localhost:4300"
        echo "  - PostgreSQL:   localhost:5432"
        echo "  - Redis:        localhost:6379"
        echo "  - MinIO:        http://localhost:9001"
        echo "  - Mailhog:      http://localhost:8025"
        echo "  - PgAdmin:      http://localhost:5050"
        echo "  - Redis Cmd:    http://localhost:8081"
        ;;
    down)
        print_info "Stopping development environment..."
        docker compose --profile dev down
        print_success "Development environment stopped!"
        ;;
    restart)
        print_info "Restarting development environment..."
        docker compose --profile dev restart
        print_success "Development environment restarted!"
        ;;
    logs)
        docker compose logs -f ${2:-}
        ;;
    build)
        print_info "Building development images..."
        docker compose --profile dev build
        print_success "Development images built!"
        ;;
    clean)
        print_warning "Cleaning up all containers, volumes, and images..."
        docker compose --profile dev down -v --rmi local
        print_success "Cleanup complete!"
        ;;
    status)
        docker compose ps
        ;;
    shell)
        service=${2:-api}
        print_info "Opening shell in ${service}..."
        docker compose exec "${service}" sh
        ;;
    *)
        echo "Usage: $0 {up|down|restart|logs|build|clean|status|shell}"
        echo ""
        echo "Commands:"
        echo "  up       Start development environment"
        echo "  down     Stop development environment"
        echo "  restart  Restart development environment"
        echo "  logs     View logs (optionally specify service)"
        echo "  build    Build development images"
        echo "  clean    Remove all containers, volumes, and images"
        echo "  status   Show container status"
        echo "  shell    Open shell in a service (default: api)"
        exit 1
        ;;
esac
