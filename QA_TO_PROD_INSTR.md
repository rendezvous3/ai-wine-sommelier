# QA To Prod Promotion Instructions

## Purpose

This runbook is for the current transitional state:

- QA cron is the validation lane (`products-qa`)
- production/live-ish catalog is still being refreshed manually via `./preset_sync.sh`
- production cron must not be treated as active until it is manually smoke-tested and then observed firing successfully on schedule

This is a temporary promotion procedure, not the final steady-state operating model.

## Current Resource Map

### QA lane

- Vectorize index: `products-qa`
- D1 database: `vectorizer-qa`
- Vectorizer Worker: `vectorizer-worker-qa`
- Verifier Worker: `postrun-verifier-qa`
- Backend Worker: `ecom-chat-backend-qa`
- Pages project: `cannavita-widget-qa`

### Prod/live-ish lane

- Vectorize index: `products-prod`
- Vectorizer Worker: `vectorizer-worker`
- Verifier Worker: `postrun-verifier`
- Backend Worker: `ecom-chat-backend`
- Pages site: `https://cannavita-widget.pages.dev`

## Promotion Gate

Do not start prod cron ownership until all of these are true:

1. QA has multiple consecutive successful scheduled runs.
2. QA `/last-run` shows `"trigger_source": "scheduled"`.
3. QA counts are stable enough to trust:
   - no unexplained upload collapse
   - no suspicious stale-delete spike
4. QA post-run verifier is green for multiple runs:
   - deployed `categories_only` verifier passes for flower, prerolls, edibles, concentrates
   - direct QA backend API checks pass separately
5. QA widget/backend behavior is acceptable.
6. Remaining known ingest gaps are understood and accepted.

Current validated QA facts that support this gate:

- `vectorizer-worker-qa` now runs with explicit Worker limits:
  - `cpu_ms = 300000`
  - `subrequests = 50000`
- a bounded high-limit QA run proved current full-menu support:
  - `limit = 1500`
  - actual `fetched_count = 824`
  - actual `uploaded_count = 682`
  - `transform_errors = 0`
- deployed verifier `full` is not the promotion gate yet because its backend probe is still flaky from inside the verifier Worker context

## Important Current Reality

- Prod backend and prod Pages already point at `products-prod`.
- The missing piece is handing refresh ownership from manual prod sync to the prod vectorizer Worker cron path.
- Until prod cron is proven, the approved prod refresh remains:

```bash
cd /Users/bojanjovanovic/Desktop/Svelte/AiChatBot/vectorizer/src
./preset_sync.sh all-products ALL products-prod none 5
```

## One-Time Prod Worker Preparation

Run these from `vectorizer/`, not `vectorizer/src/`.

```bash
cd /Users/bojanjovanovic/Desktop/Svelte/AiChatBot/vectorizer
source venv/bin/activate
nvm use --lts
```

Set or re-set prod Worker secrets on `vectorizer-worker`:

```bash
pywrangler secret put CANNAVITA_API_KEY --config wrangler.toml
pywrangler secret put CF_ACCOUNT_ID --config wrangler.toml
pywrangler secret put CF_VECTORIZE_API_TOKEN --config wrangler.toml
pywrangler secret put CF_AI_API_TOKEN --config wrangler.toml
pywrangler secret put CF_D1_DATABASE_ID --config wrangler.toml
pywrangler secret put CF_D1_API_TOKEN --config wrangler.toml
pywrangler secret put ADMIN_TOKEN --config wrangler.toml
```

Requirements:

- `CF_D1_DATABASE_ID` must be the prod/live-ish D1 database, not `vectorizer-qa`
- `CF_D1_API_TOKEN` must have D1 edit permission
- `CF_VECTORIZE_API_TOKEN` must have Vectorize read/write access
- `ADMIN_TOKEN` should be the prod token, separate from QA

## Prod Worker Deploy

Deploy the prod Worker using the existing prod config:

```bash
cd /Users/bojanjovanovic/Desktop/Svelte/AiChatBot/vectorizer
source venv/bin/activate
nvm use --lts
pywrangler deploy --config wrangler.toml
```

Current prod config already points to:

- `INDEX_NAME = "products-prod"`
- cron `17 7 * * *`

Before expecting full-menu prod support, mirror the QA Worker limits into `vectorizer/wrangler.toml`:

```toml
[limits]
cpu_ms = 300000
subrequests = 50000
```

## Manual Prod Smoke Test

Do this before trusting the scheduled run.

Trigger a small manual run:

```bash
curl -X POST https://<prod-vectorizer-worker-url>/run \
  -H "Authorization: Bearer <PROD_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"index_name":"products-prod","min_quantity":5,"stale_hours":48,"limit":"20"}'
```

Check latest run:

```bash
curl https://<prod-vectorizer-worker-url>/last-run \
  -H "Authorization: Bearer <PROD_ADMIN_TOKEN>"
```

Expected result:

- `"trigger_source": "manual"`
- `"status": "success"`
- `"index_name": "products-prod"`
- sensible `uploaded_count`
- no suspicious stale deletion behavior

## First Scheduled Prod Verification

After the next prod cron window, check again:

```bash
curl https://<prod-vectorizer-worker-url>/last-run \
  -H "Authorization: Bearer <PROD_ADMIN_TOKEN>"
```

Expected result:

- `"trigger_source": "scheduled"`
- `"status": "success"`
- `"index_name": "products-prod"`

If the latest run is still manual, prod cron has not been proven yet.

## Cutover Rule

Only after the first successful scheduled prod run should the team stop treating manual prod sync as the primary path.

Until then:

- keep using manual prod refresh when needed
- do not assume prod cron is authoritative
- do not remove the manual fallback

## Manual Fallback During Transition

If prod needs a refresh before cron is trusted:

```bash
cd /Users/bojanjovanovic/Desktop/Svelte/AiChatBot/vectorizer/src
./preset_sync.sh all-products ALL products-prod none 5
```

## Note For Future Update

Once prod cron is confirmed and becomes the normal operating path, this file must be updated.

At that point it should describe the steady-state parallel pipeline:

- QA cron lane for validation/change soak
- prod cron lane as the primary catalog refresh path
- manual sync as emergency fallback only
