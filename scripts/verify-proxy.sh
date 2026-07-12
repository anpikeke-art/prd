#!/usr/bin/env bash
# Task #1: Proxy LLM Verification
# Jalankan dari mesin yang terhubung ke Tailscale (Proxmox homelab)
set -euo pipefail

BASE="${1:-http://100.106.72.4:20128/v1}"
AUTH="${2:-sk-2aff3e352fd9b602-6lrx2q-33e5e880}"

red() { echo -e "\033[31m$1\033[0m"; }
green() { echo -e "\033[32m$1\033[0m"; }
yellow() { echo -e "\033[33m$1\033[0m"; }
header() { echo -e "\n\033[36m==== $1 ====\033[0m"; }

FAIL=0
pass() { green "  PASS: $1"; }
fail() { red "  FAIL: $1"; FAIL=1; }

header "Connectivity"
if curl -s --connect-timeout 5 "$BASE/models" > /dev/null 2>&1; then
  pass "Endpoint reachable"
else
  fail "Endpoint $BASE not reachable — are you on Tailscale?"
  exit 1
fi

header "Non-streaming chat.completions"
NONSTREAM=$(curl -s --max-time 60 "$BASE/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Balas hanya satu kata: ok"}],"stream":false}')

echo "$NONSTREAM" | head -5

# Cek field wajib OpenAI format
echo "$NONSTREAM" | python3 -c "
import json,sys
try:
  d=json.load(sys.stdin)
  assert 'id' in d, 'missing id'
  assert 'object' in d, 'missing object'
  assert 'created' in d, 'missing created'
  assert 'model' in d, 'missing model'
  assert 'choices' in d, 'missing choices'
  c=d['choices'][0]
  assert 'message' in c, 'missing choices[0].message'
  assert 'content' in c['message'], 'missing choices[0].message.content'
  assert 'finish_reason' in c, 'missing finish_reason'
  # Cek extra fields
  extra=[k for k in d if k not in ('id','object','created','model','choices','usage')]
  if extra: print('WARN: extra fields:', extra)
  print('OK: Format OpenAI compatible')
except Exception as e:
  print('FAIL:', e)
  sys.exit(1)
" && pass "Non-streaming response valid" || fail "Non-streaming response invalid"

header "Streaming chat.completions"
STREAM_OUT=$(mktemp)
curl -s --max-time 60 "$BASE/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Balas hanya dua kata: halo dunia"}],"stream":true}' \
  > "$STREAM_OUT" 2>&1

# Cek streaming format
if grep -q 'data:' "$STREAM_OUT"; then
  pass "Streaming returns data: lines"
  # Cek [DONE] marker
  if grep -q 'data: \[DONE\]' "$STREAM_OUT"; then
    pass "Streaming has [DONE] marker"
  else
    yellow "  WARN: No [DONE] marker found (check last line)"
  fi
  # Cek delta content
  DELTA_COUNT=$(grep '"delta"' "$STREAM_OUT" | grep -c '"content"' || true)
  if [ "$DELTA_COUNT" -gt 0 ]; then
    pass "Streaming contains delta content ($DELTA_COUNT chunks)"
  else
    yellow "  WARN: No delta content in stream"
  fi
else
  fail "Streaming does not return data: lines"
  head -5 "$STREAM_OUT"
fi
rm -f "$STREAM_OUT"

header "Error handling"
# Test invalid model
ERR=$(curl -s --max-time 10 "$BASE/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH" \
  -d '{"model":"nonexistent-model","messages":[{"role":"user","content":"hi"}],"stream":false}')
echo "$ERR" | python3 -c "
import json,sys
try:
  d=json.load(sys.stdin)
  if 'error' in d:
    print('OK: Has error field:', d['error'])
  else:
    print('WARN: No error field, keys:', list(d.keys()))
except:
  print('Raw:', sys.stdin.read())
" 2>&1

header "Latency"
for i in 1 2 3; do
  T=$(curl -s -o /dev/null -w "%{time_total}" --max-time 60 "$BASE/chat/completions" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH" \
    -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"balas: ok"}],"stream":false}')
  echo "  Request $i: ${T}s"
done

echo ""
if [ "$FAIL" = "1" ]; then
  red "SOME CHECKS FAILED — review output di atas"
  exit 1
else
  green "ALL CHECKS PASSED — proxy sesuai spek OpenAI chat.completions"
fi
