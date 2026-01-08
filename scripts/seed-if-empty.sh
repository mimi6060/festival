#!/bin/bash
# =============================================================================
# Auto-Seed Script - Festival Platform
# =============================================================================
# Automatically seeds the database if it's empty
# Designed to run at first application launch
# =============================================================================

set -e

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3333/api}"
MAX_RETRIES=30
RETRY_DELAY=2

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Helper Functions
# =============================================================================

log() {
    echo -e "${BLUE}[SEED]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SEED]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[SEED]${NC} $1"
}

log_error() {
    echo -e "${RED}[SEED]${NC} $1"
}

# =============================================================================
# Check Functions
# =============================================================================

wait_for_api() {
    log "Waiting for API to be ready..."

    local retries=0
    while [ $retries -lt $MAX_RETRIES ]; do
        if curl -s -o /dev/null -w "" --connect-timeout 2 "$API_BASE_URL/health" 2>/dev/null; then
            log_success "API is ready!"
            return 0
        fi

        ((retries++))
        echo -n "."
        sleep $RETRY_DELAY
    done

    echo ""
    log_error "API did not become ready in time"
    return 1
}

check_database_empty() {
    log "Checking if database has data..."

    # Try to get festivals count
    local response=$(curl -s "$API_BASE_URL/festivals" 2>/dev/null)
    local count=$(echo "$response" | jq -r '.data | length // . | length // 0' 2>/dev/null)

    if [ "$count" -gt 0 ] 2>/dev/null; then
        log_success "Database already has data ($count festivals)"
        return 1  # Not empty
    else
        log_warning "Database is empty"
        return 0  # Empty
    fi
}

run_seed() {
    log "Running database seed..."

    if npx prisma db seed; then
        log_success "Database seeded successfully!"

        # Verify seed worked
        sleep 2
        local response=$(curl -s "$API_BASE_URL/festivals" 2>/dev/null)
        local count=$(echo "$response" | jq -r '.data | length // . | length // 0' 2>/dev/null)

        if [ "$count" -gt 0 ] 2>/dev/null; then
            log_success "Verified: $count festivals created"

            echo ""
            echo "=============================================="
            echo "  Demo Data Summary"
            echo "=============================================="
            echo ""
            echo "  Admin Account:"
            echo "    Email:    admin@festival.fr"
            echo "    Password: Festival2025!"
            echo ""
            echo "  Data Created:"
            echo "    - Festivals with full configuration"
            echo "    - Users with various roles"
            echo "    - Ticket categories and sample tickets"
            echo "    - Artists and performances"
            echo "    - Vendors and products"
            echo "    - Zones and POIs"
            echo ""

            return 0
        else
            log_error "Seed verification failed"
            return 1
        fi
    else
        log_error "Seed command failed"
        return 1
    fi
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    echo ""
    echo "=============================================="
    echo "  Festival Platform - Auto-Seed"
    echo "=============================================="
    echo ""

    # Check if we should skip
    if [ "${SKIP_SEED:-}" = "true" ]; then
        log "Skipping seed (SKIP_SEED=true)"
        exit 0
    fi

    # Wait for API if requested
    if [ "${WAIT_FOR_API:-true}" = "true" ]; then
        if ! wait_for_api; then
            log_error "Cannot proceed without API"
            exit 1
        fi
    fi

    # Check if database is empty
    if check_database_empty; then
        # Database is empty, run seed
        if run_seed; then
            log_success "Auto-seed completed!"
            exit 0
        else
            log_error "Auto-seed failed!"
            exit 1
        fi
    else
        # Database has data, skip seed
        log "Skipping seed (database has data)"
        exit 0
    fi
}

# Parse arguments
case "${1:-}" in
    --force)
        log "Force seeding..."
        run_seed
        ;;
    --check)
        if check_database_empty; then
            echo "Database is empty"
            exit 0
        else
            echo "Database has data"
            exit 1
        fi
        ;;
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --force    Force seed even if database has data"
        echo "  --check    Only check if database is empty"
        echo "  --help     Show this help message"
        echo ""
        echo "Environment variables:"
        echo "  SKIP_SEED=true       Skip auto-seed entirely"
        echo "  WAIT_FOR_API=false   Don't wait for API to be ready"
        echo "  API_BASE_URL         API base URL (default: http://localhost:3333/api)"
        exit 0
        ;;
    *)
        main
        ;;
esac
