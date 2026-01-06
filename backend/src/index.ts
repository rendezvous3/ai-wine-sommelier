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

  console.log("/decide route called", prompt);

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

  console.log("/decide route resp", resp);

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

  // console.log("conversation_history", conversation_history);

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

  // console.log("/stream messagesForLLM ", messagesForLLM);

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

  console.log("/stream route ", response);

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
  const user_message = messages[messages.length - 1]?.content || "";

  let searchResults;
  try {
    const embeddings = new CloudflareWorkersAIEmbeddings({
      binding: c.env.AI,
      model: "@cf/baai/bge-large-en-v1.5"
    });

    const store = new CloudflareVectorizeStore(embeddings, {
      index: c.env.VECTORIZE_INDEX
    });

    searchResults = await store.similaritySearch(user_message, 8);
  } catch (err) {
    console.error("Vector search error:", err);
    return c.json({ recommendations: [] }, 200);
  }

  const productContext = searchResults
    .map((doc, i) => {
      const m = doc.metadata || {};
      return `${i + 1}. "${m.name}" by ${m.brand}
        Price: $${m.price}
        Type: ${m.type}
        Effects: ${m.effects}
        Description: ${doc.pageContent}`;
    })
    .join("\n\n");

  const API_KEY = c.env.GROQ_API_KEY;
  const MODEL = AGENT_ROLE_MODEL.RECCOMEND;

  const llmPrompt = `
    You are a recommendation engine. 
    Rewrite the products into a clean JSON list:

    Format:
    {
      "recommendations": [
        {
          "name": "",
          "brand": "",
          "price": 0,
          "type": "",
          "effects": "",
          "description": "",
          "match_reason": ""
        }
      ]
    }

    Products to analyze:
    ${productContext}

    User message:
    "${user_message}"

    Return ONLY valid JSON.
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
      max_tokens: 500,
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
    
//   console.log("Products Stringified Context", productsContext);
//   console.log("Similarity Search Results", results);
//   console.log("User Message", user_message);

//   const lastMessagesForLLM = messages.slice(-15);
//   const conversation_history = formatConversationHistory(lastMessagesForLLM);

//   console.log("lastMessagesForLLM ", lastMessagesForLLM);
//   console.log("conversation_history ", conversation_history);

//   // Grok Suggested Template
//   const PROMPT = generatePrompt(MODEL_PROVIDER.LLAMA, user_message, conversation_history, productsContext);
//   console.log("PROMPT", PROMPT);

//   const messagesForLLM = [
//     { role: "system", content: PROMPT },
//     ...lastMessagesForLLM,
//   ];

//   // console.log("PROMPT", PROMPT);

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

//       console.log("response ", response.body);

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