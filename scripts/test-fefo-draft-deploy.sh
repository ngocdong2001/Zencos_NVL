#!/usr/bin/env bash
set -euo pipefail

# Test script for FEFO draft reload issue on deploy (Docker)
# Verifies timezone alignment and FEFO/asOfDate responses.

API_URL="${API_URL:-http://localhost:4001}"
DB_CONTAINER="${DB_CONTAINER:-zencos-db}"
API_CONTAINER="${API_CONTAINER:-zencos-api}"

ORDER_ID="${ORDER_ID:-}"
PRODUCT_ID="${PRODUCT_ID:-}"
LOCATION_ID="${LOCATION_ID:-}"
AS_OF_DATE="${AS_OF_DATE:-}"
ADMIN_EMAIL="${ADMIN_EMAIL:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"

usage() {
  cat <<'EOF'
Usage:
  ADMIN_EMAIL='admin@example.com' ADMIN_PASSWORD='your_password' \
  ORDER_ID='123' PRODUCT_ID='456' LOCATION_ID='2' AS_OF_DATE='2026-06-24' \
  ./scripts/test-fefo-draft-deploy.sh

Optional env:
  API_URL=http://localhost:4001
  DB_CONTAINER=zencos-db
  API_CONTAINER=zencos-api

What this script checks:
  1) API container timezone/date
  2) DB global/session timezone + NOW/UTC diff
  3) Login and get JWT token
  4) /api/inventory/stock with productId/locationId/asOfDate
  5) /api/inventory/fefo-suggestions with same params
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ -z "$ADMIN_EMAIL" || -z "$ADMIN_PASSWORD" || -z "$PRODUCT_ID" || -z "$LOCATION_ID" || -z "$AS_OF_DATE" ]]; then
  echo "[ERROR] Missing required env vars."
  usage
  exit 1
fi

echo "=== 1) API container clock/timezone ==="
docker exec "$API_CONTAINER" sh -lc 'date; echo "TZ=$TZ"' || true

echo
echo "=== 2) DB timezone + time diff ==="
docker exec "$DB_CONTAINER" mysql -uroot -proot123 -N -e "
SELECT
  @@global.time_zone AS global_tz,
  @@session.time_zone AS session_tz,
  @@system_time_zone AS system_tz,
  NOW() AS db_now,
  UTC_TIMESTAMP() AS db_utc,
  TIMEDIFF(NOW(), UTC_TIMESTAMP()) AS db_now_minus_utc;
" || true

echo
echo "=== 3) Login get JWT ==="
LOGIN_RESP=$(curl -sS -X POST "$API_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  --data "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(printf '%s' "$LOGIN_RESP" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
if [[ -z "$TOKEN" ]]; then
  echo "[ERROR] Login failed. Raw response:"
  echo "$LOGIN_RESP"
  exit 1
fi

echo "Login OK"

if [[ -n "$ORDER_ID" ]]; then
  echo
  echo "=== 3.1) Draft order snapshot (optional) ==="
  curl -sS "$API_URL/api/production-orders/$ORDER_ID" \
    -H "Authorization: Bearer $TOKEN" \
    | (command -v jq >/dev/null 2>&1 && jq '{id,orderRef,status,step1ProcessedAt,nvlExportedAt,lines:(.lines|map(select(.step==1 and .direction=="out")|{productId,productCode,lotNo,actualQty,locationId,exportDate}))}' || cat)
fi

echo
echo "=== 4) Inventory stock as-of date ==="
STOCK_URL="$API_URL/api/inventory/stock?productId=$PRODUCT_ID&locationId=$LOCATION_ID&asOfDate=$AS_OF_DATE"
echo "$STOCK_URL"
curl -sS "$STOCK_URL" \
  -H "Authorization: Bearer $TOKEN" \
  | (command -v jq >/dev/null 2>&1 && jq 'map({id,lotNo,currentQtyBase,location,expiryDate})' || cat)

echo
echo "=== 5) FEFO suggestions as-of date ==="
FEFO_URL="$API_URL/api/inventory/fefo-suggestions?productId=$PRODUCT_ID&locationId=$LOCATION_ID&asOfDate=$AS_OF_DATE&limit=20"
echo "$FEFO_URL"
curl -sS "$FEFO_URL" \
  -H "Authorization: Bearer $TOKEN" \
  | (command -v jq >/dev/null 2>&1 && jq 'map({id,lotNo,currentQtyBase,location,expiryDate})' || cat)

echo
echo "=== DONE ==="
echo "If stock/fefo returns empty or qty=0 unexpectedly on deploy, timezone mismatch is likely."
