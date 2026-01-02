#!/usr/bin/env bash
#
# Festival Platform - Comprehensive API Test Script
# Tests all major API endpoints with curl
#
# Usage: ./test-api.sh [options]
#   -e, --env         Environment (local|staging|production)
#   -u, --base-url    Custom base URL (overrides environment)
#   -t, --timeout     Request timeout in seconds (default: 10)
#   -v, --verbose     Show full response bodies
#   -q, --quiet       Only output errors and summary
#   --skip-auth       Skip authentication tests (use for quick health checks)
#   --auth-token      Provide existing auth token
#   -h, --help        Show help
#
# Exit codes:
#   0 - All tests passed
#   1 - Some tests failed
#   2 - Configuration error

#######################################
# Colors and Formatting
#######################################
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

#######################################
# Default Configuration
#######################################
ENVIRONMENT="local"
BASE_URL=""
TIMEOUT=10
VERBOSE=false
QUIET=false
SKIP_AUTH=false
AUTH_TOKEN=""

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Test data storage
FAILED_TEST_NAMES=""
TEST_USER_EMAIL="test-$(date +%s)@festival.test"
TEST_USER_PASSWORD="TestPassword123!"
REGISTERED_USER_ID=""
ACCESS_TOKEN=""
REFRESH_TOKEN=""
CREATED_FESTIVAL_ID=""
CREATED_TICKET_ID=""

#######################################
# Helper Functions
#######################################

get_api_url() {
    local env="$1"
    case "$env" in
        local)
            echo "http://localhost:3000/api"
            ;;
        staging)
            echo "https://api-staging.festival.app/api"
            ;;
        production)
            echo "https://api.festival.app/api"
            ;;
        *)
            echo ""
            ;;
    esac
}

show_help() {
    cat << EOF
${BOLD}Festival Platform - Comprehensive API Test Script${NC}

${BOLD}Usage:${NC} $0 [options]

${BOLD}Options:${NC}
  -e, --env ENV       Environment: local, staging, production (default: local)
  -u, --base-url URL  Custom base URL (overrides environment)
  -t, --timeout SEC   Request timeout in seconds (default: 10)
  -v, --verbose       Show full response bodies
  -q, --quiet         Only show errors and summary
  --skip-auth         Skip authentication tests
  --auth-token TOKEN  Use existing auth token
  -h, --help          Show this help message

${BOLD}Examples:${NC}
  $0                              # Run all tests locally
  $0 -e staging --verbose         # Verbose tests on staging
  $0 --skip-auth                  # Quick endpoint check without auth
  $0 -u http://localhost:4000/api # Custom URL

${BOLD}Exit Codes:${NC}
  0 - All tests passed
  1 - Some tests failed
  2 - Configuration error

EOF
}

parse_args() {
    while [ $# -gt 0 ]; do
        case $1 in
            -e|--env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -u|--base-url)
                BASE_URL="$2"
                shift 2
                ;;
            -t|--timeout)
                TIMEOUT="$2"
                shift 2
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -q|--quiet)
                QUIET=true
                shift
                ;;
            --skip-auth)
                SKIP_AUTH=true
                shift
                ;;
            --auth-token)
                AUTH_TOKEN="$2"
                shift 2
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                echo -e "${RED}Unknown option: $1${NC}"
                show_help
                exit 2
                ;;
        esac
    done

    # Set BASE_URL if not provided
    if [ -z "$BASE_URL" ]; then
        BASE_URL=$(get_api_url "$ENVIRONMENT")
        if [ -z "$BASE_URL" ]; then
            echo -e "${RED}Invalid environment: $ENVIRONMENT${NC}"
            exit 2
        fi
    fi
}

log() {
    if [ "$QUIET" = false ]; then
        echo -e "$1"
    fi
}

log_verbose() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${CYAN}$1${NC}"
    fi
}

print_header() {
    log ""
    log "${BOLD}${BLUE}======================================================================${NC}"
    log "${BOLD}${BLUE}  $1${NC}"
    log "${BOLD}${BLUE}======================================================================${NC}"
}

print_section() {
    log ""
    log "${BOLD}${MAGENTA}>> $1${NC}"
    log "${MAGENTA}----------------------------------------------------------------------${NC}"
}

#######################################
# Test Execution Functions
#######################################

# Execute a curl request and validate response
# Usage: make_request "METHOD" "endpoint" "expected_status" "description" ["data"] ["extra_headers"]
make_request() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    local data=$5
    local extra_headers=$6

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    local full_url="${BASE_URL}${endpoint}"

    # Build curl command with timeout
    local curl_opts="-s -w '\n%{http_code}' -X $method"
    curl_opts="$curl_opts --connect-timeout $TIMEOUT"
    curl_opts="$curl_opts --max-time $((TIMEOUT * 2))"

    log_verbose "  Request: $method $full_url"
    if [ -n "$data" ]; then
        log_verbose "  Body: $data"
    fi

    # Execute request
    local response
    local http_code
    local body

    if [ -n "$ACCESS_TOKEN" ] && [ -n "$data" ]; then
        response=$(curl $curl_opts \
            -H "Content-Type: application/json" \
            -H "Accept: application/json" \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            -d "$data" \
            "$full_url" 2>/dev/null) || response=$'{"error":"Connection failed"}\n000'
    elif [ -n "$ACCESS_TOKEN" ]; then
        response=$(curl $curl_opts \
            -H "Content-Type: application/json" \
            -H "Accept: application/json" \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            "$full_url" 2>/dev/null) || response=$'{"error":"Connection failed"}\n000'
    elif [ -n "$data" ]; then
        response=$(curl $curl_opts \
            -H "Content-Type: application/json" \
            -H "Accept: application/json" \
            -d "$data" \
            "$full_url" 2>/dev/null) || response=$'{"error":"Connection failed"}\n000'
    else
        response=$(curl $curl_opts \
            -H "Content-Type: application/json" \
            -H "Accept: application/json" \
            "$full_url" 2>/dev/null) || response=$'{"error":"Connection failed"}\n000'
    fi

    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | sed '$d')

    log_verbose "  Response: $http_code"
    if [ "$VERBOSE" = true ] && [ -n "$body" ]; then
        log_verbose "  Body: $(echo "$body" | head -c 500)"
    fi

    # Validate response
    if [ "$http_code" = "$expected_status" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        log "${GREEN}  [PASS]${NC} $description ${BLUE}(HTTP $http_code)${NC}"
        echo "$body"
        return 0
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_TEST_NAMES="${FAILED_TEST_NAMES}${description}\n"
        log "${RED}  [FAIL]${NC} $description ${YELLOW}(Expected: $expected_status, Got: $http_code)${NC}"
        if [ -n "$body" ]; then
            log "${YELLOW}        Response: $(echo "$body" | head -c 200)${NC}"
        fi
        echo "$body"
        return 1
    fi
}

skip_test() {
    local description=$1
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
    log "${YELLOW}  [SKIP]${NC} $description"
}

#######################################
# Test Suites
#######################################

test_health_endpoints() {
    print_section "Health Check Endpoints"

    # Full health check
    make_request "GET" "/health" "200" "GET /health - Full health check" || true

    # Liveness probe
    make_request "GET" "/health/live" "200" "GET /health/live - Liveness probe" || true

    # Readiness probe
    make_request "GET" "/health/ready" "200" "GET /health/ready - Readiness probe" || true
}

test_monitoring_endpoints() {
    print_section "Monitoring Endpoints"

    # Metrics endpoint
    make_request "GET" "/monitoring/metrics" "200" "GET /monitoring/metrics - Prometheus metrics" || true

    # Status endpoint
    make_request "GET" "/monitoring/status" "200" "GET /monitoring/status - System status" || true
}

test_auth_register() {
    print_section "Auth - Registration"

    if [ "$SKIP_AUTH" = true ]; then
        skip_test "POST /auth/register - Register new user"
        return
    fi

    local register_data="{\"email\": \"$TEST_USER_EMAIL\", \"password\": \"$TEST_USER_PASSWORD\", \"firstName\": \"Test\", \"lastName\": \"User\", \"phone\": \"+33612345678\"}"

    local response
    response=$(make_request "POST" "/auth/register" "201" "POST /auth/register - Register new user" "$register_data") || true

    # Extract user ID if successful
    if echo "$response" | grep -q '"id"'; then
        REGISTERED_USER_ID=$(echo "$response" | sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
        log_verbose "  Registered user ID: $REGISTERED_USER_ID"
    fi

    # Test duplicate registration (should fail)
    make_request "POST" "/auth/register" "409" "POST /auth/register - Duplicate email (expect 409)" "$register_data" || true

    # Test invalid registration
    local invalid_data='{"email": "invalid-email", "password": "short"}'
    make_request "POST" "/auth/register" "400" "POST /auth/register - Invalid data (expect 400)" "$invalid_data" || true
}

test_auth_login() {
    print_section "Auth - Login"

    if [ "$SKIP_AUTH" = true ]; then
        if [ -n "$AUTH_TOKEN" ]; then
            ACCESS_TOKEN="$AUTH_TOKEN"
            log "${GREEN}  [INFO]${NC} Using provided auth token"
        else
            skip_test "POST /auth/login - User login"
        fi
        return
    fi

    local login_data="{\"email\": \"$TEST_USER_EMAIL\", \"password\": \"$TEST_USER_PASSWORD\"}"

    local response
    response=$(make_request "POST" "/auth/login" "200" "POST /auth/login - User login" "$login_data") || true

    # Extract tokens if successful
    if echo "$response" | grep -q '"accessToken"'; then
        ACCESS_TOKEN=$(echo "$response" | sed -n 's/.*"accessToken"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
        REFRESH_TOKEN=$(echo "$response" | sed -n 's/.*"refreshToken"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
        log_verbose "  Access token obtained: ${ACCESS_TOKEN:0:20}..."
    fi

    # Test invalid login
    local invalid_login='{"email": "wrong@email.com", "password": "wrongpassword"}'
    make_request "POST" "/auth/login" "401" "POST /auth/login - Invalid credentials (expect 401)" "$invalid_login" || true
}

test_auth_me() {
    print_section "Auth - Current User"

    if [ -z "$ACCESS_TOKEN" ]; then
        skip_test "GET /auth/me - Get current user"
        return
    fi

    make_request "GET" "/auth/me" "200" "GET /auth/me - Get current user" || true
}

test_auth_refresh() {
    print_section "Auth - Token Refresh"

    if [ -z "$REFRESH_TOKEN" ]; then
        skip_test "POST /auth/refresh - Refresh token"
        return
    fi

    local refresh_data="{\"refreshToken\": \"$REFRESH_TOKEN\"}"
    make_request "POST" "/auth/refresh" "200" "POST /auth/refresh - Refresh token" "$refresh_data" || true
}

test_auth_password_flow() {
    print_section "Auth - Password Management"

    if [ "$SKIP_AUTH" = true ]; then
        skip_test "POST /auth/forgot-password - Forgot password"
        skip_test "POST /auth/change-password - Change password"
        return
    fi

    # Forgot password
    local forgot_data='{"email": "test@example.com"}'
    make_request "POST" "/auth/forgot-password" "200" "POST /auth/forgot-password - Request password reset" "$forgot_data" || true

    # Change password (requires auth)
    if [ -n "$ACCESS_TOKEN" ]; then
        local change_data="{\"currentPassword\": \"$TEST_USER_PASSWORD\", \"newPassword\": \"NewPassword456!\"}"
        make_request "POST" "/auth/change-password" "200" "POST /auth/change-password - Change password" "$change_data" || true
    else
        skip_test "POST /auth/change-password - Change password"
    fi
}

test_auth_logout() {
    print_section "Auth - Logout"

    if [ -z "$ACCESS_TOKEN" ]; then
        skip_test "POST /auth/logout - Logout"
        return
    fi

    make_request "POST" "/auth/logout" "200" "POST /auth/logout - Logout current session" || true
}

test_festival_list() {
    print_section "Festivals - List & Search"

    # List all festivals (public)
    make_request "GET" "/festivals" "200" "GET /festivals - List all festivals" || true

    # List with pagination
    make_request "GET" "/festivals?page=1&limit=10" "200" "GET /festivals - With pagination" || true

    # List with filters
    make_request "GET" "/festivals?status=PUBLISHED" "200" "GET /festivals - Filter by status" || true

    # Search by name
    make_request "GET" "/festivals?search=summer" "200" "GET /festivals - Search by name" || true
}

test_festival_get() {
    print_section "Festivals - Get Details"

    # Get by ID (using a sample UUID)
    local sample_uuid="550e8400-e29b-41d4-a716-446655440000"
    make_request "GET" "/festivals/$sample_uuid" "200" "GET /festivals/:id - Get by ID" || true

    # Get by slug
    make_request "GET" "/festivals/by-slug/summer-vibes-festival-2025" "200" "GET /festivals/by-slug/:slug - Get by slug" || true

    # Invalid UUID (should return 400 or 404)
    make_request "GET" "/festivals/invalid-uuid" "400" "GET /festivals/invalid-uuid - Invalid UUID (expect 400)" || true
}

test_festival_create() {
    print_section "Festivals - Create"

    if [ -z "$ACCESS_TOKEN" ]; then
        skip_test "POST /festivals - Create festival"
        return
    fi

    local create_data="{\"name\": \"Test Festival $(date +%s)\", \"shortDescription\": \"A test festival\", \"startDate\": \"2025-08-01T12:00:00.000Z\", \"endDate\": \"2025-08-03T23:00:00.000Z\", \"location\": {\"venueName\": \"Test Venue\", \"address\": \"123 Test Street\", \"city\": \"Paris\", \"country\": \"FR\", \"postalCode\": \"75001\"}, \"capacity\": 10000, \"currency\": \"EUR\", \"timezone\": \"Europe/Paris\"}"

    local response
    response=$(make_request "POST" "/festivals" "201" "POST /festivals - Create new festival" "$create_data") || true

    # Extract festival ID if successful
    if echo "$response" | grep -q '"id"'; then
        CREATED_FESTIVAL_ID=$(echo "$response" | sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
        log_verbose "  Created festival ID: $CREATED_FESTIVAL_ID"
    fi
}

test_festival_update() {
    print_section "Festivals - Update"

    if [ -z "$ACCESS_TOKEN" ] || [ -z "$CREATED_FESTIVAL_ID" ]; then
        skip_test "PUT /festivals/:id - Update festival"
        return
    fi

    local update_data='{"name": "Updated Test Festival", "capacity": 15000}'
    make_request "PUT" "/festivals/$CREATED_FESTIVAL_ID" "200" "PUT /festivals/:id - Update festival" "$update_data" || true
}

test_festival_stats() {
    print_section "Festivals - Statistics"

    if [ -z "$ACCESS_TOKEN" ]; then
        skip_test "GET /festivals/:id/stats - Festival statistics"
        return
    fi

    local festival_id="${CREATED_FESTIVAL_ID:-550e8400-e29b-41d4-a716-446655440000}"
    make_request "GET" "/festivals/$festival_id/stats" "200" "GET /festivals/:id/stats - Festival statistics" || true
}

test_festival_actions() {
    print_section "Festivals - Publish/Cancel"

    if [ -z "$ACCESS_TOKEN" ] || [ -z "$CREATED_FESTIVAL_ID" ]; then
        skip_test "POST /festivals/:id/publish - Publish festival"
        skip_test "POST /festivals/:id/cancel - Cancel festival"
        return
    fi

    # Publish
    make_request "POST" "/festivals/$CREATED_FESTIVAL_ID/publish" "200" "POST /festivals/:id/publish - Publish festival" || true

    # Cancel
    make_request "POST" "/festivals/$CREATED_FESTIVAL_ID/cancel" "200" "POST /festivals/:id/cancel - Cancel festival" || true
}

test_users_endpoints() {
    print_section "Users - Management"

    if [ -z "$ACCESS_TOKEN" ]; then
        skip_test "GET /users - List users"
        skip_test "GET /users/:id - Get user"
        skip_test "GET /users/search - Search users"
        return
    fi

    # List users (admin only)
    make_request "GET" "/users" "200" "GET /users - List all users (Admin)" || true

    # Search users
    make_request "GET" "/users/search?q=test" "200" "GET /users/search - Search users" || true

    # Get specific user
    if [ -n "$REGISTERED_USER_ID" ]; then
        make_request "GET" "/users/$REGISTERED_USER_ID" "200" "GET /users/:id - Get user by ID" || true
        make_request "GET" "/users/$REGISTERED_USER_ID/activity" "200" "GET /users/:id/activity - User activity" || true
    fi
}

test_payments_checkout() {
    print_section "Payments - Checkout"

    if [ -z "$ACCESS_TOKEN" ]; then
        skip_test "POST /payments/checkout - Create checkout session"
        skip_test "POST /payments/checkout/ticket - Ticket checkout"
        skip_test "POST /payments/checkout/cashless-topup - Cashless top-up"
        return
    fi

    local user_id="${REGISTERED_USER_ID:-550e8400-e29b-41d4-a716-446655440000}"
    local festival_id="${CREATED_FESTIVAL_ID:-550e8400-e29b-41d4-a716-446655440000}"

    # Create generic checkout
    local checkout_data="{\"userId\": \"$user_id\", \"mode\": \"payment\", \"lineItems\": [{\"name\": \"Test Item\", \"quantity\": 1, \"price\": 1000, \"currency\": \"eur\"}], \"successUrl\": \"https://festival.app/success\", \"cancelUrl\": \"https://festival.app/cancel\"}"
    make_request "POST" "/payments/checkout" "201" "POST /payments/checkout - Create checkout session" "$checkout_data" || true

    # Ticket checkout
    local ticket_checkout="{\"userId\": \"$user_id\", \"festivalId\": \"$festival_id\", \"tickets\": [{\"categoryId\": \"cat-123\", \"name\": \"General Admission\", \"price\": 5000, \"quantity\": 2}], \"successUrl\": \"https://festival.app/success\", \"cancelUrl\": \"https://festival.app/cancel\"}"
    make_request "POST" "/payments/checkout/ticket" "201" "POST /payments/checkout/ticket - Ticket checkout" "$ticket_checkout" || true

    # Cashless top-up
    local cashless_topup="{\"userId\": \"$user_id\", \"festivalId\": \"$festival_id\", \"amount\": 5000, \"successUrl\": \"https://festival.app/success\", \"cancelUrl\": \"https://festival.app/cancel\"}"
    make_request "POST" "/payments/checkout/cashless-topup" "201" "POST /payments/checkout/cashless-topup - Cashless top-up" "$cashless_topup" || true
}

test_payments_intents() {
    print_section "Payments - Payment Intents"

    if [ -z "$ACCESS_TOKEN" ]; then
        skip_test "POST /payments/intent - Create payment intent"
        skip_test "GET /payments/user/:userId - User payment history"
        return
    fi

    local user_id="${REGISTERED_USER_ID:-550e8400-e29b-41d4-a716-446655440000}"

    # Create payment intent
    local intent_data="{\"userId\": \"$user_id\", \"amount\": 2500, \"currency\": \"eur\", \"description\": \"Test payment\"}"
    make_request "POST" "/payments/intent" "201" "POST /payments/intent - Create payment intent" "$intent_data" || true

    # Get user payment history
    make_request "GET" "/payments/user/$user_id" "200" "GET /payments/user/:userId - Payment history" || true
}

test_payments_refunds() {
    print_section "Payments - Refunds"

    if [ -z "$ACCESS_TOKEN" ]; then
        skip_test "GET /payments/refunds/eligibility/:paymentId - Check refund eligibility"
        return
    fi

    # Check refund eligibility
    local sample_payment_id="550e8400-e29b-41d4-a716-446655440000"
    make_request "GET" "/payments/refunds/eligibility/$sample_payment_id" "200" "GET /payments/refunds/eligibility/:id - Check eligibility" || true

    # Get refund history
    make_request "GET" "/payments/refunds/history/$sample_payment_id" "200" "GET /payments/refunds/history/:id - Refund history" || true
}

test_payments_connect() {
    print_section "Payments - Stripe Connect"

    if [ -z "$ACCESS_TOKEN" ]; then
        skip_test "POST /payments/connect/account - Create connect account"
        return
    fi

    # Create connect account (for vendors)
    local connect_data='{"vendorId": "vendor-123", "email": "vendor@example.com", "country": "FR", "businessType": "company", "businessProfile": {"name": "Test Vendor", "mcc": "5812"}}'
    make_request "POST" "/payments/connect/account" "201" "POST /payments/connect/account - Create Connect account" "$connect_data" || true
}

test_payments_subscriptions() {
    print_section "Payments - Subscriptions"

    if [ -z "$ACCESS_TOKEN" ]; then
        skip_test "GET /payments/subscriptions/products - List products"
        return
    fi

    # List subscription products
    make_request "GET" "/payments/subscriptions/products" "200" "GET /payments/subscriptions/products - List products" || true
}

test_gdpr_endpoints() {
    print_section "GDPR Compliance"

    if [ -z "$ACCESS_TOKEN" ]; then
        skip_test "GET /gdpr/my-data - Export user data"
        skip_test "POST /gdpr/delete-request - Request deletion"
        return
    fi

    # Export user data (GDPR right to portability)
    make_request "GET" "/gdpr/my-data" "200" "GET /gdpr/my-data - Export personal data" || true

    # Request data deletion
    local delete_request='{"reason": "Test deletion request"}'
    make_request "POST" "/gdpr/delete-request" "201" "POST /gdpr/delete-request - Request account deletion" "$delete_request" || true
}

test_vendors_endpoints() {
    print_section "Vendors"

    if [ -z "$ACCESS_TOKEN" ]; then
        skip_test "GET /vendors - List vendors"
        return
    fi

    # List vendors
    make_request "GET" "/vendors" "200" "GET /vendors - List all vendors" || true

    # Get vendor by ID
    local sample_vendor_id="550e8400-e29b-41d4-a716-446655440000"
    make_request "GET" "/vendors/$sample_vendor_id" "200" "GET /vendors/:id - Get vendor" || true

    # Get vendor menu
    make_request "GET" "/vendors/$sample_vendor_id/menu" "200" "GET /vendors/:id/menu - Get menu" || true
}

test_staff_endpoints() {
    print_section "Staff Management"

    if [ -z "$ACCESS_TOKEN" ]; then
        skip_test "GET /staff - List staff"
        return
    fi

    # List staff
    make_request "GET" "/staff" "200" "GET /staff - List all staff" || true

    # Get staff member
    local sample_staff_id="550e8400-e29b-41d4-a716-446655440000"
    make_request "GET" "/staff/$sample_staff_id" "200" "GET /staff/:id - Get staff member" || true
}

test_camping_endpoints() {
    print_section "Camping"

    # List camping spots (might be public)
    make_request "GET" "/camping/spots" "200" "GET /camping/spots - List camping spots" || true

    if [ -z "$ACCESS_TOKEN" ]; then
        skip_test "GET /camping/bookings - List bookings"
        return
    fi

    # List bookings
    make_request "GET" "/camping/bookings" "200" "GET /camping/bookings - List camping bookings" || true
}

test_zones_endpoints() {
    print_section "Zones"

    # List zones (public)
    make_request "GET" "/zones" "200" "GET /zones - List all zones" || true

    # Get zone by ID
    local sample_zone_id="550e8400-e29b-41d4-a716-446655440000"
    make_request "GET" "/zones/$sample_zone_id" "200" "GET /zones/:id - Get zone" || true
}

test_support_endpoints() {
    print_section "Support"

    if [ -z "$ACCESS_TOKEN" ]; then
        skip_test "POST /support/tickets - Create support ticket"
        skip_test "GET /support/lost-items - List lost items"
        return
    fi

    # Create support ticket
    local ticket_data='{"subject": "Test Support Ticket", "description": "This is a test ticket created by API tests", "category": "general", "priority": "medium"}'
    make_request "POST" "/support/tickets" "201" "POST /support/tickets - Create support ticket" "$ticket_data" || true

    # List support tickets
    make_request "GET" "/support/tickets" "200" "GET /support/tickets - List support tickets" || true

    # List lost items
    make_request "GET" "/support/lost-items" "200" "GET /support/lost-items - List lost items" || true
}

test_analytics_endpoints() {
    print_section "Analytics"

    if [ -z "$ACCESS_TOKEN" ]; then
        skip_test "GET /analytics/dashboard - Dashboard stats"
        return
    fi

    # Dashboard stats
    make_request "GET" "/analytics/dashboard" "200" "GET /analytics/dashboard - Dashboard statistics" || true

    # Festival analytics
    local festival_id="${CREATED_FESTIVAL_ID:-550e8400-e29b-41d4-a716-446655440000}"
    make_request "GET" "/analytics/festivals/$festival_id" "200" "GET /analytics/festivals/:id - Festival analytics" || true
}

test_cache_endpoints() {
    print_section "Cache Management"

    if [ -z "$ACCESS_TOKEN" ]; then
        skip_test "GET /cache/stats - Cache statistics"
        return
    fi

    # Cache stats
    make_request "GET" "/cache/stats" "200" "GET /cache/stats - Cache statistics" || true
}

test_error_handling() {
    print_section "Error Handling"

    # 404 - Not found
    make_request "GET" "/nonexistent-endpoint" "404" "GET /nonexistent - Should return 404" || true

    # 401 - Unauthorized (try protected endpoint without token)
    local saved_token="$ACCESS_TOKEN"
    ACCESS_TOKEN=""
    make_request "GET" "/users" "401" "GET /users (no auth) - Should return 401" || true
    ACCESS_TOKEN="$saved_token"

    # 400 - Bad request
    make_request "POST" "/auth/login" "400" "POST /auth/login (empty body) - Should return 400" "{}" || true
}

#######################################
# Summary and Reporting
#######################################

print_summary() {
    print_header "Test Summary"

    local success_rate=0
    if [ $TOTAL_TESTS -gt 0 ]; then
        success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    fi

    log ""
    log "  ${BOLD}Environment:${NC}    $ENVIRONMENT"
    log "  ${BOLD}Base URL:${NC}       $BASE_URL"
    log ""
    log "  +--------------------------------------+"
    log "  |  ${BOLD}Total Tests:${NC}     $(printf '%4d' $TOTAL_TESTS)                 |"
    log "  |  ${GREEN}Passed:${NC}          $(printf '%4d' $PASSED_TESTS)  (${success_rate}%)           |"
    log "  |  ${RED}Failed:${NC}          $(printf '%4d' $FAILED_TESTS)                 |"
    log "  |  ${YELLOW}Skipped:${NC}         $(printf '%4d' $SKIPPED_TESTS)                 |"
    log "  +--------------------------------------+"
    log ""

    if [ $FAILED_TESTS -eq 0 ]; then
        log "${GREEN}${BOLD}All tests passed!${NC}"
        log ""
        return 0
    else
        log "${RED}${BOLD}Some tests failed. See details above.${NC}"
        log ""

        # List failed tests
        log "${RED}Failed tests:${NC}"
        echo -e "$FAILED_TEST_NAMES" | while read -r test; do
            if [ -n "$test" ]; then
                log "  - $test"
            fi
        done
        log ""

        return 1
    fi
}

#######################################
# Main Execution
#######################################

main() {
    parse_args "$@"

    print_header "Festival Platform API Tests"
    log ""
    log "  ${BOLD}Environment:${NC}  $ENVIRONMENT"
    log "  ${BOLD}Base URL:${NC}     $BASE_URL"
    log "  ${BOLD}Timeout:${NC}      ${TIMEOUT}s"
    log "  ${BOLD}Verbose:${NC}      $VERBOSE"
    log "  ${BOLD}Skip Auth:${NC}    $SKIP_AUTH"

    # Check if API is reachable
    log ""
    log "${CYAN}Checking API availability...${NC}"
    if ! curl -s --connect-timeout 5 "${BASE_URL}/health" > /dev/null 2>&1; then
        log "${YELLOW}Warning: API may not be reachable at $BASE_URL${NC}"
        log "${YELLOW}Tests will continue but may fail.${NC}"
    else
        log "${GREEN}API is reachable.${NC}"
    fi

    # Run all test suites
    test_health_endpoints
    test_monitoring_endpoints
    test_auth_register
    test_auth_login
    test_auth_me
    test_auth_refresh
    test_auth_password_flow
    test_festival_list
    test_festival_get
    test_festival_create
    test_festival_update
    test_festival_stats
    test_festival_actions
    test_users_endpoints
    test_payments_checkout
    test_payments_intents
    test_payments_refunds
    test_payments_connect
    test_payments_subscriptions
    test_gdpr_endpoints
    test_vendors_endpoints
    test_staff_endpoints
    test_camping_endpoints
    test_zones_endpoints
    test_support_endpoints
    test_analytics_endpoints
    test_cache_endpoints
    test_error_handling
    test_auth_logout

    # Print summary
    if print_summary; then
        exit 0
    else
        exit 1
    fi
}

main "$@"
