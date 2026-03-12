# Vectorizer

## Local Terminal Note

On this Mac, `node`, `npm`, `npx`, `wrangler`, and `pywrangler` may be missing in a fresh terminal until `nvm` is activated. Before running any Node/Wrangler command in a new terminal, run:

```bash
nvm use --lts
```

Product catalog vectorization pipeline for the AI Budtender Widget.

## Overview

The vectorizer now has one shared Python core and two runners:

- Local CLI runner for development and manual syncs
- Dedicated Cloudflare Python Worker for scheduled production syncs

Both runners use the same sync/reconcile logic, duplicate rules, and CBD subcategory assignment.

## Operating Modes

There are now two intended operational lanes:

- `products-prod`: current live-ish/manual lane used by the existing test/UAT widget deployment
- `products-qa`: isolated QA automation lane for cron soak, stale reconciliation validation, backend retrieval checks, and QA Pages testing

Keep these rules:

- `products-prod` remains manually refreshed while QA automation is being proven
- approved manual full refresh for `products-prod` remains:
  - `./preset_sync.sh all-products ALL products-prod none 5`
- `products-qa` is full-catalog only when stale reconciliation is enabled
- do not run partial subset presets against `products-qa`

## Architecture

Key files:

| File | Purpose |
|------|---------|
| `src/core/pipeline.py` | Shared sync orchestration |
| `src/core/reconcile.py` | Shared stale-delete orchestration |
| `src/core/cloudflare_api.py` | Cloudflare REST adapter for embeddings, Vectorize, and index ops |
| `src/dutchie_client.py` | Async Dutchie GraphQL client |
| `src/d1_uniques.py` | Per-index D1 uniqueness ledger |
| `src/run_sync_cycle.py` | Shared sync + reconcile entrypoint |
| `src/vectorize.py` | Local CLI for sync-only runs |
| `src/reconcile_stale.py` | Local CLI for reconcile-only runs |
| `src/manage_indexes.py` | Local CLI for index lifecycle management |
| `src/worker_entry.py` | Cloudflare Worker entrypoint |
| `wrangler.toml` | Dedicated vectorizer Worker config |

## Local Workflow

```bash
cd vectorizer
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cd src
```

### Common Commands

```bash
# Dry run
python vectorize.py -x products-prod --category EDIBLES --limit 5

# Upload a smoke batch
python vectorize.py -x products-prod --category EDIBLES --limit 20 --upload

# Full catalog upload
python vectorize.py -x products-prod --limit none --upload

# Full catalog upload excluding low stock
python vectorize.py -x products-prod --limit none --min-quantity 5 --upload

# Reconcile stale vectors
python reconcile_stale.py -x products-prod --stale-hours 48

# Run the full sync + reconcile cycle
python run_sync_cycle.py products-prod 5 48 none
```

### Manual Prod Refresh

If the current user-facing `products-prod` lane needs a manual full refresh during the QA soak period:

```bash
cd vectorizer/src
./preset_sync.sh all-products ALL products-prod none 5
```

This keeps the existing Pages/UAT lane updated without involving the new QA automation Worker.

### Index Management

```bash
python manage_indexes.py --create products-prod
python manage_indexes.py --list
python manage_indexes.py --exists products-prod
python manage_indexes.py --delete products-old
```

## Data Quality Controls

- Full-catalog sync is supported with `--limit none`
- Optional low-stock exclusion is supported via `--min-quantity N`
- Duplicate prevention is enforced by:
  - in-run dedup by `id` and normalized name
  - cross-run D1 dedup by `id` and normalized name
- Existing IDs are allowed through the refresh path and are upserted
- New IDs with an already-known normalized name are excluded
- Stale vectors are removed after sync using D1 `last_seen_at`
- CBD products keep subcategory assignment from text inference, including:
  - `default`
  - `oil`
  - `cream`
  - `tincture`
  - `chews`
  - `pet-food`

## Environment

Create `vectorizer/.env`:

```bash
CANNAVITA_API_KEY=your_dutchie_api_key
CF_ACCOUNT_ID=your_cloudflare_account_id
CF_VECTORIZE_API_TOKEN=your_vectorize_api_token
CF_D1_DATABASE_ID=your_d1_database_id

# Optional if separate from the Vectorize token
# CF_D1_API_TOKEN=your_d1_api_token

# Optional if separate from the Vectorize token
# CF_AI_API_TOKEN=your_ai_api_token

# Optional
# VECTORIZER_SSL_VERIFY=false
```

## Cloudflare Scheduler Deployment

Production scheduling is Cloudflare-native and does not depend on GitHub Actions.

### One-Time Setup

```bash
cd vectorizer
uv sync --group dev
```

Create the required Worker secrets:

```bash
pywrangler secret put CANNAVITA_API_KEY
pywrangler secret put CF_ACCOUNT_ID
pywrangler secret put CF_VECTORIZE_API_TOKEN
pywrangler secret put CF_D1_DATABASE_ID
pywrangler secret put CF_D1_API_TOKEN
pywrangler secret put ADMIN_TOKEN
```

Review `vectorizer/wrangler.toml` defaults:

- `INDEX_NAME`
- `MIN_QUANTITY`
- `STALE_HOURS`
- `LIMIT`
- `[triggers].crons`

Deploy the dedicated Worker:

```bash
pywrangler deploy
```

### QA Scheduler Deployment

QA scheduling uses a separate Worker config and a separate D1 database.

**QA resources**:

- Vectorize index: `products-qa`
- D1 database: `vectorizer-qa`
- Worker config: `vectorizer/wrangler.qa.toml`

**Provision the QA index**:

```bash
cd vectorizer/src
python manage_indexes.py --create products-qa
```

**Create QA metadata indexes**:

```bash
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

**Deploy the QA Worker**:

```bash
cd vectorizer
pywrangler secret put CANNAVITA_API_KEY
pywrangler secret put CF_ACCOUNT_ID
pywrangler secret put CF_VECTORIZE_API_TOKEN
pywrangler secret put CF_D1_DATABASE_ID
pywrangler secret put CF_D1_API_TOKEN
pywrangler secret put ADMIN_TOKEN
pywrangler deploy --config wrangler.qa.toml
```

**Review QA defaults** in `vectorizer/wrangler.qa.toml`:

- `INDEX_NAME = "products-qa"`
- `MIN_QUANTITY = "5"`
- `STALE_HOURS = "48"`
- `LIMIT = "none"`
- daily cron in `[triggers].crons`

### Testing the Worker

Run the Worker locally:

```bash
pywrangler dev --test-scheduled
```

Manual authenticated run:

```bash
curl -X POST http://127.0.0.1:8787/run \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"index_name":"products-prod","min_quantity":5,"stale_hours":48,"limit":"20"}'
```

Inspect the most recent run:

```bash
curl http://127.0.0.1:8787/last-run \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

### QA Worker Smoke Test

Run the same local Worker development flow, but target the QA index when manually invoking the Worker:

```bash
curl -X POST http://127.0.0.1:8787/run \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"index_name":"products-qa","min_quantity":5,"stale_hours":48,"limit":"20"}'
```

Once deployed, the QA soak should use:

- backend Worker `ecom-chat-backend-qa`
- vectorizer Worker `vectorizer-worker-qa`
- Pages project `cannavita-widget-qa`
- index `products-qa`
- D1 database `vectorizer-qa`

## Monitoring

Run reporting is written into D1 in the `vectorizer_runs` table.

Each run records:

- status
- trigger source
- index name
- limits and low-stock threshold
- fetched, transformed, built, and uploaded counts
- duplicate and exclusion counts
- stale delete count
- error message when failed

Use the QA D1 database to inspect:

- `vectorizer_runs`
- `vector_uniques_products_qa`

Do not mix QA run-report inspection with the current prod/live-ish D1 database.

## See Also

- [README.md](../README.md)
- [CLI_COMMANDS.md](src/CLI_COMMANDS.md)
