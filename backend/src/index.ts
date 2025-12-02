import { Hono } from "hono";
import { cors } from 'hono/cors';
import type { Env } from 'hono/types';
import {
  CloudflareVectorizeStore,
  CloudflareWorkersAIEmbeddings
} from "@langchain/cloudflare";
import type {
  VectorizeIndex,
  Fetcher,
  Request,
  Ai,
  AiModels,
} from "@cloudflare/workers-types";

interface Bindings {
  CEREBRAS_API_KEY: string;
  GROQ_API_KEY?: string;     // optional
  VECTORIZE_INDEX: VectorizeIndex;
  AI: Ai<AiModels>;
}

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// app.options('/chat', c => c.text('', 204)) // Explicit OPTIONS is optional with cors()

app.options('/chat', () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }
  });
});

app.get('/', (c) => {
    return c.text('hello world')
});

app.post('/chat', async (c) => {

  const LLM_PROVIDER = 'cerebras';
    const API_KEY = LLM_PROVIDER === 'cerebras' 
    ? c.env.CEREBRAS_API_KEY 
    : c.env.GROQ_API_KEY ?? '';
  const BASE_URL = LLM_PROVIDER === 'cerebras'
    ? 'https://api.cerebras.ai/v1'
    : 'https://api.groq.com/openai/v1';

  if (!API_KEY) {
    return c.json({ error: "No LLM API key configured" }, 500);
  }

  let body;
  try {
    body = await c.req.json();
  } catch (err) {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const messages: any[] = body.messages || [];
  if (!messages.length || !messages[messages.length - 1]?.content?.trim()) {
    return c.json({ error: "No message provided" }, 400);
  }

  const userMessage = messages[messages.length - 1]?.content || '';

  let results;
  try {
    const embeddings = new CloudflareWorkersAIEmbeddings({
      binding: c.env.AI,
      model: "@cf/baai/bge-large-en-v1.5",
    });
    const storeVec = new CloudflareVectorizeStore(embeddings, {
    index: c.env.VECTORIZE_INDEX,
    });
    results = await storeVec.similaritySearch(userMessage, 8);
  } catch (err) {
    console.error("Vector search failed:", err);
    return c.json({ error: "Search temporarily unavailable" }, 503);
  }

  const productsContext = results
    .map((doc, i) => {
      const m = doc.metadata || {};
      return `${i + 1}. "${m.name || "Unknown Product"}" by ${m.brand || "Unknown Brand"}
    • Price: $${m.price || "???"}
    • Type: ${m.type || "???"}
    • Effects: ${m.effects || "???"}
    • Description: ${doc.pageContent.split(".")[0]}.`
    })
    .join("\n\n");
    
  console.log("productsContext", productsContext);
  console.log("results", results);
  console.log("user Message", userMessage);

  const PROMPT = `You are a dispensary budtender. ONLY recommend products from this exact list. 
          You MUST recommend at least 2–3 products from the list below when possible.
          Do not invent products. If nothing matches, say "I don't have anything that fits perfectly."

          Available products:
          ${productsContext}

          Use the real names, prices, and brands above. Be concise and helpful.` ;


  const messagesForLLM = [
    { role: "system", content: PROMPT },
    ...messages.slice(-10)
  ];

  let response;
  try {
    response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.1-8b',
        messages: messagesForLLM,
        temperature: 0.3,
        max_tokens: 800,
        stream: true
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Cerebras error:", err);
      return c.json({ error: "AI temporarily unavailable" }, 503);
    }

  } catch (err) {
    console.error("LLM call failed:", err);
    return c.json({ error: "AI temporarily unavailable" }, 503);
  }

  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      "Access-Control-Allow-Origin": "*",
    }
  });
});

export default app;