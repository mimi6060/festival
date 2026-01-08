#!/bin/bash
# =============================================================================
# Festival Platform - Development Environment Startup Script
# =============================================================================
# Usage: ./scripts/start-dev.sh [--rebuild] [--clean]
#
# Options:
#   --rebuild   Force rebuild of Docker image
#   --clean     Remove volumes and start fresh
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Parse arguments
REBUILD=false
CLEAN=false

for arg in "$@"; do
    case $arg in
        --rebuild)
            REBUILD=true
            ;;
        --clean)
            CLEAN=true
            ;;
    esac
done

# =============================================================================
# Clean mode: remove all volumes
# =============================================================================
if [ "$CLEAN" = true ]; then
    log_warn "Clean mode: Stopping containers and removing volumes..."
    docker-compose -f docker-compose.dev.yml down -v 2>/dev/null || true
    docker volume rm festival_node_modules festival_nx_cache festival_web_next festival_admin_next 2>/dev/null || true
    log_success "Cleaned up all volumes"
fi

# =============================================================================
# Check if Docker image exists or needs rebuild
# =============================================================================
IMAGE_EXISTS=$(docker images -q festival-dev:latest 2>/dev/null)

if [ -z "$IMAGE_EXISTS" ] || [ "$REBUILD" = true ]; then
    log_info "Building Docker image (festival-dev:latest)..."
    docker build -f Dockerfile.dev -t festival-dev:latest .
    log_success "Docker image built successfully"
fi

# =============================================================================
# Check if node_modules volume needs to be populated
# =============================================================================
VOLUME_EXISTS=$(docker volume ls -q | grep -E "^festival_node_modules$" || true)
VOLUME_EMPTY=false

if [ -z "$VOLUME_EXISTS" ]; then
    log_info "Creating node_modules volume..."
    docker volume create festival_node_modules
    VOLUME_EMPTY=true
else
    # Check if volume has content
    NM_COUNT=$(docker run --rm -v festival_node_modules:/nm alpine sh -c "ls /nm 2>/dev/null | wc -l")
    if [ "$NM_COUNT" -lt "10" ]; then
        VOLUME_EMPTY=true
    fi
fi

if [ "$VOLUME_EMPTY" = true ]; then
    log_info "Populating node_modules volume from Docker image..."
    docker run --rm \
        -v festival_node_modules:/target \
        festival-dev:latest \
        sh -c "cp -a /app/node_modules/. /target/"
    log_success "node_modules volume populated"
fi

# =============================================================================
# Start infrastructure services first
# =============================================================================
log_info "Starting infrastructure services (postgres, redis, minio, mailpit)..."
docker-compose -f docker-compose.dev.yml up -d postgres redis minio mailpit

# Wait for postgres and redis to be healthy
log_info "Waiting for databases to be ready..."
for i in {1..30}; do
    POSTGRES_HEALTHY=$(docker inspect --format='{{.State.Health.Status}}' festival-postgres 2>/dev/null || echo "starting")
    REDIS_HEALTHY=$(docker inspect --format='{{.State.Health.Status}}' festival-redis 2>/dev/null || echo "starting")

    if [ "$POSTGRES_HEALTHY" = "healthy" ] && [ "$REDIS_HEALTHY" = "healthy" ]; then
        log_success "Databases are ready!"
        break
    fi

    if [ $i -eq 30 ]; then
        log_error "Databases did not become healthy in time"
        exit 1
    fi

    sleep 2
done

# =============================================================================
# Start application services
# =============================================================================
log_info "Starting application services (api, web, admin)..."
docker-compose -f docker-compose.dev.yml up -d api web admin

# =============================================================================
# Wait for services to be ready
# =============================================================================
log_info "Waiting for services to start (this may take 1-2 minutes for first compile)..."

# Wait for API
for i in {1..120}; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
        log_success "API is ready at http://localhost:3001"
        break
    fi
    if [ $i -eq 120 ]; then
        log_warn "API did not respond in time. Check logs with: docker logs festival-api-dev"
    fi
    sleep 2
done

# =============================================================================
# Ensure database schema and create admin user
# =============================================================================
log_info "Ensuring database schema is up to date..."
docker-compose -f docker-compose.dev.yml exec -T api sh -c "./node_modules/.bin/prisma db push --skip-generate" 2>/dev/null || true

log_info "Checking for admin user..."
ADMIN_EXISTS=$(docker-compose -f docker-compose.dev.yml exec -T postgres psql -U festival_user -d festival_db -tAc "SELECT COUNT(*) FROM \"User\" WHERE email = 'admin@festival-platform.com';" 2>/dev/null || echo "0")

if [ "$ADMIN_EXISTS" = "0" ]; then
    log_info "Creating admin user..."
    # Generate bcrypt hash for 'admin123'
    BCRYPT_HASH=$(docker-compose -f docker-compose.dev.yml exec -T api node -e "console.log(require('bcrypt').hashSync('admin123', 10))" 2>/dev/null)

    docker-compose -f docker-compose.dev.yml exec -T postgres psql -U festival_user -d festival_db -c "
    INSERT INTO \"User\" (id, email, \"passwordHash\", \"firstName\", \"lastName\", role, status, \"emailVerified\", \"createdAt\", \"updatedAt\")
    VALUES (
        'admin-' || gen_random_uuid()::text,
        'admin@festival-platform.com',
        '$BCRYPT_HASH',
        'Admin',
        'Festival',
        'ADMIN',
        'ACTIVE',
        true,
        NOW(),
        NOW()
    );" 2>/dev/null && log_success "Admin user created (admin@festival-platform.com / admin123)"
else
    log_success "Admin user already exists"
fi

# Check Web and Admin (they usually start faster)
sleep 5
WEB_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4202 2>/dev/null || echo "000")
ADMIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4201 2>/dev/null || echo "000")

if [ "$WEB_CODE" != "000" ]; then
    log_success "Web app is ready at http://localhost:4202"
fi
if [ "$ADMIN_CODE" != "000" ]; then
    log_success "Admin app is ready at http://localhost:4201"
fi

# =============================================================================
# Print summary
# =============================================================================
echo ""
echo "=============================================="
echo "  Festival Platform - Development Environment"
echo "=============================================="
echo ""
echo "Services:"
echo "  - API:      http://localhost:3001/api"
echo "  - Web:      http://localhost:4202"
echo "  - Admin:    http://localhost:4201"
echo ""
echo "Infrastructure:"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis:      localhost:6379"
echo "  - MinIO:      http://localhost:9000 (Console: http://localhost:9001)"
echo "  - Mailpit:    http://localhost:8026 (SMTP: localhost:1026)"
echo ""
echo "Admin Credentials:"
echo "  - Email:    admin@festival-platform.com"
echo "  - Password: admin123"
echo ""
echo "Useful commands:"
echo "  - View logs:     docker logs -f festival-api-dev"
echo "  - Stop all:      docker-compose -f docker-compose.dev.yml down"
echo "  - Restart API:   docker-compose -f docker-compose.dev.yml restart api"
echo ""
