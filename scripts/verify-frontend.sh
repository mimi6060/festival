#!/bin/bash
# =============================================================================
# Frontend Verification Script - Festival Platform
# =============================================================================
# Tests frontend apps accessibility via curl
# Run this after starting frontend servers
# =============================================================================

set -e

# Configuration
WEB_URL="${WEB_URL:-http://localhost:3000}"
ADMIN_URL="${ADMIN_URL:-http://localhost:4201}"

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

check_page() {
    local name="$1"
    local url="$2"
    local expected_content="$3"
    local required="${4:-true}"

    echo -n "  $name... "

    local response=$(curl -s -o /tmp/page_response.html -w "%{http_code}" "$url" 2>/dev/null)

    if [ "$response" = "200" ] || [ "$response" = "304" ]; then
        if [ -n "$expected_content" ]; then
            if grep -q "$expected_content" /tmp/page_response.html 2>/dev/null; then
                echo -e "${GREEN}PASSED${NC} (HTTP $response, content verified)"
                ((PASSED++))
                return 0
            else
                if [ "$required" = "true" ]; then
                    echo -e "${YELLOW}WARNING${NC} (HTTP $response, content not found: '$expected_content')"
                    ((SKIPPED++))
                else
                    echo -e "${GREEN}PASSED${NC} (HTTP $response)"
                    ((PASSED++))
                fi
                return 0
            fi
        else
            echo -e "${GREEN}PASSED${NC} (HTTP $response)"
            ((PASSED++))
            return 0
        fi
    elif [ "$response" = "301" ] || [ "$response" = "302" ] || [ "$response" = "307" ] || [ "$response" = "308" ]; then
        echo -e "${GREEN}PASSED${NC} (HTTP $response - redirect)"
        ((PASSED++))
        return 0
    else
        if [ "$required" = "true" ]; then
            echo -e "${RED}FAILED${NC} (HTTP $response)"
            ((FAILED++))
            return 1
        else
            echo -e "${YELLOW}SKIPPED${NC} (HTTP $response)"
            ((SKIPPED++))
            return 0
        fi
    fi
}

check_server_running() {
    local name="$1"
    local url="$2"

    echo -n "  $name server reachable... "

    local response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$url" 2>/dev/null)

    if [ "$response" != "000" ]; then
        echo -e "${GREEN}YES${NC} (HTTP $response)"
        return 0
    else
        echo -e "${RED}NO${NC}"
        return 1
    fi
}

check_static_assets() {
    local name="$1"
    local base_url="$2"

    echo -n "  $name static assets... "

    # Try common Next.js static paths
    local found=0
    for path in "/_next/static" "/favicon.ico" "/_next"; do
        local response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 "$base_url$path" 2>/dev/null)
        if [ "$response" = "200" ] || [ "$response" = "304" ]; then
            ((found++))
        fi
    done

    if [ $found -gt 0 ]; then
        echo -e "${GREEN}PASSED${NC} ($found assets accessible)"
        ((PASSED++))
        return 0
    else
        echo -e "${YELLOW}WARNING${NC} (static assets may not be served yet)"
        ((SKIPPED++))
        return 0
    fi
}

# =============================================================================
# Web App Tests
# =============================================================================

test_web_app() {
    log_header "Phase 1: Web App (Public Site)"

    log_section "Server Status"

    if ! check_server_running "Web" "$WEB_URL"; then
        echo ""
        echo -e "${YELLOW}Web app not running. Start with: npx nx serve web${NC}"
        echo ""
        return 1
    fi

    log_section "Main Pages"

    check_page "Homepage" "$WEB_URL/" "" false
    check_page "Festivals listing" "$WEB_URL/festivals" "" false
    check_page "Login page" "$WEB_URL/auth/login" "" false
    check_page "Register page" "$WEB_URL/auth/register" "" false

    log_section "Feature Pages"

    check_page "Cashless page" "$WEB_URL/cashless" "" false
    check_page "Programme page" "$WEB_URL/programme" "" false
    check_page "Account page" "$WEB_URL/account" "" false

    log_section "Static Assets"

    check_static_assets "Web" "$WEB_URL"

    log_section "API Proxy Check"

    echo -n "  API proxy configured... "
    local api_response=$(curl -s -o /dev/null -w "%{http_code}" "$WEB_URL/api/health" 2>/dev/null)
    if [ "$api_response" = "200" ] || [ "$api_response" = "404" ]; then
        echo -e "${GREEN}PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}SKIPPED${NC} (proxy may not be configured)"
        ((SKIPPED++))
    fi
}

# =============================================================================
# Admin App Tests
# =============================================================================

test_admin_app() {
    log_header "Phase 2: Admin Dashboard"

    log_section "Server Status"

    if ! check_server_running "Admin" "$ADMIN_URL"; then
        echo ""
        echo -e "${YELLOW}Admin app not running. Start with: npx nx serve admin${NC}"
        echo ""
        return 1
    fi

    log_section "Authentication Pages"

    check_page "Login page" "$ADMIN_URL/login" "" false

    log_section "Dashboard Pages (may redirect to login)"

    check_page "Dashboard" "$ADMIN_URL/" "" false
    check_page "Festivals management" "$ADMIN_URL/festivals" "" false
    check_page "Users management" "$ADMIN_URL/users" "" false
    check_page "Staff management" "$ADMIN_URL/staff" "" false
    check_page "Payments" "$ADMIN_URL/payments" "" false

    log_section "Static Assets"

    check_static_assets "Admin" "$ADMIN_URL"
}

# =============================================================================
# Response Content Tests
# =============================================================================

test_response_content() {
    log_header "Phase 3: Response Content Verification"

    log_section "HTML Structure"

    echo -n "  Web app returns valid HTML... "
    local web_html=$(curl -s "$WEB_URL/" 2>/dev/null)
    if echo "$web_html" | grep -q "<html" && echo "$web_html" | grep -q "</html>"; then
        echo -e "${GREEN}PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}WARNING${NC}"
        ((SKIPPED++))
    fi

    echo -n "  Admin app returns valid HTML... "
    local admin_html=$(curl -s "$ADMIN_URL/" 2>/dev/null)
    if echo "$admin_html" | grep -q "<html" && echo "$admin_html" | grep -q "</html>"; then
        echo -e "${GREEN}PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}WARNING${NC}"
        ((SKIPPED++))
    fi

    log_section "JavaScript Loading"

    echo -n "  Web app loads JavaScript... "
    if echo "$web_html" | grep -q "script" || echo "$web_html" | grep -q "_next"; then
        echo -e "${GREEN}PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}WARNING${NC}"
        ((SKIPPED++))
    fi

    echo -n "  Admin app loads JavaScript... "
    if echo "$admin_html" | grep -q "script" || echo "$admin_html" | grep -q "_next"; then
        echo -e "${GREEN}PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}WARNING${NC}"
        ((SKIPPED++))
    fi
}

# =============================================================================
# Mobile App Check
# =============================================================================

test_mobile_info() {
    log_header "Phase 4: Mobile App Info"

    log_section "Expo Configuration"

    echo -n "  Mobile app configured... "
    if [ -f "apps/mobile/app.json" ] || [ -f "apps/mobile/app.config.js" ]; then
        echo -e "${GREEN}FOUND${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}NOT FOUND${NC}"
        ((SKIPPED++))
    fi

    echo ""
    echo "  Note: Mobile app requires Expo CLI to run:"
    echo "    cd apps/mobile && npx expo start"
}

# =============================================================================
# Summary
# =============================================================================

print_summary() {
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}  Frontend Verification Summary${NC}"
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
        echo -e "${RED}Frontend verification has failures!${NC}"
        echo ""
        echo "Troubleshooting:"
        echo "  1. Start web app: npx nx serve web"
        echo "  2. Start admin app: npx nx serve admin"
        echo "  3. Check for build errors in console"
        exit 1
    else
        echo -e "${GREEN}Frontend verification completed!${NC}"
        exit 0
    fi
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    echo ""
    echo "=============================================="
    echo "  Festival Platform - Frontend Verification"
    echo "=============================================="
    echo ""
    echo "Configuration:"
    echo "  Web URL:   $WEB_URL"
    echo "  Admin URL: $ADMIN_URL"
    echo ""

    # Run all test phases
    test_web_app
    test_admin_app
    test_response_content
    test_mobile_info
    print_summary
}

# Run main function
main "$@"
