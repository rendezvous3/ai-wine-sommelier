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

### Clone the Repository
```bash
git clone <your-repo-url>
cd cannavita-ai-budtender
```

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

Prepare Data: Edit dummy_products.json with real products (or integrate e-commerce API later).
Run Locally:

```bash
cd vectorizer
python vectorize.py
```

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

This embeds products using Cloudflare Workers AI (@cf/baai/bge-large-en-v1.5).
Upserts vectors into the Cloudflare Vectorize index.
First run: Uncomment cfVect.create_index() to create the index.
Subsequent runs: Keep it commented to avoid recreating.

Check console output for success messages.
Verify in Cloudflare dashboard → Vectorize → your index → query a few vectors.
Comment out create_index after first successful run.

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