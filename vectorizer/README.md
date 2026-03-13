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
pip install -r requirements.local.txt
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
- Dutchie `TINCTURES` inventory is now ingested as first-class category `tinctures` with:
  - `default`
  - `unflavored`
  - `herbal`
- Plain `tincture` / `tinctures` is not a CBD synonym. Only explicit `CBD tincture` stays on the CBD path.

## Environment

The local CLI and the deployed Workers do not use the same configuration source.

- local CLI reads a local env file
- deployed Workers read Wrangler vars + Worker secrets

Use [ENVIRONMENT_MATRIX.md](/Users/bojanjovanovic/Desktop/Svelte/AiChatBot/vectorizer/ENVIRONMENT_MATRIX.md) as the source of truth for prod, QA, and verifier env separation.

For bringing up the vectorizer Worker and verifier Worker for a new store/environment from scratch, use [STORE_SETUP.md](/Users/bojanjovanovic/Desktop/Svelte/AiChatBot/vectorizer/STORE_SETUP.md).

Local default remains `vectorizer/.env`, but the recommended file layout is:

- `vectorizer/.env.prod`
- `vectorizer/.env.qa`
- `vectorizer/.env.verifier.prod`
- `vectorizer/.env.verifier.qa`

For local vectorizer CLIs, use `VECTORIZER_ENV_FILE` when you want QA instead of the default `.env`.

Create `vectorizer/.env` or `vectorizer/.env.prod`:

```bash
CANNAVITA_API_KEY=your_dutchie_api_key
CF_ACCOUNT_ID=your_cloudflare_account_id
CF_VECTORIZE_API_TOKEN=your_vectorize_api_token
CF_AI_API_TOKEN=your_ai_api_token
CF_D1_DATABASE_ID=your_d1_database_id

# Optional if separate from the Vectorize token
# CF_D1_API_TOKEN=your_d1_api_token

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
pywrangler secret put CF_AI_API_TOKEN
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
pywrangler secret put CF_AI_API_TOKEN
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
- `POSTRUN_VERIFIER_URL = "https://postrun-verifier-qa.andresmeona.workers.dev"`
- twice-daily QA soak cron in `[triggers].crons`:
  - `17 7,19 * * *`
- explicit Worker capacity limits:
  - `cpu_ms = 300000`
  - `subrequests = 50000`

Important:

- scheduled post-run verification is currently intended to run `categories_only`
- auto-trigger becomes active only after `POSTRUN_VERIFIER_TOKEN` is set on `vectorizer-worker-qa`

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
- verifier Worker `postrun-verifier-qa`
- Pages project `cannavita-widget-qa`
- index `products-qa`
- D1 database `vectorizer-qa`

### Current validated QA sync state

The current QA Worker has already been validated beyond smoke size:

- `limit = 1500` successfully pulled the full currently observed QA menu
- actual result:
  - `fetched_count = 824`
  - `uploaded_count = 682`
  - `transform_errors = 0`

For the current catalog size, use `limit = 1500` as the documented full-menu manual trigger instead of `limit = none`. If a later store has a larger catalog, ramp safely (`20`, `200`, `500`, `1500`, then higher if needed) until `fetched_count < limit`, which proves the effective full pull.

## Post-Run Verification

The vectorizer now supports a simplified operational verifier:

- shared Python verification logic in `src/postrun_verify.py`
- local CLI runner in `src/run_postrun_verify.py`
- separate verifier Worker entrypoint in `src/probe_worker.py`

The verifier is not a unit-test runner. It executes operational checks against:

- the latest vectorizer run report in D1
- the D1 uniqueness ledger row count
- small live Dutchie chunks for:
  - `FLOWER`
  - `PRE_ROLLS`
  - `EDIBLES`
  - `CONCENTRATES`
- optional backend API canaries

### Current verifier status

The reliable deployed verifier gate is currently:

- `suite = "categories_only"`

That mode is validated and currently passes against QA after a full-menu sync.

The deployed verifier `full` suite is not the authoritative gate yet because its internal backend API probe still reports a false `404` from the verifier Worker context, even though direct terminal/browser calls to the QA backend succeed. Keep backend API validation as a separate direct check until that is fixed.

### What V1 Verifies

- latest run exists and completed successfully
- fetched/transformed/uploaded/updated/stale-delete counts are present
- active unique count from `vector_uniques_<index>`
- active count delta reconciles with the previous successful verification baseline
- product names/category/subcategory for small Dutchie chunks match our D1 uniqueness rows by `product_id`
- backend intent still routes `relaxing prerolls`
- backend recommendations still returns at least one edible for `sleepy edibles`

### Local Manual Verification

Run the shared verifier locally any time.

Against localhost backend:

```bash
cd vectorizer/src
python run_postrun_verify.py \
  --suite full \
  --index products-qa \
  --expected-trigger-source manual \
  --backend-base-url http://localhost:8787 \
  --skip-email
```

Against deployed QA backend:

```bash
cd vectorizer/src
python run_postrun_verify.py \
  --env-file ../.env.verifier.qa \
  --suite categories_only \
  --index products-qa \
  --expected-trigger-source manual \
  --skip-email
```

Against deployed prod backend:

```bash
cd vectorizer/src
python run_postrun_verify.py \
  --env-file ../.env.verifier.prod \
  --suite categories_only \
  --index products-prod \
  --expected-trigger-source manual \
  --skip-email
```

Run only Dutchie chunk checks:

```bash
cd vectorizer/src
python run_postrun_verify.py \
  --suite categories_only \
  --index products-qa \
  --categories FLOWER PRE_ROLLS EDIBLES CONCENTRATES \
  --skip-email
```

Run only backend probes locally:

```bash
cd vectorizer/src
python run_postrun_verify.py \
  --suite api_only \
  --index products-qa \
  --backend-base-url http://localhost:8787 \
  --skip-email
```

### Verifier Worker Deployment

Before setting verifier secrets, read [ENVIRONMENT_MATRIX.md](/Users/bojanjovanovic/Desktop/Svelte/AiChatBot/vectorizer/ENVIRONMENT_MATRIX.md).

The important separation is:

- `vectorizer-worker-qa` uses `ADMIN_TOKEN`
- `postrun-verifier-qa` uses `VERIFY_ADMIN_TOKEN`
- `vectorizer-worker-qa.POSTRUN_VERIFIER_TOKEN` must equal `postrun-verifier-qa.VERIFY_ADMIN_TOKEN`

Do not assume prod and QA token values are interchangeable.

Deploy the QA verifier Worker:

```bash
cd vectorizer
pywrangler secret put CANNAVITA_API_KEY --config wrangler.verifier.qa.toml
pywrangler secret put CF_ACCOUNT_ID --config wrangler.verifier.qa.toml
pywrangler secret put CF_VECTORIZE_API_TOKEN --config wrangler.verifier.qa.toml
pywrangler secret put CF_D1_DATABASE_ID --config wrangler.verifier.qa.toml
pywrangler secret put CF_D1_API_TOKEN --config wrangler.verifier.qa.toml
pywrangler secret put VERIFY_ADMIN_TOKEN --config wrangler.verifier.qa.toml
pywrangler secret put RESEND_API_KEY --config wrangler.verifier.qa.toml
pywrangler deploy --config wrangler.verifier.qa.toml
```

Deploy the prod verifier Worker:

```bash
cd vectorizer
pywrangler secret put CANNAVITA_API_KEY --config wrangler.verifier.toml
pywrangler secret put CF_ACCOUNT_ID --config wrangler.verifier.toml
pywrangler secret put CF_VECTORIZE_API_TOKEN --config wrangler.verifier.toml
pywrangler secret put CF_D1_DATABASE_ID --config wrangler.verifier.toml
pywrangler secret put CF_D1_API_TOKEN --config wrangler.verifier.toml
pywrangler secret put VERIFY_ADMIN_TOKEN --config wrangler.verifier.toml
pywrangler secret put RESEND_API_KEY --config wrangler.verifier.toml
pywrangler deploy --config wrangler.verifier.toml
```

### Remote Manual Verification

Run QA category verification remotely at any time:

```bash
printf '%s' '{
  "suite": "categories_only",
  "index_name": "products-qa",
  "expected_trigger_source": "manual",
  "skip_email": true
}' | curl -s https://postrun-verifier-qa.andresmeona.workers.dev/run \
  -H "Authorization: Bearer <QA_VERIFY_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  --data @-
```

Run prod category verification remotely at any time:

```bash
printf '%s' '{
  "suite": "categories_only",
  "index_name": "products-prod",
  "expected_trigger_source": "manual",
  "skip_email": true
}' | curl -s https://postrun-verifier.andresmeona.workers.dev/run \
  -H "Authorization: Bearer <PROD_VERIFY_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  --data @-
```

Read the latest verifier result:

```bash
curl https://postrun-verifier-qa.andresmeona.workers.dev/last-run \
  -H "Authorization: Bearer <QA_VERIFY_ADMIN_TOKEN>"
```

### Automatic Post-Cron Verification

The vectorizer scheduler can trigger the verifier automatically after a successful scheduled run.

Configure on the vectorizer Worker:

```bash
pywrangler secret put POSTRUN_VERIFIER_TOKEN --config wrangler.qa.toml
```

Then set:

- `POSTRUN_VERIFIER_URL` in `wrangler.qa.toml` or `wrangler.toml`

For QA:

- `POSTRUN_VERIFIER_TOKEN` value on `vectorizer-worker-qa` must equal `VERIFY_ADMIN_TOKEN` value on `postrun-verifier-qa`
- `ADMIN_TOKEN` on `vectorizer-worker-qa` is independent and is only for your manual `/run` and `/last-run` calls

Important:

- verification failure does **not** fail the vectorizer cron run
- the verifier is an operational canary, not the run-success contract
- the scheduled auto-trigger should currently target `categories_only`
- only treat the auto-trigger as authoritative after `POSTRUN_VERIFIER_TOKEN` is set and QA scheduled runs have been observed passing

### Separate direct backend API check

Until the deployed verifier `full` suite backend probe is fixed, validate QA backend intent directly:

```bash
printf '%s' '{
  "messages": [
    {
      "role": "assistant",
      "content": "Welcome to Cannavita!"
    },
    {
      "role": "user",
      "content": "Can you recommend relaxing pre-rolls?"
    },
    {
      "role": "assistant",
      "content": "I completely understand what you'\''re looking for - relaxing prerolls. Let me check what we have that matches your preferences."
    }
  ]
}' | curl -s https://ecom-chat-backend-qa.andresmeona.workers.dev/chat/intent \
  -H 'Content-Type: application/json' \
  --data @- | jq
```

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
- `postrun_verifications`
- `postrun_verification_checks`

Do not mix QA run-report inspection with the current prod/live-ish D1 database.

## See Also

- [README.md](../README.md)
- [CLI_COMMANDS.md](src/CLI_COMMANDS.md)
