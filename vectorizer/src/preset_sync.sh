#!/bin/bash
# preset_sync.sh - Predefined sync presets
# Usage: ./preset_sync.sh [PRESET] [CATEGORY] [INDEX] [LIMIT] [MIN_QTY]
#
# Presets:
#   all-subcategories - All subcategories for specified category (no strain filter), LIMIT per subcategory
#   all-products      - Full category pull (or ALL) with no subcategory filter
#   gummies-all       - All gummy types (gummies, live-resin, live-rosin) x all strains [EDIBLES only]
#   gummies-indica    - All gummy types x INDICA only [EDIBLES only]
#   gummies-sativa    - All gummy types x SATIVA only [EDIBLES only]
#   chocolates        - Chocolates x all strains [EDIBLES only]
#   edibles-full      - All edibles subcategories x all strains [EDIBLES only]
#   edibles-quick     - Popular subcategories only (gummies, chocolates) [EDIBLES only]
#
# Categories:
#   EDIBLES, FLOWER, PRE_ROLLS, VAPORIZERS, CONCENTRATES, CBD, TOPICALS, ACCESSORIES, ALL
#
# Examples:
#   ./preset_sync.sh all-subcategories EDIBLES products-demo-x 15
#   ./preset_sync.sh all-subcategories ALL products-demo-x 15
#   ./preset_sync.sh all-products ALL products-prod none 5
#   ./preset_sync.sh gummies-all EDIBLES products-demo-x 15

set -e

# Check arguments
if [ $# -lt 4 ]; then
    echo "Usage: $0 [PRESET] [CATEGORY] [INDEX] [LIMIT] [MIN_QTY]"
    echo ""
    echo "Presets:"
    echo "  all-subcategories - All subcategories for specified category"
    echo "  all-products      - Full category pull (or ALL)"
    echo "  gummies-all       - All gummy types x all strains [EDIBLES only]"
    echo "  gummies-indica    - All gummy types x INDICA [EDIBLES only]"
    echo "  gummies-sativa    - All gummy types x SATIVA [EDIBLES only]"
    echo "  chocolates        - Chocolates x all strains [EDIBLES only]"
    echo "  edibles-full      - All edibles x all strains [EDIBLES only]"
    echo "  edibles-quick     - Gummies + chocolates [EDIBLES only]"
    echo ""
    echo "Categories: EDIBLES, FLOWER, PRE_ROLLS, VAPORIZERS, CONCENTRATES, CBD, TOPICALS, ACCESSORIES, ALL"
    echo ""
    echo "Examples:"
    echo "  $0 all-subcategories EDIBLES products-demo-x 15"
    echo "  $0 all-subcategories ALL products-demo-x 15"
    echo "  $0 all-products ALL products-prod none 5"
    echo "  $0 gummies-all EDIBLES products-demo-x 15"
    exit 1
fi

PRESET="$1"
CATEGORY="$2"
INDEX="$3"
LIMIT="$4"
MIN_QTY="$5"
SLEEP=2

cd "$(dirname "$0")"

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

MIN_QTY_ARGS=()
if [ -n "$MIN_QTY" ]; then
    MIN_QTY_ARGS=(--min-quantity "$MIN_QTY")
fi

run_vectorize() {
    "$PYTHON_BIN" vectorize.py -x "$INDEX" "$@" --limit "$LIMIT" "${MIN_QTY_ARGS[@]}" --upload
}

echo "============================================="
echo "Preset Sync: $PRESET"
echo "Category: $CATEGORY | Index: $INDEX | Limit: $LIMIT | Min Quantity: ${MIN_QTY:-OFF}"
echo "============================================="

case "$PRESET" in
    all-subcategories)
        case "$CATEGORY" in
            EDIBLES)
                echo "Syncing all EDIBLES subcategories (no strain filter)..."
                for SUBCAT in GUMMIES LIVE_RESIN_GUMMIES LIVE_ROSIN_GUMMIES CHOCOLATES CHEWS COOKING_BAKING DRINKS; do
                    echo "  -> EDIBLES/$SUBCAT"
                    run_vectorize --category EDIBLES --subcategory "$SUBCAT" || echo "    (skipped or failed)"
                    sleep $SLEEP
                done
                ;;
            FLOWER)
                echo "Syncing all FLOWER subcategories (no strain filter)..."
                for SUBCAT in DEFAULT PREMIUM WHOLE_FLOWER BULK_FLOWER SMALL_BUDS PRE_GROUND; do
                    echo "  -> FLOWER/$SUBCAT"
                    run_vectorize --category FLOWER --subcategory "$SUBCAT" || echo "    (skipped or failed)"
                    sleep $SLEEP
                done
                ;;
            PRE_ROLLS)
                echo "Syncing all PRE_ROLLS subcategories (no strain filter)..."
                for SUBCAT in DEFAULT SINGLES PACKS INFUSED INFUSED_PRE_ROLL_PACKS BLUNTS; do
                    echo "  -> PRE_ROLLS/$SUBCAT"
                    run_vectorize --category PRE_ROLLS --subcategory "$SUBCAT" || echo "    (skipped or failed)"
                    sleep $SLEEP
                done
                ;;
            VAPORIZERS)
                echo "Syncing all VAPORIZERS subcategories (no strain filter)..."
                for SUBCAT in DEFAULT LIVE_RESIN LIVE_ROSIN ALL_IN_ONE CARTRIDGES DISPOSABLES; do
                    echo "  -> VAPORIZERS/$SUBCAT"
                    run_vectorize --category VAPORIZERS --subcategory "$SUBCAT" || echo "    (skipped or failed)"
                    sleep $SLEEP
                done
                ;;
            CONCENTRATES)
                echo "Syncing all CONCENTRATES subcategories (no strain filter)..."
                for SUBCAT in DEFAULT UNFLAVORED BADDER HASH LIVE_RESIN LIVE_ROSIN ROSIN; do
                    echo "  -> CONCENTRATES/$SUBCAT"
                    run_vectorize --category CONCENTRATES --subcategory "$SUBCAT" || echo "    (skipped or failed)"
                    sleep $SLEEP
                done
                ;;
            CBD)
                echo "Syncing CBD (no Dutchie subcategory filter; subcategory inferred during normalization)..."
                echo "  -> CBD/ALL"
                run_vectorize --category CBD || echo "    (skipped or failed)"
                sleep $SLEEP
                ;;
            TOPICALS)
                echo "Syncing all TOPICALS subcategories (no strain filter)..."
                for SUBCAT in DEFAULT BALMS; do
                    echo "  -> TOPICALS/$SUBCAT"
                    run_vectorize --category TOPICALS --subcategory "$SUBCAT" || echo "    (skipped or failed)"
                    sleep $SLEEP
                done
                ;;
            ACCESSORIES)
                echo "Syncing all ACCESSORIES subcategories (no strain filter - physical products)..."
                for SUBCAT in DEFAULT PAPERS_ROLLING_SUPPLIES GRINDERS LIGHTERS BATTERIES GLASSWARE; do
                    echo "  -> ACCESSORIES/$SUBCAT"
                    run_vectorize --category ACCESSORIES --subcategory "$SUBCAT" || echo "    (skipped or failed)"
                    sleep $SLEEP
                done
                ;;
            ALL)
                echo "Syncing ALL categories and subcategories..."
                echo ""
                echo "--- EDIBLES ---"
                for SUBCAT in GUMMIES LIVE_RESIN_GUMMIES LIVE_ROSIN_GUMMIES CHOCOLATES CHEWS COOKING_BAKING DRINKS; do
                    echo "  -> EDIBLES/$SUBCAT"
                    run_vectorize --category EDIBLES --subcategory "$SUBCAT" || echo "    (skipped or failed)"
                    sleep $SLEEP
                done
                echo ""
                echo "--- FLOWER ---"
                for SUBCAT in DEFAULT PREMIUM WHOLE_FLOWER BULK_FLOWER SMALL_BUDS PRE_GROUND; do
                    echo "  -> FLOWER/$SUBCAT"
                    run_vectorize --category FLOWER --subcategory "$SUBCAT" || echo "    (skipped or failed)"
                    sleep $SLEEP
                done
                echo ""
                echo "--- PRE_ROLLS ---"
                for SUBCAT in DEFAULT SINGLES PACKS INFUSED INFUSED_PRE_ROLL_PACKS BLUNTS; do
                    echo "  -> PRE_ROLLS/$SUBCAT"
                    run_vectorize --category PRE_ROLLS --subcategory "$SUBCAT" || echo "    (skipped or failed)"
                    sleep $SLEEP
                done
                echo ""
                echo "--- VAPORIZERS ---"
                for SUBCAT in DEFAULT LIVE_RESIN LIVE_ROSIN ALL_IN_ONE CARTRIDGES DISPOSABLES; do
                    echo "  -> VAPORIZERS/$SUBCAT"
                    run_vectorize --category VAPORIZERS --subcategory "$SUBCAT" || echo "    (skipped or failed)"
                    sleep $SLEEP
                done
                echo ""
                echo "--- CONCENTRATES ---"
                for SUBCAT in DEFAULT UNFLAVORED BADDER HASH LIVE_RESIN LIVE_ROSIN ROSIN; do
                    echo "  -> CONCENTRATES/$SUBCAT"
                    run_vectorize --category CONCENTRATES --subcategory "$SUBCAT" || echo "    (skipped or failed)"
                    sleep $SLEEP
                done
                echo ""
                echo "--- CBD ---"
                echo "  -> CBD/ALL"
                run_vectorize --category CBD || echo "    (skipped or failed)"
                sleep $SLEEP
                echo ""
                echo "--- TOPICALS ---"
                for SUBCAT in DEFAULT BALMS; do
                    echo "  -> TOPICALS/$SUBCAT"
                    run_vectorize --category TOPICALS --subcategory "$SUBCAT" || echo "    (skipped or failed)"
                    sleep $SLEEP
                done
                echo ""
                echo "--- ACCESSORIES ---"
                for SUBCAT in DEFAULT PAPERS_ROLLING_SUPPLIES GRINDERS LIGHTERS BATTERIES GLASSWARE; do
                    echo "  -> ACCESSORIES/$SUBCAT"
                    run_vectorize --category ACCESSORIES --subcategory "$SUBCAT" || echo "    (skipped or failed)"
                    sleep $SLEEP
                done
                ;;
            *)
                echo "Error: Invalid category '$CATEGORY' for preset '$PRESET'"
                echo "Valid categories: EDIBLES, FLOWER, PRE_ROLLS, VAPORIZERS, CONCENTRATES, CBD, TOPICALS, ACCESSORIES, ALL"
                exit 1
                ;;
        esac
        ;;

    all-products)
        case "$CATEGORY" in
            ALL)
                echo "Syncing ALL products with no category/subcategory filter..."
                run_vectorize || echo "    (skipped or failed)"
                ;;
            EDIBLES|FLOWER|PRE_ROLLS|VAPORIZERS|CONCENTRATES|CBD|TOPICALS|ACCESSORIES)
                echo "Syncing all products for category $CATEGORY with no subcategory filter..."
                run_vectorize --category "$CATEGORY" || echo "    (skipped or failed)"
                ;;
            *)
                echo "Error: Invalid category '$CATEGORY' for preset '$PRESET'"
                echo "Valid categories: EDIBLES, FLOWER, PRE_ROLLS, VAPORIZERS, CONCENTRATES, CBD, TOPICALS, ACCESSORIES, ALL"
                exit 1
                ;;
        esac
        ;;

    gummies-all)
        if [ "$CATEGORY" != "EDIBLES" ]; then
            echo "Error: Preset '$PRESET' only supports EDIBLES category"
            exit 1
        fi
        echo "Syncing all gummy types x all strains..."
        for GUMMY in GUMMIES LIVE_RESIN_GUMMIES LIVE_ROSIN_GUMMIES; do
            for STRAIN in INDICA SATIVA HYBRID; do
                echo "  -> $GUMMY ($STRAIN)"
                run_vectorize --category EDIBLES --subcategory "$GUMMY" --strain "$STRAIN"
                sleep $SLEEP
            done
        done
        ;;

    gummies-indica)
        if [ "$CATEGORY" != "EDIBLES" ]; then
            echo "Error: Preset '$PRESET' only supports EDIBLES category"
            exit 1
        fi
        echo "Syncing all gummy types x INDICA..."
        for GUMMY in GUMMIES LIVE_RESIN_GUMMIES LIVE_ROSIN_GUMMIES; do
            echo "  -> $GUMMY (INDICA)"
            run_vectorize --category EDIBLES --subcategory "$GUMMY" --strain INDICA
            sleep $SLEEP
        done
        ;;

    gummies-sativa)
        if [ "$CATEGORY" != "EDIBLES" ]; then
            echo "Error: Preset '$PRESET' only supports EDIBLES category"
            exit 1
        fi
        echo "Syncing all gummy types x SATIVA..."
        for GUMMY in GUMMIES LIVE_RESIN_GUMMIES LIVE_ROSIN_GUMMIES; do
            echo "  -> $GUMMY (SATIVA)"
            run_vectorize --category EDIBLES --subcategory "$GUMMY" --strain SATIVA
            sleep $SLEEP
        done
        ;;

    chocolates)
        if [ "$CATEGORY" != "EDIBLES" ]; then
            echo "Error: Preset '$PRESET' only supports EDIBLES category"
            exit 1
        fi
        echo "Syncing chocolates x all strains..."
        for STRAIN in INDICA SATIVA HYBRID; do
            echo "  -> CHOCOLATES ($STRAIN)"
            run_vectorize --category EDIBLES --subcategory CHOCOLATES --strain "$STRAIN"
            sleep $SLEEP
        done
        ;;

    edibles-quick)
        if [ "$CATEGORY" != "EDIBLES" ]; then
            echo "Error: Preset '$PRESET' only supports EDIBLES category"
            exit 1
        fi
        echo "Syncing popular edibles (gummies + chocolates) x all strains..."
        for SUBCAT in GUMMIES CHOCOLATES; do
            for STRAIN in INDICA SATIVA HYBRID; do
                echo "  -> $SUBCAT ($STRAIN)"
                run_vectorize --category EDIBLES --subcategory "$SUBCAT" --strain "$STRAIN"
                sleep $SLEEP
            done
        done
        ;;

    edibles-full)
        if [ "$CATEGORY" != "EDIBLES" ]; then
            echo "Error: Preset '$PRESET' only supports EDIBLES category"
            exit 1
        fi
        echo "Syncing ALL edibles subcategories x all strains..."
        for SUBCAT in GUMMIES LIVE_RESIN_GUMMIES LIVE_ROSIN_GUMMIES CHOCOLATES CHEWS COOKING_BAKING DRINKS; do
            for STRAIN in INDICA SATIVA HYBRID; do
                echo "  -> $SUBCAT ($STRAIN)"
                run_vectorize --category EDIBLES --subcategory "$SUBCAT" --strain "$STRAIN" || echo "    (skipped or failed)"
                sleep $SLEEP
            done
        done
        ;;

    *)
        echo "Error: Unknown preset '$PRESET'"
        echo ""
        echo "Available presets:"
        echo "  all-subcategories    - All subcategories (EDIBLES, FLOWER, PRE_ROLLS, or ALL)"
        echo "  all-products         - Full category pull (or ALL) [no subcategory filter]"
        echo "  gummies-all          - All gummy types x all strains [EDIBLES only]"
        echo "  gummies-indica       - All gummy types x INDICA [EDIBLES only]"
        echo "  gummies-sativa       - All gummy types x SATIVA [EDIBLES only]"
        echo "  chocolates           - Chocolates x all strains [EDIBLES only]"
        echo "  edibles-quick        - Gummies + chocolates [EDIBLES only]"
        echo "  edibles-full         - All edibles x all strains [EDIBLES only]"
        exit 1
        ;;
esac

echo "============================================="
echo "Preset sync complete!"
echo "============================================="
