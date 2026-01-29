# Chunked Category CLI Commands

Preset commands for pulling specific product combinations. Designed for cron jobs and batch operations.

## Quick Reference

| Category | Subcategory | Strain | Command |
|----------|-------------|--------|---------|
| EDIBLES | GUMMIES | INDICA | `python vectorize.py -x INDEX --category EDIBLES --subcategory GUMMIES --strain INDICA --limit 15 --upload` |
| EDIBLES | GUMMIES | SATIVA | `python vectorize.py -x INDEX --category EDIBLES --subcategory GUMMIES --strain SATIVA --limit 15 --upload` |
| EDIBLES | CHOCOLATES | INDICA | `python vectorize.py -x INDEX --category EDIBLES --subcategory CHOCOLATES --strain INDICA --limit 15 --upload` |
| EDIBLES | CHOCOLATES | SATIVA | `python vectorize.py -x INDEX --category EDIBLES --subcategory CHOCOLATES --strain SATIVA --limit 15 --upload` |
| FLOWER | - | INDICA | `python vectorize.py -x INDEX --category FLOWER --strain INDICA --limit 25 --upload` |
| FLOWER | - | SATIVA | `python vectorize.py -x INDEX --category FLOWER --strain SATIVA --limit 25 --upload` |

---

## Edibles - Gummies by Strain

```bash
# 15 INDICA gummies
python vectorize.py -x products-prod --category EDIBLES --subcategory GUMMIES --strain INDICA --limit 15 --upload

# 15 SATIVA gummies
python vectorize.py -x products-prod --category EDIBLES --subcategory GUMMIES --strain SATIVA --limit 15 --upload

# 15 HYBRID gummies
python vectorize.py -x products-prod --category EDIBLES --subcategory GUMMIES --strain HYBRID --limit 15 --upload
```

## Edibles - Chocolates by Strain

```bash
# 15 INDICA chocolates
python vectorize.py -x products-prod --category EDIBLES --subcategory CHOCOLATES --strain INDICA --limit 15 --upload

# 15 SATIVA chocolates
python vectorize.py -x products-prod --category EDIBLES --subcategory CHOCOLATES --strain SATIVA --limit 15 --upload

# 15 HYBRID chocolates
python vectorize.py -x products-prod --category EDIBLES --subcategory CHOCOLATES --strain HYBRID --limit 15 --upload
```

## Flower by Strain

```bash
# INDICA flower
python vectorize.py -x products-prod --category FLOWER --strain INDICA --limit 25 --upload

# SATIVA flower
python vectorize.py -x products-prod --category FLOWER --strain SATIVA --limit 25 --upload

# HYBRID flower
python vectorize.py -x products-prod --category FLOWER --strain HYBRID --limit 25 --upload
```

---

## Full Sync Shell Script

Save as `full_edibles_sync.sh` and make executable with `chmod +x full_edibles_sync.sh`:

```bash
#!/bin/bash
# full_edibles_sync.sh - Sequential sync with rate limit protection
# Usage: ./full_edibles_sync.sh [INDEX_NAME]

set -e  # Exit on error

INDEX="${1:-products-prod}"
SLEEP_BETWEEN=2  # Seconds between API calls

cd "$(dirname "$0")"  # Ensure we're in the src directory

echo "============================================="
echo "Starting Edibles Sync to index: $INDEX"
echo "============================================="

# Gummies
echo "Syncing INDICA gummies..."
python vectorize.py -x $INDEX --category EDIBLES --subcategory GUMMIES --strain INDICA --limit 15 --upload
sleep $SLEEP_BETWEEN

echo "Syncing SATIVA gummies..."
python vectorize.py -x $INDEX --category EDIBLES --subcategory GUMMIES --strain SATIVA --limit 15 --upload
sleep $SLEEP_BETWEEN

echo "Syncing HYBRID gummies..."
python vectorize.py -x $INDEX --category EDIBLES --subcategory GUMMIES --strain HYBRID --limit 15 --upload
sleep $SLEEP_BETWEEN

# Chocolates
echo "Syncing INDICA chocolates..."
python vectorize.py -x $INDEX --category EDIBLES --subcategory CHOCOLATES --strain INDICA --limit 15 --upload
sleep $SLEEP_BETWEEN

echo "Syncing SATIVA chocolates..."
python vectorize.py -x $INDEX --category EDIBLES --subcategory CHOCOLATES --strain SATIVA --limit 15 --upload
sleep $SLEEP_BETWEEN

echo "Syncing HYBRID chocolates..."
python vectorize.py -x $INDEX --category EDIBLES --subcategory CHOCOLATES --strain HYBRID --limit 15 --upload

echo "============================================="
echo "Edibles sync complete!"
echo "============================================="
```

## Full Flower Sync Script

Save as `full_flower_sync.sh`:

```bash
#!/bin/bash
# full_flower_sync.sh - Sequential flower sync
# Usage: ./full_flower_sync.sh [INDEX_NAME]

set -e

INDEX="${1:-products-prod}"
SLEEP_BETWEEN=2

cd "$(dirname "$0")"

echo "============================================="
echo "Starting Flower Sync to index: $INDEX"
echo "============================================="

echo "Syncing INDICA flower..."
python vectorize.py -x $INDEX --category FLOWER --strain INDICA --limit 25 --upload
sleep $SLEEP_BETWEEN

echo "Syncing SATIVA flower..."
python vectorize.py -x $INDEX --category FLOWER --strain SATIVA --limit 25 --upload
sleep $SLEEP_BETWEEN

echo "Syncing HYBRID flower..."
python vectorize.py -x $INDEX --category FLOWER --strain HYBRID --limit 25 --upload

echo "============================================="
echo "Flower sync complete!"
echo "============================================="
```

---

## Cron Schedule Examples

Add to crontab with `crontab -e`:

```bash
# Daily at 2 AM - Full edibles sync
0 2 * * * cd /path/to/vectorizer/src && ./full_edibles_sync.sh >> /var/log/vectorize-edibles.log 2>&1

# Daily at 3 AM - Full flower sync
0 3 * * * cd /path/to/vectorizer/src && ./full_flower_sync.sh >> /var/log/vectorize-flower.log 2>&1

# Hourly - Quick gummies refresh (latest 20)
0 * * * * cd /path/to/vectorizer/src && python vectorize.py -x products-prod --category EDIBLES --subcategory GUMMIES --limit 20 --upload >> /var/log/vectorize-hourly.log 2>&1
```

---

## Chain Commands (One-Liner)

For quick sequential execution without a script:

```bash
# Gummies - all strains
python vectorize.py -x products-prod --category EDIBLES --subcategory GUMMIES --strain INDICA --limit 15 --upload && \
sleep 2 && \
python vectorize.py -x products-prod --category EDIBLES --subcategory GUMMIES --strain SATIVA --limit 15 --upload && \
sleep 2 && \
python vectorize.py -x products-prod --category EDIBLES --subcategory GUMMIES --strain HYBRID --limit 15 --upload

# Chocolates - all strains
python vectorize.py -x products-prod --category EDIBLES --subcategory CHOCOLATES --strain INDICA --limit 15 --upload && \
sleep 2 && \
python vectorize.py -x products-prod --category EDIBLES --subcategory CHOCOLATES --strain SATIVA --limit 15 --upload && \
sleep 2 && \
python vectorize.py -x products-prod --category EDIBLES --subcategory CHOCOLATES --strain HYBRID --limit 15 --upload
```

---

## Environment Setup for Cron

Ensure cron has access to your Python environment:

```bash
#!/bin/bash
# wrapper.sh - Cron wrapper with environment setup

# Load environment
source /path/to/vectorizer/venv/bin/activate
cd /path/to/vectorizer/src

# Run the sync
./full_edibles_sync.sh products-prod
```

Then in crontab:
```bash
0 2 * * * /path/to/vectorizer/src/wrapper.sh >> /var/log/vectorize.log 2>&1
```
