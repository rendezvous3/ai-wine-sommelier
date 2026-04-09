# Wine Sommelier AI Chat Widget

## Local Terminal Note

On this Mac, `node`, `npm`, `npx`, and `wrangler` may be missing in a fresh terminal until `nvm` is activated. Before running any Node/Wrangler command in a new terminal, run:

```bash
nvm use --lts
```

## Project Overview

This is a POC embeddable AI wine recommendation chatbot. The widget delivers a sommelier-like experience:
- Answers general questions about wine
- Detects when the customer wants wine recommendations
- Streams natural, warm conversation
- Displays rich wine product cards inline when recommendations are made
- Remembers past recommendations and references them naturally
- Persists entire chat (including recommendations) across page refreshes via localStorage

The system is built as **three components**:

1. **Backend API** (`backend/`) — Hono + Cloudflare Workers
2. **Frontend Widget** (`client/`) — Svelte 5 embeddable chat widget
3. **Component Library** (`Svelte-Component-Library/`) — Reusable UI components

**No vectorization.** All product search is metadata-first via D1 SQL queries. No embeddings, no similarity scores, no HYDE inference.

## Model Catalog Maintenance

- Last reviewed: March 20, 2026
- Fast-model constants updated on this date:
  - OpenAI `gpt-5-mini` replaces `gpt-4o-mini`
  - Google `gemini-2.5-flash-lite` was added to the backend model registry
- Periodically re-check official OpenAI, Google Gemini, xAI, and Groq model catalogs.
- When backend model constants change, update `backend/src/types-and-constants.ts`.

## Architecture

### Infrastructure

- **1 Cloudflare Worker** (`wine-chat-backend`) — single wrangler.toml
- **1 D1 database** (`wine-catalog`) — the wine catalog
- **No cron jobs** — no vectorizer = no scheduled sync
- **No QA/prod split** — single deployment lane
- **No Vectorize binding** — no vector DB
- **No Workers AI binding** — no embedding model

### Profile System

`PROFILE_TYPE` env var selects runtime behavior:
- **Brand Concierge** (`brand_concierge`) — constrains all queries to a single winery's catalog
- **Merchant Advisor** (`merchant_advisor`) — searches across all brands (default)

Config lives in `backend/src/profiles/`.

### Backend API (`backend/src/index.ts`)

**Technology**: TypeScript + Hono + Cloudflare Workers

**Routes**:
- `/chat/stream` — SSE streaming conversation (sommelier persona). Emits CODEX cues to trigger intent.
- `/chat/intent` — Structured wine filter extraction from conversation. Extracts wine_type, body, flavor_profile, occasion, price, etc.
- `/chat/recommendations` — Wine search via D1 SQL + optional LLM re-ranking (fires only when >3 results).
- `/chat/product-lookup` — Name-based wine search. Confidence by result count (1=confident, 2-3=clarify, 0=not found).
- `/feedback` — User feedback collection.

**Bindings**:
```typescript
interface Bindings {
  CEREBRAS_API_KEY_PROD: string;
  GROQ_API_KEY?: string;
  GEMINI_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GROK_API_KEY?: string;
  RESEND_API_KEY: string;
  WINE_DB: D1Database;
  ANALYTICS_DB?: D1Database;
  PROFILE_TYPE?: string;
}
```

### Wine Search (`backend/src/wine-search.ts`)

Pure SQL search against D1. Three functions:
- `searchWines(db, filters)` — parameterized SQL with WHERE clauses for all wine dimensions
- `lookupWineByName(db, query, limit)` — LIKE-based name search
- `surpriseMe(db, filters, limit)` — random selection with optional partial filters

**Wine Filters**:
```typescript
interface WineFilters {
  wine_type?: string;
  varietal?: string;
  region?: string;
  body?: string;
  sweetness?: string;
  price_min?: number;
  price_max?: number;
  occasion?: string;
  brand?: string;
  flavor_profile?: string[];
}
```

### CODEX Cue System

The stream LLM emits trigger phrases when it detects a recommendation-ready query. The "2/3 rule" for wine: user provides 2 of:
1. Wine Style (red, white, sparkling, etc.)
2. Flavor/Taste preference (fruity, bold, earthy, etc.)
3. Body OR Occasion (full-bodied, dinner party, etc.)

Cue phrases:
- "I completely understand what you're looking for"
- "I'm pulling up wines that fit your criteria"
- "Checking our selection based on what you described"
- "Let me find the best matches"

### Prompt Architecture (`backend/src/prompts/`)

| File | Purpose |
|------|---------|
| `stream.ts` | Sommelier persona + CODEX cues |
| `intentWithCue.ts` | Wine filter extraction from CODEX summary |
| `intentNoCue.ts` | Backup intent extraction |
| `rerank.ts` | Wine re-ranking on metadata (no similarity scores) |

### Frontend Widget (`client/src/Widget.svelte`)

**Technology**: Svelte 5 (runes) + TypeScript + Vite

**Key Features**:
- CODEX cue detection → intent → recommendations flow
- 5-step guided flow (Wine Style → Occasion → Flavor Profile → Body → Price)
- "Surprise Me" options in guided flow steps
- Rich wine product cards with varietal/region/vintage, body/type badges
- localStorage persistence for entire conversation
- SSE streaming with buffered parsing

**Quick-start suggestions**: Bold Red, Crisp White, Date Night, Under $25, Sparkling, Surprise Me

### Component Library (`Svelte-Component-Library/`)

Reusable Svelte 5 components:
- **ProductCard** — Wine-specific: varietal/region/vintage subtitle, body/type badges, tasting notes
- **ProductRecommendation** — Multiple layouts (compact-list, compact-grid, bubble-grid, carousel) with wine badges
- **GuidedFlow** — Multi-step product discovery with single-select, multi-select, slider, price-selector
- **ChatWidget, ChatMessage, ChatBubble, ChatInput** — Chat UI primitives

### Wine Schema (`backend/src/wine-schema.ts`)

Domain constants and validation for wine dimensions:
- Wine types: red, white, rose, sparkling, dessert
- Body: light, medium, full
- Sweetness: dry, off-dry, sweet
- 8 flavor families: berry, citrus, tropical, chocolate, vanilla, pepper, floral, earthy
- Occasions: dinner-party, date-night, gift, casual, celebration, cooking

D1 schema at `backend/db/schema.sql`, seed data at `backend/db/seed.sql`.

## Development Rules

### Critical Rules
- **Never use `setTimeout` for UI logic** — Use `requestAnimationFrame`, reactive `$effect`, or CSS transitions instead. Only acceptable in network/retry logic.
- **Never break streaming** — always use buffer-based SSE parsing with `split("\n\n")` and incomplete chunk handling
- **Never send `recommendations` array to LLM** — always strip the `recommendations` field from messages before sending
- **Never recommend products in general chat** — only triggered when intent = "recommendation"
- **Always enrich history for context** — when a message has recommendations, include a natural summary in conversation history
- **Always maintain correct message order** — recommendations appear in the exact conversation position where they were made

### CSS Best Practices
- **NEVER use `!important`** — Fix CSS specificity issues properly instead
- Use CSS variables, proper specificity, and `color: inherit` to solve styling conflicts

### Accessibility (WCAG 2.1 AA Required)
- Chat log/live announcements for assistive tech
- Dialog semantics for side panels
- Keyboard operation for all custom controls
- Visible focus indicators
- Reduced-motion support via `prefers-reduced-motion`

### ChatInput Mobile Fix - DO NOT MODIFY

The ChatInput component has a carefully solved mobile tap-detection bug. Do not modify:
- Use `<input type="text">` for single-line (not textarea)
- No `backdrop-filter` on container
- Pointer-events cascade: wrapper `none`, input `auto`
- `align-items: center` (not `flex-end`)
- `touch-action: manipulation` on input and container

### Development Workflow
1. Plan the feature and propose minimal changes
2. Get approval before writing code
3. Implement one focused chunk at a time
4. Modify only necessary files
5. Verify locally (streaming, recommendations, persistence)
6. One logical change = one commit

### Component Library Integration
- Import directly from `.svelte` files, never `.stories.ts`
- Component Library is a nested git repo — commit changes there separately
- Vite tree-shakes unused components automatically

## Tech Stack

| Component | Choice | Reason |
|-----------|--------|--------|
| Frontend | Svelte 5 + TypeScript + Vite | Lightweight, reactive, ideal for embeddable widgets |
| Backend | Hono + Cloudflare Workers | Edge-fast, free tier |
| Database | Cloudflare D1 | Zero-ops SQLite, integrated with Workers |
| LLM | Multi-provider (Groq, Cerebras, Google, OpenAI, Grok) | Streaming speed + structured extraction reliability |
| Persistence | localStorage | Simple, private, offline-safe |
