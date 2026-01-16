#!/bin/bash
# =============================================================================
# Master Verification Script - Festival Platform
# =============================================================================
# Orchestrates all verification scripts for complete platform validation
# =============================================================================

set -e

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Results tracking
declare -A RESULTS
TOTAL_PASSED=0
TOTAL_FAILED=0

# =============================================================================
# Helper Functions
# =============================================================================

print_banner() {
    echo ""
    echo -e "${MAGENTA}======================================================${NC}"
    echo -e "${MAGENTA}  FESTIVAL PLATFORM - COMPLETE VERIFICATION SUITE${NC}"
    echo -e "${MAGENTA}======================================================${NC}"
    echo ""
    echo "  CTO Mission: Ensure all applications are fully functional"
    echo "  Team: 1 CTO + 30 Virtual Dev Agents"
    echo ""
    echo -e "  Date: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
}

print_phase() {
    echo ""
    echo -e "${BLUE}======================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}======================================================${NC}"
    echo ""
}

run_verification() {
    local name="$1"
    local script="$2"
    local required="${3:-false}"

    print_phase "$name"

    if [ -f "$SCRIPT_DIR/$script" ]; then
        chmod +x "$SCRIPT_DIR/$script"

        if "$SCRIPT_DIR/$script"; then
            RESULTS["$name"]="PASSED"
            ((TOTAL_PASSED++))
            echo ""
            echo -e "${GREEN}$name: PASSED${NC}"
        else
            RESULTS["$name"]="FAILED"
            ((TOTAL_FAILED++))
            echo ""
            echo -e "${RED}$name: FAILED${NC}"

            if [ "$required" = "true" ]; then
                echo -e "${RED}Critical verification failed. Stopping.${NC}"
                return 1
            fi
        fi
    else
        RESULTS["$name"]="SKIPPED (script not found)"
        echo -e "${YELLOW}$name: SKIPPED (script not found)${NC}"
    fi

    return 0
}

check_prerequisites() {
    print_phase "Phase 0: Prerequisites Check"

    local all_ok=true

    echo "Checking required tools..."
    echo ""

    # Check Node.js
    echo -n "  Node.js: "
    if command -v node &> /dev/null; then
        echo -e "${GREEN}$(node --version)${NC}"
    else
        echo -e "${RED}NOT FOUND${NC}"
        all_ok=false
    fi

    # Check npm
    echo -n "  npm: "
    if command -v npm &> /dev/null; then
        echo -e "${GREEN}$(npm --version)${NC}"
    else
        echo -e "${RED}NOT FOUND${NC}"
        all_ok=false
    fi

    # Check curl
    echo -n "  curl: "
    if command -v curl &> /dev/null; then
        echo -e "${GREEN}available${NC}"
    else
        echo -e "${RED}NOT FOUND${NC}"
        all_ok=false
    fi

    # Check jq
    echo -n "  jq: "
    if command -v jq &> /dev/null; then
        echo -e "${GREEN}available${NC}"
    else
        echo -e "${YELLOW}NOT FOUND (install: brew install jq)${NC}"
    fi

    # Check Docker
    echo -n "  Docker: "
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}available${NC}"
    else
        echo -e "${YELLOW}NOT FOUND (optional)${NC}"
    fi

    echo ""

    # Check node_modules
    echo -n "  node_modules: "
    if [ -d "node_modules" ]; then
        echo -e "${GREEN}installed${NC}"
    else
        echo -e "${RED}NOT FOUND (run: npm install)${NC}"
        all_ok=false
    fi

    # Check Prisma client
    echo -n "  Prisma client: "
    if [ -d "node_modules/.prisma" ]; then
        echo -e "${GREEN}generated${NC}"
    else
        echo -e "${YELLOW}NOT FOUND (run: npx prisma generate)${NC}"
    fi

    echo ""

    if [ "$all_ok" = false ]; then
        echo -e "${RED}Prerequisites check failed!${NC}"
        return 1
    fi

    echo -e "${GREEN}All prerequisites met!${NC}"
    return 0
}

check_services() {
    print_phase "Phase 0.5: Services Check"

    echo "Checking running services..."
    echo ""

    # Check API
    echo -n "  API (localhost:3333): "
    if curl -s -o /dev/null -w "" --connect-timeout 2 http://localhost:3333/api 2>/dev/null; then
        echo -e "${GREEN}RUNNING${NC}"
    else
        echo -e "${YELLOW}NOT RUNNING${NC}"
        echo "    Start with: npx nx serve api"
    fi

    # Check Web
    echo -n "  Web (localhost:3000): "
    if curl -s -o /dev/null -w "" --connect-timeout 2 http://localhost:3000 2>/dev/null; then
        echo -e "${GREEN}RUNNING${NC}"
    else
        echo -e "${YELLOW}NOT RUNNING${NC}"
        echo "    Start with: npx nx serve web"
    fi

    # Check Admin
    echo -n "  Admin (localhost:4201): "
    if curl -s -o /dev/null -w "" --connect-timeout 2 http://localhost:4201 2>/dev/null; then
        echo -e "${GREEN}RUNNING${NC}"
    else
        echo -e "${YELLOW}NOT RUNNING${NC}"
        echo "    Start with: npx nx serve admin"
    fi

    # Check PostgreSQL
    echo -n "  PostgreSQL (localhost:5432): "
    if command -v pg_isready &> /dev/null && pg_isready -h localhost -p 5432 &> /dev/null; then
        echo -e "${GREEN}RUNNING${NC}"
    elif curl -s -o /dev/null -w "" --connect-timeout 2 http://localhost:5432 2>/dev/null; then
        echo -e "${GREEN}RUNNING${NC}"
    else
        echo -e "${YELLOW}STATUS UNKNOWN${NC}"
    fi

    # Check Redis
    echo -n "  Redis (localhost:6379): "
    if command -v redis-cli &> /dev/null && redis-cli ping &> /dev/null; then
        echo -e "${GREEN}RUNNING${NC}"
    else
        echo -e "${YELLOW}STATUS UNKNOWN${NC}"
    fi

    echo ""
}

seed_if_empty() {
    print_phase "Phase 0.6: Database Seed Check"

    echo "Checking for demo data..."
    echo ""

    # Try to fetch festivals to see if data exists
    local festivals=$(curl -s "http://localhost:3333/api/festivals" 2>/dev/null)
    local count=$(echo "$festivals" | jq -r '.data | length // . | length' 2>/dev/null)

    if [ "$count" -gt 0 ] 2>/dev/null; then
        echo -e "  ${GREEN}Demo data present ($count festivals)${NC}"
    else
        echo -e "  ${YELLOW}No demo data found${NC}"
        echo ""
        echo -n "  Running database seed... "

        if npx prisma db seed 2>/dev/null; then
            echo -e "${GREEN}DONE${NC}"
        else
            echo -e "${YELLOW}SKIPPED (may need manual run)${NC}"
        fi
    fi

    echo ""
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    cd "$SCRIPT_DIR/.."

    print_banner

    # Check prerequisites
    if ! check_prerequisites; then
        echo ""
        echo "Please install missing prerequisites and try again."
        exit 1
    fi

    # Check services
    check_services

    # Seed if empty
    seed_if_empty

    # Run verification scripts
    echo ""
    echo -e "${CYAN}Starting verification suite...${NC}"
    echo ""

    # Phase 1: CI Verification
    run_verification "CI Build Verification" "verify-ci.sh" true || true

    # Phase 2: API Verification
    run_verification "API Verification" "verify-api.sh" false || true

    # Phase 3: Frontend Verification
    run_verification "Frontend Verification" "verify-frontend.sh" false || true

    # Phase 4: Data Verification
    run_verification "Data Integrity" "verify-data.sh" false || true

    # =============================================================================
    # Final Summary
    # =============================================================================

    echo ""
    echo -e "${MAGENTA}======================================================${NC}"
    echo -e "${MAGENTA}  VERIFICATION COMPLETE - FINAL REPORT${NC}"
    echo -e "${MAGENTA}======================================================${NC}"
    echo ""

    echo "Results by Phase:"
    echo ""
    for phase in "${!RESULTS[@]}"; do
        local status="${RESULTS[$phase]}"
        if [ "$status" = "PASSED" ]; then
            echo -e "  ${GREEN}PASS${NC} $phase"
        elif [ "$status" = "FAILED" ]; then
            echo -e "  ${RED}FAIL${NC} $phase"
        else
            echo -e "  ${YELLOW}SKIP${NC} $phase"
        fi
    done

    echo ""
    echo "=============================================="
    echo ""
    echo -e "  ${GREEN}Passed:${NC} $TOTAL_PASSED"
    echo -e "  ${RED}Failed:${NC} $TOTAL_FAILED"
    echo ""

    if [ $TOTAL_FAILED -gt 0 ]; then
        echo -e "${RED}Some verifications failed!${NC}"
        echo ""
        echo "Recommended actions:"
        echo "  1. Check service logs for errors"
        echo "  2. Ensure all services are running"
        echo "  3. Run individual verification scripts for details"
        exit 1
    else
        echo -e "${GREEN}All verifications passed!${NC}"
        echo ""
        echo "Platform is ready for use."
        exit 0
    fi
}

# Parse arguments
case "${1:-}" in
    --api-only)
        check_prerequisites
        run_verification "API Verification" "verify-api.sh" true
        ;;
    --frontend-only)
        check_prerequisites
        run_verification "Frontend Verification" "verify-frontend.sh" true
        ;;
    --ci-only)
        check_prerequisites
        run_verification "CI Build Verification" "verify-ci.sh" true
        ;;
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --api-only       Run only API verification"
        echo "  --frontend-only  Run only frontend verification"
        echo "  --ci-only        Run only CI build verification"
        echo "  --help, -h       Show this help message"
        echo ""
        echo "Without options, runs the complete verification suite."
        exit 0
        ;;
    *)
        main
        ;;
esac
