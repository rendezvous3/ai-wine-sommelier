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

## Workflows

### Vectorizer Workflow (Embed & Upload Products)
The vectorizer is a one-time or periodic script to prepare product data for RAG.

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


Embedding Process - Create Index (Create a Vector DB Table)

STEP 1

```python
vectorize_index_name = "products-demo-2"

# ONLY RUN ONCE INITIALLY to create the Vector DB Table
cfVect.create_index(index_name=vectorize_index_name, wait=True)
```

STEP 2

We must Create metadata indexes in order to be able to filter metadata

```bash

npx wrangler vectorize create-metadata-index products-demo-3 --property-name=category --type=string
npx wrangler vectorize create-metadata-index products-demo-3 --property-name=type --type=string
npx wrangler vectorize create-metadata-index products-demo-3 --property-name=brand --type=string
npx wrangler vectorize create-metadata-index products-demo-3 --property-name=subcategory --type=string
npx wrangler vectorize create-metadata-index products-demo-3 --property-name=effects --type=string
npx wrangler vectorize create-metadata-index products-demo-3 --property-name=flavor --type=string
npx wrangler vectorize create-metadata-index products-demo-3 --property-name=price --type=number
npx wrangler vectorize create-metadata-index products-demo-3 --property-name=thc_percentage --type=number
npx wrangler vectorize create-metadata-index products-demo-3 --property-name=cbd_percentage --type=number
npx wrangler vectorize create-metadata-index products-demo-3 --property-name=total_weight_grams --type=number
npx wrangler vectorize create-metadata-index products-demo-3 --property-name=pack_count --type=number
npx wrangler vectorize create-metadata-index products-demo-3 --property-name=inStock --type=boolean

```

Import products and prepare documents with Document
do not specify an id in metadata

STEP 3

```python
from langchain_core.documents import Document

with open("dummy_products.json", "r") as f:
  products = json.load(f)

  documents = [
  Document(
      page_content=f"{p['name']}. {p['description']}. Effects: {', '.join(p['effects'])}. Flavor: {', '.join(p['flavor'])}",
      metadata={
          # "id": p["id"],
          "name": p["name"],
          "category": p["category"],
          "type": p["type"],
          "brand": p["brand"],
          "effects": ", ".join(p["effects"]),
          "flavor": ", ".join(p["flavor"]),
      },
  )
  for p in products
]
```

STEP 4 - cfVect.add_documents (needs ids)

Run 

```python
  ids = [p["id"] for p in products]
  r = cfVect.add_documents(index_name=vectorize_index_name, documents=documents, ids=ids)
```

STEP 7 - Ensure that in Cloudflare dashboard (May need a few minutes)
Storage & databases
Vectorize -> Stored Vectores is updated

STEP 5

wrangler.toml

```bash
name = "ecom-chat-backend"
main = "src/index.ts"
compatibility_date = "2025-11-24"

[vars]
# These will be overridden by .env in dev, and by Cloudflare dashboard in prod
CEREBRAS_API_KEY = "replace-me-in-dashboard"

[[vectorize]]
binding = "VECTORIZE_INDEX"

## UDPATE the index name
index_name = "products-demo-2"

[ai]
binding = "AI"

```

Prepare Data: Edit dummy_products.json with real products (or integrate e-commerce API later).

This embeds products using Cloudflare Workers AI (@cf/baai/bge-large-en-v1.5).
Upserts vectors into the Cloudflare Vectorize index.
First run: Uncomment cfVect.create_index() to create the index.
Subsequent runs: Keep it commented to avoid recreating.

Check console output for success messages.
Verify in Cloudflare dashboard → Vectorize → your index → query a few vectors.
Comment out create_index after first successful run.

Run Locally:

```bash
cd vectorizer
python vectorize.py
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