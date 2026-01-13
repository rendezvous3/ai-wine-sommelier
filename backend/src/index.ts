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
import { MODEL_PROVIDER, LLM_PROVIDER, STORE_NAME, AGENT_ROLE, AGENT_ROLE_MODEL } from "./types-and-constants";
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

app.post("/chat/decide", async (c) => {
  const body = await c.req.json();
  const messages = body.messages || [];
  const last = messages[messages.length - 1]?.content || "";

  const API_KEY = c.env.GROQ_API_KEY;
  const MODEL = AGENT_ROLE_MODEL.INTENT;

  const prompt = `
    You are an intent classifier for premium cannabis dispensary
    Be able to diffirentiate between Possible intents:
    - "general"   → normal conversation, business enguiry, location 
    - "recommendation" → product recommendations needed, 
    be mindful of effects and flavors, edibles, pre-rools, flowers
    - "recommendation examples" → need/looking for/give me
    something for/suggest/how about for/anything for/ sleep/going out/appetite/upity mood/party/staying up/celebrating

    Classify intent: return ONLY "recommendation" or "general"

    Examples:
    "best indica" → recommendation
    "what strains for sleep" → recommendation
    "what are your hours" → general
    "return policy" → general
    "something for anxiety" → recommendation
    "something to xyz"
    "something to keep me going"
    "something that xyz"
    "something that doesn't get me too drowsy"
    "something that states like xyz"
    "something of effect of xyz"

    User: "${last}"

    Respond with only the word.

    Return ONLY:
    {"intent": "general"} OR {"intent": "recommendation"}

    User says: "${last}"`;

  let text;
  try {
    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: prompt }],
      temperature: 0,
      max_tokens: 10,
      stream: false
    })
  });

  const data = await resp.json();
  text = data.choices?.[0]?.message?.content || "";

  } catch (err) {
    const formatError = `/decide api error: ${err}`;
    console.error(formatError);
    return c.json({ error: formatError }, 503);
    // return c.json({ intent: "general" });
  }



  try {
    const parsed = JSON.parse(text);
    return c.json(parsed);
  } catch (err) {
    return c.json({ intent: "general" });
  }
});

app.post("/chat/stream", async (c) => {
  const body = await c.req.json();
  const messages = body.messages || [];

  const API_KEY = c.env.GROQ_API_KEY;
  const MODEL = AGENT_ROLE_MODEL.STREAM;
  const BASE_URL = "https://api.groq.com/openai/v1";

  const lastMessages = messages.slice(-15);
  const enrichedHistory = lastMessages.map(msg => {
    if (msg.recommendations?.length > 0) {
      const names = msg.recommendations.map(p => p.name).join(", ");
      return {
        role: "assistant",
        content: `${msg.content}\n\nI recommended: ${names}.`
      };
    }
    return { role: msg.role, content: msg.content };
  });

  const conversation_history = formatConversationHistory(enrichedHistory);
  const user_message = enrichedHistory[enrichedHistory.length - 1]?.content || "";
  // const conversation_history = formatConversationHistory(lastMessages);
  // const user_message = lastMessages[lastMessages.length - 1]?.content || "";

  const prompt = generatePrompt(
    MODEL_PROVIDER.LLAMA,
    user_message,
    conversation_history,
    ""
  );

  // @ts-ignore
  const cleanMessages = lastMessages.map(msg => {
    const { recommendations, ...rest } = msg;
    return rest;
  });

  // const messagesForLLM = [
  //   { role: "system", content: "Hello." },
  //   { role: "system", content: prompt },
  //   ...lastMessages
  // ];

    const messagesForLLM = [
    { role: "system", content: "Hello." },
    { role: "system", content: prompt },
    ...cleanMessages
  ];

  let response;
  try {
  response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      messages: messagesForLLM,
      temperature: 0.1,
      max_tokens: 1200,
      stream: true
    })
  });

  } catch (err) {
    const formatError = `"Groq Stream Error: ${err}`
    console.error(formatError);
    return c.json({ error: formatError }, 503);
  }
  if(response) {
      return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*"
    }
  });
  }
});

app.post("/chat/recommendations", async (c) => {
  const body = await c.req.json();
  const messages = body.messages || [];
  // const user_message = messages[messages.length - 1]?.content || "";

  const lastMessages = messages.slice(-5);
  const enrichedHistory = lastMessages.map(msg => {
    if (msg.recommendations?.length > 0) {
      const names = msg.recommendations.map(p => p.name).join(", ");
      return {
        role: "assistant",
        content: `${msg.content}\n\nI recommended: ${names}.`
      };
    }
    return { role: msg.role, content: msg.content };
  });

  const conversation_history = formatConversationHistory(enrichedHistory);
  const user_message = enrichedHistory[enrichedHistory.length - 1]?.content || "";

  let searchResults;
  try {
    const embeddings = new CloudflareWorkersAIEmbeddings({
      binding: c.env.AI,
      model: "@cf/baai/bge-large-en-v1.5"
    });

    const store = new CloudflareVectorizeStore(embeddings, {
      index: c.env.VECTORIZE_INDEX
    });

    const enrichedQuery = `
    The most important segment is that if user is asking for category or subcategory, you should search for the products that match the category or subcategory.
    As an example if user has expressed desire for edibles, you should search for the products that are edibles.
    Equaly important is the desired effect. We can't recommend products that have the opposite effect.
    If desire is euphoria, energy, uplifted we should recommend products Sativa or Hybrid products with mentioned such effect.
    If the desire is relaxed, sleep, calm, we should recommend products Indica or Hybrid products with mentioned such effect.
    Conversation history: ${conversation_history}
    User message: ${user_message}
    `;
    // searchResults = await store.similaritySearch(user_message, 5);
    searchResults = await store.similaritySearch(enrichedQuery, 8);
  } catch (err) {
    console.error("Vector search error:", err);
    return c.json({ recommendations: [] }, 200);
  }

  const results = searchResults
  .map((doc, i) => { 
    return {
      ...doc.metadata,
    }
  })

  const API_KEY = c.env.GROQ_API_KEY;
  const MODEL = AGENT_ROLE_MODEL.RECCOMEND;

  const llmPrompt = `
    You are a recommendation engine.
    Your task is to filter out wrongly retrieved products from the similarity search results.
    The most important segment is that if user is asking for category or subcategory, you should search for the products that match the category or subcategory.
    As an example if user has expressed desire for edibles, you should search for the products that are edibles.
    Same for pre-rolls, flowers, concentrates, etc.

    Examples: 
    "I'm looking for some edibles." → Edibles. (NOT Pre-Rolls or Flowers or Concentrates or etc.)
    "I would like some Pre-Rolls and edibles with XYZ effect" → Pre-Rolls and Edibles. (NOT Flowers or Concentrates or etc.)
    "What are your strongest concentrate options?" → Concentrates. (NOT Pre-Rolls or Flowers or Edibles or etc.)

    Equaly important is the desired effect. We can't recommend products that have the opposite effect.

    If desire is euphoria, energy, uplifted we should recommend products Sativa or Hybrid products with mentioned such effect. Avoid Indica.
    these must not include effects like calm, relaxed, sleepy.

    Example: "I'm looking for something to keep me energetic and uplifted." → Sativa or Hybrid products with mentioned such effect. Avoid Indica.
    effects: euphoria, energy, uplifted (at least one of these) not sleepy

    If the desire is relaxed, sleep, calm, we should recommend products Indica or Hybrid products with mentioned such effect.
    these must not include effects like euphoria, energy, uplifted. Avoid Sativa.
    effects: calm, sleep, relaxed (at least one of these) not energized or uplifted

    if user has expressed desire for indica, you should search for the products that are indica.
    if user has expressed desire for sativa, you should search for the products that are sativa.
    if user has expressed desire for hybrid, you should search for the products that are hybrid.

    Filter out the products that don't match the user's desire. Return Valid JSON. Make no changes to result JSON schema.
    Just filter out the products not matching and return it as is

    Similarity search results:
    ${JSON.stringify(results)}

    Format:
    {
      "recommendations": [results[1], results[3], results[5], ...]
    }

    Conversation history:
    ${conversation_history}

    User message:
    "${user_message}"

    Return ONLY valid JSON. Do not wrap the response in markdown code blocks. Return raw JSON only.
    `;

  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: llmPrompt }],
      temperature: 0.1,
      max_tokens: 3000,
      stream: false
    })
  });

  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content || "";
  try {
    const parsed = JSON.parse(text);
    return c.json(parsed, 200);
  } catch (err) {
    console.error("Invalid JSON from LLM:", text);
    return c.json({ recommendations: [] }, 200);
  }
});

// app.post('/chat', async (c) => {

//   const LLM = LLM_PROVIDER.GROQ;
//   let API_KEY: string | undefined = "";
//   let BASE_URL: string | undefined = "";
//   // @ts-ignore
//   if(LLM === LLM_PROVIDER.CEREBRAS) {
//     API_KEY = c.env.CEREBRAS_API_KEY;
//     BASE_URL = 'https://api.cerebras.ai/v1';

//   } else if (LLM === LLM_PROVIDER.GROQ) {
//     API_KEY = c.env.GROQ_API_KEY;
//     BASE_URL = 'https://api.groq.com/openai/v1';
//   }

//   if (!API_KEY) {
//     return c.json({ error: "No LLM API key configured" }, 500);
//   }

//   let body;
//   try {
//     body = await c.req.json();
//   } catch (err) {
//     return c.json({ error: "Invalid JSON" }, 400);
//   }

//   const messages: any[] = body.messages || [];
//   if (!messages.length || !messages[messages.length - 1]?.content?.trim()) {
//     return c.json({ error: "No message provided" }, 400);
//   }

//   const user_message = messages[messages.length - 1]?.content || '';

//   let results;
//   try {
//     const embeddings = new CloudflareWorkersAIEmbeddings({
//       binding: c.env.AI,
//       model: "@cf/baai/bge-large-en-v1.5",
//     });
//     const storeVec = new CloudflareVectorizeStore(embeddings, {
//     index: c.env.VECTORIZE_INDEX,
//     });
//     results = await storeVec.similaritySearch(user_message, 8);
//   } catch (err) {
//     console.error("Vector search failed:", err);
//     return c.json({ error: "Search temporarily unavailable" }, 503);
//   }

//   const productsContext = results
//     .map((doc, i) => {
//       const m = doc.metadata || {};
//       return `${i + 1}. "${m.name || "Unknown Product"}" by ${m.brand || "Unknown Brand"}
//     • Price: $${m.price || "???"}
//     • Type: ${m.type || "???"}
//     • Effects: ${m.effects || "???"}
//     • Description: ${doc.pageContent.split(".")[0]}.`
//     })
//     .join("\n\n");
    

//   const lastMessagesForLLM = messages.slice(-15);
//   const conversation_history = formatConversationHistory(lastMessagesForLLM);


//   // Grok Suggested Template
//   const PROMPT = generatePrompt(MODEL_PROVIDER.LLAMA, user_message, conversation_history, productsContext);

//   const messagesForLLM = [
//     { role: "system", content: PROMPT },
//     ...lastMessagesForLLM,
//   ];


//   // Cerebras models
//   // const MODEL = "qwen-3-32b";
//   // const MODEL = 'llama3.1-8b'
//   // const MODEL =  'llama-3.3-70b'
//   // const MODEL = 'gpt-oss-120b'
//   // const MODEL = 'zai-glm-4.6'

//   // Groq models
//   const MODEL = 'llama-3.1-8b-instant'

//   let response;
//   // @ts-ignore
//   if(LLM === LLM_PROVIDER.CEREBRAS) {
//       try {
//       response = await fetch(`${BASE_URL}/chat/completions`, {
//         method: 'POST',
//         headers: {
//           'Authorization': `Bearer ${API_KEY}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           model: MODEL,
//           messages: messagesForLLM,
//           temperature: 0.3,
//           max_tokens: 800,
//           stream: true,
//           // stream: false,
//           // stop: ["<think>", "</think>", "<|im_end|>"], // Add this line
//         })
//       });

//       if (!response.ok) {
//         const err = await response.text();
//         console.error("Cerebras error:", err);
//         return c.json({ error: "AI temporarily unavailable" }, 503);
//       }

//     } catch (err) {
//       console.error("LLM call failed:", err);
//       return c.json({ error: "AI temporarily unavailable" }, 503);
//     }
//   } else if (LLM === LLM_PROVIDER.GROQ) {
//     try { 
//         response = await fetch(`${BASE_URL}/chat/completions`, {
//         method: 'POST',
//         headers: {
//           'Authorization': `Bearer ${API_KEY}`, 
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           model: MODEL,
//           messages: messagesForLLM,
//           temperature: 0.3,
//           max_tokens: 800,
//           stream: true, 
//         })
//       });

//       if (!response.ok) {
//         const err = await response.text();
//         console.error("Groq error:", err);
//         return c.json({ error: `Groq AI temporarily unavailable: ${err}` }, 503);
//       }
//     } catch (err) {
//       console.error("LLM call failed:", err);
//       return c.json({ error: "AI temporarily unavailable" }, 503);
//     }
//   }
//   if(response) {
//     return new Response(response.body, {
//       headers: {
//         'Content-Type': 'text/event-stream',
//         'Cache-Control': 'no-cache',
//         'Connection': 'keep-alive',
//         "Access-Control-Allow-Origin": "*",
//       }
//     });
//   }

// });

export default app;