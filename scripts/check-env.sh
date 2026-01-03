#!/bin/bash
# =============================================================================
# Environment Variables Validation Script
# =============================================================================
# This script validates that all critical environment variables are properly
# configured before deployment to production.
#
# Usage:
#   ./scripts/check-env.sh [environment]
#
# Example:
#   ./scripts/check-env.sh production
#   ./scripts/check-env.sh staging
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Environment (default: production)
ENV="${1:-production}"

# Counters
PASSED=0
FAILED=0
WARNINGS=0

echo ""
echo "=============================================="
echo "  Environment Variables Validation"
echo "  Environment: ${ENV}"
echo "=============================================="
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}ERROR: .env file not found!${NC}"
    echo "Please create a .env file from .env.example"
    exit 1
fi

# Source .env file
set -a
source .env
set +a

# Function to check if a variable exists and is not empty
check_required() {
    local var_name="$1"
    local var_value="${!var_name}"
    local min_length="${2:-1}"

    echo -n "  Checking ${var_name}... "

    if [ -z "$var_value" ]; then
        echo -e "${RED}MISSING${NC}"
        ((FAILED++))
        return 1
    fi

    # Check minimum length
    if [ ${#var_value} -lt $min_length ]; then
        echo -e "${RED}TOO SHORT${NC} (${#var_value} chars, minimum: ${min_length})"
        ((FAILED++))
        return 1
    fi

    echo -e "${GREEN}OK${NC} (${#var_value} chars)"
    ((PASSED++))
    return 0
}

# Function to check if a variable matches a pattern
check_pattern() {
    local var_name="$1"
    local var_value="${!var_name}"
    local pattern="$2"
    local description="$3"

    echo -n "  Checking ${var_name} format... "

    if [ -z "$var_value" ]; then
        echo -e "${RED}MISSING${NC}"
        ((FAILED++))
        return 1
    fi

    if [[ ! "$var_value" =~ $pattern ]]; then
        echo -e "${RED}INVALID FORMAT${NC}"
        echo "    Expected: ${description}"
        echo "    Got: ${var_value:0:20}..."
        ((FAILED++))
        return 1
    fi

    echo -e "${GREEN}OK${NC}"
    ((PASSED++))
    return 0
}

# Function to check if a variable contains default/insecure values
check_not_default() {
    local var_name="$1"
    local var_value="${!var_name}"
    shift
    local forbidden_patterns=("$@")

    echo -n "  Checking ${var_name} is not default... "

    if [ -z "$var_value" ]; then
        echo -e "${RED}MISSING${NC}"
        ((FAILED++))
        return 1
    fi

    for pattern in "${forbidden_patterns[@]}"; do
        if [[ "$var_value" == *"$pattern"* ]]; then
            echo -e "${RED}INSECURE DEFAULT VALUE${NC}"
            echo "    Found forbidden pattern: '${pattern}'"
            ((FAILED++))
            return 1
        fi
    done

    echo -e "${GREEN}OK${NC}"
    ((PASSED++))
    return 0
}

# =============================================================================
# CRITICAL CHECKS - Must pass for production
# =============================================================================

echo -e "${BLUE}[1/7] Checking Node Environment...${NC}"
check_required "NODE_ENV" 1

if [ "$ENV" = "production" ] && [ "$NODE_ENV" != "production" ]; then
    echo -e "${RED}ERROR: NODE_ENV must be 'production' in production environment${NC}"
    ((FAILED++))
else
    echo -e "  ${GREEN}NODE_ENV is correct${NC}"
    ((PASSED++))
fi

echo ""
echo -e "${BLUE}[2/7] Checking Database Configuration...${NC}"
check_required "DATABASE_URL" 20

# Check if DATABASE_URL contains SSL in production
if [ "$ENV" = "production" ]; then
    echo -n "  Checking DATABASE_URL SSL... "
    if [[ "$DATABASE_URL" == *"sslmode=require"* ]] || [[ "$DATABASE_URL" == *"ssl=true"* ]]; then
        echo -e "${GREEN}SSL ENABLED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}SSL MISSING${NC}"
        echo "    Production databases MUST use SSL"
        echo "    Add '?sslmode=require' to DATABASE_URL"
        ((FAILED++))
    fi
fi

check_required "DATABASE_PASSWORD" 16

echo ""
echo -e "${BLUE}[3/7] Checking JWT Secrets...${NC}"
check_required "JWT_ACCESS_SECRET" 32
check_required "JWT_REFRESH_SECRET" 32

if [ "$ENV" = "production" ]; then
    check_not_default "JWT_ACCESS_SECRET" "your_super_secret" "change_in_prod" "CHANGE_IN_PRODUCTION" "example" "test"
    check_not_default "JWT_REFRESH_SECRET" "your_super_secret" "change_in_prod" "CHANGE_IN_PRODUCTION" "example" "test"
fi

# Check that access and refresh secrets are different
echo -n "  Checking JWT secrets are different... "
if [ "$JWT_ACCESS_SECRET" = "$JWT_REFRESH_SECRET" ]; then
    echo -e "${RED}SAME SECRET${NC}"
    echo "    JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different!"
    ((FAILED++))
else
    echo -e "${GREEN}OK${NC}"
    ((PASSED++))
fi

echo ""
echo -e "${BLUE}[4/7] Checking QR Code Secrets...${NC}"
check_required "QR_CODE_SECRET" 32

if [ "$ENV" = "production" ]; then
    check_not_default "QR_CODE_SECRET" "your_qr_code" "change_in_prod" "CHANGE_IN_PRODUCTION" "example" "test"
fi

echo ""
echo -e "${BLUE}[5/7] Checking Stripe Configuration...${NC}"
check_required "STRIPE_SECRET_KEY" 20
check_required "STRIPE_WEBHOOK_SECRET" 20

if [ "$ENV" = "production" ]; then
    check_pattern "STRIPE_SECRET_KEY" "^sk_live_" "Must start with sk_live_ in production"
    check_pattern "STRIPE_WEBHOOK_SECRET" "^whsec_" "Must start with whsec_"
else
    # In non-production, allow test keys
    echo -n "  Checking STRIPE_SECRET_KEY format... "
    if [[ "$STRIPE_SECRET_KEY" =~ ^sk_(test|live)_ ]]; then
        echo -e "${GREEN}OK${NC}"
        ((PASSED++))
    else
        echo -e "${RED}INVALID FORMAT${NC}"
        echo "    Must start with sk_test_ or sk_live_"
        ((FAILED++))
    fi
fi

echo ""
echo -e "${BLUE}[6/7] Checking Redis Configuration...${NC}"
check_required "REDIS_URL" 10

echo ""
echo -e "${BLUE}[7/7] Checking Security Settings...${NC}"

# Check CORS origins in production
if [ "$ENV" = "production" ]; then
    echo -n "  Checking CORS_ORIGINS... "
    if [[ "$CORS_ORIGINS" == *"localhost"* ]]; then
        echo -e "${YELLOW}WARNING${NC}"
        echo "    CORS_ORIGINS contains localhost in production!"
        echo "    Current: $CORS_ORIGINS"
        ((WARNINGS++))
    else
        echo -e "${GREEN}OK${NC}"
        ((PASSED++))
    fi
fi

# Check encryption key
if [ -n "$ENCRYPTION_KEY" ]; then
    check_required "ENCRYPTION_KEY" 32
fi

# =============================================================================
# SUMMARY
# =============================================================================

echo ""
echo "=============================================="
echo "  Validation Summary"
echo "=============================================="
echo -e "  ${GREEN}Passed:${NC}   $PASSED"
echo -e "  ${RED}Failed:${NC}   $FAILED"
echo -e "  ${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}VALIDATION FAILED!${NC}"
    echo ""
    echo "Fix the errors above before deploying to ${ENV}."
    echo ""
    echo "Common fixes:"
    echo "  1. Generate strong secrets: openssl rand -base64 64"
    echo "  2. Add SSL to DATABASE_URL: ?sslmode=require"
    echo "  3. Use production Stripe keys (sk_live_*)"
    echo "  4. Remove localhost from CORS_ORIGINS"
    echo ""
    exit 1
fi

if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}VALIDATION PASSED WITH WARNINGS${NC}"
    echo ""
    echo "Review the warnings above before deploying to ${ENV}."
    echo ""
    exit 0
fi

echo -e "${GREEN}VALIDATION PASSED!${NC}"
echo ""
echo "Environment is properly configured for ${ENV}."
echo ""
exit 0
