# Vectorizer CLI Commands Reference

## Local Terminal Note

On this Mac, `node`, `npm`, `npx`, `wrangler`, and `pywrangler` may be missing in a fresh terminal until `nvm` is activated. Before running any Node/Wrangler command in a new terminal, run:

```bash
nvm use --lts
```

Complete CLI reference guide for managing Cloudflare Vectorize indexes and syncing product data.

---

## Index Management (`manage_indexes.py`)

Manage Cloudflare Vectorize index lifecycle operations.

### Create Index

Create a new Vectorize index. This is typically done once per index before uploading data.

```bash
python manage_indexes.py --create products-demo-3
```

**Options:**
- `--create INDEX_NAME` - Create a new index with the specified name
- `--no-wait` - Don't wait for index creation to complete (optional)

**Example:**
```bash
# Create index and wait for completion
python manage_indexes.py --create products-demo-3

# Create index without waiting
python manage_indexes.py --create products-demo-3 --no-wait
```

**Output:**
```
✓ Successfully created index 'products-demo-3'
  Index ID: abc123...
  Status: ready
  D1 uniqueness table ready: vector_uniques_products_demo_3
```

### Delete Index

Delete an existing Vectorize index. **Warning:** This permanently deletes all vectors in the index.

```bash
python manage_indexes.py --delete products-demo-3
```

**Options:**
- `--delete INDEX_NAME` - Delete the specified index

**Example:**
```bash
python manage_indexes.py --delete products-demo-3
```

**Output:**
```
✓ Successfully deleted index 'products-demo-3'
```

### List All Indexes

List all Vectorize indexes in your Cloudflare account.

```bash
python manage_indexes.py --list
```

**Options:**
- `--list` - List all indexes

**Example:**
```bash
python manage_indexes.py --list
```

**Output:**
```
============================================================
VECTORIZE INDEXES
============================================================
  - products-demo-example-1: 0 vectors (status: ready)
  - products-demo-example-2: 0 vectors (status: ready)
  - products-demo-example-3: 139 vectors (status: ready)
============================================================
```

### Check if Index Exists

Check whether a specific index exists.

```bash
python manage_indexes.py --exists products-demo-3
```

**Options:**
- `--exists INDEX_NAME` - Check if index exists

**Example:**
```bash
python manage_indexes.py --exists products-demo-3
```

**Output:**
```
✓ Index 'products-demo-3' exists
```

**Exit codes:**
- `0` - Index exists
- `1` - Index does not exist

---

## Data Sync (`vectorize.py`)

Sync product data from Dutchie API to Cloudflare Vectorize.

### Dry Run (Test without Upload)

Test the vectorization pipeline without uploading to Vectorize. Useful for debugging and verification.

```bash
python vectorize.py -x products-demo-3 --category EDIBLES --limit 20
```

**Options:**
- `-x, --index INDEX_NAME` - Vectorize index name (required)
- `--category CATEGORY` - Category to vectorize (EDIBLES, FLOWER, PRE_ROLLS, VAPORIZERS, CONCENTRATES, TINCTURES, CBD, TOPICALS, ACCESSORIES)
- `--subcategory SUBCATEGORY` - Subcategory to filter (GUMMIES, CHOCOLATES, COOKING_BAKING, DRINKS, etc.)
- `--strain STRAIN` - Strain type to filter (INDICA, SATIVA, HYBRID)
- `--limit N|none` - Total number of products to fetch (default: 50). Use `none` to fetch all.
- `--min-quantity N` - Exclude products when quantity exists and is below threshold.
- `--skip-d1-dedup` - Disable D1 cross-run dedup checks and ledger writes.
- `--offset N` - Starting offset for pagination (default: 0)
- `--local` - Use local JSON files instead of API

**Example:**
```bash
# Test with 20 EDIBLES products
python vectorize.py -x products-demo-X --category EDIBLES --limit 20

# Test INDICA gummies
python vectorize.py -x products-demo-X --category EDIBLES --subcategory GUMMIES --strain INDICA --limit 15

# Test SATIVA chocolates
python vectorize.py -x products-demo-X --category EDIBLES --subcategory CHOCOLATES --strain SATIVA --limit 15

# Test with offset
python vectorize.py -x products-demo-X --category EDIBLES --offset 100 --limit 50

# Test full catalog pull
python vectorize.py -x products-demo-X --category EDIBLES --limit none

# Test low-stock exclusion
python vectorize.py -x products-demo-X --category EDIBLES --limit 100 --min-quantity 5
```

**Output:**
```
============================================================
VECTORIZATION PIPELINE
============================================================
Category: EDIBLES
Offset: 0
Limit: 20
Index: products-demo-3
Mode: DRY RUN
============================================================

Fetching products from Dutchie API (category: EDIBLES, limit: 20)...
  Fetched batch of 20 products (total: 20)
Successfully fetched 20 products from API

Transforming 20 products...
Transforming: 100%|████████████████████████████████████████| 20/20 [00:00<00:00, 23058.39it/s]

Successfully transformed 20 products

Building documents...
Built 20 documents

DRY RUN - Skipping upload
```

### Upload Products

Upload products to Vectorize index. **Note:** Index must exist before uploading.

```bash
python vectorize.py -x INDEX_NAME --category EDIBLES --limit 100 --upload
```

**Options:**
- `-x, --index INDEX_NAME` - Vectorize index name (required)
- `--upload` - Actually upload to Vectorize (default is dry run)
- All other options from dry run apply

**Example:**
```bash
# Upload 100 EDIBLES products
python vectorize.py -x products-demo-3 --category EDIBLES --limit 100 --upload

# Upload INDICA gummies to production
python vectorize.py -x products-prod --category EDIBLES --subcategory GUMMIES --strain INDICA --limit 50 --upload

# Upload SATIVA chocolates
python vectorize.py -x products-prod --category EDIBLES --subcategory CHOCOLATES --strain SATIVA --limit 30 --upload

# Upload with offset (for pagination)
python vectorize.py -x products-demo-3 --category EDIBLES --offset 100 --limit 50 --upload
```

**Output:**
```
============================================================
VECTORIZATION PIPELINE
============================================================
Category: EDIBLES
Offset: 0
Limit: 100
Index: products-demo-3
Mode: LIVE UPLOAD
============================================================

Fetching products from Dutchie API (category: EDIBLES, limit: 100)...
  Fetched batch of 50 products (total: 50)
  Fetched batch of 50 products (total: 100)
Successfully fetched 100 products from API

Transforming 100 products...
Successfully transformed 100 products

Building documents...
Built 100 documents

Uploading to Vectorize index: products-demo-3
Upload complete!
```

### With Offset

Fetch products starting from a specific offset. Useful for pagination or resuming interrupted syncs.

```bash
python vectorize.py --index INDEX_NAME --category EDIBLES --offset 100 --limit 50 --upload
```

**Example:**
```bash
# Fetch products 100-150
python vectorize.py --index products-demo-3 --category EDIBLES --offset 100 --limit 50 --upload

# Fetch products 200-300
python vectorize.py --index products-demo-3 --category EDIBLES --offset 200 --limit 100 --upload
```

### FLOWER Category

Upload flower products to Vectorize.

```bash
# Test 20 FLOWER products
python vectorize.py -x products-test --category FLOWER --limit 20

# Upload INDICA flower
python vectorize.py -x products-prod --category FLOWER --strain INDICA --limit 25 --upload

# Upload SATIVA premium flower
python vectorize.py -x products-prod --category FLOWER --subcategory PREMIUM --strain SATIVA --limit 15 --upload

# Upload small buds
python vectorize.py -x products-prod --category FLOWER --subcategory SMALL_BUDS --limit 20 --upload
```

**FLOWER Subcategories:**
- `DEFAULT` - Standard flower
- `PREMIUM` - Premium quality flower
- `WHOLE_FLOWER` - Whole flower buds
- `BULK_FLOWER` - Bulk/large quantity flower
- `SMALL_BUDS` - Small buds (popcorn nugs)
- `PRE_GROUND` - Pre-ground flower

### PRE_ROLLS Category

Upload preroll products to Vectorize.

```bash
# Test 20 PRE_ROLLS products
python vectorize.py -x products-test --category PRE_ROLLS --limit 20

# Upload INDICA prerolls
python vectorize.py -x products-prod --category PRE_ROLLS --strain INDICA --limit 25 --upload

# Upload singles only
python vectorize.py -x products-prod --category PRE_ROLLS --subcategory SINGLES --limit 20 --upload

# Upload infused prerolls
python vectorize.py -x products-prod --category PRE_ROLLS --subcategory INFUSED --strain HYBRID --limit 15 --upload
```

**PRE_ROLLS Subcategories:**
- `SINGLES` - Single prerolls
- `PACKS` - Preroll packs
- `INFUSED` - Infused prerolls (singles)
- `INFUSED_PRE_ROLL_PACKS` - Infused preroll packs
- `BLUNTS` - Blunts

**Note:** Pack count is extracted from product name/slug, NOT from inventory quantity.

### VAPORIZERS Category

Upload vaporizer products (cartridges, disposables, live resin, all-in-one devices) to Vectorize.

```bash
# Test 20 VAPORIZERS products
python vectorize.py -x products-test --category VAPORIZERS --limit 20

# Upload INDICA vaporizers
python vectorize.py -x products-prod --category VAPORIZERS --strain INDICA --limit 25 --upload

# Upload live resin cartridges
python vectorize.py -x products-prod --category VAPORIZERS --subcategory LIVE_RESIN --limit 20 --upload

# Upload disposables only
python vectorize.py -x products-prod --category VAPORIZERS --subcategory DISPOSABLES --strain SATIVA --limit 15 --upload
```

**VAPORIZERS Subcategories:**
- `DEFAULT` - Standard vaporizer products
- `LIVE_RESIN` - Live resin vaporizers
- `ALL_IN_ONE` - All-in-one devices (integrated battery)
- `CARTRIDGES` - Standard 510-thread cartridges
- `DISPOSABLES` - Disposable vape pens

**Note:** Vaporizers have higher THC percentages (66-90%+) compared to flower/prerolls (13-28%).

### CONCENTRATES Category

Upload concentrate products (badder, hash, live resin, live rosin, rosin) to Vectorize.

```bash
# Test 20 CONCENTRATES products
python vectorize.py -x products-test --category CONCENTRATES --limit 20

# Upload INDICA concentrates
python vectorize.py -x products-prod --category CONCENTRATES --strain INDICA --limit 25 --upload

# Upload live rosin only
python vectorize.py -x products-prod --category CONCENTRATES --subcategory LIVE_ROSIN --limit 20 --upload

# Upload badder
python vectorize.py -x products-prod --category CONCENTRATES --subcategory BADDER --strain HYBRID --limit 15 --upload
```

**CONCENTRATES Subcategories:**
- `DEFAULT` - Standard concentrates
- `BADDER` - Badder/budder consistency
- `HASH` - Hash concentrates
- `LIVE_RESIN` - Live resin extracts
- `LIVE_ROSIN` - Live rosin (solventless)
- `ROSIN` - Standard rosin (solventless)

**Note**: Concentrates use percentage-based THC (66-90%+), similar to vaporizers.

### TINCTURES Category

Upload tincture products as a first-class category. This is the canonical home for Dutchie `TINCTURES` inventory.

**Important**: Tinctures may expose potency as either mg totals or percentages. Ingest preserves whichever concrete field Dutchie provides.

```bash
# Test 20 TINCTURES products
python vectorize.py -x products-test --category TINCTURES --limit 20

# Upload all tinctures
python vectorize.py -x products-prod --category TINCTURES --limit 25 --upload

# Upload herbal tinctures only
python vectorize.py -x products-prod --category TINCTURES --subcategory HERBAL --limit 20 --upload
```

**TINCTURES Subcategories:**
- `DEFAULT` - Standard tinctures
- `UNFLAVORED` - Unflavored tinctures
- `HERBAL` - Herbal tinctures

**Note**: `CBD tincture` remains a CBD subcategory path. Plain `tincture` / `tinctures` maps to the `TINCTURES` category.

### CBD Category

Upload CBD products (wellness products with high CBD and minimal/no THC) to Vectorize.

**Important**: CBD products are all HIGH_CBD strain type with mg-based potency. Subcategories are inferred during normalization.

```bash
# Test 20 CBD products
python vectorize.py -x products-test --category CBD --limit 20

# Upload CBD products
python vectorize.py -x products-prod --category CBD --limit 25 --upload

# Upload CBD products while excluding known low stock
python vectorize.py -x products-prod --category CBD --limit none --min-quantity 5 --upload
```

**CBD Subcategories:**
- `DEFAULT` - Fallback when no specific form is detected
- `OIL` - Oils and drops
- `CREAM` - Creams, lotions, salves, and roll-ons
- `TINCTURE` - CBD tinctures only
- `CHEWS` - Chews, treats, gummies
- `PET-FOOD` - Pet-focused products

**Note**: CBD products have mg-based CBD (150mg-3000mg range), minimal/no THC, and are wellness-focused (pain relief, anxiety, pet products).

### TOPICALS Category

Upload topical products (balms, creams, lotions applied externally) to Vectorize.

**Important**: TOPICALS have mg-based THC:CBD ratios and are non-psychoactive (applied externally, not ingested).

```bash
# Test 20 TOPICALS products
python vectorize.py -x products-test --category TOPICALS --limit 20

# Upload topical balms
python vectorize.py -x products-prod --category TOPICALS --subcategory BALMS --limit 25 --upload

# Upload all topicals
python vectorize.py -x products-prod --category TOPICALS --limit 15 --upload
```

**TOPICALS Subcategories:**
- `BALMS` - Topical balms (1:1, 3:1, 1:3 THC:CBD ratios)

**Note**: Topicals have mg-based potency (e.g., 1000mg THC : 1000mg CBD for 1:1 ratio), used for external pain relief.

### ACCESSORIES Category

Upload accessory products (physical products with no cannabinoid content) to Vectorize.

**Important**: ACCESSORIES have no potency, no effects, no terpenes - they are physical consumption/storage tools.

```bash
# Test 20 ACCESSORIES products
python vectorize.py -x products-test --category ACCESSORIES --limit 20

# Upload rolling papers and supplies
python vectorize.py -x products-prod --category ACCESSORIES --subcategory PAPERS_ROLLING_SUPPLIES --limit 15 --upload

# Upload grinders
python vectorize.py -x products-prod --category ACCESSORIES --subcategory GRINDERS --limit 10 --upload

# Upload batteries
python vectorize.py -x products-prod --category ACCESSORIES --subcategory BATTERIES --limit 10 --upload

# Upload all accessories
python vectorize.py -x products-prod --category ACCESSORIES --limit 25 --upload
```

**ACCESSORIES Subcategories:**
- `DEFAULT` - Miscellaneous accessories
- `PAPERS_ROLLING_SUPPLIES` - Rolling papers, filter tips, trays
- `GRINDERS` - Herb grinders (2-piece, 3-piece, 4-piece)
- `LIGHTERS` - Disposable and refillable lighters
- `BATTERIES` - 510-thread and variable voltage batteries
- `GLASSWARE` - Glass pipes, tips, storage jars

**Note**: Accessories are physical products (papers, grinders, lighters, etc.) with no cannabinoid content.

### Use Local Files

Use local JSON files instead of fetching from Dutchie API. Useful for testing or when API is unavailable.

```bash
python vectorize.py --index INDEX_NAME --category EDIBLES --local
```

**Options:**
- `--index INDEX_NAME` - Vectorize index name (required)
- `--local` - Use local JSON files instead of API

**Example:**
```bash
# Test with local files
python vectorize.py --index products-demo-3 --category EDIBLES --local --limit 10

# Upload from local files
python vectorize.py --index products-demo-3 --category EDIBLES --local --upload
```

**Note:** Local files are expected in `vectorizer/src/schema/` directory (e.g., `schema/edibles.json`).

### List Categories

List all available product categories.

```bash
python vectorize.py --list-categories
```

**Example:**
```bash
python vectorize.py --list-categories
```

**Output:**
```
Available categories:
  - FLOWER
  - PRE_ROLLS
  - EDIBLES
  - VAPORIZERS
  - CONCENTRATES
  - CBD
  - TOPICALS
  - ACCESSORIES
```

---

## Common Use Cases

### Initial Setup

1. **Create the index:**
   ```bash
   python manage_indexes.py --create products-demo-3
   ```

2. **Verify index exists:**
   ```bash
   python manage_indexes.py --exists products-demo-3
   ```

3. **Test vectorization (dry run):**
   ```bash
   python vectorize.py --index products-demo-3 --category EDIBLES --limit 20
   ```

4. **Upload first batch:**
   ```bash
   python vectorize.py --index products-demo-3 --category EDIBLES --limit 100 --upload
   ```

### Full Category Sync

Sync all products from a category:

```bash
# Fetch all EDIBLES (no limit = fetches all)
python vectorize.py --index products-demo-3 --category EDIBLES --upload
```

**Note:** Use `--limit none` to fetch all available products. Use with caution for large catalogs.

### Incremental Sync

Sync products in batches:

```bash
# Batch 1: Products 0-100
python vectorize.py --index products-demo-3 --category EDIBLES --offset 0 --limit 100 --upload

# Batch 2: Products 100-200
python vectorize.py --index products-demo-3 --category EDIBLES --offset 100 --limit 100 --upload

# Batch 3: Products 200-300
python vectorize.py --index products-demo-3 --category EDIBLES --offset 200 --limit 100 --upload
```

### Testing Before Production

Always test with dry run first:

```bash
# 1. Test with small batch
python vectorize.py --index products-demo-3 --category EDIBLES --limit 5

# 2. Verify output looks correct

# 3. Upload small batch
python vectorize.py --index products-demo-3 --category EDIBLES --limit 5 --upload

# 4. Verify in Cloudflare dashboard

# 5. Proceed with full sync
python vectorize.py --index products-demo-3 --category EDIBLES --upload
```

---

## Batch Operations (Preset Scripts)

### Quick Batch Sync

Use preset scripts to sync multiple subcategories at once.

**Sync all subcategories for a specific category (15 products each, no strain filter):**
```bash
# All EDIBLES subcategories
./preset_sync.sh all-subcategories EDIBLES products-demo-x 15

# All FLOWER subcategories
./preset_sync.sh all-subcategories FLOWER products-demo-x 15

# All PRE_ROLLS subcategories
./preset_sync.sh all-subcategories PRE_ROLLS products-demo-x 15

# All VAPORIZERS subcategories
./preset_sync.sh all-subcategories VAPORIZERS products-demo-x 15

# All CONCENTRATES subcategories
./preset_sync.sh all-subcategories CONCENTRATES products-demo-x 15

# All TINCTURES subcategories
./preset_sync.sh all-subcategories TINCTURES products-demo-x 15

# All categories
./preset_sync.sh all-subcategories ALL products-demo-x 15

# Full-catalog sync (all categories, no subcategory filter), exclude known low stock
./preset_sync.sh all-products ALL products-prod none 5
```

**EDIBLES subcategories (7 total):**
- GUMMIES, LIVE_RESIN_GUMMIES, LIVE_ROSIN_GUMMIES, CHOCOLATES, CHEWS, COOKING_BAKING, DRINKS

**FLOWER subcategories (6 total):**
- DEFAULT, PREMIUM, WHOLE_FLOWER, BULK_FLOWER, SMALL_BUDS, PRE_GROUND

**PRE_ROLLS subcategories (5 total):**
- SINGLES, PACKS, INFUSED, INFUSED_PRE_ROLL_PACKS, BLUNTS

**VAPORIZERS subcategories (6 total):**
- DEFAULT, LIVE_RESIN, LIVE_ROSIN, ALL_IN_ONE, CARTRIDGES, DISPOSABLES

**CONCENTRATES subcategories (7 total):**
- DEFAULT, UNFLAVORED, BADDER, HASH, LIVE_RESIN, LIVE_ROSIN, ROSIN

**TINCTURES subcategories (3 total):**
- DEFAULT, UNFLAVORED, HERBAL

**Available Presets:**

| Preset | Description | Example |
|--------|-------------|---------|
| `all-subcategories` | All subcategories for a category | `./preset_sync.sh all-subcategories CONCENTRATES products-demo-x 15` |
| `all-products` | Full category pull with no subcategory filter | `./preset_sync.sh all-products ALL products-prod none 5` |
| `gummies-all` | All gummy types × all strains | `./preset_sync.sh gummies-all EDIBLES products-demo-x 15` |
| `gummies-indica` | All gummy types × INDICA | `./preset_sync.sh gummies-indica EDIBLES products-demo-x 20` |
| `chocolates` | Chocolates × all strains | `./preset_sync.sh chocolates EDIBLES products-prod 10` |
| `edibles-quick` | Gummies + chocolates only | `./preset_sync.sh edibles-quick EDIBLES products-prod 30` |

**Output:**
```bash
=============================================
Preset Sync: all-subcategories
Index: products-demo-x | Limit: 15
=============================================
Syncing all edibles subcategories (no strain filter)...
  → GUMMIES
  ✓ Success
  → LIVE_RESIN_GUMMIES
  ✓ Success
  → CHOCOLATES
  ✓ Success
...
=============================================
Preset sync complete!
=============================================
```

**Notes:**
- Scripts retry Dutchie API rate-limit and transient HTTP failures automatically
- Failed/empty categories are skipped
- Run from `vectorizer/src/` directory

---

## Stale Reconciliation (`reconcile_stale.py`)

Delete vectors that have not been seen recently, based on D1 `last_seen_at`.

```bash
# Dry run preview (no deletes)
python reconcile_stale.py -x products-prod --stale-hours 48 --dry-run

# Execute stale cleanup
python reconcile_stale.py -x products-prod --stale-hours 48
```

**Important:** Stale cleanup should run after sync, not before.

---

## Cloudflare Scheduler Workflow

Production scheduling is handled by the dedicated Cloudflare Python Worker in `vectorizer/`.

### Daily Scheduled Run

The Worker cron is configured in `vectorizer/wrangler.toml`:

```toml
[triggers]
crons = ["17 7 * * *"]
```

The scheduled Worker executes the same shared sync + reconcile cycle used locally:

```bash
python run_sync_cycle.py products-prod 5 48 none
```

### Local Worker Test

```bash
cd vectorizer
pywrangler dev --test-scheduled
```

### Manual Authenticated Trigger

```bash
curl -X POST http://127.0.0.1:8787/run \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"index_name":"products-prod","min_quantity":5,"stale_hours":48,"limit":"20"}'
```

---

## QA Automation Stack

Use the QA lane to validate cron and stale reconciliation without touching the current `products-prod` lane.

**QA resources**:

- Vectorize index: `products-qa`
- D1 database: `vectorizer-qa`
- Vectorizer Worker config: `vectorizer/wrangler.qa.toml`
- Backend Worker config: `backend/wrangler.qa.toml`
- QA Pages project: `cannavita-widget-qa`

**Important operating rule**:

- `products-prod` can still be manually refreshed with:
  - `./preset_sync.sh all-products ALL products-prod none 5`
- `products-qa` is full-catalog only
- do not run subset presets such as `all-subcategories`, `gummies-all`, or `gummies-indica` against `products-qa`

### QA One-Time Setup

```bash
# Create QA index
cd vectorizer/src
python manage_indexes.py --create products-qa

# Create QA metadata indexes
npx wrangler vectorize create-metadata-index products-qa --property-name=category --type=string
npx wrangler vectorize create-metadata-index products-qa --property-name=type --type=string
npx wrangler vectorize create-metadata-index products-qa --property-name=brand --type=string
npx wrangler vectorize create-metadata-index products-qa --property-name=subcategory --type=string
npx wrangler vectorize create-metadata-index products-qa --property-name=effects --type=string
npx wrangler vectorize create-metadata-index products-qa --property-name=flavor --type=string
npx wrangler vectorize create-metadata-index products-qa --property-name=price --type=number
npx wrangler vectorize create-metadata-index products-qa --property-name=thc_percentage --type=number
npx wrangler vectorize create-metadata-index products-qa --property-name=cbd_percentage --type=number
npx wrangler vectorize create-metadata-index products-qa --property-name=thc_per_unit_mg --type=number
npx wrangler vectorize create-metadata-index products-qa --property-name=inStock --type=boolean
```

### QA Worker Deploy

```bash
cd ../
pywrangler deploy --config wrangler.qa.toml
```

### QA Manual Trigger

```bash
curl -X POST http://127.0.0.1:8787/run \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"index_name":"products-qa","min_quantity":5,"stale_hours":48,"limit":"20"}'
```

### QA End-To-End Stack

- Backend Worker: `ecom-chat-backend-qa`
- Pages project: `cannavita-widget-qa`
- QA widget build mode: `npm run build:qa`

---

## Troubleshooting

### Index Doesn't Exist Error

**Problem:** `⚠️  WARNING: Index 'products-demo-3' does not exist!`

**Solution:**
```bash
python manage_indexes.py --create products-demo-3
```

### API Authentication Error

**Problem:** `Authentication failed: API key not provided`

**Solution:**
1. Check `.env` file exists in `vectorizer/` directory
2. Verify `CANNAVITA_API_KEY` is set
3. Verify `CF_ACCOUNT_ID`, `CF_VECTORIZE_API_TOKEN`, and `CF_AI_API_TOKEN` are set

### SSL Certificate Error

**Problem:** `[SSL: CERTIFICATE_VERIFY_FAILED]`

**Solution:**
```bash
# Install certificates (macOS)
/Applications/Python\ 3.x/Install\ Certificates.command

# Or update certifi
pip install --upgrade certifi
```

### No Products Fetched

**Problem:** `No products to process`

**Possible causes:**
1. Category filter too restrictive
2. API returned empty results
3. Local files not found (when using `--local`)

**Solution:**
- Check API response: Remove `--local` flag to test API
- Verify category name is correct: Use `--list-categories`
- Check local files exist: Verify `schema/edibles.json` exists

### Offset/Limit Not Working

**Problem:** Fetches all products instead of respecting limit

**Solution:**
- Ensure you're using the latest version with `--limit` as total limit
- Check that `--offset` is specified if needed
- Verify API is returning correct pagination

---

## Environment Variables

Required environment variables (in `vectorizer/.env`):

```bash
# Dutchie API
CANNAVITA_API_KEY=your_api_key_here

# Cloudflare Vectorize
CF_ACCOUNT_ID=your_account_id
CF_VECTORIZE_API_TOKEN=your_api_token
CF_AI_API_TOKEN=your_ai_api_token

# Cloudflare D1 (required for cross-run dedup ledger)
CF_D1_DATABASE_ID=your_d1_database_id
# Optional if different from CF_VECTORIZE_API_TOKEN
# CF_D1_API_TOKEN=your_d1_api_token
```

---

## Quick Reference

### Index Management

| Command | Description |
|---------|-------------|
| `python manage_indexes.py --create INDEX` | Create new index |
| `python manage_indexes.py --delete INDEX` | Delete index |
| `python manage_indexes.py --list` | List all indexes |
| `python manage_indexes.py --exists INDEX` | Check if index exists |

### Data Sync

| Command | Description |
|---------|-------------|
| `python vectorize.py --index INDEX --category CATEGORY --limit N` | Dry run (test) |
| `python vectorize.py --index INDEX --category CATEGORY --limit none` | Full pull dry run |
| `python vectorize.py --index INDEX --category CATEGORY --limit N --upload` | Upload products |
| `python vectorize.py --index INDEX --category CATEGORY --limit N --min-quantity 5 --upload` | Upload with low-stock exclusion |
| `python reconcile_stale.py --index INDEX --stale-hours 48` | Delete stale vectors + D1 rows |
| `python run_sync_cycle.py INDEX 5 48 none` | One-shot sync + reconcile workflow |
| `./cron_sync_and_reconcile.sh INDEX 5 48 none` | Shell wrapper for the shared sync cycle |
| `python vectorize.py --index INDEX --category CATEGORY --offset N --limit N` | With offset |
| `python vectorize.py --index INDEX --category CATEGORY --local` | Use local files |
| `python vectorize.py --list-categories` | List categories |

---

## Notes

- **Batch Size:** Internally uses batch size of 50 for API efficiency. The `--limit` parameter is the total number of products to fetch, not batch size.
- **Index Creation:** Indexes are created with 1024 dimensions (for `@cf/baai/bge-large-en-v1.5` embedding model) and cosine similarity metric.
- **Per-index D1 Ledger:** Index creation initializes a matching D1 uniqueness table (`vector_uniques_<index>` when D1 is configured).
- **Dedup Behavior:** Duplicate `id` or normalized `name` entries are skipped/logged (cron-safe, non-fatal).
- **Dry Run:** Always test with dry run first to verify data transformation before uploading.
- **Offset:** Useful for resuming interrupted syncs or paginating through large catalogs.
