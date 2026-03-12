# Cannavita AI Budtender Widget

## Local Terminal Note

On this Mac, `node`, `npm`, `npx`, `wrangler`, and `pywrangler` may be missing in a fresh terminal until `nvm` is activated. Before running any Node/Wrangler command in a new terminal, run:

```bash
nvm use --lts
```

## Project Overview

This project is a production-grade, embeddable AI shopping assistant widget for **Cannavita Dispensary** (a premium cannabis store in Astoria, Queens, NY). We are looking to make this chatbot reproducible and applicable to other stores like Terpli.

The widget delivers a human-like budtender experience:
- Answers general questions (hours, location, policies, laws)
- Detects when the customer wants product recommendations
- Streams natural, warm conversation
- Displays rich product cards inline when recommendations are made
- Remembers past recommendations and references them naturally
- Persists entire chat (including recommendations) across page refreshes via localStorage

The system is built as **four loosely coupled components** for maximum flexibility, scalability, and ease of development.

## Current Operational Truth (March 2026)

If a later section conflicts with this section, trust this section first and then verify the live code/config.

- Runtime surfaces:
  - `vectorizer/src/core/**` = shared sync/reconcile logic
  - `vectorizer/src/vectorize.py`, `reconcile_stale.py`, `manage_indexes.py` = local CLI entrypoints
  - `vectorizer/src/worker_entry.py` = dedicated Cloudflare Python Worker
  - `backend/src/index.ts` = chat/recommendation Worker
  - `client/` = widget bundle / Pages output
- Deployment lanes:
  - Prod/live-ish: `products-prod`, `ecom-chat-backend`, `vectorizer-worker`, `https://cannavita-widget.pages.dev`
  - QA automation: `products-qa`, `vectorizer-qa`, `ecom-chat-backend-qa`, `vectorizer-worker-qa`, `cannavita-widget-qa`
- `products-prod` remains the manual/live-ish lane while QA cron bakes.
- `products-qa` must stay full-catalog only when stale reconciliation is enabled.
- For the current QA-soak-to-prod promotion procedure, refer to [QA_TO_PROD_INSTR.md](/Users/bojanjovanovic/Desktop/Svelte/AiChatBot/QA_TO_PROD_INSTR.md).
- Deployed Workers do not read local `.env` files. `vectorizer/.env` is CLI-only; optional local QA env files are convenience only.
- On localhost, the client does not choose the Vectorize index. The backend chooses it via `backend/wrangler.toml` (`products-prod`) or `backend/wrangler.qa.toml` (`products-qa`). The client only chooses which backend URL to call.
- `wrangler --config ...` and `pywrangler --config ...` resolve relative to the current working directory. Run backend deploy commands from `backend/` and vectorizer deploy commands from `vectorizer/`, or use absolute config paths.
- `npx wrangler pages deploy ...` from a feature branch creates a preview alias. Use `--branch=main` for the stable Pages root URL.
- QA vectorizer Worker secrets must include `CF_AI_API_TOKEN`. `CF_D1_API_TOKEN` must have D1 edit permission.
- Tinctures are now a first-class category. Plain `tincture` / `tinctures` maps to category `tinctures`; `CBD tincture` remains category `cbd` with subcategory `tincture`.

## Architecture & Components

### 1. **Vectorizer (`vectorizer/`)**
- **Technology**: Python shared core + Cloudflare Vectorize + Cloudflare Workers AI + Dutchie GraphQL API
- **Purpose**: ETL pipeline to fetch, transform, and embed the product catalog into the vector database
- **Architecture**: Modular pipeline with separate concerns (fetch, transform, embed, upload)
- **Status**: Production-ready with full Dutchie API integration and comprehensive transformation logic

#### Vectorizer Scripts

**Core Scripts**:
- `vectorize.py` - Main vectorization pipeline (orchestrates fetch → transform → embed → upload)
- `normalize_products.py` - Product transformation engine (200+ lines of normalization, extraction, and mapping logic)
- `manage_indexes.py` - Index lifecycle management (create, delete, list, exists operations)
- `d1_uniques.py` - Per-index D1 uniqueness ledger for dedup (`id` + normalized name)
- `dutchie_client.py` - Dutchie GraphQL API client (handles authentication, pagination, filtering)
- `preset_sync.sh` - Batch sync automation (predefined presets for common sync patterns)

**Schema Files**:
- `schema.json` - Vectorizer schema copy that must stay aligned with `backend/src/schema.json`
- `schema/*.md` - Category-specific transformation documentation (flower_schema.md, edibles_schema.md, prerolls_schema.md, etc.)
- `schema/terpenes.json` - Terpene reference data (aromas, effects, health benefits)
- `schema/cannaboids.json` - Cannabinoid reference data (descriptions, effects)
- `CLI_COMMANDS.md` - Complete CLI reference guide with examples

#### Transformation Pipeline (`normalize_products.py`)

The vectorizer transforms raw Dutchie API data into normalized, vector-ready documents through a comprehensive transformation pipeline:

**1. Category & Type Normalization**:
- Category: `PRE_ROLLS` → `prerolls`, `FLOWER` → `flower`, `EDIBLES` → `edibles`
- Strain type: `INDICA_HYBRID` → `indica-hybrid`, `SATIVA_HYBRID` → `sativa-hybrid`
- Removes underscores, converts to lowercase

**2. Subcategory Mapping** (66+ mappings):
```python
# Display names → Schema format (lowercase kebab-case)
"PREMIUM" → "premium-flower"
"WHOLE_FLOWER" → "whole-flower"
"LIVE_RESIN_GUMMIES" → "live-resin-gummies"
"INFUSED_PRE_ROLL_PACKS" → "infused-preroll-packs"
"ALL_IN_ONE" → "all-in-one"
"PAPERS_ROLLING_SUPPLIES" → "papers-rolling-supplies"
```

**3. THC/CBD Extraction** (category-specific):
- **Flower/Prerolls/Vaporizers/Concentrates**: Extract `thc_percentage` and `cbd_percentage` from `potencyThc.range[0]` and `potencyCbd.range[0]`
- **Edibles**: Extract `thc_per_unit_mg`, `thc_per_serving_mg`, `cbd_per_unit_mg` from combined formats like "20pk | 100mg" → 100mg total / 20pk = 5mg per unit
- **CBD/Topicals**: Extract `cbd_total_mg` and `thc_total_mg` from potency fields
- **Edge cases**: Handles missing values, invalid formats, zero values, percentage/mg unit conversions

**4. Weight & Pack Count Parsing**:

**Flower Weight** (from `variants[0].option`):
```
"1/8oz" → 3.54g (total_weight_grams), 0.125oz (total_weight_ounce)
"1/4oz" → 7.09g, 0.250oz
"1/2oz" → 14.17g, 0.500oz
"1oz" → 28.35g, 1.000oz
"3.5g" → 3.5g, 0.123oz
```

**Preroll Pack Count** (from product name/slug):
```
"5pk" → pack_count: 5, individual_weight_grams: total_weight / 5
"10 Pack" → pack_count: 10
"Single" → pack_count: 1
```

**5. Effects & Flavors**:
- Normalize to lowercase: `["Relaxed", "Happy"]` → `["relaxed", "happy"]`
- Map to canonical effects (see schema section above)
- Default to `["relaxed"]` if empty
- Extract flavors from product name, description, or tags

**6. Terpenes & Cannabinoids Enrichment**:
- Extract terpene names from nested objects: `terpenes[].terpene.name` → `["Myrcene", "Limonene", "Caryophyllene"]`
- Extract cannabinoid names: `cannabinoids[].cannabinoid.name` → `["THC", "CBD", "CBG"]`
- Flatten to string arrays for Vectorize metadata compatibility (Vectorize doesn't support nested objects)

**7. Potency Classification** (category-specific scales):

Uses `POTENCY_SCALES` dict to classify potency into human-readable labels:

```python
# Flower/Prerolls (0-100% scale)
thc_percentage: 26.5% → "strong" (22-28%)
thc_percentage: 15.2% → "balanced" (13-18%)

# Vaporizers/Concentrates (66-100% scale)
thc_percentage: 88% → "strong" (85-90%)
thc_percentage: 72% → "balanced" (66-75%)

# Edibles (mg per unit scale)
thc_per_unit_mg: 7.5mg → "moderate" (5-10mg)
thc_per_unit_mg: 2mg → "mild" (0-2.5mg)
```

**8. Price Priority**:
1. `variants[0].specialPriceRec` (special recreational price)
2. `variants[0].priceRec` (regular recreational price)
3. `variants[0].priceMed` (medical price, fallback)

**9. Metadata Enrichment**:
- Add shop link: `https://cannavita.us/shop/?dtche[product]={slug}`
- Extract image URL from `image` or `images[0].url`
- Add brand name and tagline from `brand.name` and `brand.description`
- Set `inStock: true` (products in API response are always in stock)
- Mark `staffPick` if true

**10. Embedding Generation**:

Construct rich text for semantic search:
```
{name}. {description}.
Effects: {effects_joined}.
Flavor: {flavor_joined}.
Terpenes: {terpene_aromas_joined}.
Cannabinoids: {cannabinoid_descriptions_joined}.
Health Benefits: {health_benefits_joined}.
```

Generate embeddings using Cloudflare Workers AI (`@cf/baai/bge-large-en-v1.5`) - 1024-dimensional vectors.

#### Batch Sync Automation (`preset_sync.sh`)

Automates multi-subcategory/multi-strain sync operations with predefined presets.

**Available Presets**:

| Preset | Description | Example |
|--------|-------------|---------|
| `all-subcategories` | All subcategories for a category (no strain filter) | `./preset_sync.sh all-subcategories EDIBLES products-prod 15` |
| `all-products` | Full category pull (or ALL) with no subcategory filter | `./preset_sync.sh all-products ALL products-prod none 5` |
| `gummies-all` | All gummy types × all strains [EDIBLES only] | `./preset_sync.sh gummies-all EDIBLES products-prod 15` |
| `gummies-indica` | All gummy types × INDICA [EDIBLES only] | `./preset_sync.sh gummies-indica EDIBLES products-prod 20` |
| `gummies-sativa` | All gummy types × SATIVA [EDIBLES only] | `./preset_sync.sh gummies-sativa EDIBLES products-prod 20` |
| `chocolates` | Chocolates × all strains [EDIBLES only] | `./preset_sync.sh chocolates EDIBLES products-prod 10` |
| `edibles-full` | All edibles subcategories × all strains | `./preset_sync.sh edibles-full EDIBLES products-prod 30` |
| `edibles-quick` | Gummies + chocolates only | `./preset_sync.sh edibles-quick EDIBLES products-prod 30` |

**Features**:
- Automatic rate limiting (2s delay between requests)
- Graceful failure handling (skips failed categories)
- Progress output with emoji indicators
- Supports all 8 categories: EDIBLES, FLOWER, PRE_ROLLS, VAPORIZERS, CONCENTRATES, CBD, TOPICALS, ACCESSORIES

**Usage**:
```bash
# Sync all EDIBLES subcategories (15 products each, no strain filter)
./preset_sync.sh all-subcategories EDIBLES products-prod 15

# Sync all categories and subcategories (comprehensive sync)
./preset_sync.sh all-subcategories ALL products-prod 15

# Full-catalog sync (all categories), exclude known low stock
./preset_sync.sh all-products ALL products-prod none 5

# Sync all gummy types x all strains (INDICA, SATIVA, HYBRID)
./preset_sync.sh gummies-all EDIBLES products-prod 15
```

**Current lane split**:

- `products-prod` is the live-ish/manual lane currently used by the existing Pages/UAT widget deployment
- manual full refresh remains:
  - `./preset_sync.sh all-products ALL products-prod none 5`
- automated cron soak must use the QA lane:
  - index: `products-qa`
  - vectorizer Worker: `vectorizer-worker-qa`
  - backend Worker: `ecom-chat-backend-qa`
  - Pages project: `cannavita-widget-qa`
  - D1 database: `vectorizer-qa`
- when stale reconciliation is enabled, `products-qa` must be full-catalog only
- do not run partial presets against `products-qa`

#### Index Management (`manage_indexes.py`)

**Operations**:
- `--create INDEX_NAME` - Create new Vectorize index (1024 dimensions, cosine similarity)
- `--delete INDEX_NAME` - Delete existing index (warning: permanent)
- `--list` - List all indexes with vector counts and status
- `--exists INDEX_NAME` - Check if index exists (exit code 0/1)
- `--create` also initializes per-index D1 uniqueness table when D1 env vars are configured

**Examples**:
```bash
# Create index
python manage_indexes.py --create products-prod

# List all indexes
python manage_indexes.py --list

# Check if index exists
python manage_indexes.py --exists products-prod

# Delete index
python manage_indexes.py --delete products-demo-old
```

**QA setup**:
```bash
# Create isolated QA index
python manage_indexes.py --create products-qa

# Deploy QA backend
cd backend && npm run deploy:qa

# Deploy QA vectorizer worker
cd ../vectorizer && pywrangler deploy --config wrangler.qa.toml

# Deploy QA widget
cd ../client && cp .env.qa.example .env.qa && npm run build:qa
```

#### CLI Usage (`vectorize.py`)

**Dry Run** (test without uploading):
```bash
# Test 20 EDIBLES products
python vectorize.py -x products-test --category EDIBLES --limit 20

# Test INDICA gummies
python vectorize.py -x products-test --category EDIBLES --subcategory GUMMIES --strain INDICA --limit 15

# Test SATIVA chocolates
python vectorize.py -x products-test --category EDIBLES --subcategory CHOCOLATES --strain SATIVA --limit 10
```

**Upload to Vectorize**:
```bash
# Upload 100 EDIBLES products
python vectorize.py -x products-prod --category EDIBLES --limit 100 --upload

# Upload INDICA flower
python vectorize.py -x products-prod --category FLOWER --strain INDICA --limit 50 --upload

# Upload live resin vaporizers
python vectorize.py -x products-prod --category VAPORIZERS --subcategory LIVE_RESIN --limit 30 --upload
```

**With Offset** (for pagination):
```bash
# Batch 1: Products 0-100
python vectorize.py -x products-prod --category EDIBLES --offset 0 --limit 100 --upload

# Batch 2: Products 100-200
python vectorize.py -x products-prod --category EDIBLES --offset 100 --limit 100 --upload
```

#### Schema Synchronization

**Important**: `vectorizer/src/schema.json` and `backend/src/schema.json` are coordinated copies. Do not edit one and assume the other is current.

**Synchronization Process**:
1. Update both `vectorizer/src/schema.json` and `backend/src/schema.json`
2. Update transformation logic in `normalize_products.py` if needed
3. Update schema documentation in `vectorizer/src/schema/*.md`
4. Test transformations with dry run: `python vectorize.py -x test --category CATEGORY --limit 5`
5. Update backend schema utilities in `backend/src/schema.ts` if new mappings are added

**Rule**: Before schema work, diff both schema files and resolve drift explicitly. Do not assume either file is the sole source of truth.

#### Key Design Decisions

1. **Separation of Concerns**: Fetch (Dutchie API) → Transform (normalize) → Embed (Workers AI) → Upload (Vectorize) are separate, testable stages
2. **Category-Specific Logic**: Different categories use different fields (thc_percentage vs thc_per_unit_mg), different scales, different parsing logic
3. **Lowercase Kebab-Case**: All normalized values use lowercase kebab-case for consistency (`premium-flower`, `indica-hybrid`, `clear-mind`)
4. **Schema Alignment**: `vectorizer/src/schema.json` and `backend/src/schema.json` must be updated together so categories, subcategories, and potency scales stay consistent across ingestion and retrieval
5. **Metadata Flattening**: Nested objects (terpenes, cannabinoids) flattened to string arrays for Vectorize compatibility
6. **Defaults Over Nulls**: Empty effects → `["relaxed"]`, missing price → use fallback, missing weight → null but don't fail
7. **Graceful Failure**: Skip invalid products, log warnings, continue processing batch (resilient to API inconsistencies)

#### Designed for Production

- **Cron-ready**: Use with `--upload` flag for scheduled syncs
- **Pagination support**: `--offset` and `--limit` for large catalogs
- **Rate limiting**: Built into preset_sync.sh (2s delay)
- **Dedup safety**: In-run + D1 cross-run dedup by ID/name
- **Stale cleanup**: `reconcile_stale.py` deletes vectors not seen within cutoff window
- **Dry run mode**: Test transformations before uploading (default behavior)
- **Comprehensive logging**: Detailed output for debugging transformation issues
- **Schema validation**: Validates categories/subcategories against schema.json before processing
- **CLI reference**: Complete documentation in `CLI_COMMANDS.md` with 50+ examples

#### Data Schema & Transformation Pipeline

The vectorizer and backend share aligned schema definitions in `backend/src/schema.json`, `backend/src/schema.ts`, and `vectorizer/src/schema.json`. These must stay synchronized for ingestion and retrieval to stay compatible.

**Schema Files**:
- `backend/src/schema.json` - Backend schema copy used at runtime
- `backend/src/schema.ts` - TypeScript interface and utility functions for schema validation and normalization
- `vectorizer/src/schema.json` - Vectorizer schema copy used during ingestion

**Schema Structure**:

1. **Categories** (8 total):
   ```json
   ["flower", "prerolls", "edibles", "concentrates", "vaporizers", "cbd", "topicals", "accessories"]
   ```

2. **Types** (5 total):
   ```json
   ["indica", "sativa", "hybrid", "indica-hybrid", "sativa-hybrid"]
   ```

3. **Subcategories** (category-specific):
   - `edibles` → chews, chocolates, cooking-baking, drinks, gummies, live-resin-gummies, live-rosin-gummies
   - `vaporizers` → all-in-one, cartridges, disposables, live-resin, live-rosin
   - `prerolls` → blunts, infused-prerolls, infused-preroll-packs, pre-roll-packs, singles
   - `flower` → bulk-flower, pre-ground, premium-flower, small-buds, whole-flower
   - `concentrates` → badder, hash, live-resin, live-rosin, rosin, unflavored
   - `topicals` → balms
   - `accessories` → batteries, glassware, grinders, lighters, papers-rolling-supplies

4. **Canonical Effects** (10 total):
   ```typescript
   ["calm", "happy", "relaxed", "energetic", "clear-mind", "creative", "focused", "inspired", "sleepy", "uplifted"]
   ```

5. **Category Field Mappings** (which THC fields to use):
   - **thc_percentage**: flower, prerolls, vaporizers, concentrates
   - **thc_per_unit_mg**: edibles
   - **cbd_total_mg**: cbd, topicals
   - **individual_weight_grams**: prerolls
   - **quantity**: all categories (inventory tracking)

6. **Potency Scales** (category-specific THC ranges):

   **Flower/Prerolls**:
   - Mild: 0-13%, Balanced: 13-18%, Moderate: 18-22%, Strong: 22-28%, Very Strong: 28-100%

   **Vaporizers/Concentrates**:
   - Mild: 0-66%, Balanced: 66-75%, Moderate: 75-85%, Strong: 85-90%, Very Strong: 90-100%

   **Edibles**:
   - Mild: 0-2.5mg, Balanced: 2.5-5mg, Moderate: 5-10mg, Strong: 10-25mg, Very Strong: 25-100mg

**Data Transformation Pipeline**:

The vectorizer transforms raw Dutchie API data into vector-ready documents through these steps:

1. **Fetch Products** (Dutchie GraphQL API):
   - Supports filtering by `--category`, `--subcategory`, and `--strain` CLI flags
   - Retrieves product data with full fields (name, description, brand, price, THC, CBD, effects, flavors, etc.)

2. **Schema Validation & Normalization**:
   - Validates categories against `schema.json` categories list
   - Normalizes subcategories to lowercase kebab-case format
   - Maps effects to canonical effects list (e.g., "joyful" → "happy", "tired" → "sleepy")
   - Validates THC field usage based on category (percentage vs per-unit-mg)

3. **THC/CBD Extraction**:
   - Smart parsing for combined formats: "20pk | 100mg" → 100mg total, 5mg per unit
   - Category-specific extraction:
     - **Flower/Prerolls/Vaporizers/Concentrates**: Extract `thc_percentage` and `cbd_percentage`
     - **Edibles**: Extract `thc_per_unit_mg`, `thc_per_serving_mg`, `cbd_per_unit_mg`
     - **CBD/Topicals**: Extract `cbd_total_mg`
   - Handles edge cases: missing values, invalid formats, zero values

4. **Metadata Enrichment**:
   - Adds product metadata: `id`, `name`, `category`, `type`, `subcategory`, `brand`, `price`, `inStock`
   - Adds potency metadata: `thc_percentage`, `thc_per_unit_mg`, `cbd_percentage`, `cbd_total_mg`
   - Adds effect/flavor arrays: `effects`, `flavor` (stored as arrays for semantic search)
   - Adds descriptive fields: `description`, `terpene_aromas`, `health_benefits`

5. **Embedding Generation**:
   - Constructs rich text for embedding:
     ```
     {name}. {description}. Effects: {effects_joined}. Flavor: {flavor_joined}. Terpenes: {terpene_aromas}. Benefits: {health_benefits}.
     ```
   - Generates embeddings using Cloudflare Workers AI (`@cf/baai/bge-large-en-v1.5`)
   - Embeddings capture semantic meaning of effects, flavors, and product descriptions

6. **Vectorize Upsert**:
   - Upserts vectors with full metadata into Cloudflare Vectorize index
   - Metadata fields are indexed for filtering (category, type, subcategory, brand, price, thc_percentage, inStock)
   - Product ID is stored as vector ID for retrieval

**Schema Utility Functions** (`backend/src/schema.ts`):
- `isValidCategory(category)` - Validates category against schema
- `isValidSubcategory(category, subcategory)` - Validates subcategory for given category
- `normalizeCategory(category)` - Normalizes to lowercase, returns null if invalid
- `normalizeSubcategory(category, subcategory)` - Normalizes to lowercase kebab-case, validates against schema
- `getValidSubcategories(category)` - Returns list of valid subcategories for category
- `shouldUseTHCPercentage(category)` - Returns true for flower/prerolls/vaporizers/concentrates
- `shouldUseTHCPerUnitMg(category)` - Returns true for edibles
- `getSchemaForPrompt()` - Formats schema as string for LLM prompts

**Why This Matters**:
- **Consistency**: Same categories/effects across vectorizer, backend API, and frontend UI
- **Validation**: Prevents invalid data from entering the vector database
- **Normalization**: Ensures "Flower" and "flower" are treated identically
- **THC Field Safety**: Prevents mixing percentage and per-unit-mg fields (category-specific)
- **Effect Mapping**: Maps user language ("tired") to canonical effects ("sleepy") for better search results

### 2. **Backend API (`backend/src/index.ts`)**
- **Technology**: TypeScript + Hono + Cloudflare Workers
- **Purpose**: Serverless API handling all business logic
- **Routes**:
  - `/chat/intent`: Structured intent extractor (Cerebras qwen-3-32b) — classifies intent, extracts filters via HYDE + Potency Gate
  - `/chat/stream`: Streaming conversational agent (Maitre D, Groq Llama 3.3 70B) — emits CODEX cues to trigger intent
  - `/chat/recommendations`: Hybrid RAG recommendation engine — Vectorize metadata filtering + semantic search + LLM re-ranking (Cerebras qwen-3-32b)
  - `/chat/product-lookup`: Semantic product search for product-question intent (confidence-based)
- **Key Features**:
  - Zero first-token cutoffs (robust buffered SSE parsing)
  - Full context memory (remembers and references past recommendations)
  - Clean separation: general chat never recommends products
  - Structured intent extraction with metadata filters
  - Hybrid filtering approach: metadata filters for exact matches, semantic search + re-ranking for nuanced fields
  - CORS enabled for widget embedding
- **Status**: Production-ready, no streaming bugs, full context awareness, metadata filtering operational

#### Prompt Architecture (`backend/src/prompts/`)

All LLM prompts live in dedicated files under `backend/src/prompts/`. `prompt.ts` is a thin dispatcher. `index.ts` imports only what it needs.

| File | Export | Model | Role |
|------|--------|-------|------|
| `stream.ts` | `generateStreamPrompt` | Groq Llama 3.3 70B | Conversational stream + CODEX cues |
| `intentWithCue.ts` | `generateIntentWithCuePrompt` | Cerebras qwen-3-32b | Active intent extraction (HYDE, Potency Gate, all bug fixes) |
| `intentNoCue.ts` | `generateIntentNoCuePrompt` | — | Verbatim backup / rollback of original intent prompt |
| `rerank.ts` | `generateReRankPrompt` | Cerebras qwen-3-32b | Product re-ranking |
| `recommend.ts` | `generateRecommendPromptV1/V2` | — | Legacy recommendation prompts (reference) |

#### API Endpoint Details

##### `/chat/intent` - Structured Intent Extractor
**Purpose**: Analyzes conversation history to determine user intent and extract structured filters and semantic search query.

**Input**:
```json
{
  "messages": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

**Output**:
```json
{
  "intent": "recommendation" | "product-question" | "general",
  "filters": {
    "category": "flower" | "prerolls" | "edibles" | "concentrates" | "vaporizers" | "cbd" | "topicals" | "accessories" | null,
    "type": "indica" | "sativa" | "hybrid" | null,
    "thc_percentage_min": number | null,
    "thc_percentage_max": number | null,
    "thc_per_unit_mg_min": number | null,
    "thc_per_unit_mg_max": number | null,
    "subcategory": string | null,
    "effects": string[] | null,
    "flavor": string[] | null,
    "brand": string | null,
    "price_min": number | null,
    "price_max": number | null
  },
  "semantic_search": "3-5 keywords describing desired mood/effect/flavor",
  "product_query": "raw text for product lookup (only for product-question intent)"
}
```

**Intent Types**:
- `"recommendation"` - User wants product recommendations (triggers `/recommendations` API)
- `"product-question"` - User asking about a specific product (triggers product lookup flow)
- `"general"` - General questions about store, hours, policies (streams directly)

**Key Features**:
- Triggered by CODEX cue detection from stream — only fires when stream emits a recommendation-intent phrase
- Parses CODEX summary (strict field-order format) as primary extraction source
- Applies HYDE type inference: effect words automatically add strain type to filters
- Two-Step Potency Gate: potency words trigger THC range only when a category is present; effect words and effect superlatives never trigger THC
- Extracts structured filters including category, type, effects, THC ranges, subcategory, flavor, brand, price
- Robust JSON parsing with markdown stripping and fallback handling

##### `/chat/product-lookup` - Product Semantic Search
**Purpose**: Searches for a product by semantic similarity when it's NOT found in conversation history.

**Input**:
```json
{
  "product_query": "Gelato Cake"
}
```

**Output**:
```json
{
  "product": { "id": "...", "name": "...", ... } | null,
  "confidence": 0.85,
  "needsClarification": false | true,
  "suggestedNames": ["Luci Gelato", "Candy Rain"],
  "message": "I'm not quite sure which one you mean. Did you mean Luci Gelato or Candy Rain?"
}
```

**Key Features**:
- Uses native Cloudflare Vectorize API (`c.env.VECTORIZE_INDEX.query()`) for confidence scores
- Generates embeddings using Cloudflare Workers AI (`@cf/baai/bge-large-en-v1.5`)
- Returns top 3 matches with cosine similarity scores

**Confidence Thresholds**:
- `>0.7`: High confidence - returns single product (auto-answer)
- `<0.7`: Low/medium confidence - returns `needsClarification: true` with suggested names for follow-up question

##### `/chat/recommendations` - Hybrid RAG Recommendation Engine
**Purpose**: Retrieves and ranks products using a hybrid approach combining metadata filtering, semantic search, and LLM re-ranking.

**Input**:
```json
{
  "messages": [...],
  "filters": { /* from /intent endpoint */ },
  "semantic_search": "..." /* from /intent endpoint */
}
```

**Flow**:
1. **Metadata Filtering** (Vectorize): Applies exact-match filters for filterable fields:
   - `category`, `type`, `subcategory`, `brand` (string fields)
   - `price` (range queries with `$gte`/`$lte`)
   - `thc_percentage` (range queries with `$gte`/`$lte` using `thc_percentage_min` and `thc_percentage_max`)
   - `inStock` (boolean)
   - **Note**: `effects` and `flavor` are **excluded** from metadata filters (see limitations below)

2. **Semantic Search** (Vectorize): Uses `semantic_search` query (or falls back to `user_message`) to find semantically similar products based on embeddings.

3. **LLM Re-ranking**: Takes top 10 search results and re-ranks them using Cerebras qwen-3-32b for best overall match. The re-ranker evaluates:
   - Overall semantic match quality with user request
   - Product category, type, subcategory alignment
   - Product description relevance
   - Price and THC percentage preferences
   - **Effects and flavors** (included because Vectorize can't filter on these array fields)
   - Contradictions (e.g., user wants "not sleepy" but product is "heavy sedative")

   **Note**: Effects and flavors are considered during re-ranking not because they're special, but because Vectorize metadata filtering limitations prevent us from filtering on array fields. The re-ranker's primary purpose is to find the best overall matches, with effects/flavors being one factor among many.

**Output**:
```json
{
  "recommendations": [
    {
      "id": "demo-prod-001",
      "name": "...",
      "category": "...",
      "effects": ["energetic", "creative"],
      "flavor": ["citrus", "sweet"],
      ...
    }
  ]
}
```

**Vector DB Limitations & Workaround**:
- **Problem**: Cloudflare Vectorize metadata filtering does **not support filtering on array fields** (like `effects` and `flavor`). When metadata stores `effects: ["energetic", "creative"]` as an array, the `$in` operator checks if the entire array value matches, not individual elements.
- **Solution**: Exclude `effects` and `flavor` from metadata filters. Instead:
  1. Use semantic search to find products with similar effects/flavors (via embeddings)
  2. Use LLM re-ranking for **general best-match ranking** (primary purpose)
  3. The re-ranking prompt includes user-requested effects and flavors as one factor among many, ensuring they're considered despite Vectorize limitations
- **Result**: Accurate recommendations that consider all user preferences (category, type, price, effects, flavors, etc.) while still benefiting from fast metadata filtering for exact matches on non-array fields

##### `/chat/stream` - Conversational Streaming Agent
**Purpose**: Streams natural conversation using the Maitre D role (handles general questions and product-question intents).

**Input**:
```json
{
  "messages": [...],
  "productContext": "{ full product JSON }" | null,
  "clarificationContext": "follow-up question text" | null
}
```

**Key Parameters**:
- `messages`: Conversation history
- `productContext`: Full product data (JSON string) when answering product questions
- `clarificationContext`: Text for follow-up question when clarification is needed

**Behavior**:
- When `productContext` is provided: LLM answers detailed questions about that product (effects, THC%, price, etc.)
- When `clarificationContext` is provided: LLM asks the follow-up question naturally
- When neither is provided: Normal general conversation flow

**CODEX Cue System**: When the stream detects a complete recommendation query, it emits a trigger phrase ("I completely understand what you're looking for...") followed by a structured summary. The frontend detects this phrase and fires `/chat/intent`. The summary follows a strict field-order format:

`[Potency word] [Effect words] [Type] [Category] [Subcategory] [, Flavor flavor]`

Only fields the user actually mentioned are included. Type is never inferred in the stream — that is HYDE's job in intent. This makes the summary deterministic and parseable left-to-right by the intent model.

#### RAG Architecture Flow & Debugging

**Flow:** `/chat/stream` → CODEX cue → `/chat/intent` (HYDE + Potency Gate) → UI → `/chat/recommendations` → `validateAndExpandFilters` → Vector Search → Re-ranker → Results

**Practical Flow Example:**

Let's walk through a complete recommendation flow with a real query:

**User Query**: `"Tell me about focused, clear minded sativa edibles"`

**Step 1 - Intent Extraction** (`POST /chat/intent`):

The intent API analyzes the query and extracts:

```json
{
  "intent": "recommendation",
  "filters": {
    "category": "edibles",
    "type": "sativa",
    "effects": ["focused", "clear-mind"]
  },
  "semantic_search": "focused clear-minded sativa edibles energetic alert daytime"
}
```

*What happened*: The LLM identified this as a recommendation request (mentions category "edibles"), extracted the category ("edibles"), type ("sativa"), and effects ("focused" maps to canonical effect "focused", "clear minded" maps to "clear-mind"). It also generated a semantic search query with effect-related keywords that match product embedding vocabulary.

**Step 2 - UI Decision**: Frontend sees `intent: "recommendation"` and calls `/chat/recommendations` with the extracted filters and semantic_search.

**Step 3 - Hybrid Recommendation Retrieval** (`POST /chat/recommendations`):

The recommendations API receives:
```json
{
  "messages": [...],
  "filters": {
    "category": "edibles",
    "type": "sativa",
    "effects": ["focused", "clear-mind"]
  },
  "semantic_search": "focused clear-minded sativa edibles energetic alert daytime"
}
```

**3a. Metadata Filtering** (Vectorize):
- Applies exact-match filter: `category = "edibles"`
- Applies exact-match filter: `type = "sativa"`
- Does NOT filter on `effects` (array fields not supported by Vectorize)

**3b. Semantic Search** (Vectorize):
- Generates embedding for: `"focused clear-minded sativa edibles energetic alert daytime"`
- Searches for top 10 products matching metadata filters with highest semantic similarity
- Returns products like:
  - "Sativa Gummies - Focus Blend" (effects: ["focused", "energetic", "creative"])
  - "Daytime Chocolates - Sativa" (effects: ["uplifted", "happy", "clear-mind"])
  - "Live Rosin Gummies - Sativa" (effects: ["focused", "energetic", "happy"])

**3c. LLM Re-ranking**:
- Takes top 10 candidates from vector search
- Re-ranks based on:
  1. **Effects Match** (HIGHEST PRIORITY): Does the product have "focused" or "clear-mind" effects?
  2. **Category Match**: Already filtered (all are edibles)
  3. **Type Match**: Already filtered (all are sativa)
  4. **Description Relevance**: Does description mention focus, clarity, daytime use?
  5. **Price & THC**: Reasonable ranges for user's likely preference
- Excludes products with contradictory effects (e.g., "sleepy" when user wants "focused")
- Returns top 3-5 best matches

**Step 4 - Final Response**:
```json
{
  "recommendations": [
    {
      "id": "prod-123",
      "name": "Focus Blend Gummies - Sativa",
      "category": "edibles",
      "type": "sativa",
      "effects": ["focused", "energetic", "creative"],
      "flavor": ["citrus", "tropical"],
      "thc_per_unit_mg": 5,
      "price": 24.99,
      "description": "Perfect for daytime focus and productivity..."
    },
    {
      "id": "prod-456",
      "name": "Clear Mind Chocolates",
      "category": "edibles",
      "type": "sativa",
      "effects": ["clear-mind", "uplifted", "happy"],
      "flavor": ["dark-chocolate", "mint"],
      "thc_per_unit_mg": 10,
      "price": 29.99,
      "description": "Elevate your mental clarity with these artisan chocolates..."
    }
  ]
}
```

**Step 5 - UI Display**: Frontend displays product cards inline in the conversation with rich details (image, name, effects, price, THC, etc.).

---

**Debugging Unsatisfactory Queries:**

When recommendations are poor, check these three failure points in order:

| Failure Point | Symptoms | How to Debug |
|---------------|----------|--------------|
| **A) Intent** | Wrong filters, wrong semantic_search | Check `/intent` response - are filters and semantic_search correct? |
| **B) Vector DB** | Good intent but wrong products retrieved | Check `preRankedProducts` - do they match the query semantically? |
| **C) Re-ranker** | Good retrieval but wrong final ranking | Compare `preRankedProducts` vs `recommendations` - did good products get dropped? |

**Common Issues:**
- **Intent:** Category/type hallucination, poor semantic_search formulation
- **Vector DB:** semantic_search doesn't match product embedding vocabulary (effects: "energizing" vs "energetic")
- **Re-ranker:** Not enforcing effects priority, keeping contradicting products

#### THC Classification System

The system uses **category-specific THC potency scales** to standardize THC percentage classifications across the UI, API, and recommendation engine.

**Flower & Prerolls Scale**:
- **Mild**: <13%
- **Balanced**: 13-18%
- **Moderate**: 18-22%
- **Strong**: 22-28%
- **Very Strong**: >28%

**Vaporizers & Concentrates Scale**:
- **Mild**: <66%
- **Balanced**: 66-75%
- **Moderate**: 75-85%
- **Strong**: 85-90%
- **Very Strong**: >90%

**Implementation**:
- **GuidedFlow UI**: Users select potency labels (Mild, Balanced, Moderate, Strong, Very Strong) which are converted to `thc_percentage_min` and `thc_percentage_max` ranges based on the selected product category
- **Intent API**: Extracts THC preferences from conversation using category-specific scales, returning `thc_percentage_min` and `thc_percentage_max` in filters
- **Recommendations API**: Uses `thc_percentage_min` and `thc_percentage_max` for range-based metadata filtering in Vectorize
- **Re-ranking**: Considers THC percentage ranges when evaluating product matches

**Conversion Logic**: The `transformSelectionsToMetadata` function in `Svelte-Component-Library/src/lib/custom/GuidedFlow/utils.ts` uses the `potencyToTHCRange` utility from `thcScales.ts` to convert potency selections to min/max ranges based on the selected category.

#### HYDE Type Inference & Two-Step Potency Gate

The intent model applies two independent, orthogonal systems when extracting filters:

**HYDE (Hypothetical Document Expansion) — Type Inference**

Effect words automatically infer strain type. This runs ONLY on effect words:
- Sativa-indicating: `uplifting`, `energizing`, `energized`, `creative`, `focused`, `clear-mind`, `inspired`, `alert`, `daytime` → adds `type: ["sativa", "sativa-hybrid"]`
- Indica-indicating: `relaxing`, `sleepy`, `calm`, `sedative`, `heavy`, `couch-lock` → adds `type: ["indica", "indica-hybrid"]`

**Potency words are explicitly excluded from HYDE.** "Very potent prerolls" does NOT trigger type inference — `potent` is a potency descriptor, not an effect. An explicit exclusion block in the prompt prevents this hallucination.

**Two-Step Potency Gate — THC Range Extraction**

Potency words trigger THC range filters, but only when a category is present to scope the scale:
- **Step 1 (Hard Trigger):** Exact potency words (`strong`, `potent`, `very strong`, `most potent`, `mild`, etc.) or numeric values (`28%`, `5mg`) must be present. Effect words like "uplifting" and superlatives on effects ("most uplifting") do NOT pass this gate.
- **Step 2 (Scale Application):** Category-specific potency scale maps the word to min/max values. `"strong flower"` → `thc_percentage_min: 22`. `"strong edibles"` → `thc_per_unit_mg_min: 10`. Without a category, no THC filter is emitted.

**The two gates are orthogonal:**

| Query | HYDE fires? | Potency Gate fires? | Result |
|-------|-------------|---------------------|--------|
| `strong sleepy indica concentrates` | Yes (sleepy) | Yes (strong) | type + THC + effects |
| `very potent prerolls` | No | Yes (very potent) | THC only |
| `most uplifting vapes` | Yes (uplifting) | No (superlative on effect) | type + effects, no THC |
| `energizing flower` | Yes (energizing) | No | type + effects, no THC |
| `5mg gummies` | No | Yes (5mg) | THC only |

### 3. **Frontend Widget (`client/src/Widget.svelte`)**
- **Technology**: Svelte 5 (runes) + TypeScript + Vite
- **Purpose**: Lightweight, embeddable chat widget
- **Key Features**:
  - Floating bubble launcher
  - Responsive chat interface
  - Rich product cards displayed inline in the correct message
  - Recommendations preserved in message history (order maintained)
  - localStorage persistence for entire conversation
  - Environment-aware (VITE_ variables for API URL and store name)
  - Built as static `widget.js` for easy embedding
- **Embed Method**:
  ```html
  <script type="module" src="https://your-domain.com/widget.js" data-api="https://api..." data-store="cannavita"></script>
  ```
- **Current State**: Functional with basic UI implementation
- **Planned Improvement**: Migrating to use Component Library Chat Components for production-grade UI
- **Import Pattern**: Direct imports from `Svelte-Component-Library/src/lib/custom/` (tree-shaking safe, Storybook files excluded)
- **Product Question Flow**: Two-phase lookup for handling product-related questions
- **Status**: Functional, but work needed to be production UI

#### Product Question Flow (Frontend)

When the intent is `"product-question"`, the widget uses a two-phase lookup:

**Phase 1: Frontend Fuzzy Matching**
```
1. Extract product_query from intent response
2. Fuzzy match against conversation history (recommended products)
3. If high confidence (>0.7): Stream with full product context
4. If low confidence: Stream follow-up question ("Do you mean [product name]?")
5. If no match: Proceed to Phase 2
```

**Phase 2: Backend Semantic Search**
```
1. Call /chat/product-lookup with product_query
2. If high confidence (>0.7): Stream with product context
3. If low/medium confidence: Stream follow-up question with suggested names
4. If no match: Offer to search for recommendations
```

**Key Functions**:
- `fuzzyFindProduct()`: Word-based matching against recommended products in history
- `handleProductQuestion()`: Orchestrates the two-phase lookup
- `streamWithProductContext()`: Calls stream API with product data
- `streamFollowUp()`: Calls stream API with clarification context

**Design Philosophy**: Prefer follow-up questions over auto-search for ambiguous queries to:
- Avoid LLM hallucination risks
- Build natural conversation (user feels heard)
- Reduce unnecessary API calls

### CSS Best Practices
- **NEVER use `!important`** - Fix CSS specificity issues properly instead
- **NEVER create classes just to add `!important`** - This is a code smell indicating a deeper CSS architecture problem
- Use CSS variables, proper specificity, and `color: inherit` to solve styling conflicts
- If styles are being overridden, investigate the root cause (global styles, specificity, inheritance) rather than forcing with `!important`

### 4. **Component Library (`Svelte-Component-Library/`)**
- **Technology**: Svelte 5 (runes) + TypeScript + Storybook
- **Purpose**: Reusable UI component library for building production-ready chat interfaces
- **Key Features**:
  - Complete Chat Components suite (ChatWidget, ChatMessage, ChatBubble, ChatInput, ChatLoader, ChatWindow, TypingIndicator)
  - Product display components (ProductCard, ProductGrid, ProductList, ProductRecommendation)
  - Form components (Button, Input, Checkbox)
  - All components use Svelte 5 runes syntax
  - Storybook documentation for all components
- **Integration**: Components are imported directly from the library into `client/src/Widget.svelte` for UI improvements
- **Repository**: Separate git repository (nested), managed independently
- **Status**: Ready for integration into client widget

#### ⚠️ **CRITICAL: ChatInput Mobile Fix - DO NOT MODIFY**

**The Problem We Solved:**
The ChatInput component had a persistent bug on mobile where the input field wouldn't respond to the first tap when the chat widget initially opened. This required multiple taps or typing attempts before becoming interactive.

**Root Causes (Multiple Issues Combined):**
1. **Backdrop-filter GPU Delay** - `backdrop-filter: blur(20px)` caused mobile browsers to delay GPU compositing, making the element unresponsive during initial render
2. **Wrong Input Element** - Using `<textarea>` for single-line input added unnecessary mobile rendering complexity
3. **Pointer Events Blocking** - Parent wrapper inadvertently blocked touch events from reaching the input
4. **Vertical Alignment** - `align-items: flex-end` pushed text to bottom edge instead of centering
5. **Missing Touch Optimization** - No `touch-action: manipulation` allowed double-tap zoom delays

**The Solution (All Required - Don't Change Any):**

1. **Use `<input type="text">` for single-line, `<textarea>` only when expanded:**
```svelte
{#if !isExpanded}
  <input bind:this={inputRef} type="text" class="chat-input__field chat-input__field--input" ... />
{:else}
  <textarea bind:this={textareaRef} class="chat-input__field chat-input__field--expanded" ... />
{/if}
```

2. **NO backdrop-filter on container** (removed completely):
```css
.chat-input__container {
  /* ❌ NO backdrop-filter: blur(20px); */
  /* ❌ NO -webkit-backdrop-filter: blur(20px); */
}
```

3. **Pointer-events cascade** (critical for mobile touch):
```css
.chat-input__textarea-wrapper {
  pointer-events: none; /* Wrapper doesn't block */
}

.chat-input__textarea-wrapper > input,
.chat-input__textarea-wrapper > textarea {
  pointer-events: auto; /* Input receives all events */
}
```

4. **Vertical centering**:
```css
.chat-input__container {
  align-items: center; /* NOT flex-end */
}
```

5. **Mobile touch optimizations** (all required):
```css
.chat-input__field--input {
  touch-action: manipulation;
  pointer-events: auto !important;
  -webkit-tap-highlight-color: transparent;
  padding: 10px 12px 10px 0;
}

.chat-input__container {
  pointer-events: auto;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.chat-input {
  z-index: 1;
  isolation: isolate;
}
```

**⚠️ WARNING:**
- **DO NOT add backdrop-filter back** - it breaks mobile tap detection
- **DO NOT change pointer-events** - the cascade is intentional and critical
- **DO NOT switch back to textarea-only** - input element is required for mobile
- **DO NOT modify touch-action** - prevents double-tap zoom delays
- **DO NOT change align-items to flex-end** - breaks vertical centering

This fix took multiple attempts to solve. Respect the solution and don't modify these specific CSS properties and HTML structure without extensive mobile testing.

## Current Project State

- **Streaming**: Good — no cutoffs, instant first token
- **Recommendations**: Appear in conversation, preserved in order, but poor UI and sometimes empty bubbles are showing
- **Context Memory**: Agent remembers and references past recommendations naturally
- **Persistence**: Full chat (text + recommendations) survives refresh
- **Intent Detection**: Three intents (recommendation, product-question, general) — accurate and fast
- **Product Questions**: Users can ask detailed questions about recommended products without re-triggering recommendations
- **UX**: Warm, human-like, engaging — but work left to do making it look amazing, looks very basic
- **UI Improvements**: In progress — migrating to Component Library Chat Components for production-grade interface

## Technology Decisions

| Component       | Choice                          | Reason |
|-----------------|----------------------------------|--------|
| Frontend        | Svelte 5 + TypeScript + Vite     | Lightweight, reactive, ideal for embeddable widgets |
| Backend         | Hono + Cloudflare Workers        | Edge-fast, free tier, seamless with Vectorize |
| Vector DB       | Cloudflare Vectorize             | Zero-ops, integrated with Workers AI |
| Embeddings      | Cloudflare Workers AI            | Free, fast, no external calls |
| LLM             | Groq Llama 3.3 70B (stream) / Cerebras qwen-3-32b (intent, rerank) | Multi-provider: streaming speed + structured extraction reliability |
| Persistence     | localStorage                     | Simple, private, offline-safe |

## Development Rules

### Critical Rules
- **Never use `setTimeout` for UI logic** — No setTimeout for scroll, layout, focus, or animation timing. It is a hack that papers over root-cause issues. Use `requestAnimationFrame` (frame-sync), reactive `$effect`, or CSS transitions instead. The only acceptable use of setTimeout is inside network/retry logic.
- **Never use `Promise` for UI logic** — Promises are for API fetching only. Do not wrap UI operations (scroll, focus, DOM reads) in Promises or async/await.
- **Never break streaming** — always use buffer-based SSE parsing with `split("\n\n")` and incomplete chunk handling
- **Never send `recommendations` array to LLM** — always strip the `recommendations` field from messages before sending to Groq/OpenAI (it breaks the API)
- **Never recommend products in general chat** — product recommendations are only triggered when intent = "recommendation"
- **Never use injection hacks** — keep conversational text and structured recommendation data completely separate (no <recs> tags in stream)
- **Always enrich history for context** — when a message has recommendations, include a natural summary in the conversation history sent to the LLM (e.g., "I recommended: Gelato Cake, Granddaddy Purple.")
- **Always maintain correct message order** — recommendations must appear in the exact conversation position where they were made (as part of the same assistant message)
- **Never filter `effects` or `flavor` via metadata filters** — Vectorize doesn't support array element filtering. These fields are stored as arrays in metadata but must be handled via semantic search + LLM re-ranking instead
- **Always pass filters and semantic_search from `/intent` to `/recommendations`** — The intent endpoint extracts structured filters and semantic search query that must be passed to the recommendations endpoint for optimal results
- **Handle product-question intent correctly** — When intent is "product-question", do NOT call `/recommendations`. Instead use two-phase lookup: (1) fuzzy match in frontend conversation history, (2) fallback to `/product-lookup` semantic search. Pass full product context to `/stream` when found.

### Accessibility Initiative (Mandatory)
- **WCAG 2.1 AA is required** for widget UI releases.
- **Do not regress accessibility foundations**:
  - Chat log/live announcements for assistive tech
  - Dialog semantics for side panels (`role="dialog"`, focus trap, Escape close, focus restore)
  - Keyboard operation for all custom controls (including custom dropdowns)
  - Visible focus indicators on interactive elements
  - Reduced-motion support via `prefers-reduced-motion`
- **Feedback states must be announced** with assistive-friendly status/alert semantics.
- **Any UI change must include an accessibility verification pass** (keyboard + screen reader + reduced motion + reflow).

### Prompt Engineering Philosophy
- **Examine root causes, don't bloat context** — When a prompt isn't working, analyze WHY it fails before adding more text. Modify existing instructions slightly rather than adding many new examples.
- **New examples only when absolutely necessary** — Most prompt improvements should clarify existing instructions, not add more bulk. New examples only if the issue can't be fixed by refining current text.
- **Safety over accuracy for THC extraction** — Better to NOT extract `thc_percentage_min/max` when uncertain than to accidentally add it. Hallucinating THC filters is MORE dangerous now that we've raised potency limits (32% for "strongest" vs 28%). Recommending too-strong products is worse than omitting THC filters.
- **Effect superlatives ≠ Potency superlatives** — "Most uplifting" = strongest EFFECT (no THC), "Most potent" = highest THC. This distinction is critical and must be preserved.

### Component Library Integration Rules
- **Import patterns** — Always import directly from `.svelte` files (e.g., `import ChatWidget from '../Svelte-Component-Library/src/lib/custom/ChatWidget/ChatWidget.svelte'`), never import `.stories.ts` files
- **Tree-shaking** — Vite automatically excludes Storybook files and unused components from the build, so only imported components are bundled
- **Separate repository** — Component Library is a nested git repository, managed independently
- **Component modifications** — When modifying Component Library components, commit changes in that repo separately (cd into `Svelte-Component-Library/` and commit there)
- **Component usage** — Use Component Library Chat Components (ChatWidget, ChatMessage, ChatBubble, etc.) to replace basic UI in `client/src/Widget.svelte`

### Development Workflow
1. **Develop locally first** — use `wrangler dev` for backend, `npm run dev` for widget
2. **Test streaming + recommendations thoroughly** — verify no cutoffs, correct order, persistence across refresh
3. **Update widget embed URL only after deploy** — never point production embeds to localhost
4. **Vectorize new/changed products** — run `vectorize.py` whenever inventory updates
5. **Use VITE_ environment variables** — all URLs, store names, and secrets must come from `import.meta.env.VITE_*`
6. **Commit small and often** — one feature or fix per commit for clear history
7. **Wait for explicit instruction** — do not add new features or components without clear approval

### Development Workflow - Feature Building
1. **Plan the feature** — think step-by-step about what will change (new props, state, UI, API calls, files)
2. **Propose the plan** — describe the minimal changes needed and the expected outcome
3. **Get approval** — wait for explicit "yes, proceed" before writing any code
4. **Deliver smallest workable chunk** — implement only one focused change (e.g., one component, one route, one fix)
5. **Modify only necessary files** — touch the minimum number of files required
6. **Update tests/stories if applicable** — add or adjust Storybook stories for new variants
7. **Verify locally** — test streaming, recommendations, persistence, and responsiveness
8. **Propose Changes** — one logical change = one commit with clear message
9. **We will discuss fixes and changes while in review** — be ready to apply feedback on specific chunks of code instead of reworking solution
10. **STOP** — wait for next instruction or approval before continuing

### Multi-Chunk Feature Development
1. **Plan** the entire feature and break it into smallest independent chunks
2. **Get approval** for the overall plan and first chunk
3. **Implement one chunk at a time** following steps 4–9 above
4. **Never implement unapproved features** — even if they seem related or obvious
5. **Always ask** if direction is unclear: "Should I proceed with [specific chunk]?"

**Development Philosophy - Choose the best solution for each task:**
- When refactoring or clarifying data pipelines, be mindful of whether the best solution is:
  - Updating prompts to instruct the LLM (when it improves an existing prompt or the LLM is already used for similar tasks)
  - Refactoring existing functions/methods (when logic is better handled in code)
  - Creating new functions (as a last resort, when neither of the above makes sense)
- Example: Effects mapping in the intent API makes sense to handle via LLM because:
  - The intent API already uses LLM for extraction and normalization
  - It improves the prompt's capability
  - It's a similar task to what the LLM is already doing
- Schema files should hold canonical data lists (like CANONICAL_EFFECTS), not transformation logic
- Transformation logic belongs in prompts when the LLM is already handling similar tasks, or in code when deterministic logic is needed

### Storybook Story Format Guidelines
**For all new components:** Use `args` format directly without `render` function when possible.

```typescript
// ✅ Preferred format
export const MyStory: Story = {
  args: {
    expanded: false,
    showScrollButton: true,
  },
};

// ✅ Acceptable: Use args with render when needed
export const WithCustomContent: Story = {
  args: {
    expanded: false,
    showScrollButton: true,
  },
  render: (args) => ({
    Component: ChatWindow as any,
    props: args,
  })
};

// ❌ Avoid: Render function without args (only use for complex wrapper components)
export const ComplexDemo: Story = {
  render: () => ({
    Component: ComplexWrapperComponent as any,
  })
};
```

**Rule:** Always use the `args` format when possible. Only use `render` functions for complex wrapper components that need custom logic or multiple component interactions.

**Component Props Indentation:** When writing component props in Svelte files, always indent props with one tab (2 spaces) from the component tag. Each prop should be on its own line.

```svelte
<!-- ✅ Correct indentation -->
<ChatWindow
  expanded={false}
  showScrollButton={true}
  hasMessages={true}
  clearButtonIcon="trash"
>

<!-- ❌ Incorrect: Props aligned to left -->
<ChatWindow
expanded={false}
showScrollButton={true}
hasMessages={true}
clearButtonIcon="trash"
>

<!-- ❌ Incorrect: All props on one line (unless very short) -->
<ChatWindow expanded={false} showScrollButton={true} hasMessages={true} clearButtonIcon="trash">
```

## Context Management

### Focusing Claude on Specific Areas

The project uses `.claude/settings.json` to control which files Claude can access. This reduces token usage and helps Claude focus on relevant code.

**Default configuration** (team settings):
- ✅ `client/src/` - Frontend widget
- ✅ `Svelte-Component-Library/src/` - UI components
- ✅ Documentation files (README.md, CLAUDE.md)
- ❌ `backend/` - Backend API (excluded)
- ❌ `vectorizer/` - Python scripts (excluded)
- ❌ `node_modules/` - Dependencies (excluded)

### Switching Work Context

To switch focus areas:

1. **Copy the template:**
   ```bash
   cp .claude/settings.local.json.example .claude/settings.local.json
   ```

2. **Choose a preset** from the example file and copy its `deny` array to `permissions.deny`

3. **Restart Claude Code** to apply changes

**Available presets:**
- **UI Focus** (default) - Client + Component Library
- **Backend Focus** - Backend API only
- **Vectorizer Focus** - Python scripts only
- **Full Access** - All areas (use sparingly)

**Example - Switch to backend work:**
```json
{
  "permissions": {
    "deny": [
      "Read(./Svelte-Component-Library/**)",
      "Read(./client/**)",
      "Read(./vectorizer/**)",
      "Read(./node_modules/**)"
    ]
  }
}
```

### Why This Matters

- **Token efficiency**: Excluding irrelevant code reduces context usage by 60-70%
- **Focus**: Claude only sees code relevant to your current task
- **Safety**: Prevents accidental modifications to areas you're not working on
- **Team harmony**: Personal overrides don't affect team defaults

---
**Follow these rules strictly — they ensure clean, testable, and maintainable progress.**
