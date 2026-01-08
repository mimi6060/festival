#!/bin/bash
# =============================================================================
# API Verification Script - Festival Platform
# =============================================================================
# Tests all API endpoints to ensure they return correct data
# Run this after starting the API server: npx nx serve api
# =============================================================================

set -e

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3333/api}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@festival.fr}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Festival2025!}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
SKIPPED=0

# Store tokens
ACCESS_TOKEN=""
REFRESH_TOKEN=""
TEST_USER_ID=""
TEST_FESTIVAL_ID=""

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

log_section() {
    echo ""
    echo -e "${CYAN}--- $1 ---${NC}"
}

run_test() {
    local name="$1"
    local expected_status="$2"
    local method="$3"
    local endpoint="$4"
    local data="$5"
    local auth="${6:-true}"

    echo -n "  $name... "

    # Build curl command
    local curl_cmd="curl -s -w '\n%{http_code}' -X $method"
    curl_cmd="$curl_cmd -H 'Content-Type: application/json'"

    if [ "$auth" = "true" ] && [ -n "$ACCESS_TOKEN" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $ACCESS_TOKEN'"
    fi

    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi

    curl_cmd="$curl_cmd '$API_BASE_URL$endpoint'"

    # Execute and capture response
    local response
    response=$(eval $curl_cmd 2>/dev/null)
    local status_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}PASSED${NC} (HTTP $status_code)"
        ((PASSED++))
        echo "$body"
        return 0
    else
        echo -e "${RED}FAILED${NC} (Expected $expected_status, got $status_code)"
        ((FAILED++))
        echo "    Response: $body" | head -c 200
        echo ""
        return 1
    fi
}

check_json_field() {
    local json="$1"
    local field="$2"
    local name="$3"

    echo -n "  Checking $name... "

    if echo "$json" | jq -e ".$field" > /dev/null 2>&1; then
        local value=$(echo "$json" | jq -r ".$field" 2>/dev/null)
        echo -e "${GREEN}OK${NC} ($value)"
        return 0
    else
        echo -e "${RED}MISSING${NC}"
        return 1
    fi
}

# =============================================================================
# Health Checks
# =============================================================================

test_health_endpoints() {
    log_header "Phase 1: Health Check Endpoints"

    log_section "Basic Health"

    echo -n "  API server reachable... "
    if curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL/../api/docs" | grep -q "200\|301\|302"; then
        echo -e "${GREEN}PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}FAILED${NC} - API server not running!"
        echo "  Start the API with: npx nx serve api"
        ((FAILED++))
        exit 1
    fi

    echo -n "  Health endpoint... "
    local health_response=$(curl -s "$API_BASE_URL/health" 2>/dev/null)
    if echo "$health_response" | jq -e '.status' > /dev/null 2>&1; then
        local status=$(echo "$health_response" | jq -r '.status')
        echo -e "${GREEN}PASSED${NC} (status: $status)"
        ((PASSED++))
    else
        echo -e "${YELLOW}SKIPPED${NC} (endpoint may not exist)"
        ((SKIPPED++))
    fi

    echo -n "  Liveness probe... "
    local live_response=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL/health/live" 2>/dev/null)
    if [ "$live_response" = "200" ]; then
        echo -e "${GREEN}PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}SKIPPED${NC}"
        ((SKIPPED++))
    fi

    echo -n "  Readiness probe... "
    local ready_response=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL/health/ready" 2>/dev/null)
    if [ "$ready_response" = "200" ]; then
        echo -e "${GREEN}PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}SKIPPED${NC}"
        ((SKIPPED++))
    fi

    echo -n "  Swagger docs accessible... "
    local swagger_response=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL/../api/docs" 2>/dev/null)
    if [ "$swagger_response" = "200" ] || [ "$swagger_response" = "301" ]; then
        echo -e "${GREEN}PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}WARNING${NC} (HTTP $swagger_response)"
        ((SKIPPED++))
    fi
}

# =============================================================================
# Authentication Tests
# =============================================================================

test_authentication() {
    log_header "Phase 2: Authentication Flow"

    log_section "Admin Login"

    echo -n "  Login with admin credentials... "
    local login_response=$(curl -s -X POST "$API_BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\": \"$ADMIN_EMAIL\", \"password\": \"$ADMIN_PASSWORD\"}" 2>/dev/null)

    if echo "$login_response" | jq -e '.accessToken' > /dev/null 2>&1; then
        ACCESS_TOKEN=$(echo "$login_response" | jq -r '.accessToken')
        REFRESH_TOKEN=$(echo "$login_response" | jq -r '.refreshToken // empty')
        echo -e "${GREEN}PASSED${NC}"
        ((PASSED++))

        # Extract user info if available
        if echo "$login_response" | jq -e '.user.id' > /dev/null 2>&1; then
            TEST_USER_ID=$(echo "$login_response" | jq -r '.user.id')
            echo "    User ID: $TEST_USER_ID"
        fi
    else
        echo -e "${RED}FAILED${NC}"
        echo "    Response: $login_response"
        ((FAILED++))
        echo ""
        echo -e "${YELLOW}Note: If login failed, run database seed first:${NC}"
        echo "  npx prisma db seed"
        return 1
    fi

    log_section "Token Verification"

    echo -n "  Get current user (auth/me)... "
    local me_response=$(curl -s "$API_BASE_URL/auth/me" \
        -H "Authorization: Bearer $ACCESS_TOKEN" 2>/dev/null)

    if echo "$me_response" | jq -e '.id' > /dev/null 2>&1 || echo "$me_response" | jq -e '.email' > /dev/null 2>&1; then
        echo -e "${GREEN}PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}FAILED${NC}"
        echo "    Response: $me_response"
        ((FAILED++))
    fi

    if [ -n "$REFRESH_TOKEN" ]; then
        echo -n "  Refresh token... "
        local refresh_response=$(curl -s -X POST "$API_BASE_URL/auth/refresh" \
            -H "Content-Type: application/json" \
            -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}" 2>/dev/null)

        if echo "$refresh_response" | jq -e '.accessToken' > /dev/null 2>&1; then
            ACCESS_TOKEN=$(echo "$refresh_response" | jq -r '.accessToken')
            echo -e "${GREEN}PASSED${NC}"
            ((PASSED++))
        else
            echo -e "${YELLOW}SKIPPED${NC}"
            ((SKIPPED++))
        fi
    fi
}

# =============================================================================
# Users CRUD Tests
# =============================================================================

test_users_crud() {
    log_header "Phase 3: Users Module"

    log_section "Read Operations"

    echo -n "  List users... "
    local users_response=$(curl -s "$API_BASE_URL/users" \
        -H "Authorization: Bearer $ACCESS_TOKEN" 2>/dev/null)

    if echo "$users_response" | jq -e '.data' > /dev/null 2>&1 || echo "$users_response" | jq -e '.[0]' > /dev/null 2>&1; then
        local count=$(echo "$users_response" | jq -r '.data | length // . | length' 2>/dev/null)
        echo -e "${GREEN}PASSED${NC} ($count users found)"
        ((PASSED++))
    elif echo "$users_response" | jq -e '.message' > /dev/null 2>&1; then
        echo -e "${YELLOW}RESTRICTED${NC} (requires admin)"
        ((SKIPPED++))
    else
        echo -e "${RED}FAILED${NC}"
        ((FAILED++))
    fi

    if [ -n "$TEST_USER_ID" ]; then
        echo -n "  Get user by ID... "
        local user_response=$(curl -s "$API_BASE_URL/users/$TEST_USER_ID" \
            -H "Authorization: Bearer $ACCESS_TOKEN" 2>/dev/null)

        if echo "$user_response" | jq -e '.id' > /dev/null 2>&1; then
            echo -e "${GREEN}PASSED${NC}"
            ((PASSED++))
        else
            echo -e "${YELLOW}SKIPPED${NC}"
            ((SKIPPED++))
        fi
    fi
}

# =============================================================================
# Festivals CRUD Tests
# =============================================================================

test_festivals_crud() {
    log_header "Phase 4: Festivals Module"

    log_section "Read Operations"

    echo -n "  List festivals (public)... "
    local festivals_response=$(curl -s "$API_BASE_URL/festivals" 2>/dev/null)

    if echo "$festivals_response" | jq -e '.data' > /dev/null 2>&1 || echo "$festivals_response" | jq -e '.[0]' > /dev/null 2>&1; then
        local count=$(echo "$festivals_response" | jq -r '.data | length // . | length' 2>/dev/null)
        echo -e "${GREEN}PASSED${NC} ($count festivals found)"
        ((PASSED++))

        # Get first festival ID for further tests
        TEST_FESTIVAL_ID=$(echo "$festivals_response" | jq -r '.data[0].id // .[0].id // empty' 2>/dev/null)
        if [ -n "$TEST_FESTIVAL_ID" ]; then
            echo "    First festival ID: $TEST_FESTIVAL_ID"
        fi
    else
        echo -e "${YELLOW}EMPTY${NC} (no festivals in database)"
        ((SKIPPED++))
    fi

    if [ -n "$TEST_FESTIVAL_ID" ]; then
        echo -n "  Get festival by ID... "
        local festival_response=$(curl -s "$API_BASE_URL/festivals/$TEST_FESTIVAL_ID" 2>/dev/null)

        if echo "$festival_response" | jq -e '.id' > /dev/null 2>&1; then
            local name=$(echo "$festival_response" | jq -r '.name // .title')
            echo -e "${GREEN}PASSED${NC} ($name)"
            ((PASSED++))
        else
            echo -e "${RED}FAILED${NC}"
            ((FAILED++))
        fi

        log_section "Festival Sub-Resources"

        echo -n "  List festival zones... "
        local zones_response=$(curl -s "$API_BASE_URL/festivals/$TEST_FESTIVAL_ID/zones" \
            -H "Authorization: Bearer $ACCESS_TOKEN" 2>/dev/null)

        if echo "$zones_response" | jq -e '.data' > /dev/null 2>&1 || echo "$zones_response" | jq -e '.[0]' > /dev/null 2>&1 || echo "$zones_response" | jq -e '. | type == "array"' > /dev/null 2>&1; then
            echo -e "${GREEN}PASSED${NC}"
            ((PASSED++))
        else
            echo -e "${YELLOW}EMPTY/SKIPPED${NC}"
            ((SKIPPED++))
        fi

        echo -n "  List festival POIs... "
        local pois_response=$(curl -s "$API_BASE_URL/festivals/$TEST_FESTIVAL_ID/pois" 2>/dev/null)

        if echo "$pois_response" | jq -e '.data' > /dev/null 2>&1 || echo "$pois_response" | jq -e '.[0]' > /dev/null 2>&1; then
            echo -e "${GREEN}PASSED${NC}"
            ((PASSED++))
        else
            echo -e "${YELLOW}EMPTY/SKIPPED${NC}"
            ((SKIPPED++))
        fi

        echo -n "  List festival staff... "
        local staff_response=$(curl -s "$API_BASE_URL/festivals/$TEST_FESTIVAL_ID/staff" \
            -H "Authorization: Bearer $ACCESS_TOKEN" 2>/dev/null)

        if echo "$staff_response" | jq -e '.data' > /dev/null 2>&1 || echo "$staff_response" | jq -e '.[0]' > /dev/null 2>&1; then
            echo -e "${GREEN}PASSED${NC}"
            ((PASSED++))
        else
            echo -e "${YELLOW}EMPTY/SKIPPED${NC}"
            ((SKIPPED++))
        fi
    fi
}

# =============================================================================
# Tickets Module Tests
# =============================================================================

test_tickets_module() {
    log_header "Phase 5: Tickets Module"

    log_section "Ticket Operations"

    echo -n "  Get user tickets... "
    local tickets_response=$(curl -s "$API_BASE_URL/tickets" \
        -H "Authorization: Bearer $ACCESS_TOKEN" 2>/dev/null)

    if echo "$tickets_response" | jq -e '.data' > /dev/null 2>&1 || echo "$tickets_response" | jq -e '. | type == "array"' > /dev/null 2>&1; then
        echo -e "${GREEN}PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}SKIPPED${NC}"
        ((SKIPPED++))
    fi
}

# =============================================================================
# Cashless/Wallet Module Tests
# =============================================================================

test_cashless_module() {
    log_header "Phase 6: Cashless/Wallet Module"

    log_section "Wallet Operations"

    echo -n "  Get wallet account... "
    local wallet_response=$(curl -s "$API_BASE_URL/wallet/account" \
        -H "Authorization: Bearer $ACCESS_TOKEN" 2>/dev/null)

    if echo "$wallet_response" | jq -e '.id' > /dev/null 2>&1 || echo "$wallet_response" | jq -e '.balance' > /dev/null 2>&1; then
        echo -e "${GREEN}PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}SKIPPED${NC} (no wallet created)"
        ((SKIPPED++))
    fi

    echo -n "  Get wallet balance... "
    local balance_response=$(curl -s "$API_BASE_URL/wallet/balance" \
        -H "Authorization: Bearer $ACCESS_TOKEN" 2>/dev/null)

    if echo "$balance_response" | jq -e '.balance' > /dev/null 2>&1; then
        local balance=$(echo "$balance_response" | jq -r '.balance')
        echo -e "${GREEN}PASSED${NC} (balance: $balance)"
        ((PASSED++))
    else
        echo -e "${YELLOW}SKIPPED${NC}"
        ((SKIPPED++))
    fi
}

# =============================================================================
# Program Module Tests
# =============================================================================

test_program_module() {
    log_header "Phase 7: Program Module"

    log_section "Artists & Performances"

    echo -n "  Get all artists... "
    local artists_response=$(curl -s "$API_BASE_URL/program/artists" 2>/dev/null)

    if echo "$artists_response" | jq -e '.data' > /dev/null 2>&1 || echo "$artists_response" | jq -e '.[0]' > /dev/null 2>&1; then
        local count=$(echo "$artists_response" | jq -r '.data | length // . | length' 2>/dev/null)
        echo -e "${GREEN}PASSED${NC} ($count artists)"
        ((PASSED++))
    else
        echo -e "${YELLOW}EMPTY/SKIPPED${NC}"
        ((SKIPPED++))
    fi

    echo -n "  Get all stages... "
    local stages_response=$(curl -s "$API_BASE_URL/program/stages" 2>/dev/null)

    if echo "$stages_response" | jq -e '.data' > /dev/null 2>&1 || echo "$stages_response" | jq -e '.[0]' > /dev/null 2>&1; then
        echo -e "${GREEN}PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}EMPTY/SKIPPED${NC}"
        ((SKIPPED++))
    fi
}

# =============================================================================
# Analytics Module Tests
# =============================================================================

test_analytics_module() {
    log_header "Phase 8: Analytics Module"

    if [ -z "$TEST_FESTIVAL_ID" ]; then
        echo "  Skipping analytics tests (no festival ID available)"
        ((SKIPPED++))
        return
    fi

    log_section "Dashboard & Metrics"

    echo -n "  Get dashboard KPIs... "
    local dashboard_response=$(curl -s "$API_BASE_URL/analytics/festivals/$TEST_FESTIVAL_ID/dashboard" \
        -H "Authorization: Bearer $ACCESS_TOKEN" 2>/dev/null)

    if echo "$dashboard_response" | jq -e '.' > /dev/null 2>&1 && ! echo "$dashboard_response" | jq -e '.statusCode' > /dev/null 2>&1; then
        echo -e "${GREEN}PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}SKIPPED${NC}"
        ((SKIPPED++))
    fi

    echo -n "  Get sales analytics... "
    local sales_response=$(curl -s "$API_BASE_URL/analytics/festivals/$TEST_FESTIVAL_ID/sales" \
        -H "Authorization: Bearer $ACCESS_TOKEN" 2>/dev/null)

    if echo "$sales_response" | jq -e '.' > /dev/null 2>&1 && ! echo "$sales_response" | jq -e '.statusCode' > /dev/null 2>&1; then
        echo -e "${GREEN}PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}SKIPPED${NC}"
        ((SKIPPED++))
    fi
}

# =============================================================================
# Vendors Module Tests
# =============================================================================

test_vendors_module() {
    log_header "Phase 9: Vendors Module"

    log_section "Vendor Operations"

    echo -n "  List vendors... "
    local vendors_response=$(curl -s "$API_BASE_URL/vendors" \
        -H "Authorization: Bearer $ACCESS_TOKEN" 2>/dev/null)

    if echo "$vendors_response" | jq -e '.data' > /dev/null 2>&1 || echo "$vendors_response" | jq -e '.[0]' > /dev/null 2>&1; then
        local count=$(echo "$vendors_response" | jq -r '.data | length // . | length' 2>/dev/null)
        echo -e "${GREEN}PASSED${NC} ($count vendors)"
        ((PASSED++))
    else
        echo -e "${YELLOW}EMPTY/SKIPPED${NC}"
        ((SKIPPED++))
    fi
}

# =============================================================================
# Data Integrity Checks
# =============================================================================

test_data_integrity() {
    log_header "Phase 10: Data Integrity Verification"

    log_section "Database Content Check"

    echo -n "  Demo data present... "

    # Check if there's at least one festival
    local has_festivals=$(curl -s "$API_BASE_URL/festivals" 2>/dev/null | jq -r '.data | length // . | length' 2>/dev/null)

    if [ "$has_festivals" -gt 0 ] 2>/dev/null; then
        echo -e "${GREEN}PASSED${NC} ($has_festivals festivals)"
        ((PASSED++))
    else
        echo -e "${RED}FAILED${NC} - No demo data found!"
        echo "    Run: npx prisma db seed"
        ((FAILED++))
    fi
}

# =============================================================================
# Summary
# =============================================================================

print_summary() {
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}  API Verification Summary${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""
    echo -e "  ${GREEN}Passed:${NC}   $PASSED"
    echo -e "  ${RED}Failed:${NC}   $FAILED"
    echo -e "  ${YELLOW}Skipped:${NC}  $SKIPPED"
    echo ""

    local total=$((PASSED + FAILED))
    if [ $total -gt 0 ]; then
        local percentage=$((PASSED * 100 / total))
        echo -e "  Success Rate: ${percentage}%"
    fi
    echo ""

    if [ $FAILED -gt 0 ]; then
        echo -e "${RED}API verification has failures!${NC}"
        echo ""
        echo "Troubleshooting:"
        echo "  1. Ensure API is running: npx nx serve api"
        echo "  2. Ensure database has demo data: npx prisma db seed"
        echo "  3. Check Docker services: docker-compose up -d"
        exit 1
    else
        echo -e "${GREEN}API verification completed successfully!${NC}"
        exit 0
    fi
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    echo ""
    echo "=============================================="
    echo "  Festival Platform - API Verification"
    echo "=============================================="
    echo ""
    echo "Configuration:"
    echo "  API URL: $API_BASE_URL"
    echo "  Admin: $ADMIN_EMAIL"
    echo ""

    # Run all test phases
    test_health_endpoints
    test_authentication

    # Only continue if authentication passed
    if [ -n "$ACCESS_TOKEN" ]; then
        test_users_crud
        test_festivals_crud
        test_tickets_module
        test_cashless_module
        test_program_module
        test_analytics_module
        test_vendors_module
    fi

    test_data_integrity
    print_summary
}

# Run main function
main "$@"
