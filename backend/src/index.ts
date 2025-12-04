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
// import { groq } from '@ai-sdk/groq';
// import { streamText } from 'ai';
import { generatePrompt } from "./prompt";
import { MODEL_PROVIDER, LLM_PROVIDER, STORE_NAME, AGENT_ROLE } from "./types-and-constants";
import { formatConversationHistory } from "./utils"

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

  const LLM = LLM_PROVIDER.GROQ;
  let API_KEY: string | undefined = "";
  let BASE_URL: string | undefined = "";
  // @ts-ignore
  if(LLM === LLM_PROVIDER.CEREBRAS) {
    API_KEY = c.env.CEREBRAS_API_KEY;
    BASE_URL = 'https://api.cerebras.ai/v1';

  } else if (LLM === LLM_PROVIDER.GROQ) {
    API_KEY = c.env.GROQ_API_KEY;
    BASE_URL = 'https://api.groq.com/openai/v1';
  }

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

  const user_message = messages[messages.length - 1]?.content || '';

  let results;
  try {
    const embeddings = new CloudflareWorkersAIEmbeddings({
      binding: c.env.AI,
      model: "@cf/baai/bge-large-en-v1.5",
    });
    const storeVec = new CloudflareVectorizeStore(embeddings, {
    index: c.env.VECTORIZE_INDEX,
    });
    results = await storeVec.similaritySearch(user_message, 8);
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
    
  console.log("Products Stringified Context", productsContext);
  console.log("Similarity Search Results", results);
  console.log("User Message", user_message);

  const lastMessagesForLLM = messages.slice(-15);
  const conversation_history = formatConversationHistory(lastMessagesForLLM);

  console.log("lastMessagesForLLM ", lastMessagesForLLM);
  console.log("conversation_history ", conversation_history);

  // Grok Suggested Template
  const PROMPT = generatePrompt(MODEL_PROVIDER.LLAMA, user_message, conversation_history, productsContext);
  console.log("PROMPT", PROMPT);

  const messagesForLLM = [
    { role: "system", content: PROMPT },
    ...lastMessagesForLLM,
  ];

  // console.log("PROMPT", PROMPT);

  // Cerebras models
  // const MODEL = "qwen-3-32b";
  // const MODEL = 'llama3.1-8b'
  // const MODEL =  'llama-3.3-70b'
  // const MODEL = 'gpt-oss-120b'
  // const MODEL = 'zai-glm-4.6'

  // Groq models
  const MODEL = 'llama-3.1-8b-instant'

  let response;
  // @ts-ignore
  if(LLM === LLM_PROVIDER.CEREBRAS) {
      try {
      response = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: messagesForLLM,
          temperature: 0.3,
          max_tokens: 800,
          stream: true,
          // stream: false,
          // stop: ["<think>", "</think>", "<|im_end|>"], // Add this line
        })
      });

      console.log("response ", response.body);

      if (!response.ok) {
        const err = await response.text();
        console.error("Cerebras error:", err);
        return c.json({ error: "AI temporarily unavailable" }, 503);
      }

    } catch (err) {
      console.error("LLM call failed:", err);
      return c.json({ error: "AI temporarily unavailable" }, 503);
    }
  } else if (LLM === LLM_PROVIDER.GROQ) {
    try { 
        response = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`, 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: messagesForLLM,
          temperature: 0.3,
          max_tokens: 800,
          stream: true, 
        })
      });

      if (!response.ok) {
        const err = await response.text();
        console.error("Groq error:", err);
        return c.json({ error: `Groq AI temporarily unavailable: ${err}` }, 503);
      }
    } catch (err) {
      console.error("LLM call failed:", err);
      return c.json({ error: "AI temporarily unavailable" }, 503);
    }
  }
  if(response) {
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        "Access-Control-Allow-Origin": "*",
      }
    });
  }

});

export default app;