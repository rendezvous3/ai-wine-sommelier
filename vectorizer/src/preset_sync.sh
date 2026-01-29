#!/bin/bash
# preset_sync.sh - Predefined sync presets
# Usage: ./preset_sync.sh [PRESET] [INDEX] [LIMIT]
#
# Presets:
#   all-subcategories - All edibles subcategories (no strain filter), LIMIT per subcategory
#   gummies-all       - All gummy types (gummies, live-resin, live-rosin) x all strains
#   gummies-indica    - All gummy types x INDICA only
#   gummies-sativa    - All gummy types x SATIVA only
#   chocolates        - Chocolates x all strains
#   edibles-full      - All edibles subcategories x all strains
#   edibles-quick     - Popular subcategories only (gummies, chocolates)
#
# Examples:
#   ./preset_sync.sh all-subcategories products-demo-x 15
#   ./preset_sync.sh gummies-all products-demo-x 15
#   ./preset_sync.sh chocolates products-prod 20

set -e

# Check arguments
if [ $# -lt 3 ]; then
    echo "Usage: $0 [PRESET] [INDEX] [LIMIT]"
    echo ""
    echo "Presets:"
    echo "  all-subcategories - All edibles subcategories (no strain filter)"
    echo "  gummies-all       - All gummy types x all strains"
    echo "  gummies-indica    - All gummy types x INDICA"
    echo "  gummies-sativa    - All gummy types x SATIVA"
    echo "  chocolates        - Chocolates x all strains"
    echo "  edibles-full      - All edibles x all strains"
    echo "  edibles-quick     - Gummies + chocolates only"
    echo ""
    echo "Examples:"
    echo "  $0 all-subcategories products-demo-x 15"
    echo "  $0 gummies-all products-demo-x 15"
    echo "  $0 chocolates products-prod 20"
    exit 1
fi

PRESET="$1"
INDEX="$2"
LIMIT="$3"
SLEEP=2

cd "$(dirname "$0")"

echo "============================================="
echo "Preset Sync: $PRESET"
echo "Index: $INDEX | Limit: $LIMIT"
echo "============================================="

case "$PRESET" in
    all-subcategories)
        echo "Syncing all edibles subcategories (no strain filter)..."
        for SUBCAT in GUMMIES LIVE_RESIN_GUMMIES LIVE_ROSIN_GUMMIES CHOCOLATES CHEWS COOKING_BAKING DRINKS; do
            echo "  → $SUBCAT"
            python vectorize.py -x "$INDEX" --category EDIBLES --subcategory "$SUBCAT" --limit "$LIMIT" --upload || echo "    (skipped or failed)"
            sleep $SLEEP
        done
        ;;

    gummies-all)
        echo "Syncing all gummy types x all strains..."
        for GUMMY in GUMMIES LIVE_RESIN_GUMMIES LIVE_ROSIN_GUMMIES; do
            for STRAIN in INDICA SATIVA HYBRID; do
                echo "  → $GUMMY ($STRAIN)"
                python vectorize.py -x "$INDEX" --category EDIBLES --subcategory "$GUMMY" --strain "$STRAIN" --limit "$LIMIT" --upload
                sleep $SLEEP
            done
        done
        ;;

    gummies-indica)
        echo "Syncing all gummy types x INDICA..."
        for GUMMY in GUMMIES LIVE_RESIN_GUMMIES LIVE_ROSIN_GUMMIES; do
            echo "  → $GUMMY (INDICA)"
            python vectorize.py -x "$INDEX" --category EDIBLES --subcategory "$GUMMY" --strain INDICA --limit "$LIMIT" --upload
            sleep $SLEEP
        done
        ;;

    gummies-sativa)
        echo "Syncing all gummy types x SATIVA..."
        for GUMMY in GUMMIES LIVE_RESIN_GUMMIES LIVE_ROSIN_GUMMIES; do
            echo "  → $GUMMY (SATIVA)"
            python vectorize.py -x "$INDEX" --category EDIBLES --subcategory "$GUMMY" --strain SATIVA --limit "$LIMIT" --upload
            sleep $SLEEP
        done
        ;;

    chocolates)
        echo "Syncing chocolates x all strains..."
        for STRAIN in INDICA SATIVA HYBRID; do
            echo "  → CHOCOLATES ($STRAIN)"
            python vectorize.py -x "$INDEX" --category EDIBLES --subcategory CHOCOLATES --strain "$STRAIN" --limit "$LIMIT" --upload
            sleep $SLEEP
        done
        ;;

    edibles-quick)
        echo "Syncing popular edibles (gummies + chocolates) x all strains..."
        for SUBCAT in GUMMIES CHOCOLATES; do
            for STRAIN in INDICA SATIVA HYBRID; do
                echo "  → $SUBCAT ($STRAIN)"
                python vectorize.py -x "$INDEX" --category EDIBLES --subcategory "$SUBCAT" --strain "$STRAIN" --limit "$LIMIT" --upload
                sleep $SLEEP
            done
        done
        ;;

    edibles-full)
        echo "Syncing ALL edibles subcategories x all strains..."
        for SUBCAT in GUMMIES LIVE_RESIN_GUMMIES LIVE_ROSIN_GUMMIES CHOCOLATES CHEWS COOKING_BAKING DRINKS; do
            for STRAIN in INDICA SATIVA HYBRID; do
                echo "  → $SUBCAT ($STRAIN)"
                python vectorize.py -x "$INDEX" --category EDIBLES --subcategory "$SUBCAT" --strain "$STRAIN" --limit "$LIMIT" --upload || echo "    (skipped or failed)"
                sleep $SLEEP
            done
        done
        ;;

    *)
        echo "Error: Unknown preset '$PRESET'"
        echo ""
        echo "Available presets:"
        echo "  all-subcategories    - All subcategories, no strain filter"
        echo "  gummies-all          - All gummy types x all strains"
        echo "  gummies-indica       - All gummy types x INDICA"
        echo "  gummies-sativa       - All gummy types x SATIVA"
        echo "  chocolates           - Chocolates x all strains"
        echo "  edibles-quick        - Gummies + chocolates"
        echo "  edibles-full         - Everything"
        exit 1
        ;;
esac

echo "============================================="
echo "Preset sync complete!"
echo "============================================="
