## Environment Matrix

This file is the source of truth for local env files and deployed Worker secrets in `vectorizer/`.

### Core rule

Local files and deployed Worker secrets are different things.

- Local CLI reads local env files.
- Deployed Workers read Wrangler vars and Worker secrets.
- Editing a local env file does not change a deployed Worker.

## Local env files

Recommended local files:

- `vectorizer/.env.prod`
  - local vectorizer CLI against prod resources
- `vectorizer/.env.qa`
  - local vectorizer CLI against QA resources
- `vectorizer/.env.verifier.prod`
  - local verifier CLI against prod resources
- `vectorizer/.env.verifier.qa`
  - local verifier CLI against QA resources

Current backward-compatible default:

- `vectorizer/.env`
  - still the default file loaded by local vectorizer CLIs
  - recommended use is to keep this as your prod-oriented local default only

Legacy fragment:

- `vectorizer/.qa.env`
  - old partial QA override file
  - keep for reference only
  - do not use it as the current QA source of truth

## Current validated QA runtime state

As of March 13, 2026:

- `vectorizer-worker-qa` has explicit Worker limits in `vectorizer/wrangler.qa.toml`:
  - `cpu_ms = 300000`
  - `subrequests = 50000`
- QA soak cron is configured twice daily:
  - `30 23 * * *`
  - `30 10 * * *`
- a bounded high-limit manual run proved full-menu coverage for the current QA catalog:
  - `limit = 1500`
  - actual `fetched_count = 824`
  - actual `uploaded_count = 682`
  - `transform_errors = 0`
- the reliable deployed verifier gate is currently:
  - `suite = "categories_only"`
- the scheduled post-run verifier target should also be `categories_only`
- the deployed verifier `full` suite is not the authoritative gate yet because its backend API probe still reports a false `404` from inside the verifier Worker context, even though direct backend curl checks pass

For a reusable from-scratch setup flow, use [STORE_SETUP.md](/Users/bojanjovanovic/Desktop/Svelte/AiChatBot/vectorizer/STORE_SETUP.md).

## Local CLI commands

Vectorizer CLI against QA:

```bash
cd vectorizer/src
VECTORIZER_ENV_FILE=../.env.qa python vectorize.py -x products-qa --category FLOWER --limit 20
```

Verifier CLI against QA:

```bash
cd vectorizer/src
python run_postrun_verify.py \
  --env-file ../.env.verifier.qa \
  --suite categories_only \
  --index products-qa \
  --expected-trigger-source manual \
  --skip-email
```

Vectorizer CLI against prod:

```bash
cd vectorizer/src
VECTORIZER_ENV_FILE=../.env.prod python vectorize.py -x products-prod --category FLOWER --limit 20
```

Verifier CLI against prod:

```bash
cd vectorizer/src
python run_postrun_verify.py \
  --env-file ../.env.verifier.prod \
  --suite categories_only \
  --index products-prod \
  --expected-trigger-source manual \
  --skip-email
```

## QA deployed Workers

There are two separate QA Workers:

### `vectorizer-worker-qa`

Config file:

- `vectorizer/wrangler.qa.toml`

Secrets:

- `CANNAVITA_API_KEY`
- `CF_ACCOUNT_ID`
- `CF_VECTORIZE_API_TOKEN`
- `CF_AI_API_TOKEN`
- `CF_D1_DATABASE_ID`
- `CF_D1_API_TOKEN`
- `ADMIN_TOKEN`
- `POSTRUN_VERIFIER_TOKEN`

Vars:

- `INDEX_NAME`
- `MIN_QUANTITY`
- `STALE_HOURS`
- `LIMIT`
- `POSTRUN_VERIFIER_URL`

Use `ADMIN_TOKEN` for:

- `POST /run`
- `GET /last-run`

### `postrun-verifier-qa`

Config file:

- `vectorizer/wrangler.verifier.qa.toml`

Secrets:

- `CANNAVITA_API_KEY`
- `CF_ACCOUNT_ID`
- `CF_VECTORIZE_API_TOKEN`
- `CF_D1_DATABASE_ID`
- `CF_D1_API_TOKEN`
- `VERIFY_ADMIN_TOKEN`
- `RESEND_API_KEY` optional

Vars:

- `INDEX_NAME`
- `BACKEND_BASE_URL`
- `VERIFY_ALERT_TO`
- `VERIFY_ALERT_FROM`

Use `VERIFY_ADMIN_TOKEN` for:

- `POST /run`
- `GET /last-run`
- `GET /runs/:verification_id`

## Prod deployed Workers

There are two separate prod Workers:

### `vectorizer-worker`

Config file:

- `vectorizer/wrangler.toml`

Secrets:

- `CANNAVITA_API_KEY`
- `CF_ACCOUNT_ID`
- `CF_VECTORIZE_API_TOKEN`
- `CF_AI_API_TOKEN`
- `CF_D1_DATABASE_ID`
- `CF_D1_API_TOKEN`
- `ADMIN_TOKEN`
- `POSTRUN_VERIFIER_TOKEN`

### `postrun-verifier`

Config file:

- `vectorizer/wrangler.verifier.toml`

Secrets:

- `CANNAVITA_API_KEY`
- `CF_ACCOUNT_ID`
- `CF_VECTORIZE_API_TOKEN`
- `CF_D1_DATABASE_ID`
- `CF_D1_API_TOKEN`
- `VERIFY_ADMIN_TOKEN`
- `RESEND_API_KEY` optional

## Required token relationships

These relationships are mandatory:

- `vectorizer-worker-qa.POSTRUN_VERIFIER_TOKEN` must equal `postrun-verifier-qa.VERIFY_ADMIN_TOKEN`
- `vectorizer-worker.POSTRUN_VERIFIER_TOKEN` must equal `postrun-verifier.VERIFY_ADMIN_TOKEN`

These do not have to match:

- `vectorizer-worker-qa.ADMIN_TOKEN`
- `postrun-verifier-qa.VERIFY_ADMIN_TOKEN`

and

- `vectorizer-worker.ADMIN_TOKEN`
- `postrun-verifier.VERIFY_ADMIN_TOKEN`

For QA, you may choose to make them equal for simplicity, but that is optional.

## Naming guidance

Use distinct labels when you store values in a password manager or local notes:

- `QA_VECTORIZER_ADMIN_TOKEN`
- `QA_VERIFY_ADMIN_TOKEN`
- `PROD_VECTORIZER_ADMIN_TOKEN`
- `PROD_VERIFY_ADMIN_TOKEN`

Do not label a secret generically as just `ADMIN_TOKEN` outside the specific Worker context.

## Recommended no-cross-over rules

1. Do not reuse prod token values in QA.
2. Do not assume `vectorizer/.env` is QA.
3. Do not use verifier tokens against `vectorizer-worker-* /run`.
4. Do not use vectorizer admin tokens against `postrun-verifier* /run` unless you intentionally made them equal.
5. Use explicit placeholder names in commands:
   - `<QA_VECTORIZER_ADMIN_TOKEN>`
   - `<QA_VERIFY_ADMIN_TOKEN>`

## Common failure modes

### `{"ok": false, "error": "unauthorized"}`

Usually one of:

1. wrong worker URL
2. correct worker, wrong secret name
3. copied prod token into QA command
4. piped an empty shell variable into `pywrangler secret put`

### Empty shell variable upload

This command uploads an empty secret if `TOKEN` is unset:

```bash
printf '%s' "$TOKEN" | pywrangler secret put ADMIN_TOKEN --config wrangler.qa.toml
```

If debugging auth, prefer entering the value manually:

```bash
pywrangler secret put ADMIN_TOKEN --config wrangler.qa.toml
```

### `CF_ACCOUNT_ID` deprecation warning

Not blocking.

Wrangler prefers `CLOUDFLARE_ACCOUNT_ID`, but the codebase still supports both:

- `CLOUDFLARE_ACCOUNT_ID`
- `CF_ACCOUNT_ID`

## Minimal QA manual flow

Manual QA full-menu-equivalent vectorizer run for the currently observed QA catalog size:

```bash
curl -X POST https://vectorizer-worker-qa.andresmeona.workers.dev/run \
  -H "Authorization: Bearer <QA_VECTORIZER_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"index_name":"products-qa","min_quantity":5,"stale_hours":48,"limit":"1500"}'
```

Manual QA verifier run:

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

Wire QA auto-trigger:

1. set `POSTRUN_VERIFIER_URL` in `vectorizer/wrangler.qa.toml`
2. set `POSTRUN_VERIFIER_TOKEN` on `vectorizer-worker-qa` to the QA verifier token value
3. redeploy `vectorizer-worker-qa`

Separate direct backend sanity check:

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
