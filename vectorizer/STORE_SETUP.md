# Store Setup Runbook

Use this runbook when bringing up the vectorizer Worker and verifier Worker for a new store or a new isolated environment.

This guide assumes:

- you want a dedicated Vectorize index
- you want a dedicated D1 database for the lane
- you want a dedicated vectorizer Worker
- you want a dedicated verifier Worker

This guide documents the current working pattern validated in QA:

- full menu sync through the Worker is viable with explicit Worker limits
- current reliable verifier gate is `categories_only`
- direct backend API checks should still be run separately

## Model Catalog Maintenance

- Last reviewed: March 20, 2026
- Fast-model constants updated on this date:
  - OpenAI `gpt-5-mini` replaces `gpt-4o-mini`
  - Google `gemini-2.5-flash-lite` was added to the backend model registry
- Periodically re-check official OpenAI, Google Gemini, xAI, and Groq model catalogs and proactively bring it to the maintainer's attention.
- When backend model constants change, update [../backend/src/types-and-constants.ts](/Users/bojanjovanovic/Desktop/Svelte/AiChatBot/backend/src/types-and-constants.ts) comments and the maintained Markdown docs in the same change.

## Naming pattern

Pick a consistent suffix first.

Examples:

- QA lane:
  - index: `products-qa`
  - vectorizer Worker: `vectorizer-worker-qa`
  - verifier Worker: `postrun-verifier-qa`
  - D1 database: `vectorizer-qa`

- Another store QA lane:
  - index: `products-terpli-qa`
  - vectorizer Worker: `vectorizer-worker-terpli-qa`
  - verifier Worker: `postrun-verifier-terpli-qa`
  - D1 database: `vectorizer-terpli-qa`

Keep the vectorizer Worker and verifier Worker separate.

## Local env files

Use real local env files, not ad-hoc shell variables.

Recommended files:

- `vectorizer/.env.prod`
- `vectorizer/.env.qa`
- `vectorizer/.env.verifier.prod`
- `vectorizer/.env.verifier.qa`

Use [ENVIRONMENT_MATRIX.md](/Users/bojanjovanovic/Desktop/Svelte/AiChatBot/vectorizer/ENVIRONMENT_MATRIX.md) for the current token and secret split.

## 1. Create the Vectorize index

From `vectorizer/src`:

```bash
python manage_indexes.py --create <INDEX_NAME>
```

Example:

```bash
cd /Users/bojanjovanovic/Desktop/Svelte/AiChatBot/vectorizer/src
python manage_indexes.py --create products-terpli-qa
```

## 2. Create metadata indexes

Create the same metadata indexes used by the existing lanes:

```bash
npx wrangler vectorize create-metadata-index <INDEX_NAME> --property-name=category --type=string
npx wrangler vectorize create-metadata-index <INDEX_NAME> --property-name=type --type=string
npx wrangler vectorize create-metadata-index <INDEX_NAME> --property-name=brand --type=string
npx wrangler vectorize create-metadata-index <INDEX_NAME> --property-name=subcategory --type=string
npx wrangler vectorize create-metadata-index <INDEX_NAME> --property-name=effects --type=string
npx wrangler vectorize create-metadata-index <INDEX_NAME> --property-name=flavor --type=string
npx wrangler vectorize create-metadata-index <INDEX_NAME> --property-name=price --type=number
npx wrangler vectorize create-metadata-index <INDEX_NAME> --property-name=thc_percentage --type=number
npx wrangler vectorize create-metadata-index <INDEX_NAME> --property-name=cbd_percentage --type=number
npx wrangler vectorize create-metadata-index <INDEX_NAME> --property-name=thc_per_unit_mg --type=number
npx wrangler vectorize create-metadata-index <INDEX_NAME> --property-name=inStock --type=boolean
```

## 3. Create the D1 database

```bash
npx wrangler d1 create <D1_DATABASE_NAME>
```

Save the returned `database_id`.

That `database_id` becomes:

- `CF_D1_DATABASE_ID` in the vectorizer env file for that lane
- `CF_D1_DATABASE_ID` in the verifier env file for that lane

## 4. Create the Worker config files

Create or copy two Worker configs:

- `vectorizer/wrangler.<lane>.toml`
- `vectorizer/wrangler.verifier.<lane>.toml`

### Vectorizer Worker config requirements

Example shape:

```toml
name = "vectorizer-worker-terpli-qa"
main = "src/worker_entry.py"
compatibility_date = "2026-03-07"
compatibility_flags = ["python_workers"]

[vars]
INDEX_NAME = "products-terpli-qa"
MIN_QUANTITY = "5"
STALE_HOURS = "48"
LIMIT = "none"
POSTRUN_VERIFIER_URL = ""

[triggers]
crons = ["30 21 * * *", "30 9 * * *"]

[limits]
cpu_ms = 300000
subrequests = 50000
```

Do not omit the `[limits]` block. This is required for full-menu Worker runs at current catalog scale.

For QA/staging soak lanes, the recommended starting schedule is twice daily:

- `30 21 * * *`
- `30 9 * * *`

That gives a usable validation sample over a few days without waiting a full day between runs.

For ad-hoc testing, use a manual trigger instead of temporarily adding a third cron slot.

### Verifier Worker config requirements

Example shape:

```toml
name = "postrun-verifier-terpli-qa"
main = "src/probe_worker.py"
compatibility_date = "2026-03-07"
compatibility_flags = ["python_workers"]

[vars]
INDEX_NAME = "products-terpli-qa"
BACKEND_BASE_URL = "https://ecom-chat-backend-terpli-qa.<subdomain>.workers.dev"
VERIFY_ALERT_TO = ""
VERIFY_ALERT_FROM = ""
VERIFY_REPORT_BASE_URL = "https://postrun-verifier-<lane>.<subdomain>.workers.dev"
```

## 5. Populate local env files

Create the lane-specific real env files and fill them with the actual values.

Vectorizer lane file should contain:

- `CF_ACCOUNT_ID`
- `CF_VECTORIZE_API_TOKEN`
- `CF_AI_API_TOKEN`
- `CF_D1_API_TOKEN`
- `CF_D1_DATABASE_ID`
- `CANNAVITA_API_KEY`
- `ADMIN_TOKEN`

Verifier lane file should contain:

- `CF_ACCOUNT_ID`
- `CF_VECTORIZE_API_TOKEN`
- `CF_D1_API_TOKEN`
- `CF_D1_DATABASE_ID`
- `CANNAVITA_API_KEY`
- `VERIFY_ADMIN_TOKEN`
- `VERIFY_REPORT_TOKEN` optional
- `BACKEND_BASE_URL`
- `VERIFY_ALERT_TO`
- `VERIFY_ALERT_FROM`
- `VERIFY_REPORT_BASE_URL`
- `RESEND_API_KEY`

Token rule:

- `POSTRUN_VERIFIER_TOKEN` on the vectorizer Worker must equal `VERIFY_ADMIN_TOKEN` on the verifier Worker

## 6. Set vectorizer Worker secrets

From `vectorizer/`:

```bash
pywrangler secret put CANNAVITA_API_KEY --config wrangler.<lane>.toml
pywrangler secret put CF_ACCOUNT_ID --config wrangler.<lane>.toml
pywrangler secret put CF_VECTORIZE_API_TOKEN --config wrangler.<lane>.toml
pywrangler secret put CF_AI_API_TOKEN --config wrangler.<lane>.toml
pywrangler secret put CF_D1_DATABASE_ID --config wrangler.<lane>.toml
pywrangler secret put CF_D1_API_TOKEN --config wrangler.<lane>.toml
pywrangler secret put ADMIN_TOKEN --config wrangler.<lane>.toml
```

## 7. Set verifier Worker secrets

From `vectorizer/`:

```bash
pywrangler secret put CANNAVITA_API_KEY --config wrangler.verifier.<lane>.toml
pywrangler secret put CF_ACCOUNT_ID --config wrangler.verifier.<lane>.toml
pywrangler secret put CF_VECTORIZE_API_TOKEN --config wrangler.verifier.<lane>.toml
pywrangler secret put CF_D1_DATABASE_ID --config wrangler.verifier.<lane>.toml
pywrangler secret put CF_D1_API_TOKEN --config wrangler.verifier.<lane>.toml
pywrangler secret put VERIFY_ADMIN_TOKEN --config wrangler.verifier.<lane>.toml
pywrangler secret put VERIFY_REPORT_TOKEN --config wrangler.verifier.<lane>.toml
pywrangler secret put RESEND_API_KEY --config wrangler.verifier.<lane>.toml
```

## 8. Deploy both Workers

Deploy verifier first:

```bash
pywrangler deploy --config wrangler.verifier.<lane>.toml
```

Then deploy vectorizer:

```bash
pywrangler deploy --config wrangler.<lane>.toml
```

## 9. Validate vectorizer Worker capacity

Do not jump straight to `limit = none`.

Use a ramp:

1. `20`
2. `200`
3. `500`
4. `1500`

Example:

```bash
curl -X POST https://<vectorizer-worker-url>/run \
  -H "Authorization: Bearer <LANE_VECTORIZER_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"index_name":"<INDEX_NAME>","min_quantity":5,"stale_hours":48,"limit":"20"}'
```

Then:

```bash
curl -X POST https://<vectorizer-worker-url>/run \
  -H "Authorization: Bearer <LANE_VECTORIZER_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"index_name":"<INDEX_NAME>","min_quantity":5,"stale_hours":48,"limit":"200"}'
```

Continue until:

- the run succeeds
- and `fetched_count < limit`

That is the current practical proof that you effectively pulled the full menu without needing `limit = none`.

## 10. Validate verifier Worker using the reliable gate

Use `categories_only` first. This is the current reliable deployed verifier gate.

```bash
printf '%s' '{
  "suite": "categories_only",
  "index_name": "<INDEX_NAME>",
  "expected_trigger_source": "manual",
  "skip_email": true
}' | curl -s https://<verifier-worker-url>/run \
  -H "Authorization: Bearer <LANE_VERIFY_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  --data @-
```

What should pass:

- `latest_run`
- `count_reconciliation` may be `skipped` on the first baseline
- `dutchie_flower_top5`
- `dutchie_pre_rolls_top5`
- `dutchie_edibles_top5`
- `dutchie_concentrates_top5`

## 11. Run direct backend API sanity checks separately

Until the deployed verifier `full` suite backend probe is fully trustworthy, keep one direct backend check in the runbook:

```bash
printf '%s' '{
  "messages": [
    {
      "role": "assistant",
      "content": "Welcome to the store!"
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
}' | curl -s https://<backend-worker-url>/chat/intent \
  -H 'Content-Type: application/json' \
  --data @- | jq
```

This should return:

- `intent = recommendation`
- category including `prerolls`
- effects including `relaxed`

## 12. Wire auto-trigger only after manual validation is green

Once:

- vectorizer full-menu-equivalent run is green
- verifier `categories_only` is green

then wire the verifier URL and token into the vectorizer Worker.

Set:

- `POSTRUN_VERIFIER_URL` in `wrangler.<lane>.toml`
- `POSTRUN_VERIFIER_TOKEN` secret on the vectorizer Worker to the verifier token value

Then redeploy the vectorizer Worker.

Current recommendation:

- auto-trigger the verifier in `categories_only` mode first
- treat `full` as a later enhancement after the backend probe issue is fixed

## 13. Observe scheduled behavior

After the next cron window, confirm:

### vectorizer Worker

```bash
curl https://<vectorizer-worker-url>/last-run \
  -H "Authorization: Bearer <LANE_VECTORIZER_ADMIN_TOKEN>"
```

Expected:

- `trigger_source = scheduled`
- `status = success`

### verifier Worker

```bash
curl https://<verifier-worker-url>/last-run \
  -H "Authorization: Bearer <LANE_VERIFY_ADMIN_TOKEN>"
```

Expected:

- `source = scheduled_postrun`
- a passed `categories_only`-style summary once auto-trigger is wired to that mode

## Current recommended gate

For a new store today, the practical go-live sequence is:

1. validate vectorizer manual full-menu-equivalent run
2. validate verifier `categories_only`
3. validate backend direct intent curl
4. wire auto-trigger
5. observe scheduled vectorizer + scheduled verifier

Do not use the deployed verifier `full` suite as the sole gate until its backend probe behavior is fixed.
