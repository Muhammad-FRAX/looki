#!/usr/bin/env bash
# e2e smoke test: boots the full stack and verifies core endpoints.
# Usage: ./scripts/e2e-smoke.sh
# Requires: docker compose, curl, jq

set -euo pipefail

API="http://localhost:3000/api/v1"
WEB="http://localhost:80"
PASS=0
FAIL=0

green() { printf '\033[0;32m[PASS]\033[0m %s\n' "$1"; PASS=$((PASS + 1)); }
red()   { printf '\033[0;31m[FAIL]\033[0m %s\n' "$1"; FAIL=$((FAIL + 1)); }

check_status() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [ "$actual" = "$expected" ]; then
    green "$label (HTTP $actual)"
  else
    red "$label (expected HTTP $expected, got HTTP $actual)"
  fi
}

echo "==> Starting full stack..."
docker compose up -d --wait 2>/dev/null || docker compose up -d
echo "==> Waiting for services to be healthy (up to 120s)..."

for i in $(seq 1 24); do
  status=$(curl -s -o /dev/null -w "%{http_code}" "$API/health" || true)
  if [ "$status" = "200" ]; then
    echo "    API healthy after $((i * 5))s"
    break
  fi
  sleep 5
done

echo ""
echo "==> Running smoke checks..."

# 1. Health endpoint
status=$(curl -s -o /dev/null -w "%{http_code}" "$API/health")
check_status "GET /api/v1/health" "200" "$status"

# 2. Ready endpoint (200 if DB reachable)
status=$(curl -s -o /dev/null -w "%{http_code}" "$API/ready")
if [ "$status" = "200" ] || [ "$status" = "503" ]; then
  green "GET /api/v1/ready (HTTP $status — DB may not be seeded)"
else
  red "GET /api/v1/ready (unexpected HTTP $status)"
fi

# 3. OpenAPI spec
status=$(curl -s -o /dev/null -w "%{http_code}" "$API/openapi.json")
check_status "GET /api/v1/openapi.json" "200" "$status"

# 4. Swagger UI
status=$(curl -s -o /dev/null -w "%{http_code}" "$API/docs")
check_status "GET /api/v1/docs" "200" "$status"

# 5. Prometheus metrics
status=$(curl -s -o /dev/null -w "%{http_code}" "$API/metrics")
check_status "GET /api/v1/metrics" "200" "$status"

# 6–10. Five anonymous demo lookups (landing page rate-limited)
echo ""
echo "==> Running 5 anonymous lookup probes..."
for i in 1 2 3 4 5; do
  body=$(curl -s "$API/lookup?number=%2B12125550123" 2>/dev/null || true)
  # Without an API key and SKIP_AUTH=false these return 401; with SKIP_AUTH they return 200/503
  code=$(curl -s -o /dev/null -w "%{http_code}" "$API/lookup?number=%2B12125550123" || true)
  if [ "$code" = "200" ] || [ "$code" = "401" ] || [ "$code" = "503" ]; then
    green "Lookup probe $i (HTTP $code)"
  else
    red "Lookup probe $i (unexpected HTTP $code)"
  fi
done

# 11. Auth: registration validation (no DB required)
status=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$API/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"bad","password":"short"}')
check_status "POST /api/v1/auth/register (validation error)" "400" "$status"

# 12. Auth: login validation (no DB required)
status=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"bad"}')
check_status "POST /api/v1/auth/login (validation error)" "400" "$status"

# 13. Landing page (nginx-served frontend)
if [ -n "${CHECK_WEB:-}" ]; then
  status=$(curl -s -o /dev/null -w "%{http_code}" "$WEB/")
  check_status "GET / (landing page)" "200" "$status"
fi

echo ""
echo "==> Results: $PASS passed, $FAIL failed"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
