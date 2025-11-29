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
  const { messages } = await c.req.json();
  const userMessage = messages[messages.length - 1]?.content || '';

  if (!userMessage) {
      return c.json({ error: "No message provided" }, 400);
    }

  const LLM_PROVIDER = c.env.CEREBRAS_API_KEY ? 'cerebras' : 'groq';

//   console.log("LLM_PROVIDER", LLM_PROVIDER);   

  const embeddings = new CloudflareWorkersAIEmbeddings({
    binding: c.env.AI,
    model: "@cf/baai/bge-large-en-v1.5",
  });
  const store = new CloudflareVectorizeStore(embeddings, {
    index: c.env.VECTORIZE_INDEX,
  });

  const results = await store.similaritySearch(userMessage, 7);
  const context = results
    .map((doc, i) => {
      const m = doc.metadata || {};
      return `${i + 1}. "${m.name || "Unknown Product"}" by ${m.brand || "Unknown Brand"}
    • Price: $${m.price || "???"}
    • Type: ${m.type || "???"}
    • Effects: ${m.effects || "???"}
    • Description: ${doc.pageContent.split(".")[0]}.`
    })
    .join("\n\n");
    
  console.log("context", context);
  console.log("results", context);

  const API_KEY = LLM_PROVIDER === 'cerebras' 
    ? c.env.CEREBRAS_API_KEY 
    : c.env.GROQ_API_KEY ?? '';
  const BASE_URL = LLM_PROVIDER === 'cerebras'
    ? 'https://api.cerebras.ai/v1'
    : 'https://api.groq.com/openai/v1';

  if (!API_KEY) {
    return c.json({ error: "No LLM API key configured" }, 500);
  }

  console.log("user Message", userMessage);

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: LLM_PROVIDER === 'cerebras' 
        // ? 'llama-3.3-70b' 
        ? 'llama3.1-8b'
        : 'llama-3.1-70b-instant',
      messages: [
        { role: 'system', 
          content: `You are a dispensary budtender. ONLY recommend products from this exact list. 
          You MUST recommend at least 2–3 products from the list below when possible.
          Do not invent products. If nothing matches, say "I don't have anything that fits perfectly."

          Available products:
          ${context}

          Use the real names, prices, and brands above. Be concise and helpful.` },
        ...messages
      ],
      temperature: 0.3,
      stream: true
    })
  });

  // const response = {
  //   body: 'response body',
  // }

  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });


});

export default app;