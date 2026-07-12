#!/usr/bin/env bash
set -euo pipefail
PORT=3001 exec node node_modules/next/dist/bin/next dev --port 3001
