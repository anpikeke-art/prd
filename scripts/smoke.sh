#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
PROJECT_ID=""

create_project() {
  curl -fsS -X POST "$BASE_URL/api/projects" \
    -H 'Content-Type: application/json' \
    -d '{"title":"Smoke Project","idea":"Smoketest app fullstack"}'
}

echo "Smoke: health"
curl -fsS "$BASE_URL/api/health" | cat

echo "Smoke: create"
PROJECT_JSON="$(create_project)"
echo "$PROJECT_JSON"
PROJECT_ID="$(node -e "const p = JSON.parse(process.argv[1]); console.log(p.data.project.id)" "$PROJECT_JSON")"

echo "Smoke: clarify"
curl -fsS -X POST "$BASE_URL/api/projects/$PROJECT_ID/clarify" \
  -H 'Content-Type: application/json' \
  -d '{"idea":"Smoketest app fullstack","existingContext":""}' | cat

echo "Smoke: stack"
curl -fsS -X POST "$BASE_URL/api/projects/$PROJECT_ID/tech-stack" \
  -H 'Content-Type: application/json' \
  -d '{"mode":"manual","idea":"Smoketest app fullstack","manual_stack":{"frontend":"Next.js","backend":"Next.js Route Handlers","database":"PostgreSQL","realtime":"SSE","auth_ready":true}}' | cat

echo "Smoke: PRD"
curl -fsS -X POST "$BASE_URL/api/projects/$PROJECT_ID/generate-prd" \
  -H 'Content-Type: application/json' \
  -d '{"clarification_log":{"questions":[],"answers":{}},"tech_stack":{"frontend":"Next.js","backend":"Next.js Route Handlers","database":"PostgreSQL","realtime":"SSE","auth_ready":true}}' | cat

echo "Smoke: connect MCP"
curl -fsS -X POST "$BASE_URL/api/projects/$PROJECT_ID/connect" | cat

echo "Smoke: done"
