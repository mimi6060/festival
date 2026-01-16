#!/bin/bash
#
# Festival Platform - Health Check Script
# Comprehensive health verification for all platform services
#
# Usage: ./health-check.sh [options]
#   -e, --env         Environment (local|staging|production)
#   -v, --verbose     Verbose output
#   -q, --quiet       Only output errors
#   -j, --json        Output as JSON
#   -t, --timeout     Request timeout in seconds (default: 5)
#   --api-only        Check API only
#   --db-only         Check database only
#   --cache-only      Check cache only
#   --all             Check all services (default)
#   -h, --help        Show help
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
ENVIRONMENT="local"
VERBOSE=false
QUIET=false
JSON_OUTPUT=false
TIMEOUT=5
CHECK_API=true
CHECK_DB=true
CHECK_CACHE=true
CHECK_SERVICES=true

# Service URLs by environment
declare -A API_URLS
API_URLS[local]="http://localhost:3000"
API_URLS[staging]="https://api-staging.festival.app"
API_URLS[production]="https://api.festival.app"

declare -A WEB_URLS
WEB_URLS[local]="http://localhost:4201"
WEB_URLS[staging]="https://staging.festival.app"
WEB_URLS[production]="https://festival.app"

declare -A ADMIN_URLS
ADMIN_URLS[local]="http://localhost:4300"
ADMIN_URLS[staging]="https://admin-staging.festival.app"
ADMIN_URLS[production]="https://admin.festival.app"

# Results storage
declare -A RESULTS
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0

# Parse arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--env)
                ENVIRONMENT="$2"
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
            -j|--json)
                JSON_OUTPUT=true
                shift
                ;;
            -t|--timeout)
                TIMEOUT="$2"
                shift 2
                ;;
            --api-only)
                CHECK_DB=false
                CHECK_CACHE=false
                CHECK_SERVICES=false
                shift
                ;;
            --db-only)
                CHECK_API=false
                CHECK_CACHE=false
                CHECK_SERVICES=false
                shift
                ;;
            --cache-only)
                CHECK_API=false
                CHECK_DB=false
                CHECK_SERVICES=false
                shift
                ;;
            --all)
                CHECK_API=true
                CHECK_DB=true
                CHECK_CACHE=true
                CHECK_SERVICES=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

show_help() {
    cat << EOF
Festival Platform Health Check Script

Usage: $0 [options]

Options:
  -e, --env ENV       Environment: local, staging, production (default: local)
  -v, --verbose       Show detailed output
  -q, --quiet         Only show errors
  -j, --json          Output results as JSON
  -t, --timeout SEC   Request timeout in seconds (default: 5)
  --api-only          Check API services only
  --db-only           Check database only
  --cache-only        Check cache only
  --all               Check all services (default)
  -h, --help          Show this help message

Examples:
  $0                          # Check all services locally
  $0 -e production --verbose  # Verbose check in production
  $0 --api-only -j            # Check API only, JSON output
EOF
}

log() {
    if [ "$QUIET" = false ]; then
        echo -e "$1"
    fi
}

log_verbose() {
    if [ "$VERBOSE" = true ]; then
        echo -e "$1"
    fi
}

log_result() {
    local name=$1
    local status=$2
    local message=$3
    local duration=$4

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    RESULTS["$name"]="$status"

    if [ "$status" = "pass" ]; then
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        if [ "$QUIET" = false ]; then
            echo -e "${GREEN}[PASS]${NC} $name ${BLUE}(${duration}ms)${NC}"
        fi
    elif [ "$status" = "warn" ]; then
        WARNINGS=$((WARNINGS + 1))
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        if [ "$QUIET" = false ]; then
            echo -e "${YELLOW}[WARN]${NC} $name: $message ${BLUE}(${duration}ms)${NC}"
        fi
    else
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        echo -e "${RED}[FAIL]${NC} $name: $message"
    fi
}

# Check HTTP endpoint
check_http() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}

    log_verbose "  Checking $url..."

    local start_time=$(date +%s%3N)
    local response
    local http_code

    response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout "$TIMEOUT" --max-time "$TIMEOUT" "$url" 2>/dev/null) || response="000"
    http_code=$response

    local end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))

    if [ "$http_code" = "$expected_status" ]; then
        log_result "$name" "pass" "" "$duration"
        return 0
    elif [ "$http_code" = "000" ]; then
        log_result "$name" "fail" "Connection failed (timeout or unreachable)" "$duration"
        return 1
    else
        log_result "$name" "fail" "Expected $expected_status, got $http_code" "$duration"
        return 1
    fi
}

# Check PostgreSQL connection
check_postgres() {
    local name=$1
    local host=${2:-localhost}
    local port=${3:-5432}
    local database=${4:-festival}

    log_verbose "  Checking PostgreSQL at $host:$port/$database..."

    local start_time=$(date +%s%3N)

    if command -v pg_isready &> /dev/null; then
        if pg_isready -h "$host" -p "$port" -d "$database" -t "$TIMEOUT" &> /dev/null; then
            local end_time=$(date +%s%3N)
            local duration=$((end_time - start_time))
            log_result "$name" "pass" "" "$duration"
            return 0
        else
            local end_time=$(date +%s%3N)
            local duration=$((end_time - start_time))
            log_result "$name" "fail" "PostgreSQL not ready" "$duration"
            return 1
        fi
    else
        # Fallback: try TCP connection
        if timeout "$TIMEOUT" bash -c "cat < /dev/null > /dev/tcp/$host/$port" 2>/dev/null; then
            local end_time=$(date +%s%3N)
            local duration=$((end_time - start_time))
            log_result "$name" "pass" "" "$duration"
            return 0
        else
            local end_time=$(date +%s%3N)
            local duration=$((end_time - start_time))
            log_result "$name" "fail" "Cannot connect to $host:$port" "$duration"
            return 1
        fi
    fi
}

# Check Redis connection
check_redis() {
    local name=$1
    local host=${2:-localhost}
    local port=${3:-6379}

    log_verbose "  Checking Redis at $host:$port..."

    local start_time=$(date +%s%3N)

    if command -v redis-cli &> /dev/null; then
        if redis-cli -h "$host" -p "$port" ping 2>/dev/null | grep -q "PONG"; then
            local end_time=$(date +%s%3N)
            local duration=$((end_time - start_time))
            log_result "$name" "pass" "" "$duration"
            return 0
        else
            local end_time=$(date +%s%3N)
            local duration=$((end_time - start_time))
            log_result "$name" "fail" "Redis not responding" "$duration"
            return 1
        fi
    else
        # Fallback: try TCP connection
        if timeout "$TIMEOUT" bash -c "cat < /dev/null > /dev/tcp/$host/$port" 2>/dev/null; then
            local end_time=$(date +%s%3N)
            local duration=$((end_time - start_time))
            log_result "$name" "warn" "Connected (redis-cli not available)" "$duration"
            return 0
        else
            local end_time=$(date +%s%3N)
            local duration=$((end_time - start_time))
            log_result "$name" "fail" "Cannot connect to $host:$port" "$duration"
            return 1
        fi
    fi
}

# Check Docker container
check_docker_container() {
    local name=$1
    local container=$2

    log_verbose "  Checking Docker container: $container..."

    local start_time=$(date +%s%3N)

    if command -v docker &> /dev/null; then
        local status
        status=$(docker inspect -f '{{.State.Status}}' "$container" 2>/dev/null) || status="not_found"

        local end_time=$(date +%s%3N)
        local duration=$((end_time - start_time))

        if [ "$status" = "running" ]; then
            log_result "$name" "pass" "" "$duration"
            return 0
        elif [ "$status" = "not_found" ]; then
            log_result "$name" "fail" "Container not found" "$duration"
            return 1
        else
            log_result "$name" "fail" "Container status: $status" "$duration"
            return 1
        fi
    else
        log_result "$name" "warn" "Docker not available" "0"
        return 0
    fi
}

# Check disk space
check_disk_space() {
    local name=$1
    local path=${2:-/}
    local threshold=${3:-90}

    log_verbose "  Checking disk space for $path (threshold: $threshold%)..."

    local start_time=$(date +%s%3N)
    local usage
    usage=$(df -h "$path" 2>/dev/null | awk 'NR==2 {print $5}' | sed 's/%//')

    local end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))

    if [ -z "$usage" ]; then
        log_result "$name" "fail" "Cannot determine disk usage" "$duration"
        return 1
    elif [ "$usage" -ge "$threshold" ]; then
        log_result "$name" "warn" "Disk usage: $usage% (threshold: $threshold%)" "$duration"
        return 0
    else
        log_result "$name" "pass" "" "$duration"
        return 0
    fi
}

# Check memory usage
check_memory() {
    local name=$1
    local threshold=${2:-90}

    log_verbose "  Checking memory usage (threshold: $threshold%)..."

    local start_time=$(date +%s%3N)
    local usage

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        local pages_free=$(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
        local pages_active=$(vm_stat | grep "Pages active" | awk '{print $3}' | sed 's/\.//')
        local pages_inactive=$(vm_stat | grep "Pages inactive" | awk '{print $3}' | sed 's/\.//')
        local pages_wired=$(vm_stat | grep "Pages wired" | awk '{print $4}' | sed 's/\.//')
        local total=$((pages_free + pages_active + pages_inactive + pages_wired))
        local used=$((pages_active + pages_wired))
        usage=$((used * 100 / total))
    else
        # Linux
        usage=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')
    fi

    local end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))

    if [ "$usage" -ge "$threshold" ]; then
        log_result "$name" "warn" "Memory usage: $usage% (threshold: $threshold%)" "$duration"
        return 0
    else
        log_result "$name" "pass" "" "$duration"
        return 0
    fi
}

# Run all checks
run_checks() {
    local api_url="${API_URLS[$ENVIRONMENT]}"
    local web_url="${WEB_URLS[$ENVIRONMENT]}"
    local admin_url="${ADMIN_URLS[$ENVIRONMENT]}"

    log ""
    log "${BLUE}========================================${NC}"
    log "${BLUE}  Festival Platform Health Check${NC}"
    log "${BLUE}  Environment: ${YELLOW}$ENVIRONMENT${NC}"
    log "${BLUE}========================================${NC}"
    log ""

    # API Health Checks
    if [ "$CHECK_API" = true ]; then
        log "${BLUE}=== API Health ===${NC}"
        check_http "API Health" "$api_url/health"
        check_http "API Liveness" "$api_url/health/live"
        check_http "API Readiness" "$api_url/health/ready"
        check_http "API Metrics" "$api_url/monitoring/metrics"
        check_http "API Status" "$api_url/monitoring/status"
        log ""
    fi

    # Web & Admin Frontend
    if [ "$CHECK_SERVICES" = true ]; then
        log "${BLUE}=== Frontend Services ===${NC}"
        check_http "Web Frontend" "$web_url"
        check_http "Admin Dashboard" "$admin_url"
        log ""
    fi

    # Database Checks
    if [ "$CHECK_DB" = true ]; then
        log "${BLUE}=== Database ===${NC}"
        if [ "$ENVIRONMENT" = "local" ]; then
            check_postgres "PostgreSQL" "localhost" "5432" "festival"
        else
            check_http "Database (via API)" "$api_url/health/ready"
        fi
        log ""
    fi

    # Cache Checks
    if [ "$CHECK_CACHE" = true ]; then
        log "${BLUE}=== Cache ===${NC}"
        if [ "$ENVIRONMENT" = "local" ]; then
            check_redis "Redis" "localhost" "6379"
        else
            check_http "Cache (via API)" "$api_url/health/ready"
        fi
        log ""
    fi

    # Docker Containers (local only)
    if [ "$CHECK_SERVICES" = true ] && [ "$ENVIRONMENT" = "local" ]; then
        if command -v docker &> /dev/null; then
            log "${BLUE}=== Docker Containers ===${NC}"
            check_docker_container "API Container" "festival-api"
            check_docker_container "PostgreSQL Container" "festival-postgres"
            check_docker_container "Redis Container" "festival-redis"
            log ""
        fi
    fi

    # System Resources
    if [ "$CHECK_SERVICES" = true ]; then
        log "${BLUE}=== System Resources ===${NC}"
        check_disk_space "Disk Space" "/" 90
        check_memory "Memory Usage" 90
        log ""
    fi
}

# Output JSON results
output_json() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    echo "{"
    echo "  \"timestamp\": \"$timestamp\","
    echo "  \"environment\": \"$ENVIRONMENT\","
    echo "  \"summary\": {"
    echo "    \"total\": $TOTAL_CHECKS,"
    echo "    \"passed\": $PASSED_CHECKS,"
    echo "    \"failed\": $FAILED_CHECKS,"
    echo "    \"warnings\": $WARNINGS,"
    echo "    \"healthy\": $([ $FAILED_CHECKS -eq 0 ] && echo 'true' || echo 'false')"
    echo "  },"
    echo "  \"checks\": {"

    local first=true
    for key in "${!RESULTS[@]}"; do
        if [ "$first" = true ]; then
            first=false
        else
            echo ","
        fi
        echo -n "    \"$key\": \"${RESULTS[$key]}\""
    done
    echo ""

    echo "  }"
    echo "}"
}

# Print summary
print_summary() {
    log ""
    log "${BLUE}========================================${NC}"
    log "${BLUE}  Summary${NC}"
    log "${BLUE}========================================${NC}"
    log "  Total Checks: $TOTAL_CHECKS"
    log "  ${GREEN}Passed: $PASSED_CHECKS${NC}"
    log "  ${YELLOW}Warnings: $WARNINGS${NC}"
    log "  ${RED}Failed: $FAILED_CHECKS${NC}"
    log ""

    if [ $FAILED_CHECKS -eq 0 ]; then
        log "${GREEN}All health checks passed!${NC}"
        return 0
    else
        log "${RED}Some health checks failed.${NC}"
        return 1
    fi
}

# Main
main() {
    parse_args "$@"

    if [ "$JSON_OUTPUT" = true ]; then
        QUIET=true
    fi

    run_checks

    if [ "$JSON_OUTPUT" = true ]; then
        output_json
    else
        print_summary
    fi

    if [ $FAILED_CHECKS -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

main "$@"
