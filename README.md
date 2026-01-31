# AI Budtender Widget

## Description

This project is an embeddable AI shopping assistant widget for dispensaries. The widget provides an intelligent budtender experience, handling general inquiries (hours, location, policies) and product recommendations via RAG (Retrieval-Augmented Generation). It streams natural conversations and displays rich product cards inline. During chat Agentic AI can interpet the intent of the request and trigger recommendation if needed.

The project consists of three microservices:
- **Vectorizer**: Python script to embed and upload product data to a vector database.
- **Backend**: TypeScript API (Hono on Cloudflare Workers) for intent classification, streaming chat, and recommendations.
- **Client**: Svelte 5 widget for the UI, embeddable via a script tag.

## Prerequisites

- **Node.js** (v20+): For client and backend.
- **Python** (3.10+): For vectorizer.
- **Accounts/Keys**:
  - Cloudflare (for Workers, Vectorize, AI).
  - Groq API key (for LLM).
- **Tools**: Git, npm/pnpm, pip.

## Installation

### Install Dependencies

### Vectorizer

```bash
cd vectorizer
pip install -r requirements.txt  # (create requirements.txt with langchain-cloudflare, sentence-transformers, etc.)
# Load .env with Cloudflare/Groq keys
```

### Backend

```bash
cd backend
npm install  # or pnpm install (installs Hono, LangChain, etc.)
```

### Client
```bash
cd client
npm install  # or pnpm install (installs Svelte, Vite)
```

## Data Schema & Transformation Pipeline

The project uses a canonical data schema defined in `backend/src/schema.json` and `backend/src/schema.ts` to ensure consistency across data ingestion, storage, and retrieval.

### Schema Structure

**Categories** (8 total):
```
flower, prerolls, edibles, concentrates, vaporizers, cbd, topicals, accessories
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
The vectorizer is an ETL pipeline that fetches products from Dutchie API, transforms them using category-specific logic, and uploads embeddings to Cloudflare Vectorize. It uses the canonical schema (`vectorizer/src/schema.json`) as the source of truth.

**Architecture**: Fetch (Dutchie API) → Transform (`normalize_products.py`) → Embed (Workers AI) → Upload (Vectorize)

**Key Scripts**:
- `vectorize.py` - Main pipeline orchestrator
- `normalize_products.py` - 200+ lines of transformation logic (THC extraction, weight parsing, effects mapping, etc.)
- `manage_indexes.py` - Index lifecycle management (create, delete, list)
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
python3 -m venv
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

# Sync all gummy types x all strains
./preset_sync.sh gummies-all EDIBLES products-prod 15

# Sync gummies INDICA only
./preset_sync.sh gummies-indica EDIBLES products-prod 20
```

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
```

**Update backend wrangler.toml**:

```toml
[[vectorize]]
binding = "VECTORIZE_INDEX"
index_name = "products-prod"  # Update to your index name
```

## Backend Workflow (API)
The backend handles intent classification, streaming chat, and recommendations.

Run Locally:

```bash
cd backend
npx wrangler dev --remote
```

## Client Workflow (Svelte App compiled into JS script widget)

The client compiles Svelte app into JavaScript Widget placed in html.

Run Locally:

```bash
cd client
# after changes
npm run build
npm run dev
```

```html
<script
  type="module"
  src="https://your-cdn.com/widget.js"
  data-api="https://your-api.com/chat"
  data-store="cannavita"
></script>
```

Compiles everything to static files in dist/.
The key file is dist/widget.js (plus CSS if any).

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