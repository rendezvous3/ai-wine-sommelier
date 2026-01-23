# Cannavita AI Budtender Widget

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

## Architecture & Components

### 1. **Vectorizer (`vectorizer/vectorize.py`)**
- **Technology**: Python + LangChain + Cloudflare Vectorize
- **Purpose**: Script to embed and upload the product catalog into the vector database
- **Key Features**:
  - Loads product data (JSON or future e-commerce sync)
  - Generates embeddings using Cloudflare Workers AI (`@cf/baai/bge-large-en-v1.5`)
  - Upserts into Cloudflare Vectorize index
  - Designed for one-time or periodic runs (local or CI/CD)
- **Status**: Ready for real product data

### 2. **Backend API (`backend/src/index.ts`)**
- **Technology**: TypeScript + Hono + Cloudflare Workers
- **Purpose**: Serverless API handling all business logic
- **Routes**:
  - `/chat/intent`: Structured intent extractor that classifies intent and extracts filters + semantic search query
  - `/chat/stream`: Streaming conversational agent (Maitre D role) using Groq Llama 3.3 70B
  - `/chat/recommendations`: Hybrid RAG-powered recommendation engine using Cloudflare Vectorize metadata filtering + semantic search + LLM re-ranking
- **Key Features**:
  - Zero first-token cutoffs (robust buffered SSE parsing)
  - Full context memory (remembers and references past recommendations)
  - Clean separation: general chat never recommends products
  - Structured intent extraction with metadata filters
  - Hybrid filtering approach: metadata filters for exact matches, semantic search + re-ranking for nuanced fields
  - CORS enabled for widget embedding
- **Status**: Production-ready, no streaming bugs, full context awareness, metadata filtering operational

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
  "intent": "recommendation" | "general",
  "filters": {
    "category": "flower" | "prerolls" | "edibles" | "concentrates" | "tincture" | "vaporizers" | null,
    "type": "indica" | "sativa" | "hybrid" | null,
    "thc_percentage_min": number | null,
    "thc_percentage_max": number | null,
    "subcategory": string | null,
    "effects": string[] | null,
    "flavor": string[] | null,
    "brand": string | null,
    "price_min": number | null,
    "price_max": number | null
  },
  "semantic_search": "3-5 keywords describing desired mood/effect/flavor"
}
```

**Key Features**:
- Uses last 7 messages for context
- Extracts structured filters from conversation history
- Generates semantic search query for nuanced preferences (mood, effects, flavors)
- Returns filters even when intent is "recommendation" (used by `/recommendations` endpoint)
- Robust JSON parsing with markdown stripping and fallback handling

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

3. **LLM Re-ranking**: Takes top 10 search results and re-ranks them using Groq Llama 3.3 70B for best overall match. The re-ranker evaluates:
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

#### RAG Architecture Flow & Debugging

**Flow:** `/intent` → UI → `/recommendations` → `validateAndExpandFilters` → Vector Search → Re-ranker → Results

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
- **Status**: Functional, but work needed to be production UI

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

## Current Project State

- **Streaming**: Good — no cutoffs, instant first token
- **Recommendations**: Appear in conversation, preserved in order, but poor UI and sometimes empty bubbles are showing
- **Context Memory**: Agent remembers and references past recommendations naturally
- **Persistence**: Full chat (text + recommendations) survives refresh
- **Intent Detection**: Accurate and fast
- **UX**: Warm, human-like, engaging — but work left to do making it look amazing, looks very basic
- **UI Improvements**: In progress — migrating to Component Library Chat Components for production-grade interface

## Technology Decisions

| Component       | Choice                          | Reason |
|-----------------|----------------------------------|--------|
| Frontend        | Svelte 5 + TypeScript + Vite     | Lightweight, reactive, ideal for embeddable widgets |
| Backend         | Hono + Cloudflare Workers        | Edge-fast, free tier, seamless with Vectorize |
| Vector DB       | Cloudflare Vectorize             | Zero-ops, integrated with Workers AI |
| Embeddings      | Cloudflare Workers AI            | Free, fast, no external calls |
| LLM             | Groq (Llama 3.3 70B + 8B)         | Best speed/quality for streaming |
| Persistence     | localStorage                     | Simple, private, offline-safe |

## Development Rules

### Critical Rules
- **Never break streaming** — always use buffer-based SSE parsing with `split("\n\n")` and incomplete chunk handling
- **Never send `recommendations` array to LLM** — always strip the `recommendations` field from messages before sending to Groq/OpenAI (it breaks the API)
- **Never recommend products in general chat** — product recommendations are only triggered when intent = "recommendation"
- **Never use injection hacks** — keep conversational text and structured recommendation data completely separate (no <recs> tags in stream)
- **Always enrich history for context** — when a message has recommendations, include a natural summary in the conversation history sent to the LLM (e.g., "I recommended: Gelato Cake, Granddaddy Purple.")
- **Always maintain correct message order** — recommendations must appear in the exact conversation position where they were made (as part of the same assistant message)
- **Never filter `effects` or `flavor` via metadata filters** — Vectorize doesn't support array element filtering. These fields are stored as arrays in metadata but must be handled via semantic search + LLM re-ranking instead
- **Always pass filters and semantic_search from `/intent` to `/recommendations`** — The intent endpoint extracts structured filters and semantic search query that must be passed to the recommendations endpoint for optimal results

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
