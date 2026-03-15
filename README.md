# AI Budtender Widget

## Local Terminal Note

On this Mac, `node`, `npm`, `npx`, `wrangler`, and `pywrangler` may be missing in a fresh terminal until `nvm` is activated. Before running any Node/Wrangler command in a new terminal, run:

```bash
nvm use --lts
```

## Description

This project is an embeddable AI shopping assistant widget for dispensaries. The widget handles general store questions, recommendation flows, and rich product cards backed by Dutchie catalog data + Cloudflare Vectorize retrieval.

The codebase now operates as four practical surfaces:
- **Vectorizer local CLI**: local/manual catalog sync and debugging
- **Vectorizer Worker**: Cloudflare-native scheduled sync + stale reconciliation
- **Backend Worker**: Hono API for intent, stream, rerank, and retrieval
- **Client / Pages**: embeddable Svelte widget built to `widget.js`

## Current Architecture (March 2026)

If a later section conflicts with this March 2026 architecture summary, trust this section first and then verify the live code/config in `backend/`, `client/`, and `vectorizer/`.

### Runtime split

- `vectorizer/src/core/**` contains the shared sync/reconcile logic
- `vectorizer/src/vectorize.py`, `reconcile_stale.py`, `manage_indexes.py` are local CLI entrypoints
- `vectorizer/src/worker_entry.py` is the dedicated Cloudflare Python Worker entrypoint
- `backend/src/index.ts` is the chat/recommendation Worker
- `client/` builds the hosted widget bundle for Cloudflare Pages

### Environment split

- **Production / live-ish lane**
  - Vectorize index: `products-prod`
  - Backend Worker: `ecom-chat-backend`
  - Vectorizer Worker: `vectorizer-worker`
  - Pages site: `https://cannavita-widget.pages.dev`

- **QA automation lane**
  - Vectorize index: `products-qa`
  - D1 database: `vectorizer-qa`
  - Backend Worker: `ecom-chat-backend-qa`
  - Vectorizer Worker: `vectorizer-worker-qa`
  - Pages project: `cannavita-widget-qa`

### Important operational rules

- `products-prod` remains the live-ish/manual lane until QA cron soak is trusted.
- `products-qa` is the automation validation lane and must stay **full-catalog only** when stale reconciliation is enabled.
- For the current QA-soak-to-prod promotion procedure, refer to [QA_TO_PROD_INSTR.md](/Users/bojanjovanovic/Desktop/Svelte/AiChatBot/QA_TO_PROD_INSTR.md).
- Deployed Workers do **not** read local `.env` files. Local `.env` is only for CLI runs on your machine. Optional local QA env copies are convenience only.
- `wrangler --config ...` and `pywrangler --config ...` resolve config paths relative to the **current working directory**. Run backend commands from `backend/` and vectorizer commands from `vectorizer/` unless using absolute config paths.
- `npx wrangler pages deploy ...` from a non-production branch creates a **preview alias** like `elastic-email-v1.cannavita-widget-qa.pages.dev`; use `--branch=main` if you want the stable project root URL `https://cannavita-widget-qa.pages.dev`.
- The QA vectorizer Worker requires `CF_AI_API_TOKEN` in addition to the Dutchie, Vectorize, D1, and admin secrets. `CF_D1_API_TOKEN` must have D1 edit permission, and `CF_VECTORIZE_API_TOKEN` must have Vectorize read/write access.
- Cron deployment is not proof of cron execution. Confirm actual scheduled runs via `GET /last-run` and check for `"trigger_source": "scheduled"`.

### Current known tincture rule

- `tinctures` is now a first-class category across backend and vectorizer.
- Plain `tincture` / `tinctures` should resolve to category `tinctures`.
- `CBD tincture` remains a CBD-specific path: category `cbd`, subcategory `tincture`.

## Accessibility Compliance (WCAG 2.1 AA)

This project now treats accessibility as a required release standard for the embedded widget.

- **Compliance target**: WCAG 2.1 Level AA
- **Legal alignment**: ADA Title III expectations for public-facing private business web experiences
- **Current scope**: Widget UI and widget panels (`client/src/Widget.svelte` + shared component library)

### Implemented Accessibility Features

- Chat message region now uses an accessible log/live-region pattern for assistive technology announcements.
- Streaming chat announcements are controlled to avoid token-by-token screen reader spam (final-message announcement mode).
- In-widget panels now use modal dialog semantics (`role="dialog"`, `aria-modal`, `aria-labelledby`).
- Panel keyboard behavior includes:
  - Focus moved into panel on open
  - Focus trap while panel is open
  - `Escape` closes panel
  - Focus restore to the previously focused control on close
- Feedback status messages now announce success/errors with appropriate live semantics (`role="status"` / `role="alert"`).
- Custom dropdown controls in chat input now include:
  - `aria-expanded`, `aria-controls`, `aria-haspopup`
  - `role="listbox"` and `role="option"` semantics
  - Arrow key navigation + Escape close behavior
- Reduced-motion support was added for key animated components using `@media (prefers-reduced-motion: reduce)`.
- Explicit keyboard focus-visible styles were added for panel controls and form fields.

### Accessibility Testing Instructions (Required)

Run these checks before merging UI changes:

1. **Keyboard-only flow**
- Open widget with keyboard.
- Send a message.
- Open each panel (disclosure/feedback/guides), then close via back button and `Escape`.
- Submit feedback form with both valid and invalid states.
- Confirm focus remains visible and never gets lost.

2. **Screen reader flow**
- Verify new assistant messages are announced once meaningfully.
- Verify opening a panel announces its dialog title/context.
- Verify feedback success and error messages are announced.

3. **Visual checks**
- Test at 200% zoom.
- Test mobile width (`<= 640px`).
- Verify no loss of functionality and no clipped critical controls.

4. **Reduced motion**
- Enable reduced-motion at OS/browser level.
- Verify shimmer/typing/animated transitions are disabled or minimized.

5. **Contrast/focus**
- Confirm all interactive controls have visible focus indicators.
- Confirm key text and control contrast meets WCAG AA minimums.

## Prerequisites

- **Node.js** (v20+): required for client, backend, Wrangler, and Python Worker tooling.
- **Python** (3.12+): required for the current vectorizer + Cloudflare Python Worker toolchain.
- **Accounts/Keys**:
  - Cloudflare (for Workers, Vectorize, AI).
  - Groq API key (for LLM).
- **Tools**: Git, npm/pnpm, pip.

## Installation

### Install Dependencies

### Vectorizer

```bash
cd vectorizer

# Preferred: project-managed environment (includes Worker tooling)
uv sync --group dev

# Legacy local CLI fallback (manual venv)
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.local.txt

# Local CLI reads vectorizer/.env for Dutchie + Cloudflare values.
# Deployed Workers use Cloudflare Worker secrets instead.
```

### Backend

```bash
cd backend
npm install  # or pnpm install
```

### Client
```bash
cd client
npm install  # or pnpm install (installs Svelte, Vite)
```

## Data Schema & Transformation Pipeline

The project keeps matching schema definitions in `backend/src/schema.json`, `backend/src/schema.ts`, and `vectorizer/src/schema.json`. Keep them aligned; do not assume only one file is authoritative without checking the others.

### Schema Structure

**Categories** (9 total):
```
flower, prerolls, edibles, concentrates, vaporizers, tinctures, cbd, topicals, accessories
```

**Types** (5 total):
```
indica, sativa, hybrid, indica-hybrid, sativa-hybrid
```

**Subcategories** (category-specific):
- **edibles**: chews, chocolates, cooking-baking, drinks, gummies, live-resin-gummies, live-rosin-gummies
- **vaporizers**: all-in-one, cartridges, disposables, live-resin, live-rosin
- **prerolls**: blunts, infused-prerolls, infused-preroll-packs, pre-roll-packs, singles
- **flower**: bulk-flower, pre-ground, premium-flower, small-buds, whole-flower
- **concentrates**: badder, hash, live-resin, live-rosin, rosin, unflavored
- **tinctures**: default, unflavored, herbal
- **cbd**: default, oil, cream, tincture, chews, pet-food
- **topicals**: balms
- **accessories**: batteries, glassware, grinders, lighters, papers-rolling-supplies

**Canonical Effects** (10 total):
```
calm, happy, relaxed, energetic, clear-mind, creative, focused, inspired, sleepy, uplifted
```

### Category Field Mappings

Different categories use different THC fields:

- **thc_percentage** (percentage-based): flower, prerolls, vaporizers, concentrates
- **thc_per_unit_mg** (milligram-based): edibles
- **cbd_total_mg** (milligram-based): cbd, topicals
- **individual_weight_grams**: prerolls (weight per unit)

### Potency Scales

Category-specific THC potency scales used across UI, API, and vectorizer:

**Flower & Prerolls**:
- Mild: <13%
- Balanced: 13-18%
- Moderate: 18-22%
- Strong: 22-28%
- Very Strong: >28%

**Vaporizers & Concentrates**:
- Mild: <66%
- Balanced: 66-75%
- Moderate: 75-85%
- Strong: 85-90%
- Very Strong: >90%

**Edibles**:
- Mild: <2.5mg
- Balanced: 2.5-5mg
- Moderate: 5-10mg
- Strong: 10-25mg
- Very Strong: >25mg

### Data Transformation Pipeline

The vectorizer transforms raw Dutchie API data into vector-ready documents:

1. **Fetch Products**: Query Dutchie GraphQL API with category/subcategory/strain filters
2. **Schema Validation**: Validate categories, subcategories, and effects against schema.json
3. **Normalization**: Convert to lowercase kebab-case, map effects to canonical list
4. **THC/CBD Extraction**: Parse combined formats ("20pk | 100mg"), extract category-specific fields
5. **Metadata Enrichment**: Add all product metadata (id, name, category, type, effects, flavors, price, etc.)
6. **Embedding Generation**: Create rich text with effects/flavors/descriptions, generate embeddings via Cloudflare Workers AI
7. **Vectorize Upsert**: Upload vectors with metadata to Cloudflare Vectorize index

**Schema Utility Functions** (`backend/src/schema.ts`):
- `isValidCategory()`, `isValidSubcategory()` - Validation
- `normalizeCategory()`, `normalizeSubcategory()` - Normalization
- `shouldUseTHCPercentage()`, `shouldUseTHCPerUnitMg()` - Field mapping
- `getSchemaForPrompt()` - Format schema for LLM prompts

## Workflows

### Vectorizer Workflow (Embed & Upload Products)
The vectorizer is an ETL pipeline that fetches products from Dutchie API, transforms them using category-specific logic, and uploads embeddings to Cloudflare Vectorize. It relies on the aligned schema files in `vectorizer/src/schema.json` and `backend/src/schema.json`.

**Architecture**: Fetch (Dutchie API) → Transform (`normalize_products.py`) → Build page content/metadata → Embed (Workers AI) → Upload (Vectorize) → Reconcile stale vectors

**Key Scripts**:
- `core/pipeline.py` - Shared sync orchestration used by local CLI and Worker
- `core/reconcile.py` - Shared stale-delete orchestration
- `vectorize.py` - Local sync CLI
- `normalize_products.py` - 200+ lines of transformation logic (THC extraction, weight parsing, effects mapping, etc.)
- `manage_indexes.py` - Index lifecycle management (create, delete, list)
- `d1_uniques.py` - Per-index D1 uniqueness ledger for dedup by `id` and normalized `name`
- `run_sync_cycle.py` - Shared sync + reconcile entrypoint
- `worker_entry.py` - Dedicated Cloudflare Worker entrypoint
- `preset_sync.sh` - Batch sync automation with presets
- `CLI_COMMANDS.md` - Complete CLI reference guide

**Transformation Pipeline** (`normalize_products.py`):

The vectorizer applies comprehensive transformations to raw Dutchie data:

1. **Category/Type Normalization**: `PRE_ROLLS` → `prerolls`, `INDICA_HYBRID` → `indica-hybrid`
2. **Subcategory Mapping**: `PREMIUM` → `premium-flower`, `LIVE_RESIN_GUMMIES` → `live-resin-gummies` (66+ mappings)
3. **THC/CBD Extraction** (category-specific):
   - Flower/Prerolls/Vaporizers/Concentrates: Extract `thc_percentage`, `cbd_percentage` from potency fields
   - Edibles: Parse combined formats like "20pk | 100mg" → `thc_per_unit_mg: 5mg` (100mg / 20pk)
   - CBD/Topicals: Extract `cbd_total_mg`, `thc_total_mg`
4. **Weight & Pack Count**:
   - Flower: Parse `1/8oz` → `3.54g`, `1/4oz` → `7.09g`, `1oz` → `28.35g`
   - Prerolls: Extract pack count from name (`5pk` → 5), calculate `individual_weight_grams`
5. **Effects & Flavors**: Normalize to lowercase, map to canonical effects, default to `["relaxed"]` if empty
6. **Terpenes & Cannabinoids**: Flatten nested objects to string arrays for Vectorize compatibility
7. **Potency Classification**: Classify using category-specific scales (Mild/Balanced/Moderate/Strong/Very Strong)
8. **Price Priority**: Special price > Recreational > Medical
9. **Metadata Enrichment**: Add shop links, image URLs, brand info, `inStock` flag
10. **Embedding Generation**: Construct rich text with effects/flavors/terpenes/cannabinoids, embed with Workers AI

Create venv if not created
```bash
python3 -m venv venv
pip install --upgrade pip
```

Must activate venv
```bash
source venv/bin/activate
## or
source .venv/bin/activate
```


**Quick Start**:

**STEP 1**: Create Index
```bash
cd vectorizer/src
python manage_indexes.py --create products-prod
```

**STEP 2**: Create metadata indexes via Wrangler
```bash
# Run these once per index
npx wrangler vectorize create-metadata-index products-prod --property-name=category --type=string
npx wrangler vectorize create-metadata-index products-prod --property-name=type --type=string
npx wrangler vectorize create-metadata-index products-prod --property-name=brand --type=string
npx wrangler vectorize create-metadata-index products-prod --property-name=subcategory --type=string
npx wrangler vectorize create-metadata-index products-prod --property-name=effects --type=string
npx wrangler vectorize create-metadata-index products-prod --property-name=flavor --type=string
npx wrangler vectorize create-metadata-index products-prod --property-name=price --type=number
npx wrangler vectorize create-metadata-index products-prod --property-name=thc_percentage --type=number
npx wrangler vectorize create-metadata-index products-prod --property-name=cbd_percentage --type=number
npx wrangler vectorize create-metadata-index products-prod --property-name=thc_per_unit_mg --type=number
npx wrangler vectorize create-metadata-index products-prod --property-name=inStock --type=boolean
```

**STEP 3**: Test with Dry Run (no upload)
```bash
cd vectorizer/src
python vectorize.py -x products-prod --category EDIBLES --limit 5
```

**STEP 4**: Upload First Batch
```bash
python vectorize.py -x products-prod --category EDIBLES --limit 20 --upload
```

**STEP 5**: Verify in Cloudflare Dashboard
- Go to Storage & Databases → Vectorize
- Check `products-prod` index shows vectors

**CLI Examples**:

```bash
# Dry run (test transformation without upload)
python vectorize.py -x products-test --category EDIBLES --limit 20

# Upload INDICA gummies
python vectorize.py -x products-prod --category EDIBLES --subcategory GUMMIES --strain INDICA --limit 15 --upload

# Upload SATIVA chocolates
python vectorize.py -x products-prod --category EDIBLES --subcategory CHOCOLATES --strain SATIVA --limit 15 --upload

# Upload all FLOWER products
python vectorize.py -x products-prod --category FLOWER --limit 100 --upload

# With pagination (offset)
python vectorize.py -x products-prod --category EDIBLES --offset 100 --limit 50 --upload
```

**Batch Sync with Presets** (`preset_sync.sh`):

```bash
# Sync all EDIBLES subcategories (15 products each, no strain filter)
./preset_sync.sh all-subcategories EDIBLES products-prod 15

# Sync all categories and subcategories
./preset_sync.sh all-subcategories ALL products-prod 15

# Full-catalog sync (all categories, no subcategory filter), skip known low stock
./preset_sync.sh all-products ALL products-prod none 5

# Sync all gummy types x all strains
./preset_sync.sh gummies-all EDIBLES products-prod 15

# Sync gummies INDICA only
./preset_sync.sh gummies-indica EDIBLES products-prod 20
```

**Current Operating Policy**:

- `products-prod` remains the live-ish catalog used by the current test/UAT widget at `https://cannavita-widget.pages.dev`
- Manual full refresh for that lane remains valid:
  - `./preset_sync.sh all-products ALL products-prod none 5`
- New cron/reconcile automation must be validated against the separate QA lane first:
  - Vectorize index: `products-qa`
  - Vectorizer Worker: `vectorizer-worker-qa`
  - Backend Worker: `ecom-chat-backend-qa`
  - Pages project: `cannavita-widget-qa`
  - D1 database: `vectorizer-qa`
- `products-qa` is full-catalog only. Do not run partial subset presets against that index if stale reconciliation is enabled.

**Index Management**:

```bash
# List all indexes
python manage_indexes.py --list

# Check if index exists
python manage_indexes.py --exists products-prod

# Delete index
python manage_indexes.py --delete products-old
```

**Environment Setup**:

Create `vectorizer/.env` with:
```bash
CANNAVITA_API_KEY=your_dutchie_api_key
CF_ACCOUNT_ID=your_cloudflare_account_id
CF_VECTORIZE_API_TOKEN=your_vectorize_api_token
CF_AI_API_TOKEN=your_ai_api_token
CF_D1_DATABASE_ID=your_d1_database_id
# Optional if different from CF_VECTORIZE_API_TOKEN:
# CF_D1_API_TOKEN=your_d1_api_token
```

### Vectorizer Data Quality Controls (March 2026)

- Full-catalog sync is supported with `--limit none` and preset `all-products`.
- Optional low-stock exclusion is supported via `--min-quantity N` (only excludes when quantity is present and below threshold).
- Duplicate prevention is enforced by `id` and normalized `name`:
  - in-run dedup before upload
  - cross-run dedup using a per-index D1 uniqueness table
- New Vectorize index initialization now prepares a matching D1 uniqueness table.
- Duplicate collisions are skipped/logged and the sync continues (cron-safe behavior).

### Cron Deployment (Cloudflare Native)

Production scheduling now belongs to the dedicated vectorizer Worker in `vectorizer/`, not the backend Worker.

Primary files:
- `vectorizer/wrangler.toml`
- `vectorizer/src/worker_entry.py`
- `vectorizer/src/run_sync_cycle.py`

One-time setup:

```bash
cd vectorizer
uv sync --group dev
pywrangler secret put CANNAVITA_API_KEY
pywrangler secret put CF_ACCOUNT_ID
pywrangler secret put CF_VECTORIZE_API_TOKEN
pywrangler secret put CF_AI_API_TOKEN
pywrangler secret put CF_D1_DATABASE_ID
pywrangler secret put CF_D1_API_TOKEN
pywrangler secret put ADMIN_TOKEN
pywrangler deploy
```

### QA Automation Lane

Use the QA stack to validate cron, stale reconciliation, backend retrieval, and Pages behavior without touching the current `products-prod` lane.

**QA resources**:

- Vectorize index: `products-qa`
- D1 database: `vectorizer-qa`
- Vectorizer Worker config: `vectorizer/wrangler.qa.toml`
- Backend Worker config: `backend/wrangler.qa.toml`
- QA widget Pages project: `cannavita-widget-qa`

**Provision the QA index**:

```bash
cd vectorizer/src
python manage_indexes.py --create products-qa
```

**Create metadata indexes for QA**:

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

**Deploy QA vectorizer Worker**:

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

**Deploy QA backend**:

```bash
cd backend
npm run deploy:qa
```

**Build and deploy QA widget**:

```bash
cd client
cp .env.qa.example .env.qa
npm run build:qa
npx wrangler pages deploy dist --project-name=cannavita-widget-qa --branch=main
```

**QA smoke trigger**:

```bash
curl -X POST https://vectorizer-worker-qa.andresmeona.workers.dev/run \
  -H "Authorization: Bearer <QA_VECTORIZER_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"index_name":"products-qa","min_quantity":5,"stale_hours":48,"limit":"1500"}'
```

**QA post-run category verification**:

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

**QA token relationship**:

- `vectorizer-worker-qa` manual auth secret is `ADMIN_TOKEN`
- `postrun-verifier-qa` manual auth secret is `VERIFY_ADMIN_TOKEN`
- `vectorizer-worker-qa` auto-trigger secret is `POSTRUN_VERIFIER_TOKEN`
- `POSTRUN_VERIFIER_TOKEN` must equal `QA_VERIFY_ADMIN_TOKEN`
- `QA_VECTORIZER_ADMIN_TOKEN` does not have to equal `QA_VERIFY_ADMIN_TOKEN`

Use [vectorizer/ENVIRONMENT_MATRIX.md](/Users/bojanjovanovic/Desktop/Svelte/AiChatBot/vectorizer/ENVIRONMENT_MATRIX.md) for the full prod/QA/verifier split.
Use [vectorizer/STORE_SETUP.md](/Users/bojanjovanovic/Desktop/Svelte/AiChatBot/vectorizer/STORE_SETUP.md) when bringing up the vectorizer Worker + verifier Worker for a new store or isolated lane from scratch.

**Local verification against localhost backend**:

```bash
cd vectorizer/src
python run_postrun_verify.py \
  --suite categories_only \
  --index products-qa \
  --expected-trigger-source manual \
  --skip-email
```

**Direct QA backend intent sanity check**:

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

What this simplified V1 verifier checks:

- latest successful vectorizer run
- fetched/transformed/uploaded/updated/stale-delete counts
- active D1 uniqueness row count as the V1 active-vector count
- small live Dutchie chunk checks for:
  - `FLOWER`
  - `PRE_ROLLS`
  - `EDIBLES`
  - `CONCENTRATES`
- remote `categories_only` is the currently reliable deployed verifier gate

Current validated QA runtime facts:

- `vectorizer-worker-qa` has explicit Worker limits:
  - `cpu_ms = 300000`
  - `subrequests = 50000`
- QA soak cron is configured twice daily:
  - `17 7,19 * * *`
  - `07:17 UTC` and `19:17 UTC`
- a `limit = 1500` manual run successfully pulled the full currently observed QA menu:
  - `fetched_count = 824`
  - `uploaded_count = 682`
  - `transform_errors = 0`

The deployed verifier `full` suite is not the gate yet because its backend API probe is still flaky from inside the verifier Worker context, even though direct terminal/browser calls to the QA backend succeed. The scheduled post-run verifier target should therefore remain `categories_only` for now. It is a post-run operational canary, not a unit-test runner, and verifier failure does not fail the vectorizer cron itself.

Local manual cycle:

```bash
cd vectorizer/src
python run_sync_cycle.py products-prod 5 48 none
```

Local worker testing:

```bash
cd vectorizer
pywrangler dev --test-scheduled
```

Manual authenticated worker trigger:

```bash
curl -X POST http://127.0.0.1:8787/run \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"index_name":"products-prod","min_quantity":5,"stale_hours":48,"limit":"20"}'
```

## Development & Deployment

### Environment Configuration

The project uses environment-specific configuration files to manage API URLs and settings across local development and production environments.

#### Environment Files Structure

**Client** (`client/`):
- `.env.development` - Local development (points to localhost:8787)
- `.env.local` - Optional untracked local override for whichever backend port you want to hit today
- `.env.qa` - QA widget build (points to QA backend Worker)
- `.env.production` - Production deployment (points to deployed Cloudflare Worker)
- `.env.qa.example` - Tracked template for QA widget build values

```bash
# client/.env.development
VITE_API_URL=http://localhost:8787/chat
VITE_STORE_NAME=cannavita

# client/.env.local
# Optional override if you want localhost client to hit a different local backend port
VITE_API_URL=http://localhost:8788/chat
VITE_STORE_NAME=cannavita

# client/.env.qa
VITE_API_URL=https://ecom-chat-backend-qa.andresmeona.workers.dev/chat
VITE_STORE_NAME=cannavita

# client/.env.production
VITE_API_URL=https://ecom-chat-backend.andresmeona.workers.dev/chat
VITE_STORE_NAME=cannavita
```

**Backend** (`backend/`):
- `.env` - Local secrets (API keys, tokens)
- `wrangler.toml` - Local/deployed backend config bound to `products-prod`
- `wrangler.qa.toml` - Local/deployed backend config bound to `products-qa`

**Important**: All `.env.*` files are gitignored and not committed to the repository.

#### How Environment Variables Work

**Vite automatically switches .env files based on command**:

| Command | Mode | .env File Used | Result |
|---------|------|----------------|--------|
| `npm run build:dev` | development | `.env.development` | Bakes localhost API URL into `widget.js` |
| `npm run dev` | development server | none by itself | Serves the local page, but does not rebuild `widget.js` |
| `npm run build:qa` | qa | `.env.qa` | Bakes QA API URL into `widget.js` |
| `npm run build:prod` | production | `.env.production` | Bakes production API URL into `widget.js` |
| `npm run build` | production alias | `.env.production` | Alias of `npm run build:prod` |

**Important**:
- `npm run dev` serves the local app, but the local page still loads `dist/widget.js`.
- That means localhost widget work requires a build command first.
- For normal localhost development, use `npm run build:dev`.

**API URL Resolution Order** (in `client/src/main.ts`):
1. **Runtime override**: `data-api` attribute on script tag (highest priority)
2. **Compile-time**: `import.meta.env.VITE_API_URL` from .env file (baked into build)
3. **Fallback**: `http://localhost:8787/chat` (hardcoded default)

**Important local-dev rule**:
- The client does **not** choose the Vectorize index.
- The backend chooses the Vectorize index via its Wrangler config:
  - `backend/wrangler.toml` -> `products-prod`
  - `backend/wrangler.qa.toml` -> `products-qa`
- The client only chooses which backend URL to call (`localhost:8787`, `localhost:8788`, deployed QA Worker, deployed prod Worker, etc.).

**Example - Runtime Override**:
```html
<!-- Override baked-in URL at embed time -->
<script
  type="module"
  src="/widget.js"
  data-api="https://custom-api.com/chat"
  data-store="my-store">
</script>
```

---

### Local Development

#### Development Setup

**Important**: The client's `index.html` points to `/dist/widget.js` (built file), not source files. This means:
- ❌ **No Hot Module Replacement (HMR)** - changes require manual rebuild
- ✅ **Production-like widget testing** - the local page exercises the same built widget format used in deployment
- ⚡ **Workflow**: Edit source → Build → Refresh browser

#### Full Local Development Workflow

Run backend and frontend together for complete local testing:

**Terminal 1 - Backend API (prod index on localhost)**:
```bash
cd backend
npx wrangler dev --remote
```
**→ Runs backend on `http://localhost:8787`**
**→ Uses remote Cloudflare resources (Vectorize, Workers AI)**
**→ Queries Vectorize index `products-prod`**

**Terminal 1 alternative - Backend API (QA index on localhost)**:
```bash
cd backend
npx wrangler dev --remote --config wrangler.qa.toml
```
**→ Runs backend on `http://localhost:8787`**
**→ Queries Vectorize index `products-qa`**

**Terminal 2 - Frontend Widget**:
```bash
cd client

# Optional: pin localhost client to whichever backend you want today
printf 'VITE_API_URL=http://localhost:8787/chat\nVITE_STORE_NAME=cannavita\n' > .env.local

# Build widget for localhost development
npm run build:dev

# Start dev server (serves built widget)
npm run dev
```
**→ Builds source to `dist/widget.js` using `.env.development`**
**→ Runs Vite dev server on `http://localhost:5173`**
**→ Serves `index.html` which loads `dist/widget.js`**

**Development Loop**:
1. Edit files in `client/src/` (Widget.svelte, etc.)
2. Run `npm run build:dev` in Terminal 2
3. Refresh browser at `http://localhost:5173`
4. Repeat

#### Local client build modes

Use the client build command that matches what you are trying to test:

1. **Local development build**
```bash
cd client
npm run build:dev
npm run dev
```
- Uses `.env.development`
- This is the default localhost widget workflow

2. **Local QA simulation**
```bash
cd client
npm run build:qa
npm run dev
```
- Uses `.env.qa`
- Useful when you want the local page to exercise the QA backend URL

3. **Local production simulation**
```bash
cd client
npm run build:prod
npm run dev
```
- Uses `.env.production`
- `npm run build` is just an alias for this mode
- Use this when you intentionally want localhost to simulate the deployed production widget build

#### Local prod vs QA switching

The important split is:

- **backend config chooses the vector index**
- **client URL chooses which backend instance to call**

**Simplest switching model**:
- want localhost -> prod index: run `backend/wrangler.toml`
- want localhost -> QA index: run `backend/wrangler.qa.toml`
- keep client pointing at `http://localhost:8787/chat`

**Run both side-by-side if you want fast comparison**:

```bash
# Terminal 1 - prod backend on 8787
cd backend
npx wrangler dev --remote --port 8787

# Terminal 2 - QA backend on 8788
cd backend
npx wrangler dev --remote --config wrangler.qa.toml --port 8788
```

Then point the client where you want:

```bash
# Local client -> prod backend
cd client
printf 'VITE_API_URL=http://localhost:8787/chat\nVITE_STORE_NAME=cannavita\n' > .env.local
npm run build:dev
npm run dev

# Local client -> QA backend
cd client
printf 'VITE_API_URL=http://localhost:8788/chat\nVITE_STORE_NAME=cannavita\n' > .env.local
npm run build:dev
npm run dev
```

**Runtime override option**:
- `client/src/main.ts` already prefers `data-api` over baked env vars
- so an embed/demo page can switch backends without a rebuild by changing `data-api`

Example:
```html
<script
  id="ecom-widget-script"
  type="module"
  src="/widget.js"
  data-api="http://localhost:8788/chat"
  data-store="cannavita">
</script>
```

**Why `--remote` flag?**
The `--remote` flag runs your Worker code remotely on Cloudflare's infrastructure while keeping the dev server local. This gives you:
- Access to production Vectorize indexes
- Access to Cloudflare Workers AI models
- Faster cold starts (no local emulation overhead)
- Same behavior as production

---

### Deployment

#### Production Deployment Workflow

Deploy both backend and frontend to Cloudflare:

#### 1. Deploy Backend API (Cloudflare Workers)

```bash
cd backend
npx wrangler deploy
```

**What happens**:
- Deploys backend to Cloudflare Workers
- Creates/updates Worker at `https://ecom-chat-backend.andresmeona.workers.dev`
- Binds to Vectorize index specified in `wrangler.toml`
- Uses variables from `wrangler.toml` and Worker secrets configured via Wrangler

**Configuration** (`backend/wrangler.toml`):
```toml
name = "ecom-chat-backend"
main = "src/index.ts"
compatibility_date = "2025-11-24"

[[vectorize]]
binding = "VECTORIZE_INDEX"
index_name = "products-prod"

[vars]
# Public environment variables
```

**Deployed API URL**: `https://ecom-chat-backend.andresmeona.workers.dev/chat`

**Feedback Email Secret (Resend)**

The feedback form (`POST /feedback`) sends email via Resend and requires `RESEND_API_KEY` on the **backend Worker**.

Set production secret:
```bash
cd backend
npx wrangler secret put RESEND_API_KEY
```

Verify configured secrets:
```bash
npx wrangler secret list
```

For local `wrangler dev`, create `backend/.dev.vars`:
```env
RESEND_API_KEY=your_resend_api_key
```

Notes:
- `RESEND_API_KEY` should be configured in `backend` (Worker runtime), not in `client/.env`.
- Feedback emails currently send from `Cannavita Feedback <noreply@xtscale.com>` to `hq@algophase.com`.

---

#### QA Deployment Workflow

Use the QA stack for multi-day cron soak and browser-level validation.

#### 1. Deploy QA Backend API (Cloudflare Workers)

```bash
cd backend
npm run deploy:qa
```

**Configuration** (`backend/wrangler.qa.toml`):
```toml
name = "ecom-chat-backend-qa"
main = "src/index.ts"
compatibility_date = "2025-11-24"

[[vectorize]]
binding = "VECTORIZE_INDEX"
index_name = "products-qa"

[ai]
binding = "AI"
```

**Deployed QA API URL**:
- `https://ecom-chat-backend-qa.andresmeona.workers.dev/chat`

**Required QA backend secrets**:

Set the same runtime secrets used by the current backend on the QA Worker as well, especially:

- `CEREBRAS_API_KEY_PROD`
- active provider key(s) such as `GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, or `GROK_API_KEY`
- `RESEND_API_KEY` if feedback email should work in QA

#### 2. Deploy QA Widget (Cloudflare Pages)

```bash
cd client
cp .env.qa.example .env.qa
npm run build:qa
npx wrangler pages deploy dist --project-name=cannavita-widget-qa --branch=main
```

**What happens**:
- Vite builds widget using `.env.qa`
- `widget.js` is baked with the QA backend URL
- the demo page in `client/public/index.html` now relies on the baked API URL instead of a hardcoded `data-api`
- `--branch=main` deploys to the stable QA Pages URL `https://cannavita-widget-qa.pages.dev`
- omitting `--branch=main` from a feature branch creates a preview alias like `elastic-email-v1.cannavita-widget-qa.pages.dev`
- Pages project `cannavita-widget-qa` is deployed separately from `cannavita-widget`

**QA Pages URL**:
- `https://cannavita-widget-qa.pages.dev`

#### 3. Deploy QA Vectorizer Worker

```bash
cd vectorizer
pywrangler deploy --config wrangler.qa.toml
```

**Configuration** (`vectorizer/wrangler.qa.toml`):
```toml
name = "vectorizer-worker-qa"

[vars]
INDEX_NAME = "products-qa"
MIN_QUANTITY = "5"
STALE_HOURS = "48"
LIMIT = "none"

[triggers]
crons = ["17 7 * * *"]
```

**QA run-report and dedup isolation**:
- use a separate D1 database for QA: `vectorizer-qa`
- prod/live-ish run reports and QA run reports must not share the same D1 database

---

#### 2. Deploy Frontend Widget (Cloudflare Pages)

```bash
cd client

# Step 1: Build for production (uses .env.production)
npm run build:prod

# Step 2: Deploy to Cloudflare Pages
npx wrangler pages deploy dist --project-name=cannavita-widget
```

**What happens**:
- **Step 1**: Vite builds widget using `.env.production`
  - API URL `https://ecom-chat-backend.andresmeona.workers.dev/chat` is baked into `widget.js`
  - Outputs to `client/dist/`:
    - `dist/widget.js` - Compiled widget (IIFE format)
    - `dist/index.html` - Demo page for testing
    - `dist/assets/*` - Images, icons, other assets
- **Step 2**: Wrangler uploads entire `dist/` folder to Cloudflare Pages
  - Creates/updates Pages project `cannavita-widget`
  - Assigns URL: `https://cannavita-widget.pages.dev`

**Build Configuration** (`client/vite.config.ts`):
```typescript
build: {
  outDir: 'dist',
  emptyOutDir: true,  // Clears dist/ before each build
  lib: {
    entry: 'src/main.ts',
    name: 'EcomWidget',
    fileName: 'widget',
    formats: ['iife']
  }
}
```

---

#### Embedding the Production Widget

Once deployed, embed the widget on any website:

**Option 1: Use Deployed Widget (Recommended)**
```html
<script
  id="ecom-widget-script"
  type="module"
  src="https://cannavita-widget.pages.dev/widget.js"
  data-api="https://ecom-chat-backend.andresmeona.workers.dev/chat"
  data-store="cannavita">
</script>
```

**Option 2: Use CDN (for faster global delivery)**
```html
<!-- Host widget.js on a CDN and reference it -->
<script
  type="module"
  src="https://your-cdn.com/widget.js"
  data-api="https://ecom-chat-backend.andresmeona.workers.dev/chat"
  data-store="cannavita">
</script>
```

**Option 3: Baked-in API URL (no data-api attribute needed)**
```html
<!-- API URL already baked into widget.js during build -->
<script
  type="module"
  src="https://cannavita-widget.pages.dev/widget.js">
</script>
```

---

### Environment Summary

| Environment | Backend | Frontend | Widget API URL |
|-------------|---------|----------|----------------|
| **Local Dev** | `wrangler dev --remote` or `wrangler dev --remote --config wrangler.qa.toml` | `npm run build:dev` + `npm run dev` (localhost:5173) | `http://localhost:8787/chat` or another local backend port |
| **QA** | `wrangler deploy --config wrangler.qa.toml` | `npm run build:qa` + `wrangler pages deploy dist --project-name=cannavita-widget-qa --branch=main` | `https://ecom-chat-backend-qa.andresmeona.workers.dev/chat` |
| **Production** | `wrangler deploy` (Workers) | `npm run build:prod` + `wrangler pages deploy dist` (Pages) | `https://ecom-chat-backend.andresmeona.workers.dev/chat` |

---

### Deployment URLs

**Backend API**:
- Local prod-index backend: `http://localhost:8787/chat`
- Local QA-index backend: `http://localhost:8787/chat` if run alone, or another local port such as `http://localhost:8788/chat` when run side-by-side
- QA: `https://ecom-chat-backend-qa.andresmeona.workers.dev/chat`
- Production: `https://ecom-chat-backend.andresmeona.workers.dev/chat`

**Frontend Widget**:
- Local: `http://localhost:5173` (dev server)
- QA: `https://cannavita-widget-qa.pages.dev`
- Production: `https://cannavita-widget.pages.dev`

**API Endpoints** (append to base URL):
- `/chat/stream` - Streaming conversational agent
- `/chat/intent` - Intent extraction
- `/chat/recommendations` - Product recommendations
- `/chat/product-lookup` - Semantic product search

---

### Quick Reference: All Commands

**Local Development**:
```bash
# Terminal 1 - Backend using products-prod
cd backend
npx wrangler dev --remote

# Terminal 1 alternative - Backend using products-qa
cd backend
npx wrangler dev --remote --config wrangler.qa.toml

# Terminal 2 - Frontend pinned to current local backend port
cd client
printf 'VITE_API_URL=http://localhost:8787/chat\nVITE_STORE_NAME=cannavita\n' > .env.local
npm run build:dev  # After making changes
npm run dev    # Start dev server
```

**Production Deployment**:
```bash
# Deploy Backend
cd backend
npx wrangler deploy

# Deploy Frontend
cd client
npm run build:prod
npx wrangler pages deploy dist --project-name=cannavita-widget
```

**QA Deployment**:
```bash
# Deploy QA Backend
cd backend
npm run deploy:qa

# Deploy QA Vectorizer Worker
cd ../vectorizer
pywrangler deploy --config wrangler.qa.toml

# Deploy QA Frontend
cd ../client
cp .env.qa.example .env.qa
npm run build:qa
npx wrangler pages deploy dist --project-name=cannavita-widget-qa --branch=main
```

**Build Only** (without deploying):
```bash
cd client
npm run build:dev   # Localhost widget build
npm run build:qa    # QA widget build
npm run build:prod  # Production widget build
```

---

### Development vs Production: Key Differences

| Aspect | Local Development | Production |
|--------|-------------------|------------|
| **Backend** | `wrangler dev --remote` (`products-prod`) or `wrangler dev --remote --config wrangler.qa.toml` (`products-qa`) | `wrangler deploy` or `wrangler deploy --config wrangler.qa.toml` |
| **Frontend** | Built widget served by Vite dev server | Static widget.js hosted on Cloudflare Pages (`cannavita-widget` or `cannavita-widget-qa`) |
| **Widget Behavior** | Identical (tests production build) | Same as local (no surprises) |
| **API URL** | `http://localhost:8787/chat` by default, or whichever local backend port you choose | `https://ecom-chat-backend.andresmeona.workers.dev/chat` or `https://ecom-chat-backend-qa.andresmeona.workers.dev/chat` |
| **Environment File** | `.env.development` plus optional `.env.local` override | `.env.production` or `.env.qa` |
| **Hot Reload** | ❌ No (requires `npm run build:dev`) | ❌ No (static build) |
| **CORS** | Relaxed (same origin) | Configured in backend |
| **Vectorize** | Remote (`products-prod` with `wrangler.toml` or `products-qa` with `wrangler.qa.toml`) | Remote (`products-prod` or `products-qa`) |
| **Workers AI** | Remote (Cloudflare models) | Remote (Cloudflare models) |

---

### Important Notes

1. **`dist/` folder is for deployment only**:
   - Created by `npm run build:dev`, `npm run build:qa`, or `npm run build:prod`
   - Contains production-ready files
   - Ignored by git (in `.gitignore`)
   - Cleared on each build (`emptyOutDir: true`)

2. **Widget loads built file even in dev mode**:
   - `index.html` points to `/dist/widget.js` (not source)
   - This tests the built widget behavior locally
   - Requires manual rebuild after changes (no HMR)

3. **Environment variables are baked into build**:
   - `npm run build:dev` bakes `.env.development` into the localhost widget build
   - `npm run build:qa` bakes `.env.qa` into the QA widget build
   - `npm run build:prod` bakes `.env.production` into the production widget build
   - `npm run build` is an alias for `npm run build:prod`
   - Can still override at runtime via `data-api` attribute

5. **Current prod/UAT lane stays separate during automation soak**:
   - `https://cannavita-widget.pages.dev` continues pointing at the current `products-prod` lane
   - `products-prod` can still be refreshed manually with `./preset_sync.sh all-products ALL products-prod none 5`
   - new cron validation belongs on `products-qa`, not `products-prod`

4. **Backend always uses remote resources**:
   - `--remote` flag connects to production Vectorize and Workers AI
   - Ensures consistent behavior between dev and production
   - No need to mock or emulate Cloudflare services locally

## Component Library Integration

The `Svelte-Component-Library/` folder is a **separate git repository** cloned directly inside the parent project. The parent repo tracks all Component Library files as regular files — no git submodules, no npm linking, no build step.

### How It Works

```
AiChatBot/                              ← Parent repo (github.com/rendezvous3/AiChatBot)
├── .git/
├── client/src/Widget.svelte            ← Imports via relative paths
├── Svelte-Component-Library/           ← Nested repo (github.com/rendezvous3/Svelte-Component-Library)
│   ├── .git/                           ← Its own git (independent remote)
│   └── src/lib/custom/
│       ├── ChatWidget/
│       ├── ChatMessage/
│       └── ...
└── backend/
```

The parent git fully tracks all files inside `Svelte-Component-Library/` as regular files. The nested `.git` exists independently, allowing the Component Library to also be committed and pushed to its own remote — making it portable and reusable across projects.

### Import Pattern

Imports use plain relative paths — no aliases or config required:

```typescript
import ChatWidget from "../../Svelte-Component-Library/src/lib/custom/ChatWidget/ChatWidget.svelte";
import ChatMessage from "../../Svelte-Component-Library/src/lib/custom/ChatMessage/ChatMessage.svelte";
import type { GuidedFlowConfig } from "../../Svelte-Component-Library/src/lib/custom/GuidedFlow/types.js";
```

Vite resolves these at build time. Tree-shaking is automatic — only imported components are bundled into `widget.js`. Storybook files (`.stories.ts`) are never imported so they're never bundled.

### Dual-Commit Workflow

When you make changes to Component Library files, you need two commits — one to keep the Component Library repo updated on its own remote, and one to update the parent project:

```bash
# 1. Commit to the Component Library's own repo
cd Svelte-Component-Library/
git add .
git commit -m "Add new component variant"
git push   # → pushes to github.com/rendezvous3/Svelte-Component-Library

# 2. Commit to the parent AiChatBot repo
cd ..
git add Svelte-Component-Library/
git commit -m "Update component library"
git push   # → pushes to github.com/rendezvous3/AiChatBot
```

### Replicating This in a New Project

```bash
# 1. Clone the Component Library into your new project root
cd /path/to/YourNewProject
git clone https://github.com/rendezvous3/Svelte-Component-Library.git

# 2. Add and commit it to the parent repo
git add Svelte-Component-Library/
git commit -m "Add component library"

# 3. Import components with relative paths — no other config needed
```

---

## Theme Configuration

The widget supports both light and dark themes. To change the theme:

### 1. Change Initial Theme State

Edit `client/src/theme.svelte.ts` and change the initial theme value:

```typescript
// For light theme:
current: 'light' as 'light' | 'dark',

// For dark theme:
current: 'dark' as 'light' | 'dark',
```

### 2. Update Widget darkMode Prop

Edit `client/src/Widget.svelte` and update the `darkMode` prop on the `ChatWidget` component:

```svelte
<!-- For light theme: -->
darkMode={false}

<!-- For dark theme: -->
darkMode={true}
```

The theme is automatically applied when the widget initializes via the `theme.apply()` call in `onMount`.

**Note**: Product images use `mix-blend-mode: multiply` to blend white backgrounds with the theme. In light mode, this may require additional styling adjustments if needed.
