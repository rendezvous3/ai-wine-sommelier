#!/bin/bash
# Cron-ready orchestration:
# 1) Sync catalog into a stable Vectorize index
# 2) Reconcile stale vectors not seen in recent runs
#
# Usage:
#   ./cron_sync_and_reconcile.sh [INDEX] [MIN_QTY] [STALE_HOURS] [LIMIT]
# Example:
#   ./cron_sync_and_reconcile.sh products-prod 5 48 none

set -euo pipefail

INDEX="${1:-products-prod}"
MIN_QTY="${2:-5}"
STALE_HOURS="${3:-48}"
LIMIT="${4:-none}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [ -x "../venv/bin/python" ]; then
    PYTHON_BIN="../venv/bin/python"
elif command -v python >/dev/null 2>&1; then
    PYTHON_BIN="python"
elif command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="python3"
else
    echo "Error: python interpreter not found (expected python or python3)." >&2
    exit 127
fi

echo "============================================================"
echo "CRON SYNC + RECONCILE"
echo "Index: $INDEX | Min Qty: $MIN_QTY | Stale Hours: $STALE_HOURS | Limit: $LIMIT"
echo "============================================================"

"$PYTHON_BIN" run_sync_cycle.py "$INDEX" "$MIN_QTY" "$STALE_HOURS" "$LIMIT"

echo "============================================================"
echo "Cron workflow complete."
echo "============================================================"
