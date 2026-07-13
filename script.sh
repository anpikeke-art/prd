#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

MODE="${1:-dev}"
WITH_STUDIO="${WITH_STUDIO:-1}"

read_env() {
  local key="$1"
  local fallback="${2:-}"
  local value
  value="$(grep -E "^${key}=" .env 2>/dev/null | tail -n 1 | cut -d= -f2- || true)"
  if [ -n "${value}" ]; then
    printf '%s' "${value}"
  else
    printf '%s' "${fallback}"
  fi
}

wait_for_port() {
  local port="$1"
  local label="$2"
  local max_attempts="${3:-60}"
  local attempt=1
  while ! (command -v ss >/dev/null 2>&1 && ss -tln 2>/dev/null | grep -q ":${port} "); do
    if [ "$attempt" -ge "$max_attempts" ]; then
      echo "Timed out waiting for ${label} on port ${port}"
      return 1
    fi
    attempt=$((attempt + 1))
    sleep 1
  done
}

cleanup() {
  local pids=()
  [ -n "${NEXT_PID:-}" ] && pids+=("${NEXT_PID}")
  [ -n "${MCP_PID:-}" ] && pids+=("${MCP_PID}")
  [ -n "${STUDIO_PID:-}" ] && pids+=("${STUDIO_PID}")

  if [ "${#pids[@]}" -gt 0 ]; then
    echo "Stopping RakitPRD services..."
    kill "${pids[@]}" 2>/dev/null || true
    wait 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

APP_PORT="${APP_PORT:-$(read_env APP_PORT 3001)}"
MCP_PORT="${MCP_PORT:-$(read_env MCP_PORT 3333)}"
STUDIO_PORT="${STUDIO_PORT:-5555}"

echo "=== RakitPRD Workflow Orchestrator ==="
echo "Mode        : ${MODE}"
echo "App port    : ${APP_PORT}"
echo "MCP port    : ${MCP_PORT}"
echo "Studio port : ${STUDIO_PORT}"
echo ""

if [ "${MODE}" = "dev" ]; then
  echo "[1/5] Starting PostgreSQL..."
  docker compose up -d db
  echo "      Waiting for DB health..."
  DB_CONTAINER="$(docker compose ps -q db)"
  if [ -n "${DB_CONTAINER}" ]; then
    for _ in $(seq 1 60); do
      DB_HEALTH="$(docker inspect -f '{{.State.Health.Status}}' "${DB_CONTAINER}" 2>/dev/null || echo starting)"
      if [ "${DB_HEALTH}" = "healthy" ]; then
        break
      fi
      sleep 1
    done
  fi
  echo "      DB ready"

  echo "[2/5] Syncing Prisma schema..."
  npx prisma generate
  npx prisma db push

  echo "[3/5] Starting frontend + API on ${APP_PORT}..."
  npm run dev -- --port "${APP_PORT}" &
  NEXT_PID=$!

  echo "[4/5] Starting MCP server on ${MCP_PORT}..."
  (cd mcp && MCP_PORT="${MCP_PORT}" npm run dev) &
  MCP_PID=$!

  if [ "${WITH_STUDIO}" = "1" ]; then
    echo "[5/5] Starting Prisma Studio on ${STUDIO_PORT}..."
    npx prisma studio --port "${STUDIO_PORT}" &
    STUDIO_PID=$!
  else
    echo "[5/5] Prisma Studio skipped (WITH_STUDIO=0)"
  fi

  echo ""
  echo "=== All services started ==="
  echo "Frontend + API : http://localhost:${APP_PORT}"
  echo "MCP Server     : http://localhost:${MCP_PORT}"
  if [ "${WITH_STUDIO}" = "1" ]; then
    echo "Prisma Studio   : http://localhost:${STUDIO_PORT}"
  fi
  echo "DB             : docker compose service db"
  echo ""
  echo "Press Ctrl+C to stop all services"

  wait
fi

if [ "${MODE}" = "prod" ]; then
  echo "[1/4] Starting PostgreSQL..."
  docker compose up -d db
  echo "      Waiting for DB health..."
  DB_CONTAINER="$(docker compose ps -q db)"
  if [ -n "${DB_CONTAINER}" ]; then
    for _ in $(seq 1 60); do
      DB_HEALTH="$(docker inspect -f '{{.State.Health.Status}}' "${DB_CONTAINER}" 2>/dev/null || echo starting)"
      if [ "${DB_HEALTH}" = "healthy" ]; then
        break
      fi
      sleep 1
    done
  fi
  echo "      DB ready"

  echo "[2/4] Building app..."
  npm run build

  echo "[3/4] Starting app server on ${APP_PORT}..."
  PORT="${APP_PORT}" npm run start &
  NEXT_PID=$!

  echo "[4/4] Starting MCP server on ${MCP_PORT}..."
  (cd mcp && npm run build && MCP_PORT="${MCP_PORT}" npm run start) &
  MCP_PID=$!

  echo ""
  echo "=== Production services started ==="
  echo "Frontend + API : http://localhost:${APP_PORT}"
  echo "MCP Server     : http://localhost:${MCP_PORT}"
  echo ""
  echo "Press Ctrl+C to stop all services"

  wait
fi

echo "Unknown mode: ${MODE}"
exit 1
