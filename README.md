# AI Budtender Widget

## Description

This project is a production-grade, embeddable AI shopping assistant widget for Cannavita Dispensary, a premium cannabis store in Astoria, Queens, NY. The widget provides an intelligent budtender experience, handling general inquiries (hours, location, policies) and product recommendations via RAG (Retrieval-Augmented Generation). It streams natural conversations and displays rich product cards inline.

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

```bash
cd vectorizer
pip install -r requirements.txt  # (create requirements.txt with langchain-cloudflare, sentence-transformers, etc.)
# Load .env with Cloudflare/Groq keys
```
