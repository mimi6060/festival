#!/usr/bin/env bash
# =============================================================================
# Secrets Rotation Script - Festival Management Platform
# =============================================================================
# This script automates the rotation of all sensitive secrets used by the
# Festival Platform. It supports multiple secret managers and environments.
#
# Usage:
#   ./rotate-secrets.sh [OPTIONS]
#
# Options:
#   -e, --env          Environment (dev, staging, production)
#   -s, --secret       Specific secret to rotate (or 'all')
#   -d, --dry-run      Show what would be done without making changes
#   -f, --force        Skip confirmation prompts
#   -v, --verbose      Verbose output
#   -h, --help         Show this help message
#
# Examples:
#   ./rotate-secrets.sh -e production -s jwt           # Rotate JWT secret
#   ./rotate-secrets.sh -e staging -s all              # Rotate all secrets
#   ./rotate-secrets.sh -e production -s database -d   # Dry run
#
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="${PROJECT_ROOT}/logs/secrets"
BACKUP_DIR="${PROJECT_ROOT}/backups/secrets"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=""
SECRET_TYPE="all"
DRY_RUN=false
FORCE=false
VERBOSE=false

# Secret types that can be rotated
ROTATABLE_SECRETS=(
    "jwt"
    "refresh_token"
    "database"
    "redis"
    "stripe"
    "encryption"
    "api_keys"
    "webhook"
)

# =============================================================================
# Helper Functions
# =============================================================================

log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")

    case $level in
        "INFO")
            echo -e "${BLUE}[INFO]${NC} ${timestamp} - ${message}"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[SUCCESS]${NC} ${timestamp} - ${message}"
            ;;
        "WARNING")
            echo -e "${YELLOW}[WARNING]${NC} ${timestamp} - ${message}"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} ${timestamp} - ${message}"
            ;;
        "DEBUG")
            if [[ "$VERBOSE" == "true" ]]; then
                echo -e "[DEBUG] ${timestamp} - ${message}"
            fi
            ;;
    esac

    # Also log to file
    mkdir -p "$LOG_DIR"
    echo "[${level}] ${timestamp} - ${message}" >> "${LOG_DIR}/rotation_${TIMESTAMP}.log"
}

show_help() {
    cat << EOF
Secrets Rotation Script - Festival Management Platform

Usage: $(basename "$0") [OPTIONS]

Options:
    -e, --env          Environment (dev, staging, production) [REQUIRED]
    -s, --secret       Secret to rotate: jwt, refresh_token, database, redis,
                       stripe, encryption, api_keys, webhook, or 'all'
                       Default: all
    -d, --dry-run      Show what would be done without making changes
    -f, --force        Skip confirmation prompts
    -v, --verbose      Verbose output
    -h, --help         Show this help message

Rotatable Secrets:
    jwt             - JWT signing secret for access tokens
    refresh_token   - Refresh token signing secret
    database        - Database password
    redis           - Redis password
    stripe          - Stripe API keys
    encryption      - AES encryption key for sensitive data
    api_keys        - Internal API keys
    webhook         - Webhook signing secrets

Examples:
    $(basename "$0") -e production -s jwt           # Rotate JWT secret
    $(basename "$0") -e staging -s all              # Rotate all secrets
    $(basename "$0") -e production -s database -d   # Dry run

Security Notes:
    - Always run in dry-run mode first
    - Ensure you have recent backups before rotating
    - Production rotations should be scheduled during low traffic
    - Some rotations require application restart

EOF
}

generate_secret() {
    local length=${1:-64}
    openssl rand -base64 "$length" | tr -d '\n/+=' | head -c "$length"
}

generate_password() {
    local length=${1:-32}
    LC_ALL=C tr -dc 'A-Za-z0-9!@#$%^&*()_+-=' < /dev/urandom | head -c "$length"
}

generate_api_key() {
    local prefix=${1:-"fst"}
    echo "${prefix}_$(openssl rand -hex 32)"
}

backup_secret() {
    local secret_name=$1
    local secret_value=$2

    mkdir -p "$BACKUP_DIR/$ENVIRONMENT"

    if command -v gpg &> /dev/null && [[ -n "${GPG_KEY_ID:-}" ]]; then
        echo "$secret_value" | gpg --encrypt --recipient "$GPG_KEY_ID" \
            > "${BACKUP_DIR}/${ENVIRONMENT}/${secret_name}_${TIMESTAMP}.gpg"
        log "DEBUG" "Backup encrypted with GPG: ${secret_name}"
    else
        echo "$secret_value" > "${BACKUP_DIR}/${ENVIRONMENT}/${secret_name}_${TIMESTAMP}.bak"
        chmod 600 "${BACKUP_DIR}/${ENVIRONMENT}/${secret_name}_${TIMESTAMP}.bak"
        log "WARNING" "Backup stored without encryption (GPG not configured)"
    fi
}

# =============================================================================
# AWS Secrets Manager Functions
# =============================================================================

get_aws_secret() {
    local secret_id=$1
    aws secretsmanager get-secret-value \
        --secret-id "$secret_id" \
        --query 'SecretString' \
        --output text 2>/dev/null || echo ""
}

update_aws_secret() {
    local secret_id=$1
    local secret_value=$2

    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "[DRY RUN] Would update AWS secret: $secret_id"
        return 0
    fi

    aws secretsmanager update-secret \
        --secret-id "$secret_id" \
        --secret-string "$secret_value"

    log "SUCCESS" "Updated AWS secret: $secret_id"
}

# =============================================================================
# Kubernetes Secrets Functions
# =============================================================================

update_k8s_secret() {
    local namespace=$1
    local secret_name=$2
    local key=$3
    local value=$4

    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "[DRY RUN] Would update K8s secret: $namespace/$secret_name.$key"
        return 0
    fi

    kubectl get secret "$secret_name" -n "$namespace" -o json | \
        jq --arg key "$key" --arg value "$(echo -n "$value" | base64)" \
        '.data[$key] = $value' | \
        kubectl apply -f -

    log "SUCCESS" "Updated K8s secret: $namespace/$secret_name.$key"
}

# =============================================================================
# Secret Rotation Functions
# =============================================================================

rotate_jwt_secret() {
    log "INFO" "Rotating JWT signing secret..."

    local new_secret=$(generate_secret 64)

    local current_secret=$(get_aws_secret "festival/${ENVIRONMENT}/jwt-secret")
    if [[ -n "$current_secret" ]]; then
        backup_secret "jwt_secret" "$current_secret"
    fi

    update_aws_secret "festival/${ENVIRONMENT}/jwt-secret" "$new_secret"

    if kubectl get namespace festival-"$ENVIRONMENT" &>/dev/null; then
        update_k8s_secret "festival-${ENVIRONMENT}" "api-secrets" "JWT_SECRET" "$new_secret"
    fi

    log "SUCCESS" "JWT secret rotated successfully"
    log "WARNING" "Application pods need to be restarted to pick up new secret"
}

rotate_refresh_token_secret() {
    log "INFO" "Rotating refresh token secret..."

    local new_secret=$(generate_secret 64)

    local current_secret=$(get_aws_secret "festival/${ENVIRONMENT}/refresh-token-secret")
    if [[ -n "$current_secret" ]]; then
        backup_secret "refresh_token_secret" "$current_secret"
    fi

    update_aws_secret "festival/${ENVIRONMENT}/refresh-token-secret" "$new_secret"

    if kubectl get namespace festival-"$ENVIRONMENT" &>/dev/null; then
        update_k8s_secret "festival-${ENVIRONMENT}" "api-secrets" "JWT_REFRESH_SECRET" "$new_secret"
    fi

    log "SUCCESS" "Refresh token secret rotated"
    log "WARNING" "All existing refresh tokens will be invalidated"
}

rotate_database_password() {
    log "INFO" "Rotating database password..."

    local new_password=$(generate_password 32)

    local current_password=$(get_aws_secret "festival/${ENVIRONMENT}/database-password")
    if [[ -n "$current_password" ]]; then
        backup_secret "database_password" "$current_password"
    fi

    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "[DRY RUN] Would rotate database password"
        return 0
    fi

    local db_instance="festival-${ENVIRONMENT}-db"

    log "INFO" "Updating RDS master password..."
    aws rds modify-db-instance \
        --db-instance-identifier "$db_instance" \
        --master-user-password "$new_password" \
        --apply-immediately

    update_aws_secret "festival/${ENVIRONMENT}/database-password" "$new_password"

    local db_host=$(aws rds describe-db-instances \
        --db-instance-identifier "$db_instance" \
        --query 'DBInstances[0].Endpoint.Address' \
        --output text)

    local connection_string="postgresql://festival:${new_password}@${db_host}:5432/festival_${ENVIRONMENT}"
    update_aws_secret "festival/${ENVIRONMENT}/database-url" "$connection_string"

    if kubectl get namespace festival-"$ENVIRONMENT" &>/dev/null; then
        update_k8s_secret "festival-${ENVIRONMENT}" "api-secrets" "DATABASE_URL" "$connection_string"
    fi

    log "SUCCESS" "Database password rotated"
    log "WARNING" "Application pods need to be restarted"
}

rotate_redis_password() {
    log "INFO" "Rotating Redis password..."

    local new_password=$(generate_password 32)

    local current_password=$(get_aws_secret "festival/${ENVIRONMENT}/redis-password")
    if [[ -n "$current_password" ]]; then
        backup_secret "redis_password" "$current_password"
    fi

    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "[DRY RUN] Would rotate Redis password"
        return 0
    fi

    local redis_cluster="festival-${ENVIRONMENT}-redis"

    log "INFO" "Updating ElastiCache auth token..."
    aws elasticache modify-replication-group \
        --replication-group-id "$redis_cluster" \
        --auth-token "$new_password" \
        --auth-token-update-strategy ROTATE \
        --apply-immediately

    update_aws_secret "festival/${ENVIRONMENT}/redis-password" "$new_password"

    if kubectl get namespace festival-"$ENVIRONMENT" &>/dev/null; then
        local redis_url="redis://:${new_password}@${redis_cluster}.cache.amazonaws.com:6379"
        update_k8s_secret "festival-${ENVIRONMENT}" "api-secrets" "REDIS_URL" "$redis_url"
    fi

    log "SUCCESS" "Redis password rotated"
}

rotate_stripe_keys() {
    log "INFO" "Rotating Stripe API keys..."

    log "WARNING" "Stripe API key rotation requires manual steps:"
    log "INFO" "1. Generate new restricted API key in Stripe Dashboard"
    log "INFO" "2. Update the key in AWS Secrets Manager"
    log "INFO" "3. Test with the new key"
    log "INFO" "4. Revoke the old key in Stripe Dashboard"

    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "[DRY RUN] Stripe key rotation is semi-manual"
        return 0
    fi

    if [[ "$FORCE" != "true" ]]; then
        read -rp "Enter new Stripe Secret Key (or press Enter to skip): " new_stripe_key

        if [[ -n "$new_stripe_key" ]]; then
            local current_key=$(get_aws_secret "festival/${ENVIRONMENT}/stripe-secret-key")
            if [[ -n "$current_key" ]]; then
                backup_secret "stripe_secret_key" "$current_key"
            fi

            update_aws_secret "festival/${ENVIRONMENT}/stripe-secret-key" "$new_stripe_key"

            if kubectl get namespace festival-"$ENVIRONMENT" &>/dev/null; then
                update_k8s_secret "festival-${ENVIRONMENT}" "api-secrets" "STRIPE_SECRET_KEY" "$new_stripe_key"
            fi

            log "SUCCESS" "Stripe secret key updated"
        else
            log "INFO" "Skipping Stripe key rotation"
        fi
    fi
}

rotate_encryption_key() {
    log "INFO" "Rotating AES encryption key..."

    local new_key=$(openssl rand -hex 32)

    local current_key=$(get_aws_secret "festival/${ENVIRONMENT}/encryption-key")
    if [[ -n "$current_key" ]]; then
        backup_secret "encryption_key" "$current_key"
    fi

    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "[DRY RUN] Would rotate encryption key"
        return 0
    fi

    log "WARNING" "Encryption key rotation requires data re-encryption!"
    log "INFO" "Steps required after key rotation:"
    log "INFO" "1. Keep old key available for decryption"
    log "INFO" "2. Run data migration to re-encrypt with new key"
    log "INFO" "3. Remove old key after migration is complete"

    if [[ "$FORCE" != "true" ]]; then
        read -rp "Continue with encryption key rotation? (yes/no): " confirm
        if [[ "$confirm" != "yes" ]]; then
            log "INFO" "Encryption key rotation cancelled"
            return 0
        fi
    fi

    update_aws_secret "festival/${ENVIRONMENT}/encryption-key-new" "$new_key"

    log "SUCCESS" "New encryption key generated and stored"
    log "WARNING" "Run data migration before activating new key"
}

rotate_api_keys() {
    log "INFO" "Rotating internal API keys..."

    local new_admin_key=$(generate_api_key "fst_admin")
    local new_service_key=$(generate_api_key "fst_svc")
    local new_webhook_key=$(generate_api_key "fst_whk")

    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "[DRY RUN] Would generate new API keys"
        return 0
    fi

    backup_secret "api_keys" "$(get_aws_secret "festival/${ENVIRONMENT}/api-keys")"

    local api_keys_json=$(cat << EOF
{
    "admin_api_key": "${new_admin_key}",
    "service_api_key": "${new_service_key}",
    "webhook_api_key": "${new_webhook_key}",
    "rotated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
)

    update_aws_secret "festival/${ENVIRONMENT}/api-keys" "$api_keys_json"

    log "SUCCESS" "API keys rotated"
    log "INFO" "New Admin API Key: ${new_admin_key:0:20}..."
}

rotate_webhook_secret() {
    log "INFO" "Rotating webhook signing secret..."

    local new_secret=$(generate_secret 32)

    local current_secret=$(get_aws_secret "festival/${ENVIRONMENT}/webhook-secret")
    if [[ -n "$current_secret" ]]; then
        backup_secret "webhook_secret" "$current_secret"
    fi

    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "[DRY RUN] Would rotate webhook secret"
        return 0
    fi

    update_aws_secret "festival/${ENVIRONMENT}/webhook-secret" "$new_secret"

    if kubectl get namespace festival-"$ENVIRONMENT" &>/dev/null; then
        update_k8s_secret "festival-${ENVIRONMENT}" "api-secrets" "WEBHOOK_SECRET" "$new_secret"
    fi

    log "SUCCESS" "Webhook secret rotated"
    log "WARNING" "Update webhook secret in external services (Stripe, etc.)"
}

# =============================================================================
# Main Rotation Orchestration
# =============================================================================

rotate_all_secrets() {
    log "INFO" "Starting rotation of all secrets for environment: $ENVIRONMENT"

    local failed=0

    for secret in "${ROTATABLE_SECRETS[@]}"; do
        log "INFO" "Processing: $secret"

        case $secret in
            "jwt")
                rotate_jwt_secret || ((failed++))
                ;;
            "refresh_token")
                rotate_refresh_token_secret || ((failed++))
                ;;
            "database")
                rotate_database_password || ((failed++))
                ;;
            "redis")
                rotate_redis_password || ((failed++))
                ;;
            "stripe")
                rotate_stripe_keys || ((failed++))
                ;;
            "encryption")
                rotate_encryption_key || ((failed++))
                ;;
            "api_keys")
                rotate_api_keys || ((failed++))
                ;;
            "webhook")
                rotate_webhook_secret || ((failed++))
                ;;
        esac

        echo ""
    done

    if [[ $failed -gt 0 ]]; then
        log "ERROR" "$failed secret(s) failed to rotate"
        return 1
    fi

    log "SUCCESS" "All secrets rotated successfully"
}

rotate_single_secret() {
    local secret=$1

    case $secret in
        "jwt")
            rotate_jwt_secret
            ;;
        "refresh_token")
            rotate_refresh_token_secret
            ;;
        "database")
            rotate_database_password
            ;;
        "redis")
            rotate_redis_password
            ;;
        "stripe")
            rotate_stripe_keys
            ;;
        "encryption")
            rotate_encryption_key
            ;;
        "api_keys")
            rotate_api_keys
            ;;
        "webhook")
            rotate_webhook_secret
            ;;
        *)
            log "ERROR" "Unknown secret type: $secret"
            log "INFO" "Valid types: ${ROTATABLE_SECRETS[*]}"
            exit 1
            ;;
    esac
}

# =============================================================================
# Pre-flight Checks
# =============================================================================

preflight_checks() {
    log "INFO" "Running pre-flight checks..."

    local required_tools=("aws" "jq" "openssl")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log "ERROR" "Required tool not found: $tool"
            exit 1
        fi
    done

    if ! aws sts get-caller-identity &> /dev/null; then
        log "ERROR" "AWS credentials not configured or expired"
        exit 1
    fi

    if command -v kubectl &> /dev/null; then
        if kubectl cluster-info &> /dev/null; then
            log "DEBUG" "Kubernetes cluster accessible"
        else
            log "WARNING" "Kubernetes cluster not accessible, K8s updates will be skipped"
        fi
    fi

    log "SUCCESS" "Pre-flight checks passed"
}

# =============================================================================
# Argument Parsing
# =============================================================================

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -s|--secret)
                SECRET_TYPE="$2"
                shift 2
                ;;
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -f|--force)
                FORCE=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log "ERROR" "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    if [[ -z "$ENVIRONMENT" ]]; then
        log "ERROR" "Environment is required (-e, --env)"
        show_help
        exit 1
    fi

    if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|production)$ ]]; then
        log "ERROR" "Invalid environment: $ENVIRONMENT"
        log "INFO" "Valid environments: dev, staging, production"
        exit 1
    fi
}

# =============================================================================
# Main Entry Point
# =============================================================================

main() {
    parse_args "$@"

    echo ""
    echo "=============================================="
    echo "  Secrets Rotation - Festival Platform"
    echo "=============================================="
    echo "  Environment: $ENVIRONMENT"
    echo "  Secret:      $SECRET_TYPE"
    echo "  Dry Run:     $DRY_RUN"
    echo "  Timestamp:   $TIMESTAMP"
    echo "=============================================="
    echo ""

    if [[ "$DRY_RUN" == "true" ]]; then
        log "WARNING" "Running in DRY RUN mode - no changes will be made"
    fi

    if [[ "$ENVIRONMENT" == "production" && "$FORCE" != "true" && "$DRY_RUN" != "true" ]]; then
        log "WARNING" "You are about to rotate secrets in PRODUCTION!"
        read -rp "Type 'ROTATE PRODUCTION' to confirm: " confirm
        if [[ "$confirm" != "ROTATE PRODUCTION" ]]; then
            log "INFO" "Operation cancelled"
            exit 0
        fi
    fi

    preflight_checks

    if [[ "$SECRET_TYPE" == "all" ]]; then
        rotate_all_secrets
    else
        rotate_single_secret "$SECRET_TYPE"
    fi

    echo ""
    log "INFO" "Rotation complete. Log file: ${LOG_DIR}/rotation_${TIMESTAMP}.log"

    if [[ "$DRY_RUN" != "true" ]]; then
        log "WARNING" "Remember to:"
        log "INFO" "  1. Restart application pods to pick up new secrets"
        log "INFO" "  2. Verify application functionality"
        log "INFO" "  3. Update any external integrations if needed"
        log "INFO" "  4. Monitor for authentication/connection errors"
    fi
}

main "$@"
