#!/bin/bash
# =============================================================================
# Data Verification Script - Festival Platform
# =============================================================================
# Verifies database contains expected demo data
# =============================================================================

set -e

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3333/api}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# =============================================================================
# Helper Functions
# =============================================================================

log_header() {
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""
}

check_data() {
    local name="$1"
    local endpoint="$2"
    local min_count="${3:-1}"
    local auth_token="$4"

    echo -n "  $name... "

    local curl_cmd="curl -s '$API_BASE_URL$endpoint'"
    if [ -n "$auth_token" ]; then
        curl_cmd="curl -s -H 'Authorization: Bearer $auth_token' '$API_BASE_URL$endpoint'"
    fi

    local response=$(eval $curl_cmd 2>/dev/null)
    local count=$(echo "$response" | jq -r '.data | length // . | length // 0' 2>/dev/null)

    if [ "$count" -ge "$min_count" ] 2>/dev/null; then
        echo -e "${GREEN}PASSED${NC} ($count items)"
        ((PASSED++))
        return 0
    elif [ "$count" = "0" ] || [ -z "$count" ]; then
        echo -e "${YELLOW}EMPTY${NC} (0 items, expected >= $min_count)"
        ((WARNINGS++))
        return 0
    else
        echo -e "${RED}FAILED${NC} ($count items, expected >= $min_count)"
        ((FAILED++))
        return 1
    fi
}

# =============================================================================
# Authentication
# =============================================================================

get_auth_token() {
    local email="${ADMIN_EMAIL:-admin@festival.fr}"
    local password="${ADMIN_PASSWORD:-Festival2025!}"

    local response=$(curl -s -X POST "$API_BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\": \"$email\", \"password\": \"$password\"}" 2>/dev/null)

    echo "$response" | jq -r '.accessToken // empty' 2>/dev/null
}

# =============================================================================
# Data Checks
# =============================================================================

verify_demo_data() {
    log_header "Data Verification"

    echo "Authenticating..."
    local token=$(get_auth_token)

    if [ -z "$token" ]; then
        echo -e "${YELLOW}Warning: Could not authenticate. Some checks may fail.${NC}"
        echo ""
    else
        echo -e "${GREEN}Authenticated successfully${NC}"
        echo ""
    fi

    echo "Checking database content..."
    echo ""

    # Core entities (public)
    check_data "Festivals" "/festivals" 1

    # Entities that might need auth
    check_data "Users" "/users" 1 "$token"

    # Festival sub-resources (need a festival ID)
    local festival_id=$(curl -s "$API_BASE_URL/festivals" 2>/dev/null | jq -r '.data[0].id // .[0].id // empty' 2>/dev/null)

    if [ -n "$festival_id" ]; then
        echo ""
        echo "  Using festival ID: $festival_id"
        echo ""

        check_data "Zones" "/festivals/$festival_id/zones" 0 "$token"
        check_data "POIs" "/festivals/$festival_id/pois" 0
        check_data "Staff" "/festivals/$festival_id/staff" 0 "$token"
    fi

    # Other entities
    check_data "Vendors" "/vendors" 0 "$token"
    check_data "Artists" "/program/artists" 0
    check_data "Stages" "/program/stages" 0
}

# =============================================================================
# Seed Recommendation
# =============================================================================

recommend_seed() {
    if [ $WARNINGS -gt 0 ] || [ $FAILED -gt 0 ]; then
        echo ""
        echo -e "${YELLOW}============================================${NC}"
        echo -e "${YELLOW}  Recommendation${NC}"
        echo -e "${YELLOW}============================================${NC}"
        echo ""
        echo "Some data is missing. To populate the database with demo data:"
        echo ""
        echo "  npx prisma db seed"
        echo ""
        echo "This will create:"
        echo "  - Admin user (admin@festival.fr / Festival2025!)"
        echo "  - Sample festivals with full configuration"
        echo "  - Demo tickets, artists, vendors, and more"
        echo ""
    fi
}

# =============================================================================
# Summary
# =============================================================================

print_summary() {
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}  Data Verification Summary${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""
    echo -e "  ${GREEN}Passed:${NC}   $PASSED"
    echo -e "  ${YELLOW}Warnings:${NC} $WARNINGS"
    echo -e "  ${RED}Failed:${NC}   $FAILED"
    echo ""

    recommend_seed

    if [ $FAILED -gt 0 ]; then
        echo -e "${RED}Data verification has failures!${NC}"
        exit 1
    else
        echo -e "${GREEN}Data verification completed!${NC}"
        exit 0
    fi
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    echo ""
    echo "=============================================="
    echo "  Festival Platform - Data Verification"
    echo "=============================================="
    echo ""
    echo "API URL: $API_BASE_URL"
    echo ""

    # Check if API is running
    echo -n "Checking API availability... "
    if curl -s -o /dev/null -w "" --connect-timeout 3 "$API_BASE_URL/../api" 2>/dev/null; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}FAILED${NC}"
        echo ""
        echo "API server is not running!"
        echo "Start it with: npx nx serve api"
        exit 1
    fi

    verify_demo_data
    print_summary
}

main "$@"
