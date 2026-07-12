#!/usr/bin/env bash
set -euo pipefail
export $(grep -v '^#' .env.local | xargs)
docker compose -f deploy-compose.yml down -v || true
docker compose -f deploy-compose.yml up --build -d
