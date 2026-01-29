#!/bin/bash
# batch_sync.sh - Batch sync all edibles subcategories
# Usage: ./batch_sync.sh INDEX_NAME LIMIT [STRAIN]
#
# Examples:
#   ./batch_sync.sh products-demo-1 15           # All strains, 15 products each
#   ./batch_sync.sh products-demo-1 15 INDICA    # Only INDICA, 15 products each
#   ./batch_sync.sh products-prod 50             # Production, 50 products each

set -e  # Exit on error

# Check arguments
if [ $# -lt 2 ]; then
    echo "Usage: $0 INDEX_NAME LIMIT [STRAIN]"
    echo ""
    echo "Examples:"
    echo "  $0 products-demo-1 15           # All strains, 15 products each"
    echo "  $0 products-demo-1 15 INDICA    # Only INDICA, 15 products each"
    echo "  $0 products-prod 50             # Production, 50 products each"
    exit 1
fi

INDEX="$1"
LIMIT="$2"
STRAIN="${3:-}"  # Optional strain filter
SLEEP_BETWEEN=2  # Seconds between API calls

cd "$(dirname "$0")"  # Ensure we're in the src directory

echo "============================================="
echo "Batch Sync Configuration"
echo "============================================="
echo "Index: $INDEX"
echo "Limit per category: $LIMIT"
echo "Strain filter: ${STRAIN:-ALL}"
echo "============================================="
echo ""

# Define subcategories
SUBCATEGORIES=("GUMMIES" "LIVE_RESIN_GUMMIES" "LIVE_ROSIN_GUMMIES" "CHOCOLATES" "CHEWS" "COOKING_BAKING" "DRINKS")

# Define strains to sync
if [ -n "$STRAIN" ]; then
    STRAINS=("$STRAIN")
else
    STRAINS=("INDICA" "SATIVA" "HYBRID")
fi

# Counter
TOTAL=0
SUCCESS=0
FAILED=0

# Loop through subcategories and strains
for SUBCATEGORY in "${SUBCATEGORIES[@]}"; do
    for STRAIN_TYPE in "${STRAINS[@]}"; do
        TOTAL=$((TOTAL + 1))
        echo "[$TOTAL] Syncing $SUBCATEGORY ($STRAIN_TYPE)..."

        if python vectorize.py -x "$INDEX" \
            --category EDIBLES \
            --subcategory "$SUBCATEGORY" \
            --strain "$STRAIN_TYPE" \
            --limit "$LIMIT" \
            --upload 2>&1 | grep -q "Upload complete"; then
            SUCCESS=$((SUCCESS + 1))
            echo "  ✓ Success"
        else
            FAILED=$((FAILED + 1))
            echo "  ✗ Failed or no products found"
        fi

        # Sleep between requests to avoid rate limiting
        if [ $TOTAL -lt $((${#SUBCATEGORIES[@]} * ${#STRAINS[@]})) ]; then
            sleep $SLEEP_BETWEEN
        fi
    done
done

echo ""
echo "============================================="
echo "Batch Sync Complete"
echo "============================================="
echo "Total attempts: $TOTAL"
echo "Successful: $SUCCESS"
echo "Failed: $FAILED"
echo "============================================="
