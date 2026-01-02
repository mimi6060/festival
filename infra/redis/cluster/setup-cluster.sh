#!/bin/bash
# ============================================================================
# Redis Cluster Setup Script
# Festival Management Platform
# ============================================================================
# This script sets up and manages a Redis Cluster
# ============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REDIS_PASSWORD="${REDIS_PASSWORD:-redis_secret}"
REDIS_PORT="${REDIS_PORT:-6379}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1"; }
error() { log "${RED}ERROR: $1${NC}"; exit 1; }
success() { log "${GREEN}SUCCESS: $1${NC}"; }
warn() { log "${YELLOW}WARNING: $1${NC}"; }
info() { log "${BLUE}INFO: $1${NC}"; }

# Redis CLI wrapper with auth
redis_cli() {
    local host="${1:-localhost}"
    local port="${2:-6379}"
    shift 2
    redis-cli -h "$host" -p "$port" -a "$REDIS_PASSWORD" --no-auth-warning "$@"
}

# Check cluster status
check_status() {
    local host="${1:-localhost}"
    local port="${2:-6379}"

    info "Checking Redis Cluster status..."

    echo ""
    echo "=== Cluster Info ==="
    redis_cli "$host" "$port" cluster info

    echo ""
    echo "=== Cluster Nodes ==="
    redis_cli "$host" "$port" cluster nodes

    echo ""
    echo "=== Cluster Slots ==="
    redis_cli "$host" "$port" cluster slots

    echo ""
    echo "=== Memory Info ==="
    redis_cli "$host" "$port" info memory | grep -E "used_memory_human|maxmemory_human|mem_fragmentation_ratio"

    echo ""
    echo "=== Replication Info ==="
    redis_cli "$host" "$port" info replication | grep -E "role|connected_slaves|master_link_status"
}

# Create cluster
create_cluster() {
    local nodes="${1:-}"

    if [[ -z "$nodes" ]]; then
        error "Usage: $0 create <node1:port> <node2:port> ..."
    fi

    info "Creating Redis Cluster with nodes: $nodes"

    # Check if nodes are reachable
    for node in $nodes; do
        local host=$(echo "$node" | cut -d: -f1)
        local port=$(echo "$node" | cut -d: -f2)
        if ! redis_cli "$host" "$port" ping > /dev/null 2>&1; then
            error "Node $node is not reachable"
        fi
    done

    # Create the cluster
    redis-cli -a "$REDIS_PASSWORD" --no-auth-warning --cluster create $nodes \
        --cluster-replicas 1 \
        --cluster-yes

    success "Redis Cluster created successfully!"
    check_status
}

# Add node to cluster
add_node() {
    local new_node="${1:-}"
    local existing_node="${2:-}"
    local as_replica="${3:-false}"

    if [[ -z "$new_node" ]] || [[ -z "$existing_node" ]]; then
        error "Usage: $0 add-node <new-node:port> <existing-node:port> [--replica <master-id>]"
    fi

    info "Adding node $new_node to cluster via $existing_node..."

    if [[ "$as_replica" == "true" ]] && [[ -n "${4:-}" ]]; then
        redis-cli -a "$REDIS_PASSWORD" --no-auth-warning \
            --cluster add-node "$new_node" "$existing_node" \
            --cluster-slave --cluster-master-id "$4"
    else
        redis-cli -a "$REDIS_PASSWORD" --no-auth-warning \
            --cluster add-node "$new_node" "$existing_node"
    fi

    success "Node added successfully!"
}

# Remove node from cluster
remove_node() {
    local node="${1:-}"
    local node_id="${2:-}"

    if [[ -z "$node" ]] || [[ -z "$node_id" ]]; then
        error "Usage: $0 remove-node <any-node:port> <node-id-to-remove>"
    fi

    warn "Removing node $node_id from cluster..."

    # First, reshard if this is a master with slots
    local slots=$(redis_cli "${node%:*}" "${node#*:}" cluster nodes | grep "$node_id" | awk '{print $8}')
    if [[ -n "$slots" ]] && [[ "$slots" != "slave" ]]; then
        warn "Node has slots assigned. Resharding first..."
        redis-cli -a "$REDIS_PASSWORD" --no-auth-warning \
            --cluster reshard "$node" \
            --cluster-from "$node_id" \
            --cluster-to "$(redis_cli "${node%:*}" "${node#*:}" cluster nodes | grep master | grep -v "$node_id" | head -1 | awk '{print $1}')" \
            --cluster-slots 0 \
            --cluster-yes
    fi

    redis-cli -a "$REDIS_PASSWORD" --no-auth-warning \
        --cluster del-node "$node" "$node_id"

    success "Node removed successfully!"
}

# Reshard slots between nodes
reshard() {
    local node="${1:-}"
    local from="${2:-}"
    local to="${3:-}"
    local slots="${4:-}"

    if [[ -z "$node" ]] || [[ -z "$from" ]] || [[ -z "$to" ]] || [[ -z "$slots" ]]; then
        error "Usage: $0 reshard <any-node:port> <from-node-id> <to-node-id> <num-slots>"
    fi

    info "Resharding $slots slots from $from to $to..."

    redis-cli -a "$REDIS_PASSWORD" --no-auth-warning \
        --cluster reshard "$node" \
        --cluster-from "$from" \
        --cluster-to "$to" \
        --cluster-slots "$slots" \
        --cluster-yes

    success "Resharding complete!"
}

# Rebalance cluster slots
rebalance() {
    local node="${1:-localhost:6379}"

    info "Rebalancing cluster slots..."

    redis-cli -a "$REDIS_PASSWORD" --no-auth-warning \
        --cluster rebalance "$node" \
        --cluster-use-empty-masters

    success "Cluster rebalanced!"
}

# Check cluster health
check_health() {
    local node="${1:-localhost:6379}"

    info "Checking cluster health..."

    redis-cli -a "$REDIS_PASSWORD" --no-auth-warning \
        --cluster check "$node"
}

# Fix cluster issues
fix_cluster() {
    local node="${1:-localhost:6379}"

    warn "Attempting to fix cluster issues..."

    redis-cli -a "$REDIS_PASSWORD" --no-auth-warning \
        --cluster fix "$node" \
        --cluster-fix-with-unreachable-masters

    success "Cluster fix complete!"
}

# Failover a replica to master
failover() {
    local replica_node="${1:-}"
    local mode="${2:-force}"

    if [[ -z "$replica_node" ]]; then
        error "Usage: $0 failover <replica-node:port> [force|takeover]"
    fi

    local host=$(echo "$replica_node" | cut -d: -f1)
    local port=$(echo "$replica_node" | cut -d: -f2)

    info "Initiating failover on $replica_node (mode: $mode)..."

    if [[ "$mode" == "takeover" ]]; then
        redis_cli "$host" "$port" cluster failover takeover
    else
        redis_cli "$host" "$port" cluster failover force
    fi

    sleep 3
    check_status "$host" "$port"
}

# Get slot info
slot_info() {
    local key="${1:-}"
    local node="${2:-localhost:6379}"

    if [[ -z "$key" ]]; then
        error "Usage: $0 slot-info <key> [node:port]"
    fi

    local host=$(echo "$node" | cut -d: -f1)
    local port=$(echo "$node" | cut -d: -f2)

    local slot=$(redis_cli "$host" "$port" cluster keyslot "$key")
    local node_info=$(redis_cli "$host" "$port" cluster slots | grep -A 2 "^$((slot))")

    echo "Key: $key"
    echo "Slot: $slot"
    echo "Responsible node info:"
    redis_cli "$host" "$port" cluster slots
}

# Backup cluster config
backup_config() {
    local output_dir="${1:-.}"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$output_dir/redis-cluster-backup-$timestamp.txt"

    info "Backing up cluster configuration to $backup_file..."

    {
        echo "# Redis Cluster Backup - $timestamp"
        echo ""
        echo "## Cluster Info"
        redis_cli localhost 6379 cluster info
        echo ""
        echo "## Cluster Nodes"
        redis_cli localhost 6379 cluster nodes
        echo ""
        echo "## Cluster Slots"
        redis_cli localhost 6379 cluster slots
    } > "$backup_file"

    success "Backup saved to $backup_file"
}

# Show usage
usage() {
    cat <<EOF
Redis Cluster Management Script

Usage: $0 <command> [options]

Commands:
    status [node:port]
        Check cluster status (default: localhost:6379)

    create <node1:port> <node2:port> ...
        Create a new cluster with specified nodes

    add-node <new-node:port> <existing-node:port> [--replica <master-id>]
        Add a node to the cluster

    remove-node <any-node:port> <node-id>
        Remove a node from the cluster

    reshard <node:port> <from-id> <to-id> <num-slots>
        Move slots between nodes

    rebalance [node:port]
        Rebalance slots across all master nodes

    check [node:port]
        Check cluster health

    fix [node:port]
        Attempt to fix cluster issues

    failover <replica-node:port> [force|takeover]
        Failover a replica to master

    slot-info <key> [node:port]
        Get slot information for a key

    backup [output-dir]
        Backup cluster configuration

Environment Variables:
    REDIS_PASSWORD    Redis authentication password
    REDIS_PORT        Default Redis port (6379)

Examples:
    $0 status
    $0 create node1:6379 node2:6379 node3:6379 node4:6379 node5:6379 node6:6379
    $0 add-node new-node:6379 existing-node:6379
    $0 failover replica-node:6379 force
    $0 rebalance node1:6379
EOF
}

# Main
main() {
    case "${1:-}" in
        status)
            check_status "${2:-localhost}" "${3:-6379}"
            ;;
        create)
            shift
            create_cluster "$*"
            ;;
        add-node)
            add_node "${2:-}" "${3:-}" "${4:-false}" "${5:-}"
            ;;
        remove-node)
            remove_node "${2:-}" "${3:-}"
            ;;
        reshard)
            reshard "${2:-}" "${3:-}" "${4:-}" "${5:-}"
            ;;
        rebalance)
            rebalance "${2:-localhost:6379}"
            ;;
        check)
            check_health "${2:-localhost:6379}"
            ;;
        fix)
            fix_cluster "${2:-localhost:6379}"
            ;;
        failover)
            failover "${2:-}" "${3:-force}"
            ;;
        slot-info)
            slot_info "${2:-}" "${3:-localhost:6379}"
            ;;
        backup)
            backup_config "${2:-.}"
            ;;
        *)
            usage
            exit 1
            ;;
    esac
}

main "$@"
