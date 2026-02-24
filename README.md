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

## Development & Deployment

### Environment Configuration

The project uses environment-specific configuration files to manage API URLs and settings across local development and production environments.

#### Environment Files Structure

**Client** (`client/`):
- `.env.development` - Local development (points to localhost:8787)
- `.env.production` - Production deployment (points to deployed Cloudflare Worker)

```bash
# client/.env.development
VITE_API_URL=http://localhost:8787/chat
VITE_STORE_NAME=cannavita

# client/.env.production
VITE_API_URL=https://ecom-chat-backend.andresmeona.workers.dev/chat
VITE_STORE_NAME=cannavita
```

**Backend** (`backend/`):
- `.env` - Local secrets (API keys, tokens)
- `wrangler.toml` - Cloudflare Workers configuration

**Important**: All `.env.*` files are gitignored and not committed to the repository.

#### How Environment Variables Work

**Vite automatically switches .env files based on command**:

| Command | Mode | .env File Used | Result |
|---------|------|----------------|--------|
| `npm run dev` | development | `.env.development` | Uses localhost API |
| `npm run build` | production | `.env.production` | Bakes production API URL into `widget.js` |

**API URL Resolution Order** (in `client/src/main.ts`):
1. **Runtime override**: `data-api` attribute on script tag (highest priority)
2. **Compile-time**: `import.meta.env.VITE_API_URL` from .env file (baked into build)
3. **Fallback**: `http://localhost:8787/chat` (hardcoded default)

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
- ✅ **Production-like testing** - tests the exact widget that will be deployed
- ⚡ **Workflow**: Edit source → Build → Refresh browser

#### Full Local Development Workflow

Run backend and frontend together for complete local testing:

**Terminal 1 - Backend API**:
```bash
cd backend
npx wrangler dev --remote
```
**→ Runs backend on `http://localhost:8787`**
**→ Uses remote Cloudflare resources (Vectorize, Workers AI)**

**Terminal 2 - Frontend Widget**:
```bash
cd client

# Build widget after making changes
npm run build

# Start dev server (serves built widget)
npm run dev
```
**→ Builds source to `dist/widget.js` (uses `.env.development`)**
**→ Runs Vite dev server on `http://localhost:5173`**
**→ Serves `index.html` which loads `dist/widget.js`**

**Development Loop**:
1. Edit files in `client/src/` (Widget.svelte, etc.)
2. Run `npm run build` in Terminal 2
3. Refresh browser at `http://localhost:5173`
4. Repeat

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
- Uses environment variables from `backend/.env` and `wrangler.toml`

**Configuration** (`backend/wrangler.toml`):
```toml
name = "ecom-chat-backend"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[vectorize]]
binding = "VECTORIZE_INDEX"
index_name = "products-prod"

[vars]
# Public environment variables
```

**Deployed API URL**: `https://ecom-chat-backend.andresmeona.workers.dev/chat`

---

#### 2. Deploy Frontend Widget (Cloudflare Pages)

```bash
cd client

# Step 1: Build for production (uses .env.production)
npm run build

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
| **Local Dev** | `wrangler dev --remote` (localhost:8787) | `npm run build` + `npm run dev` (localhost:5173) | `http://localhost:8787/chat` |
| **Production** | `wrangler deploy` (Workers) | `wrangler pages deploy dist` (Pages) | `https://ecom-chat-backend.andresmeona.workers.dev/chat` |

---

### Deployment URLs

**Backend API**:
- Local: `http://localhost:8787/chat`
- Production: `https://ecom-chat-backend.andresmeona.workers.dev/chat`

**Frontend Widget**:
- Local: `http://localhost:5173` (dev server)
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
# Terminal 1 - Backend
cd backend
npx wrangler dev --remote

# Terminal 2 - Frontend
cd client
npm run build  # After making changes
npm run dev    # Start dev server
```

**Production Deployment**:
```bash
# Deploy Backend
cd backend
npx wrangler deploy

# Deploy Frontend
cd client
npm run build
npx wrangler pages deploy dist --project-name=cannavita-widget
```

**Build Only** (without deploying):
```bash
cd client
npm run build  # Outputs to dist/
```

---

### Development vs Production: Key Differences

| Aspect | Local Development | Production |
|--------|-------------------|------------|
| **Backend** | `wrangler dev --remote` (localhost:8787) | `wrangler deploy` (Cloudflare Workers) |
| **Frontend** | Built widget served by Vite dev server | Static widget.js hosted on Cloudflare Pages |
| **Widget Behavior** | Identical (tests production build) | Same as local (no surprises) |
| **API URL** | `http://localhost:8787/chat` | `https://ecom-chat-backend.andresmeona.workers.dev/chat` |
| **Environment File** | `.env.development` | `.env.production` |
| **Hot Reload** | ❌ No (requires `npm run build`) | ❌ No (static build) |
| **CORS** | Relaxed (same origin) | Configured in backend |
| **Vectorize** | Remote (production data) | Remote (production data) |
| **Workers AI** | Remote (Cloudflare models) | Remote (Cloudflare models) |

---

### Important Notes

1. **`dist/` folder is for deployment only**:
   - Created by `npm run build`
   - Contains production-ready files
   - Ignored by git (in `.gitignore`)
   - Cleared on each build (`emptyOutDir: true`)

2. **Widget loads built file even in dev mode**:
   - `index.html` points to `/dist/widget.js` (not source)
   - This tests production behavior locally
   - Requires manual rebuild after changes (no HMR)

3. **Environment variables are baked into build**:
   - `VITE_API_URL` from `.env.production` is compiled into `widget.js`
   - Can still override at runtime via `data-api` attribute

4. **Backend always uses remote resources**:
   - `--remote` flag connects to production Vectorize and Workers AI
   - Ensures consistent behavior between dev and production
   - No need to mock or emulate Cloudflare services locally

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