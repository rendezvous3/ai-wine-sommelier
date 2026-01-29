#!/bin/bash
# preset_sync.sh - Predefined sync presets
# Usage: ./preset_sync.sh [PRESET] [CATEGORY] [INDEX] [LIMIT]
#
# Presets:
#   all-subcategories - All subcategories for specified category (no strain filter), LIMIT per subcategory
#   gummies-all       - All gummy types (gummies, live-resin, live-rosin) x all strains [EDIBLES only]
#   gummies-indica    - All gummy types x INDICA only [EDIBLES only]
#   gummies-sativa    - All gummy types x SATIVA only [EDIBLES only]
#   chocolates        - Chocolates x all strains [EDIBLES only]
#   edibles-full      - All edibles subcategories x all strains [EDIBLES only]
#   edibles-quick     - Popular subcategories only (gummies, chocolates) [EDIBLES only]
#
# Categories:
#   EDIBLES, FLOWER, PRE_ROLLS, VAPORIZERS, ALL (for all-subcategories only)
#
# Examples:
#   ./preset_sync.sh all-subcategories EDIBLES products-demo-x 15
#   ./preset_sync.sh all-subcategories FLOWER products-demo-x 15
#   ./preset_sync.sh all-subcategories PRE_ROLLS products-demo-x 15
#   ./preset_sync.sh all-subcategories VAPORIZERS products-demo-x 15
#   ./preset_sync.sh all-subcategories ALL products-demo-x 15
#   ./preset_sync.sh gummies-all EDIBLES products-demo-x 15
#   ./preset_sync.sh chocolates EDIBLES products-prod 20

set -e

# Check arguments
if [ $# -lt 4 ]; then
    echo "Usage: $0 [PRESET] [CATEGORY] [INDEX] [LIMIT]"
    echo ""
    echo "Presets:"
    echo "  all-subcategories - All subcategories for specified category"
    echo "  gummies-all       - All gummy types x all strains [EDIBLES only]"
    echo "  gummies-indica    - All gummy types x INDICA [EDIBLES only]"
    echo "  gummies-sativa    - All gummy types x SATIVA [EDIBLES only]"
    echo "  chocolates        - Chocolates x all strains [EDIBLES only]"
    echo "  edibles-full      - All edibles x all strains [EDIBLES only]"
    echo "  edibles-quick     - Gummies + chocolates [EDIBLES only]"
    echo ""
    echo "Categories: EDIBLES, FLOWER, PRE_ROLLS, VAPORIZERS, ALL"
    echo ""
    echo "Examples:"
    echo "  $0 all-subcategories EDIBLES products-demo-x 15"
    echo "  $0 all-subcategories FLOWER products-demo-x 15"
    echo "  $0 all-subcategories VAPORIZERS products-demo-x 15"
    echo "  $0 all-subcategories ALL products-demo-x 15"
    echo "  $0 gummies-all EDIBLES products-demo-x 15"
    echo "  $0 chocolates EDIBLES products-prod 20"
    exit 1
fi

PRESET="$1"
CATEGORY="$2"
INDEX="$3"
LIMIT="$4"
SLEEP=2

cd "$(dirname "$0")"

echo "============================================="
echo "Preset Sync: $PRESET"
echo "Category: $CATEGORY | Index: $INDEX | Limit: $LIMIT"
echo "============================================="

case "$PRESET" in
    all-subcategories)
        case "$CATEGORY" in
            EDIBLES)
                echo "Syncing all EDIBLES subcategories (no strain filter)..."
                for SUBCAT in GUMMIES LIVE_RESIN_GUMMIES LIVE_ROSIN_GUMMIES CHOCOLATES CHEWS COOKING_BAKING DRINKS; do
                    echo "  → EDIBLES/$SUBCAT"
                    python vectorize.py -x "$INDEX" --category EDIBLES --subcategory "$SUBCAT" --limit "$LIMIT" --upload || echo "    (skipped or failed)"
                    sleep $SLEEP
                done
                ;;
            FLOWER)
                echo "Syncing all FLOWER subcategories (no strain filter)..."
                for SUBCAT in DEFAULT PREMIUM WHOLE_FLOWER BULK_FLOWER SMALL_BUDS PRE_GROUND; do
                    echo "  → FLOWER/$SUBCAT"
                    python vectorize.py -x "$INDEX" --category FLOWER --subcategory "$SUBCAT" --limit "$LIMIT" --upload || echo "    (skipped or failed)"
                    sleep $SLEEP
                done
                ;;
            PRE_ROLLS)
                echo "Syncing all PRE_ROLLS subcategories (no strain filter)..."
                for SUBCAT in SINGLES PACKS INFUSED INFUSED_PRE_ROLL_PACKS BLUNTS; do
                    echo "  → PRE_ROLLS/$SUBCAT"
                    python vectorize.py -x "$INDEX" --category PRE_ROLLS --subcategory "$SUBCAT" --limit "$LIMIT" --upload || echo "    (skipped or failed)"
                    sleep $SLEEP
                done
                ;;
            VAPORIZERS)
                echo "Syncing all VAPORIZERS subcategories (no strain filter)..."
                for SUBCAT in DEFAULT LIVE_RESIN ALL_IN_ONE CARTRIDGES DISPOSABLES; do
                    echo "  → VAPORIZERS/$SUBCAT"
                    python vectorize.py -x "$INDEX" --category VAPORIZERS --subcategory "$SUBCAT" --limit "$LIMIT" --upload || echo "    (skipped or failed)"
                    sleep $SLEEP
                done
                ;;
            ALL)
                echo "Syncing ALL categories and subcategories..."
                echo ""
                echo "--- EDIBLES ---"
                for SUBCAT in GUMMIES LIVE_RESIN_GUMMIES LIVE_ROSIN_GUMMIES CHOCOLATES CHEWS COOKING_BAKING DRINKS; do
                    echo "  → EDIBLES/$SUBCAT"
                    python vectorize.py -x "$INDEX" --category EDIBLES --subcategory "$SUBCAT" --limit "$LIMIT" --upload || echo "    (skipped or failed)"
                    sleep $SLEEP
                done
                echo ""
                echo "--- FLOWER ---"
                for SUBCAT in DEFAULT PREMIUM WHOLE_FLOWER BULK_FLOWER SMALL_BUDS PRE_GROUND; do
                    echo "  → FLOWER/$SUBCAT"
                    python vectorize.py -x "$INDEX" --category FLOWER --subcategory "$SUBCAT" --limit "$LIMIT" --upload || echo "    (skipped or failed)"
                    sleep $SLEEP
                done
                echo ""
                echo "--- PRE_ROLLS ---"
                for SUBCAT in SINGLES PACKS INFUSED INFUSED_PRE_ROLL_PACKS BLUNTS; do
                    echo "  → PRE_ROLLS/$SUBCAT"
                    python vectorize.py -x "$INDEX" --category PRE_ROLLS --subcategory "$SUBCAT" --limit "$LIMIT" --upload || echo "    (skipped or failed)"
                    sleep $SLEEP
                done
                echo ""
                echo "--- VAPORIZERS ---"
                for SUBCAT in DEFAULT LIVE_RESIN ALL_IN_ONE CARTRIDGES DISPOSABLES; do
                    echo "  → VAPORIZERS/$SUBCAT"
                    python vectorize.py -x "$INDEX" --category VAPORIZERS --subcategory "$SUBCAT" --limit "$LIMIT" --upload || echo "    (skipped or failed)"
                    sleep $SLEEP
                done
                ;;
            *)
                echo "Error: Invalid category '$CATEGORY' for preset '$PRESET'"
                echo "Valid categories: EDIBLES, FLOWER, PRE_ROLLS, VAPORIZERS, ALL"
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
                echo "  → $GUMMY ($STRAIN)"
                python vectorize.py -x "$INDEX" --category EDIBLES --subcategory "$GUMMY" --strain "$STRAIN" --limit "$LIMIT" --upload
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
            echo "  → $GUMMY (INDICA)"
            python vectorize.py -x "$INDEX" --category EDIBLES --subcategory "$GUMMY" --strain INDICA --limit "$LIMIT" --upload
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
            echo "  → $GUMMY (SATIVA)"
            python vectorize.py -x "$INDEX" --category EDIBLES --subcategory "$GUMMY" --strain SATIVA --limit "$LIMIT" --upload
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
            echo "  → CHOCOLATES ($STRAIN)"
            python vectorize.py -x "$INDEX" --category EDIBLES --subcategory CHOCOLATES --strain "$STRAIN" --limit "$LIMIT" --upload
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
                echo "  → $SUBCAT ($STRAIN)"
                python vectorize.py -x "$INDEX" --category EDIBLES --subcategory "$SUBCAT" --strain "$STRAIN" --limit "$LIMIT" --upload
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
        echo "  all-subcategories    - All subcategories (EDIBLES, FLOWER, PRE_ROLLS, or ALL)"
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
