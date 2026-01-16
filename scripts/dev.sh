#!/bin/bash
# ==============================================
# Festival Platform - Development Script
# ==============================================
# Usage: ./scripts/dev.sh [command]
# Run without args to see all commands.

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
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }

# Get local IP
get_local_ip() {
    ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost"
}

# Check if Docker is working
check_docker() {
    if docker info >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Wait for port to be available
wait_for_port() {
    local port=$1
    local name=$2
    local max_wait=${3:-30}
    local count=0

    while ! nc -z localhost "$port" 2>/dev/null; do
        sleep 1
        count=$((count + 1))
        if [ $count -ge $max_wait ]; then
            log_error "$name (port $port) failed to start within ${max_wait}s"
            return 1
        fi
    done
    log_success "$name ready on port $port"
    return 0
}

# Start infrastructure services in Docker
start_infra() {
    log_step "Starting infrastructure services..."

    if ! check_docker; then
        log_error "Docker is not running or not responding!"
        log_warn "Please start Docker Desktop and try again."
        log_warn "Or run './scripts/dev.sh frontend' to start only frontend apps."
        return 1
    fi

    docker compose -f docker-compose.dev.yml up -d postgres redis 2>/dev/null || \
    docker-compose -f docker-compose.dev.yml up -d postgres redis

    log_info "Waiting for PostgreSQL..."
    sleep 5

    # Check if postgres is ready
    local retries=0
    while ! docker compose -f docker-compose.dev.yml exec -T postgres pg_isready -U festival_user >/dev/null 2>&1; do
        retries=$((retries + 1))
        if [ $retries -ge 30 ]; then
            log_error "PostgreSQL failed to start"
            return 1
        fi
        sleep 1
    done

    log_success "Infrastructure services started!"
}

# Prepare database
prepare_db() {
    log_step "Preparing database..."

    npx prisma generate >/dev/null 2>&1
    npx prisma db push --accept-data-loss >/dev/null 2>&1 || true

    log_success "Database ready"
}

# Start API
start_api() {
    log_step "Starting API on port 3333..."

    # Build first
    npx nx build api --skip-nx-cache >/dev/null 2>&1

    # Start with dotenv
    NODE_ENV=development nohup node -r dotenv/config dist/apps/api/main.js dotenv_config_path=.env.development > /tmp/festival-api.log 2>&1 &
    echo $! > /tmp/festival-api.pid

    wait_for_port 3333 "API" 30
}

# Start Web
start_web() {
    log_step "Starting Web on port 3000..."

    cd "$PROJECT_DIR/apps/web"
    PORT=3000 nohup npx next dev > /tmp/festival-web.log 2>&1 &
    echo $! > /tmp/festival-web.pid
    cd "$PROJECT_DIR"

    wait_for_port 3000 "Web" 30
}

# Start Admin
start_admin() {
    log_step "Starting Admin on port 4201..."

    cd "$PROJECT_DIR/apps/admin"
    PORT=4201 nohup npx next dev > /tmp/festival-admin.log 2>&1 &
    echo $! > /tmp/festival-admin.pid
    cd "$PROJECT_DIR"

    wait_for_port 4201 "Admin" 30
}

# Start Mobile
start_mobile() {
    log_step "Starting Mobile on port 8081..."

    cd "$PROJECT_DIR/apps/mobile"
    nohup npx expo start --host lan --port 8081 > /tmp/festival-mobile.log 2>&1 &
    echo $! > /tmp/festival-mobile.pid
    cd "$PROJECT_DIR"

    wait_for_port 8081 "Mobile" 60
}

# Start all frontend apps (no Docker needed)
start_frontend() {
    log_info "Starting frontend apps only (Web, Admin, Mobile)..."
    echo ""

    # Check npm modules
    if [ ! -d "node_modules" ]; then
        log_step "Installing dependencies..."
        npm install
    fi

    start_web &
    start_admin &
    start_mobile &
    wait

    show_urls
}

# Start everything
start_all() {
    log_info "Starting all services..."
    echo ""

    # Check npm modules
    if [ ! -d "node_modules" ]; then
        log_step "Installing dependencies..."
        npm install
    fi

    # Try to start infrastructure
    if start_infra; then
        prepare_db
        start_api &
    else
        log_warn "Skipping API (requires Docker)"
    fi

    start_web &
    start_admin &
    start_mobile &
    wait

    echo ""
    show_urls
}

# Stop all services
stop_all() {
    log_info "Stopping all services..."

    # Kill by PID files
    for app in api web admin mobile; do
        if [ -f "/tmp/festival-$app.pid" ]; then
            kill $(cat /tmp/festival-$app.pid) 2>/dev/null || true
            rm /tmp/festival-$app.pid
        fi
    done

    # Kill by process name (fallback)
    pkill -f "node.*festival" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "expo start" 2>/dev/null || true

    # Stop Docker if running
    if check_docker; then
        docker compose -f docker-compose.dev.yml stop 2>/dev/null || true
    fi

    log_success "All services stopped"
}

# Show URLs
show_urls() {
    local LOCAL_IP=$(get_local_ip)

    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Festival Platform - Development URLs${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
    echo ""

    # Check each service
    if nc -z localhost 3333 2>/dev/null; then
        echo -e "  ${GREEN}●${NC} API:      http://localhost:3333"
        echo -e "            Swagger: http://localhost:3333/api/docs"
    else
        echo -e "  ${RED}○${NC} API:      Not running (needs Docker)"
    fi

    if nc -z localhost 3000 2>/dev/null; then
        echo -e "  ${GREEN}●${NC} Web:      http://localhost:3000"
    else
        echo -e "  ${RED}○${NC} Web:      Not running"
    fi

    if nc -z localhost 4201 2>/dev/null; then
        echo -e "  ${GREEN}●${NC} Admin:    http://localhost:4201"
    else
        echo -e "  ${RED}○${NC} Admin:    Not running"
    fi

    if nc -z localhost 8081 2>/dev/null; then
        echo -e "  ${GREEN}●${NC} Mobile:   http://${LOCAL_IP}:8081"
    else
        echo -e "  ${RED}○${NC} Mobile:   Not running"
    fi

    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
    echo ""
}

# Show logs
show_logs() {
    local app=${1:-all}

    case "$app" in
        api)    tail -f /tmp/festival-api.log ;;
        web)    tail -f /tmp/festival-web.log ;;
        admin)  tail -f /tmp/festival-admin.log ;;
        mobile) tail -f /tmp/festival-mobile.log ;;
        all)    tail -f /tmp/festival-*.log ;;
    esac
}

# Verify all services with curl
verify() {
    echo ""
    log_info "Verifying all services..."
    echo ""

    # Web
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
        echo -e "  Web:    ${GREEN}✓${NC} HTTP 200"
    else
        echo -e "  Web:    ${RED}✗${NC} Not responding"
    fi

    # Admin
    local admin_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4201)
    if [ "$admin_code" = "200" ] || [ "$admin_code" = "307" ]; then
        echo -e "  Admin:  ${GREEN}✓${NC} HTTP $admin_code"
    else
        echo -e "  Admin:  ${RED}✗${NC} Not responding"
    fi

    # API
    if curl -s http://localhost:3333/api/health 2>/dev/null | grep -q "status"; then
        echo -e "  API:    ${GREEN}✓${NC} Health OK"
    else
        echo -e "  API:    ${RED}✗${NC} Not responding"
    fi

    # Mobile
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8081 | grep -q "200"; then
        echo -e "  Mobile: ${GREEN}✓${NC} HTTP 200"
    else
        echo -e "  Mobile: ${RED}✗${NC} Not responding"
    fi

    echo ""
}

# Main
case "${1:-help}" in
    start|all)
        start_all
        ;;
    frontend|fe)
        start_frontend
        ;;
    api)
        start_infra && prepare_db && start_api
        show_urls
        ;;
    web)
        start_web
        show_urls
        ;;
    admin)
        start_admin
        show_urls
        ;;
    mobile)
        start_mobile
        show_urls
        ;;
    infra)
        start_infra
        ;;
    stop)
        stop_all
        ;;
    restart)
        stop_all
        sleep 2
        start_all
        ;;
    status|urls)
        show_urls
        ;;
    logs)
        show_logs "${2:-all}"
        ;;
    verify|test)
        verify
        ;;
    help|*)
        echo ""
        echo "Festival Platform - Development Script"
        echo ""
        echo "Usage: $0 <command>"
        echo ""
        echo "Commands:"
        echo "  start, all      Start all services (API, Web, Admin, Mobile)"
        echo "  frontend, fe    Start frontend only (Web, Admin, Mobile) - no Docker needed"
        echo "  api             Start API only (requires Docker)"
        echo "  web             Start Web only"
        echo "  admin           Start Admin only"
        echo "  mobile          Start Mobile only"
        echo "  infra           Start infrastructure (PostgreSQL, Redis)"
        echo "  stop            Stop all services"
        echo "  restart         Restart all services"
        echo "  status, urls    Show service URLs and status"
        echo "  logs [app]      Show logs (api|web|admin|mobile|all)"
        echo "  verify, test    Verify all services with HTTP checks"
        echo ""
        echo "Examples:"
        echo "  $0 start        # Start everything"
        echo "  $0 frontend     # Start only frontends (no Docker needed)"
        echo "  $0 logs api     # Show API logs"
        echo "  $0 verify       # Check all services"
        echo ""
        ;;
esac
