#!/usr/bin/env bash
# Boots the built API against a migrated, seeded database and checks that it really serves.
# Expects DATABASE_URL and Redis to be configured, and `nx build api` to have run.
set -uo pipefail

PORT="${PORT:-3333}"
BASE="http://127.0.0.1:${PORT}/api"
LOG="$(mktemp)"

PORT="$PORT" node dist/apps/api/main.js >"$LOG" 2>&1 &
PID=$!
trap 'kill "$PID" 2>/dev/null' EXIT

for _ in $(seq 1 60); do
  curl -sf -o /dev/null "$BASE/health/live" && break
  if ! kill -0 "$PID" 2>/dev/null; then
    echo "API crashed during startup:"; tail -40 "$LOG"; exit 1
  fi
  sleep 1
done

status=0
for path in /health/live /festivals /festivals/featured /stats/platform /program; do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$BASE$path")"
  echo "$code $path"
  [ "$code" = "200" ] || status=1
done

if [ "$status" -ne 0 ]; then tail -40 "$LOG"; fi
exit "$status"
