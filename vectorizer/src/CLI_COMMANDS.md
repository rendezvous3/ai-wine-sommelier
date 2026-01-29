# Vectorizer CLI Commands Reference

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
  - products-demo-1: 0 vectors (status: ready)
  - products-demo-2: 0 vectors (status: ready)
  - products-demo-3: 139 vectors (status: ready)
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
- `--category CATEGORY` - Category to vectorize (EDIBLES, FLOWER, PRE_ROLLS, VAPORIZERS, CONCENTRATES, CBD, TOPICALS, ACCESSORIES)
- `--subcategory SUBCATEGORY` - Subcategory to filter (GUMMIES, CHOCOLATES, COOKING_BAKING, DRINKS, etc.)
- `--strain STRAIN` - Strain type to filter (INDICA, SATIVA, HYBRID)
- `--limit N` - Total number of products to fetch (default: 50)
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

**Note:** Without `--limit`, the script will fetch all available products. Use with caution for large catalogs.

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

**Sync all edibles subcategories (15 products each, no strain filter):**
```bash
./preset_sync.sh all-subcategories products-demo-1 15
```

This will sync:
- GUMMIES (15 products)
- LIVE_RESIN_GUMMIES (15 products)
- LIVE_ROSIN_GUMMIES (15 products)
- CHOCOLATES (15 products)
- CHEWS (15 products)
- COOKING_BAKING (15 products)
- DRINKS (15 products)

**Available Presets:**

| Preset | Description | Example |
|--------|-------------|---------|
| `all-subcategories` | All edibles, no strain filter | `./preset_sync.sh all-subcategories products-demo-1 15` |
| `gummies-all` | All gummy types × all strains | `./preset_sync.sh gummies-all products-demo-1 15` |
| `gummies-indica` | All gummy types × INDICA | `./preset_sync.sh gummies-indica products-demo-1 20` |
| `chocolates` | Chocolates × all strains | `./preset_sync.sh chocolates products-prod 10` |
| `edibles-quick` | Gummies + chocolates only | `./preset_sync.sh edibles-quick products-prod 30` |

**Output:**
```bash
=============================================
Preset Sync: all-subcategories
Index: products-demo-1 | Limit: 15
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
- Scripts automatically handle rate limiting (2s delay between requests)
- Failed/empty categories are skipped
- Run from `vectorizer/src/` directory

---

## Cronjob Scheduling Examples

### Daily Product Sync

Sync EDIBLES products daily at 2 AM:

```bash
0 2 * * * cd /path/to/vectorizer/src && python vectorize.py --index products-demo-3 --category EDIBLES --limit 1000 --upload
```

### Hourly Incremental Sync

Sync new products every hour (assuming products are added incrementally):

```bash
0 * * * * cd /path/to/vectorizer/src && python vectorize.py --index products-demo-3 --category EDIBLES --offset 0 --limit 50 --upload
```

### Weekly Full Sync

Full sync of all categories weekly on Sunday at 3 AM:

```bash
0 3 * * 0 cd /path/to/vectorizer/src && python vectorize.py --index products-demo-3 --upload
```

### Multiple Categories

Sync different categories at different times:

```bash
# EDIBLES at 2 AM
0 2 * * * cd /path/to/vectorizer/src && python vectorize.py --index products-demo-3 --category EDIBLES --upload

# FLOWER at 3 AM
0 3 * * * cd /path/to/vectorizer/src && python vectorize.py --index products-demo-3 --category FLOWER --upload

# PRE_ROLLS at 4 AM
0 4 * * * cd /path/to/vectorizer/src && python vectorize.py --index products-demo-3 --category PRE_ROLLS --upload
```

### With Logging

Redirect output to log files:

```bash
0 2 * * * cd /path/to/vectorizer/src && python vectorize.py --index products-demo-3 --category EDIBLES --upload >> /var/log/vectorize.log 2>&1
```

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
3. Verify `CF_ACCOUNT_ID` and `CF_VECTORIZE_API_TOKEN` are set

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
| `python vectorize.py --index INDEX --category CATEGORY --limit N --upload` | Upload products |
| `python vectorize.py --index INDEX --category CATEGORY --offset N --limit N` | With offset |
| `python vectorize.py --index INDEX --category CATEGORY --local` | Use local files |
| `python vectorize.py --list-categories` | List categories |

---

## Notes

- **Batch Size:** Internally uses batch size of 50 for API efficiency. The `--limit` parameter is the total number of products to fetch, not batch size.
- **Index Creation:** Indexes are created with 1024 dimensions (for `@cf/baai/bge-large-en-v1.5` embedding model) and cosine similarity metric.
- **Dry Run:** Always test with dry run first to verify data transformation before uploading.
- **Offset:** Useful for resuming interrupted syncs or paginating through large catalogs.
