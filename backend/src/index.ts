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

app.post("/chat/intent", async (c) => {
  const body = await c.req.json();
  const messages = body.messages || [];
  
  // Get last 5 messages for context, or all if less than 5
  const lastMessages = messages.slice(-7);
  const lastMessage = lastMessages[lastMessages.length - 1]?.content || "";
  
  // Format conversation history for context
  const conversationHistory = lastMessages.length > 1 
    ? formatConversationHistory(lastMessages.slice(0, -1))
    : "";

  const API_KEY = c.env.GROQ_API_KEY;
  const MODEL = AGENT_ROLE_MODEL.INTENT;

  const prompt = `
You are the Brain of a Cannabis Dispensary AI.
Analyze the conversation history and the latest user message.

Review the conversation. Extract the current active preferences. 
If a user changes their mind (e.g., from Flower to Pre-roll), the new choice replaces the old one. 
If they add a preference (e.g., 'And make it strong'), append it.

For category you must use exact keyword. This is absolutely crucial.
Can't use preroll for prerolls or edibles for edibles.

must use one of the following keywords for category: flower, prerolls, edibles, concentrates, tincture, vaporizers

THC Potency Classification (category-specific scales):
- Flower/Prerolls: Mild (<13%), Balanced (13-18%), Moderate (18-22%), Strong (22-28%), Very Strong (>28%)
- Vaporizers/Concentrates: Mild (<66%), Balanced (66-75%), Moderate (75-85%), Strong (85-90%), Very Strong (>90%)

When extracting THC preferences, use thc_percentage_min and thc_percentage_max based on the category:
- If category is "flower" or "prerolls", use Flower/Prerolls scale
- If category is "vaporizers" or "concentrates", use Vaporizers/Concentrates scale
- If no category is specified, default to Flower/Prerolls scale

Return ONLY valid JSON with:
1. "intent": "recommendation" or "general"
2. "filters": { 
    "category": (flower, prerolls, edibles, concentrates, tincture, vaporizers) or null,
    "type": (indica, sativa, hybrid) or null,
    "thc_percentage_min": (number) or null,
    "thc_percentage_max": (number) or null,
    "subcategory": (string) or null,
    "effects": (array of strings) or null,
    "flavor": (array of strings) or null,
    "brand": (string) or null,
    "price_min": (number) or null,
    "price_max": (number) or null
}
3. "semantic_search": "3-5 keywords describing desired mood/effect/flavor" or empty string

Type mapping:
- "indica", "indica-dominant" → "indica"
- "sativa", "sativa-dominant" → "sativa"
- "hybrid" → "hybrid"

Examples:
- "I want a flower for sleep, no couch-lock, something strong"
  Result: {
    "intent": "recommendation",
    "filters": { "category": "flower", "type": "indica", "thc_percentage_min": 22, "thc_percentage_max": 28 },
    "semantic_search": "sleepy relaxed nighttime functional"
  }

- "What are your hours?"
  Result: {
    "intent": "general",
    "filters": {},
    "semantic_search": ""
  }

- "Show me edibles"
  Result: {
    "intent": "recommendation",
    "filters": { "category": "edibles" },
    "semantic_search": "edible products"
  }

- "I want something for anxiety, maybe a sativa"
  Result: {
    "intent": "recommendation",
    "filters": { "type": "sativa" },
    "semantic_search": "anxiety relief calming focused"
  }

${conversationHistory ? `Conversation history:\n${conversationHistory}\n\n` : ""}

Latest user message: "${lastMessage}"

Return ONLY valid JSON. Do not wrap in markdown code blocks.`;

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
        max_tokens: 500,
        stream: false
      })
    });

    const data = await resp.json();
    text = data.choices?.[0]?.message?.content || "";

  } catch (err) {
    const formatError = `/intent api error: ${err}`;
    console.error(formatError);
    return c.json({ 
      intent: "general", 
      filters: {}, 
      semantic_search: "" 
    }, 503);
  }

  // Parse and validate response
  try {
    // Strip markdown code blocks if present
    let cleanedText = text.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/\s*```$/g, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/g, '');
    }
    cleanedText = cleanedText.trim();

    const parsed = JSON.parse(cleanedText);
    
    // Validate and normalize response structure
    const response = {
      intent: parsed.intent === "recommendation" ? "recommendation" : "general",
      filters: parsed.filters || {},
      semantic_search: parsed.semantic_search || ""
    };

    // Ensure filters object has correct structure (null for missing values)
    const normalizedFilters: Record<string, any> = {};
    const filterFields = ["category", "type", "thc_min", "thc_max", "subcategory", "effects", "flavor", "brand", "price_min", "price_max"];
    
    for (const field of filterFields) {
      if (response.filters[field] !== undefined && response.filters[field] !== null) {
        normalizedFilters[field] = response.filters[field];
      }
    }

    return c.json({
      intent: response.intent,
      filters: normalizedFilters,
      semantic_search: response.semantic_search
    });
  } catch (err) {
    console.error("Failed to parse intent response:", err);
    console.error("Raw response:", text);
    // Fallback to general intent with empty filters
    return c.json({ 
      intent: "general", 
      filters: {}, 
      semantic_search: "" 
    });
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
  const filters = body.filters || {};
  const semantic_search = body.semantic_search || "";

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

    // Use semantic_search if provided, otherwise fallback to user_message
    const queryString = semantic_search || user_message;
    
    // Convert filters to Vectorize format
    const vectorizeFilters: Record<string, any> = {};

    // Direct string fields
    // if (filters.category) vectorizeFilters.category = filters.category;
    if (filters.category) {
      if (Array.isArray(filters.category)) {
        vectorizeFilters.category = { "$in": filters.category };
      } else {
        vectorizeFilters.category = filters.category;
      }
    }
    if (filters.type) {
      if (Array.isArray(filters.type)) {
        vectorizeFilters.type = { "$in": filters.type };
      } else {
        vectorizeFilters.type = filters.type;
      }
    }
    // if (filters.subcategory) vectorizeFilters.subcategory = filters.subcategory;
    if (filters.subcategory) {
      if (Array.isArray(filters.subcategory)) {
        vectorizeFilters.subcategory = { "$in": filters.subcategory };
      } else {
        vectorizeFilters.subcategory = filters.subcategory;
      }
    }
    if (filters.brand) vectorizeFilters.brand = filters.brand;

    // Array fields (effects, flavor) - use $in operator
    // if (filters.effects && Array.isArray(filters.effects) && filters.effects.length > 0) {
    //   vectorizeFilters.effects = { "$in": filters.effects };
    // }
    // if (filters.flavor && Array.isArray(filters.flavor) && filters.flavor.length > 0) {
    //   vectorizeFilters.flavor = { "$in": filters.flavor };
    // }

    // Numeric ranges
    if (filters.price_min !== null && filters.price_min !== undefined || 
        filters.price_max !== null && filters.price_max !== undefined) {
      vectorizeFilters.price = {};
      if (filters.price_min !== null && filters.price_min !== undefined) {
        vectorizeFilters.price["$gte"] = filters.price_min;
      }
      if (filters.price_max !== null && filters.price_max !== undefined) {
        vectorizeFilters.price["$lte"] = filters.price_max;
      }
    }

    if (filters.thc_percentage_min !== null && filters.thc_percentage_min !== undefined || 
        filters.thc_percentage_max !== null && filters.thc_percentage_max !== undefined) {
      vectorizeFilters.thc_percentage = {};
      if (filters.thc_percentage_min !== null && filters.thc_percentage_min !== undefined) {
        vectorizeFilters.thc_percentage["$gte"] = filters.thc_percentage_min;
      }
      if (filters.thc_percentage_max !== null && filters.thc_percentage_max !== undefined) {
        vectorizeFilters.thc_percentage["$lte"] = filters.thc_percentage_max;
      }
    }

    if (filters.thc_per_unit_mg_min !== null && filters.thc_per_unit_mg_min !== undefined || 
        filters.thc_per_unit_mg_max !== null && filters.thc_per_unit_mg_max !== undefined) {
      vectorizeFilters.thc_per_unit_mg = {};
      if (filters.thc_per_unit_mg_min !== null && filters.thc_per_unit_mg_min !== undefined) {
        vectorizeFilters.thc_per_unit_mg["$gte"] = filters.thc_per_unit_mg_min;
      }
      if (filters.thc_per_unit_mg_max !== null && filters.thc_per_unit_mg_max !== undefined) {
        vectorizeFilters.thc_per_unit_mg["$lte"] = filters.thc_per_unit_mg_max;
      }
    }

    // Boolean
    if (filters.inStock !== null && filters.inStock !== undefined) {
      vectorizeFilters.inStock = filters.inStock;
    }

    // Use filters if any exist, otherwise no filter
    const filterToUse = Object.keys(vectorizeFilters).length > 0 ? vectorizeFilters : undefined;

    // return c.json({ queryString: queryString, filterToUse: vectorizeFilters }, 200);
    
    searchResults = await store.similaritySearch(queryString, 10, filterToUse);
    // searchResults = await store.similaritySearch(queryString, 10, { "effects": { "$in": ["energetic", "happy"] } });
  } catch (err) {
    console.error("Vector search error:", err);
    return c.json({ recommendations: [] }, 200);
  }

// Transform searchResults to metadata format
  const results = searchResults.map((doc) => {
    const productId = doc.metadata?.id;
    return {
      id: productId || "", // Use metadata.id (should always be present after fix)
      ...doc.metadata,
    };
  });

  // Create product map for name-based lookup
  const productMap = new Map(results.map((r, i) => [r.name, r]));

  const API_KEY = c.env.GROQ_API_KEY;
  const MODEL = AGENT_ROLE_MODEL.RECCOMEND;

  const reRankPrompt = `
You are a Master Budtender. Your goal is to rank cannabis products based on how perfectly they match a user's specific request.

Rank products by overall best match considering ALL factors: category, type, description, price, THC percentage, effects, flavors, and any other preferences mentioned.

### USER REQUEST:
"${user_message}"

### USER PREFERENCES (from conversation):
${filters?.effects?.length ? `- Requested Effects: ${JSON.stringify(filters.effects)}` : ''}
${filters?.flavor?.length ? `- Requested Flavors: ${JSON.stringify(filters.flavor)}` : ''}
${filters?.category ? `- Category: ${filters.category}` : ''}
${filters?.type ? `- Type: ${filters.type}` : ''}
${filters?.thc_percentage_min !== undefined || filters?.thc_percentage_max !== undefined ? (() => {
  const min = filters?.thc_percentage_min;
  const max = filters?.thc_percentage_max;
  let rangeStr = '';
  if (min !== undefined && max !== undefined) {
    rangeStr = `${min}%-${max}%`;
  } else if (min !== undefined) {
    rangeStr = `>${min}%`;
  } else if (max !== undefined) {
    rangeStr = `<${max}%`;
  }
  return `- THC Percentage Range: ${rangeStr}`;
})() : ''}
${filters?.price_min || filters?.price_max ? `- Price Range: $${filters.price_min || 0} - $${filters.price_max || '∞'}` : ''}

**Note**: Effects and flavors are provided here because the vector database cannot filter on array fields. Consider them along with all other factors when ranking.

### CANDIDATE PRODUCTS (JSON):
${JSON.stringify(results)}

### INSTRUCTIONS:
1. Analyze the User Request holistically - consider category, type, effects, flavors, price, THC level, and any other preferences.
2. Evaluate each candidate product based on ALL relevant fields: category, type, subcategory, description, effects, flavors, price, THC percentage (considering min/max ranges), brand, etc.
3. Rank products from BEST overall match to LEAST match, considering how well each product satisfies the complete user request.
4. If a product clearly contradicts the user's request (e.g., user wants "not sleepy" but product says "heavy sedative"), remove it entirely.
5. Return ONLY a JSON object with a "ranked_names" array containing product names in order of best match.

### RESPONSE FORMAT (STRICT):
{
  "ranked_names": ["Product Name 1", "Product Name 2", "Product Name 3", ...]
}

Return ONLY valid JSON. Do not wrap in markdown code blocks.
`;

  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: reRankPrompt }],
      temperature: 0.1,
      max_tokens: 3000,
      stream: false
    })
  });

  const data = await resp.json();
  let text = data.choices?.[0]?.message?.content || "";
  
  // Strip markdown code blocks if present
  text = text.trim();
  if (text.startsWith('```json')) {
    text = text.replace(/^```json\s*/i, '').replace(/\s*```$/g, '');
  } else if (text.startsWith('```')) {
    text = text.replace(/^```\s*/, '').replace(/\s*```$/g, '');
  }
  text = text.trim();

  // Extract JSON object from response (LLM may include extra text)
  // Look for the first { and find the matching closing }
  let jsonText = text;
  const firstBrace = text.indexOf('{');
  if (firstBrace !== -1) {
    let braceCount = 0;
    let endBrace = -1;
    for (let i = firstBrace; i < text.length; i++) {
      if (text[i] === '{') braceCount++;
      if (text[i] === '}') braceCount--;
      if (braceCount === 0) {
        endBrace = i + 1;
        break;
      }
    }
    if (endBrace > firstBrace) {
      jsonText = text.substring(firstBrace, endBrace);
    }
  }

  try {
    const parsed = JSON.parse(jsonText);
    const rankedNames = parsed.ranked_names || [];
    
    // Map ranked names back to full product objects
    const rankedProducts = rankedNames
      .map((name: string) => productMap.get(name))
      .filter((product: any) => product !== undefined);
    
    // If re-ranking failed or returned empty, fallback to original search results
    if (rankedProducts.length === 0) {
      return c.json({ 
        recommendations: results 
      }, 200);
    }
    
    return c.json({ recommendations: rankedProducts }, 200);
  } catch (err) {
    console.error("Invalid JSON from LLM:", text);
    console.error("Extracted JSON:", jsonText);
    console.error("Error:", err);
    // Fallback to original search results if re-ranking fails
    return c.json({ 
      recommendations: results 
    }, 200);
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