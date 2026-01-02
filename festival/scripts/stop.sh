#!/bin/bash
# =============================================================================
# Festival Platform - Stop Script
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Stop API
log_info "Stopping API server..."
if [ -f /tmp/api.pid ]; then
    kill $(cat /tmp/api.pid) 2>/dev/null || true
    rm /tmp/api.pid
fi

# Kill any remaining node processes on common ports
for port in 3000 4200 4300; do
    if lsof -ti :$port >/dev/null 2>&1; then
        log_info "Killing process on port $port"
        lsof -ti :$port | xargs kill -9 2>/dev/null || true
    fi
done

# Stop Docker services (optional)
read -p "Stop Docker services (postgres, redis)? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Stopping Docker services..."
    cd "$(dirname "$0")/.."
    docker compose down 2>/dev/null || docker-compose down 2>/dev/null || true
fi

log_info "All services stopped"
