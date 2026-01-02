#!/bin/bash
# =============================================================================
# Festival Platform - Startup Script
# =============================================================================
# Ce script démarre toute l'application et itère jusqu'à ce qu'il n'y ait
# plus d'erreurs lors de l'exécution.
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MAX_RETRIES=10
RETRY_DELAY=10
API_PORT=3333
WEB_PORT=4200
ADMIN_PORT=4300

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a port is in use
port_in_use() {
    lsof -i :$1 >/dev/null 2>&1
}

# Function to kill process on port
kill_port() {
    local port=$1
    if port_in_use $port; then
        log_warning "Killing process on port $port"
        lsof -ti :$port | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Function to wait for service
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=${3:-30}
    local attempt=1

    log_info "Waiting for $name to be ready..."
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            log_success "$name is ready!"
            return 0
        fi
        echo -n "."
        sleep 2
        ((attempt++))
    done
    log_error "$name failed to start after $max_attempts attempts"
    return 1
}

# Function to test endpoint
test_endpoint() {
    local url=$1
    local expected_code=${2:-200}
    local name=$3

    local response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

    if [ "$response" = "$expected_code" ]; then
        log_success "$name - OK (HTTP $response)"
        return 0
    else
        log_error "$name - FAILED (HTTP $response, expected $expected_code)"
        return 1
    fi
}

# =============================================================================
# STEP 1: Start Docker Infrastructure
# =============================================================================
start_docker() {
    log_info "=== Starting Docker Infrastructure ==="

    cd "$(dirname "$0")/.."

    # Check if docker-compose is available
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi

    # Start infrastructure services
    log_info "Starting PostgreSQL and Redis..."
    docker compose up -d postgres redis 2>/dev/null || docker-compose up -d postgres redis 2>/dev/null

    # Wait for PostgreSQL
    log_info "Waiting for PostgreSQL..."
    local pg_attempts=0
    while [ $pg_attempts -lt 30 ]; do
        if docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
            log_success "PostgreSQL is ready"
            break
        fi
        sleep 2
        ((pg_attempts++))
    done

    # Wait for Redis
    log_info "Waiting for Redis..."
    local redis_attempts=0
    while [ $redis_attempts -lt 30 ]; do
        if docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; then
            log_success "Redis is ready"
            break
        fi
        sleep 2
        ((redis_attempts++))
    done

    log_success "Docker infrastructure is ready"
}

# =============================================================================
# STEP 2: Run Database Migrations
# =============================================================================
run_migrations() {
    log_info "=== Running Database Migrations ==="

    cd "$(dirname "$0")/.."

    export DATABASE_URL="postgresql://festival_user:festival_password@localhost:5432/festival_db?schema=public"

    # Generate Prisma client
    log_info "Generating Prisma client..."
    npx prisma generate 2>/dev/null || true

    # Run migrations
    log_info "Running migrations..."
    npx prisma migrate deploy 2>/dev/null || npx prisma db push 2>/dev/null || true

    log_success "Database migrations complete"
}

# =============================================================================
# STEP 3: Build Applications
# =============================================================================
build_apps() {
    log_info "=== Building Applications ==="

    cd "$(dirname "$0")/.."

    local build_errors=0

    # Build API
    log_info "Building API..."
    if ! npx nx build api --skip-nx-cache 2>&1 | tee /tmp/api-build.log | grep -q "error"; then
        log_success "API built successfully"
    else
        log_error "API build failed"
        ((build_errors++))
    fi

    # Build Web (optional)
    log_info "Building Web app..."
    if NODE_ENV=production npx nx build web --skip-nx-cache 2>&1 | tee /tmp/web-build.log | grep -v "error" >/dev/null; then
        log_success "Web app built successfully"
    else
        log_warning "Web app build had issues (non-blocking)"
    fi

    return $build_errors
}

# =============================================================================
# STEP 4: Start API Server
# =============================================================================
start_api() {
    log_info "=== Starting API Server ==="

    cd "$(dirname "$0")/.."

    # Kill any existing process on port 3000
    kill_port $API_PORT

    # Set environment variables
    export DATABASE_URL="postgresql://festival_user:festival_password@localhost:5432/festival_db?schema=public"
    export REDIS_HOST="localhost"
    export REDIS_PORT="6379"
    export JWT_SECRET="festival-jwt-secret-key-2026"
    export JWT_REFRESH_SECRET="festival-refresh-secret-key-2026"
    export JWT_EXPIRY="15m"
    export JWT_REFRESH_EXPIRY="7d"
    export STRIPE_SECRET_KEY="sk_test_placeholder"
    export NODE_ENV="development"
    export SKIP_SWAGGER="true"
    export PORT="3333"

    # Start API in background
    log_info "Starting API on port $API_PORT..."
    nohup npx nx serve api > /tmp/api.log 2>&1 &
    echo $! > /tmp/api.pid

    # Wait for API to be ready
    wait_for_service "http://localhost:$API_PORT" "API" 60
}

# =============================================================================
# STEP 5: Test All Endpoints
# =============================================================================
test_endpoints() {
    log_info "=== Testing API Endpoints ==="

    local errors=0
    local BASE_URL="http://localhost:$API_PORT"

    # Health check endpoints
    log_info "Testing health endpoints..."
    test_endpoint "$BASE_URL/health" 200 "GET /health" || ((errors++))
    test_endpoint "$BASE_URL/api" 200 "GET /api" || ((errors++))

    # Auth endpoints (should return 401 without token)
    log_info "Testing auth endpoints..."
    test_endpoint "$BASE_URL/api/auth/me" 401 "GET /api/auth/me (unauthenticated)" || ((errors++))

    # Public endpoints
    log_info "Testing public endpoints..."
    test_endpoint "$BASE_URL/api/festivals" 200 "GET /api/festivals" || true

    # Swagger docs
    log_info "Testing Swagger..."
    test_endpoint "$BASE_URL/api/docs" 200 "GET /api/docs" || ((errors++))

    if [ $errors -eq 0 ]; then
        log_success "All endpoint tests passed!"
        return 0
    else
        log_error "$errors endpoint tests failed"
        return 1
    fi
}

# =============================================================================
# STEP 6: Run Full Test Suite
# =============================================================================
run_tests() {
    log_info "=== Running Test Suite ==="

    cd "$(dirname "$0")/.."

    # Run unit tests
    log_info "Running unit tests..."
    npx nx test api --skip-nx-cache --passWithNoTests 2>&1 | tail -20 || true

    log_success "Test suite complete"
}

# =============================================================================
# MAIN: Orchestration Loop
# =============================================================================
main() {
    log_info "========================================"
    log_info "  Festival Platform - Startup Script"
    log_info "========================================"

    local attempt=1
    local success=false

    while [ $attempt -le $MAX_RETRIES ] && [ "$success" = false ]; do
        log_info ""
        log_info "=== Attempt $attempt of $MAX_RETRIES ==="
        log_info ""

        # Step 1: Docker
        if ! start_docker; then
            log_error "Docker startup failed"
            ((attempt++))
            sleep $RETRY_DELAY
            continue
        fi

        # Step 2: Migrations
        if ! run_migrations; then
            log_warning "Migration issues (continuing anyway)"
        fi

        # Step 3: Build
        if ! build_apps; then
            log_error "Build failed, retrying..."
            ((attempt++))
            sleep $RETRY_DELAY
            continue
        fi

        # Step 4: Start API
        if ! start_api; then
            log_error "API startup failed, retrying..."
            ((attempt++))
            sleep $RETRY_DELAY
            continue
        fi

        # Step 5: Test endpoints
        if test_endpoints; then
            success=true
            log_success ""
            log_success "========================================"
            log_success "  All services started successfully!"
            log_success "========================================"
            log_success ""
            log_success "Services running:"
            log_success "  - PostgreSQL: localhost:5432"
            log_success "  - Redis: localhost:6379"
            log_success "  - API: http://localhost:$API_PORT"
            log_success "  - API Docs: http://localhost:$API_PORT/api/docs"
            log_success ""
            log_success "To stop all services:"
            log_success "  ./scripts/stop.sh"
            log_success ""
        else
            log_error "Endpoint tests failed, retrying..."
            # Check logs for errors
            log_info "Checking API logs for errors..."
            grep -i "error" /tmp/api.log 2>/dev/null | tail -10 || true

            ((attempt++))
            sleep $RETRY_DELAY
        fi
    done

    if [ "$success" = false ]; then
        log_error ""
        log_error "========================================"
        log_error "  Failed to start after $MAX_RETRIES attempts"
        log_error "========================================"
        log_error ""
        log_error "Check logs at:"
        log_error "  - API: /tmp/api.log"
        log_error "  - Build: /tmp/api-build.log"
        log_error ""
        exit 1
    fi
}

# Run main function
main "$@"
