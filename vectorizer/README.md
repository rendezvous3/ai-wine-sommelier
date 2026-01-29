# Vectorizer

Product data vectorization pipeline for the AI Budtender Widget.

## Overview

The vectorizer fetches product data from the Dutchie API, transforms it into a normalized format, generates embeddings, and uploads to Cloudflare Vectorize.

## Quick Start

```bash
# Navigate to vectorizer
cd vectorizer

# Activate virtual environment
source venv/bin/activate

# Navigate to src
cd src

# Dry run - test with 10 INDICA gummies
python vectorize.py -x products-test --category EDIBLES --subcategory GUMMIES --strain INDICA --limit 10

# Upload to production index
python vectorize.py -x products-prod --category EDIBLES --subcategory GUMMIES --strain INDICA --limit 15 --upload
```

## CLI Reference

### vectorize.py

| Flag | Description |
|------|-------------|
| `-x, --index` | Vectorize index name (required) |
| `--category` | Product category (EDIBLES, FLOWER, PRE_ROLLS, VAPORIZERS, CONCENTRATES, CBD, TOPICALS, ACCESSORIES) |
| `--subcategory` | Subcategory filter (GUMMIES, CHOCOLATES, COOKING_BAKING, DRINKS, etc.) |
| `--strain` | Strain type filter (INDICA, SATIVA, HYBRID) |
| `--offset` | Starting offset for pagination (default: 0) |
| `--limit` | Total products to fetch (default: 50) |
| `--upload` | Actually upload to Vectorize (default: dry run) |
| `--local` | Use local JSON files instead of API |
| `--list-categories` | List available categories |

### manage_indexes.py

| Flag | Description |
|------|-------------|
| `--create INDEX` | Create new index |
| `--delete INDEX` | Delete index |
| `--list` | List all indexes |
| `--exists INDEX` | Check if index exists |

## Examples

```bash
# Fetch INDICA gummies
python vectorize.py -x products-test --category EDIBLES --subcategory GUMMIES --strain INDICA --limit 20

# Fetch SATIVA chocolates
python vectorize.py -x products-test --category EDIBLES --subcategory CHOCOLATES --strain SATIVA --limit 15

# Fetch INDICA flower
python vectorize.py -x products-test --category FLOWER --strain INDICA --limit 25

# Upload to production
python vectorize.py -x products-prod --category EDIBLES --subcategory GUMMIES --limit 50 --upload
```

## Architecture

| File | Purpose |
|------|---------|
| `vectorize.py` | Main orchestrator - CLI entry point |
| `dutchie_client.py` | GraphQL API client for Dutchie |
| `normalize_products.py` | Data transformation and normalization logic |
| `manage_indexes.py` | Index lifecycle management |
| `schema.json` | Schema validation (categories, subcategories, potency scales) |

## Data Flow

1. **Fetch** - Pull products from Dutchie GraphQL API with category/subcategory/strain filters
2. **Transform** - Normalize to schema format (THC/CBD extraction, effects, terpenes)
3. **Build** - Construct page_content for semantic search and metadata for filtering
4. **Embed** - Generate embeddings via Cloudflare Workers AI (`@cf/baai/bge-large-en-v1.5`)
5. **Upload** - Upsert to Cloudflare Vectorize index

## Environment Variables

Create a `.env` file in the vectorizer directory:

```bash
# Cloudflare
CF_ACCOUNT_ID=your_account_id
CF_VECTORIZE_API_TOKEN=your_api_token

# Dutchie API
CANNAVITA_API_KEY=your_dutchie_api_key

# Optional: Disable SSL verification for development
# VECTORIZER_SSL_VERIFY=false
```

## See Also

- [CLI_COMMANDS.md](src/CLI_COMMANDS.md) - Detailed CLI reference
- [chunked_category_CLI_commands.md](src/chunked_category_CLI_commands.md) - Preset commands for batch operations
