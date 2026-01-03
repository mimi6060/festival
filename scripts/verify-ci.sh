#!/bin/bash
# =============================================================================
# CI Verification Script - Festival Platform
# =============================================================================
# This script simulates what GitHub Actions will run
# Run this before pushing to ensure CI will pass
# =============================================================================

set -e

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

echo ""
echo "=============================================="
echo "  Festival Platform - CI Verification"
echo "=============================================="
echo ""

# Function to run a check
run_check() {
    local name="$1"
    local command="$2"
    local required="${3:-true}"

    echo -n "  $name... "

    if eval "$command" > /tmp/ci-check.log 2>&1; then
        echo -e "${GREEN}PASSED${NC}"
        ((PASSED++))
        return 0
    else
        if [ "$required" = "true" ]; then
            echo -e "${RED}FAILED${NC}"
            ((FAILED++))
            echo -e "    ${RED}Error output:${NC}"
            tail -10 /tmp/ci-check.log | sed 's/^/    /'
            return 1
        else
            echo -e "${YELLOW}WARNING${NC}"
            ((WARNINGS++))
            return 0
        fi
    fi
}

echo -e "${BLUE}[1/5] Checking dependencies...${NC}"
run_check "Node modules installed" "test -d node_modules"
run_check "Package lock exists" "test -f package-lock.json"

echo ""
echo -e "${BLUE}[2/5] Generating Prisma client...${NC}"
run_check "Prisma generate" "npx prisma generate" false

echo ""
echo -e "${BLUE}[3/5] TypeScript compilation...${NC}"
run_check "API TypeScript check" "npx tsc --noEmit --project apps/api/tsconfig.json" false

echo ""
echo -e "${BLUE}[4/5] Building projects...${NC}"
run_check "Build API" "npx nx build api --skip-nx-cache"
run_check "Build Web" "npx nx build web --skip-nx-cache" false
run_check "Build Admin" "npx nx build admin --skip-nx-cache" false

echo ""
echo -e "${BLUE}[5/5] Running tests...${NC}"
run_check "API tests" "npx nx test api --passWithNoTests" false

echo ""
echo "=============================================="
echo "  Summary"
echo "=============================================="
echo -e "  ${GREEN}Passed:${NC}   $PASSED"
echo -e "  ${RED}Failed:${NC}   $FAILED"
echo -e "  ${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}CI verification FAILED!${NC}"
    echo "Fix the issues above before pushing."
    exit 1
else
    echo -e "${GREEN}CI verification PASSED!${NC}"
    echo "Safe to push to GitHub."
    exit 0
fi
