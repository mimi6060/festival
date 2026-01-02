#!/bin/bash
# ============================================================================
# PostgreSQL Replication Setup Script
# Festival Management Platform
# ============================================================================
# This script sets up streaming replication between primary and replica nodes
# Run on the PRIMARY server first, then on REPLICA servers
# ============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/postgresql/replication-setup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    log "${RED}ERROR: $1${NC}"
    exit 1
}

success() {
    log "${GREEN}SUCCESS: $1${NC}"
}

warn() {
    log "${YELLOW}WARNING: $1${NC}"
}

# Check if running as postgres user or root
check_user() {
    if [[ $EUID -ne 0 ]] && [[ $(whoami) != "postgres" ]]; then
        error "This script must be run as root or postgres user"
    fi
}

# Check required environment variables
check_env() {
    local required_vars=("POSTGRES_PASSWORD" "REPLICATOR_PASSWORD")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Required environment variable $var is not set"
        fi
    done
}

# Setup primary server
setup_primary() {
    log "Setting up PRIMARY server..."

    # Create replication user
    log "Creating replication user..."
    sudo -u postgres psql -c "
        DO \$\$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'replicator') THEN
                CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD '${REPLICATOR_PASSWORD}';
            ELSE
                ALTER ROLE replicator WITH PASSWORD '${REPLICATOR_PASSWORD}';
            END IF;
        END
        \$\$;
    " || error "Failed to create replication user"

    # Create replication slots for each replica
    for i in 1 2 3; do
        local slot_name="replica${i}_slot"
        log "Creating replication slot: $slot_name"
        sudo -u postgres psql -c "
            SELECT pg_create_physical_replication_slot('${slot_name}', true)
            WHERE NOT EXISTS (
                SELECT 1 FROM pg_replication_slots WHERE slot_name = '${slot_name}'
            );
        " 2>/dev/null || warn "Slot $slot_name may already exist"
    done

    # Update pg_hba.conf for replication
    log "Updating pg_hba.conf..."
    local PG_HBA="/etc/postgresql/16/main/pg_hba.conf"

    if ! grep -q "replicator" "$PG_HBA" 2>/dev/null; then
        cat >> "$PG_HBA" <<EOF

# Replication connections
hostssl replication replicator 10.0.0.0/8 scram-sha-256
hostssl replication replicator 172.16.0.0/12 scram-sha-256
hostssl replication replicator 192.168.0.0/16 scram-sha-256
EOF
    fi

    # Reload configuration
    log "Reloading PostgreSQL configuration..."
    sudo -u postgres psql -c "SELECT pg_reload_conf();" || error "Failed to reload config"

    success "Primary server setup complete"
}

# Setup replica server
setup_replica() {
    local PRIMARY_HOST="${1:-primary}"
    local REPLICA_NAME="${2:-replica1}"
    local SLOT_NAME="${REPLICA_NAME}_slot"

    log "Setting up REPLICA server: $REPLICA_NAME..."

    # Stop PostgreSQL if running
    log "Stopping PostgreSQL..."
    systemctl stop postgresql || true

    # Remove existing data directory
    local DATA_DIR="/var/lib/postgresql/16/main"
    log "Cleaning data directory..."
    rm -rf "$DATA_DIR"/*

    # Create base backup from primary
    log "Creating base backup from primary: $PRIMARY_HOST..."
    sudo -u postgres pg_basebackup \
        --host="$PRIMARY_HOST" \
        --port=5432 \
        --username=replicator \
        --pgdata="$DATA_DIR" \
        --wal-method=stream \
        --slot="$SLOT_NAME" \
        --create-slot \
        --checkpoint=fast \
        --progress \
        --verbose \
        || error "Base backup failed"

    # Create standby.signal
    log "Creating standby.signal..."
    touch "$DATA_DIR/standby.signal"
    chown postgres:postgres "$DATA_DIR/standby.signal"

    # Configure primary_conninfo in postgresql.auto.conf
    log "Configuring replication connection..."
    sudo -u postgres psql -c "
        ALTER SYSTEM SET primary_conninfo = 'host=$PRIMARY_HOST port=5432 user=replicator password=${REPLICATOR_PASSWORD} application_name=$REPLICA_NAME sslmode=require';
        ALTER SYSTEM SET primary_slot_name = '$SLOT_NAME';
        ALTER SYSTEM SET recovery_target_timeline = 'latest';
        ALTER SYSTEM SET hot_standby = 'on';
        ALTER SYSTEM SET hot_standby_feedback = 'on';
    " || true  # Might fail if PostgreSQL not running, that's ok

    # Write to postgresql.auto.conf directly if needed
    cat >> "$DATA_DIR/postgresql.auto.conf" <<EOF

# Replication settings (added by setup script)
primary_conninfo = 'host=$PRIMARY_HOST port=5432 user=replicator password=${REPLICATOR_PASSWORD} application_name=$REPLICA_NAME sslmode=require'
primary_slot_name = '$SLOT_NAME'
recovery_target_timeline = 'latest'
hot_standby = on
hot_standby_feedback = on
EOF

    chown postgres:postgres "$DATA_DIR/postgresql.auto.conf"

    # Start PostgreSQL
    log "Starting PostgreSQL..."
    systemctl start postgresql || error "Failed to start PostgreSQL"

    success "Replica server setup complete"
}

# Check replication status
check_replication() {
    log "Checking replication status..."

    # On primary - check connected replicas
    log "Replication slots status:"
    sudo -u postgres psql -c "
        SELECT slot_name,
               slot_type,
               active,
               active_pid,
               restart_lsn,
               confirmed_flush_lsn
        FROM pg_replication_slots;
    "

    log "Connected replicas:"
    sudo -u postgres psql -c "
        SELECT client_addr,
               application_name,
               state,
               sync_state,
               sent_lsn,
               write_lsn,
               flush_lsn,
               replay_lsn,
               pg_wal_lsn_diff(sent_lsn, replay_lsn) AS replication_lag_bytes
        FROM pg_stat_replication;
    "

    log "WAL receiver status (on replica):"
    sudo -u postgres psql -c "
        SELECT status,
               receive_start_lsn,
               received_lsn,
               last_msg_receipt_time,
               sender_host,
               sender_port
        FROM pg_stat_wal_receiver;
    " 2>/dev/null || warn "Not running on a replica"
}

# Promote replica to primary (for failover)
promote_replica() {
    log "Promoting replica to primary..."

    if [[ ! -f "/var/lib/postgresql/16/main/standby.signal" ]]; then
        error "This server is not a replica (standby.signal not found)"
    fi

    # Promote using pg_ctl
    sudo -u postgres pg_ctl promote -D /var/lib/postgresql/16/main

    success "Replica promoted to primary. Update application connection strings!"
}

# Switchover (planned failover)
switchover() {
    local NEW_PRIMARY="${1:-}"

    if [[ -z "$NEW_PRIMARY" ]]; then
        error "Usage: $0 switchover <new-primary-host>"
    fi

    log "Initiating switchover to $NEW_PRIMARY..."

    warn "Please ensure:"
    warn "1. All applications are stopped or in read-only mode"
    warn "2. All replicas are caught up (check replication lag)"
    warn "3. You have a backup of the current state"

    read -p "Continue with switchover? (yes/no): " confirm
    if [[ "$confirm" != "yes" ]]; then
        error "Switchover cancelled"
    fi

    # Stop accepting new writes
    log "Setting primary to read-only mode..."
    sudo -u postgres psql -c "ALTER SYSTEM SET default_transaction_read_only = on;"
    sudo -u postgres psql -c "SELECT pg_reload_conf();"

    # Wait for replication to catch up
    log "Waiting for replication to sync..."
    sleep 5

    # Check replication lag
    local lag=$(sudo -u postgres psql -t -c "
        SELECT MAX(pg_wal_lsn_diff(sent_lsn, replay_lsn))
        FROM pg_stat_replication;
    " | tr -d ' ')

    if [[ "$lag" -gt 0 ]]; then
        warn "Replication lag detected: $lag bytes. Waiting..."
        sleep 10
    fi

    log "Stopping current primary..."
    systemctl stop postgresql

    log "Promote $NEW_PRIMARY manually by running: $0 promote on that server"

    success "Current primary stopped. Promote the new primary now."
}

# Cleanup old WAL files
cleanup_wal() {
    log "Cleaning up old WAL files..."

    # Remove inactive replication slots
    sudo -u postgres psql -c "
        SELECT pg_drop_replication_slot(slot_name)
        FROM pg_replication_slots
        WHERE NOT active AND slot_name LIKE 'replica%';
    " 2>/dev/null || warn "No inactive slots to clean up"

    success "WAL cleanup complete"
}

# Show usage
usage() {
    cat <<EOF
Usage: $0 <command> [options]

Commands:
    primary                 Setup this server as primary
    replica <primary-host> [replica-name]
                           Setup this server as replica
    status                  Check replication status
    promote                 Promote this replica to primary
    switchover <new-primary>
                           Initiate planned failover
    cleanup                 Clean up old WAL files and slots

Environment Variables:
    POSTGRES_PASSWORD       PostgreSQL superuser password
    REPLICATOR_PASSWORD     Replication user password

Examples:
    $0 primary              # Setup as primary
    $0 replica db-primary   # Setup as replica connecting to db-primary
    $0 replica db-primary replica2
                            # Setup as replica2 connecting to db-primary
    $0 status               # Check replication status
    $0 promote              # Promote replica to primary
EOF
}

# Main
main() {
    check_user
    check_env

    case "${1:-}" in
        primary)
            setup_primary
            ;;
        replica)
            setup_replica "${2:-primary}" "${3:-replica1}"
            ;;
        status)
            check_replication
            ;;
        promote)
            promote_replica
            ;;
        switchover)
            switchover "${2:-}"
            ;;
        cleanup)
            cleanup_wal
            ;;
        *)
            usage
            exit 1
            ;;
    esac
}

main "$@"
