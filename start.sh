#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

echo "=== PRD Studio - Start All Services ==="

# 1. Baca port dari .env
APP_PORT="${APP_PORT:-$(grep '^APP_PORT=' .env 2>/dev/null | cut -d= -f2)}"
APP_PORT="${APP_PORT:-3001}"
MCP_PORT="${MCP_PORT:-$(grep '^MCP_PORT=' .env 2>/dev/null | cut -d= -f2)}"
MCP_PORT="${MCP_PORT:-3333}"

# 2. Start DB via Docker (background)
echo "[1/4] Starting PostgreSQL..."
docker compose up -d db 2>&1 | grep -v "WARN\|orphan" || docker compose -f deploy-compose.yml up -d db 2>&1 | grep -v "WARN\|orphan"
echo "       DB ready on port 5432"

# 3. Prisma generate + push
echo "[2/4] Running Prisma..."
npx prisma generate --no-hints 2>&1 | grep -v deprecated
npx prisma db push 2>&1 | grep -v deprecated | grep -v "^$"
echo "       DB schema synced"

# 4. Start Next.js (frontend + API) di background
echo "[3/4] Starting Next.js (port $APP_PORT)..."
PORT=$APP_PORT npx next dev --port "$APP_PORT" &
NEXT_PID=$!

# 5. Start MCP server di background
if ss -tlnp "sport = :$MCP_PORT" 2>/dev/null | grep -q .; then
  echo "[4/4] MCP server already running on port $MCP_PORT (skip)"
  MCP_PID=""
else
  echo "[4/4] Starting MCP server (port $MCP_PORT)..."
  (cd mcp && npx tsx src/index.ts) &
  MCP_PID=$!
fi

# 6. Prisma Studio (GUI DB)
STUDIO_PORT=5555
if ss -tlnp "sport = :$STUDIO_PORT" 2>/dev/null | grep -q .; then
  echo "[5/5] Prisma Studio already running on port $STUDIO_PORT (skip)"
  STUDIO_PID=""
else
  echo "[5/5] Starting Prisma Studio (port $STUDIO_PORT)..."
  npx prisma studio --port $STUDIO_PORT &
  STUDIO_PID=$!
fi

echo ""
echo "=== All services started ==="
echo "  Frontend + API : http://localhost:$APP_PORT"
echo "  MCP Server     : http://localhost:$MCP_PORT"
echo "  DB Studio      : http://localhost:$STUDIO_PORT"
echo "  DB             : postgresql://localhost:5432/prd_studio"
echo ""
echo "Press Ctrl+C to stop all services"

CLEANED=0
cleanup() { if [ "$CLEANED" = 0 ]; then CLEANED=1; echo "Stopping..."; kill $NEXT_PID $MCP_PID $STUDIO_PID 2>/dev/null; wait 2>/dev/null; echo "Done."; fi; }
trap cleanup EXIT INT TERM

wait
