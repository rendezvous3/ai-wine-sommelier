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
import {
  generateStreamPrompt,
  generateStreamFireAt2Prompt,
  generateIntentWithCuePrompt,
  generateReRankPrompt
} from "./prompts";
import { MODEL_PROVIDER, LLM_PROVIDER, STORE_NAME, AGENT_ROLE, AGENT_ROLE_MODEL, USE_FIRE_AT_2_PROMPT, getModelForRole, getBaseUrl, getApiKey, getTokenLimitsForModel, type Tier } from "./types-and-constants";
import { formatConversationHistory, validateAndExpandFilters, buildVectorizeFilters, parseRobustJSON } from "./utils";
import {
  isValidCategory,
  isValidSubcategory,
  normalizeCategory,
  normalizeSubcategory,
  getValidSubcategories,
  shouldUseTHCPercentage,
  shouldUseTHCPerUnitMg,
  getSchemaForPrompt
} from "./schema";

interface Bindings {
  CEREBRAS_API_KEY_PROD: string;
  GROQ_API_KEY?: string;     // optional
  VECTORIZE_INDEX: VectorizeIndex;
  AI: Ai<AiModels>;
}

// ============================================
// MODEL PROVIDER CONFIGURATION
// Change this to switch between Groq and Cerebras
// ============================================
const ACTIVE_PROVIDER = LLM_PROVIDER.GROQ; // Groq: Cheaper, great quality

// Default tier - can be made configurable via environment variable later
const TIER: Tier = "FREE";

// Helper function to build token usage response object
function buildTokenUsageResponse(
  modelName: string,
  usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined,
  tier: Tier = TIER
): {
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  modelContextLimit: number;
} | null {
  if (!usage) {
    return null;
  }

  const promptTokens = usage.prompt_tokens || 0;
  const completionTokens = usage.completion_tokens || 0;
  const totalTokens = usage.total_tokens || (promptTokens + completionTokens);

  const tokenLimits = getTokenLimitsForModel(modelName, tier);

  return {
    tokenUsage: {
      promptTokens,
      completionTokens,
      totalTokens,
    },
    model: modelName,
    modelContextLimit: tokenLimits.contextWindow,
  };
}

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Global error handler
app.onError((err, c) => {
  if (err instanceof SyntaxError) {
    return c.json({ error: "Invalid JSON format", message: err.message }, 400);
  }
  console.error(`Status: ${err.name}`, err.message);
  return c.json({ error: "Internal Server Error" }, 500);
});

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

  // IMPORTANT: Use FULL context to capture multi-turn queries
  // Example: "What are your most potent vapes?" → "sleep"
  // We need to see "most potent" from the first user message
  // The CODEX message is still the trigger, but we need full conversation for filter extraction

  const lastMessage = messages[messages.length - 1]?.content || "";

  // CODEX DETECTION (before LLM call)
  // Check last assistant message for CODEX cues
  const lastAssistantMsg = messages.filter((m: any) => m.role === 'assistant').pop();
  const lastAssistantContent = lastAssistantMsg?.content || '';
  
  // Store assistant query for response verification
  const assistantQuery = lastAssistantContent;

  const RECOMMEND_CUES = [
    'I completely understand what you\'re looking for',
    'Let me check what we have that matches your preferences',
    'I\'m pulling up products that fit your criteria',
    'Checking our inventory based on what you described'
  ];

  const PRODUCT_CUES = [
    'Let me look up',
    'I\'ll pull up the details on'
  ];

  const hasRecommendCue = RECOMMEND_CUES.some(cue => lastAssistantContent.includes(cue));
  const hasProductCue = PRODUCT_CUES.some(cue => lastAssistantContent.includes(cue));

  // If no CODEX cue, return general immediately (no LLM call needed)
  if (!hasRecommendCue && !hasProductCue) {
    return c.json({
      intent: 'general',
      filters: {},
      semantic_search: '',
      product_query: null,
      assistantQuery: assistantQuery
    });
  }

  // If PRODUCT_LOOKUP cue detected, extract product name and return product-question intent
  if (hasProductCue) {
    // Extract product name from cue phrase
    const lookupMatch = lastAssistantContent.match(/Let me look up (.+?) for you/i)
                     || lastAssistantContent.match(/I'll pull up the details on (.+)/i);
    const productName = lookupMatch ? lookupMatch[1].trim() : lastMessage;

    return c.json({
      intent: 'product-question',
      filters: {},
      semantic_search: '',
      product_query: productName,
      assistantQuery: assistantQuery
    });
  }

  // CODEX:RECOMMEND detected - call LLM for filter extraction
  const API_KEY = getApiKey(ACTIVE_PROVIDER, c.env);
  const MODEL = getModelForRole(ACTIVE_PROVIDER, "INTENT");
  const BASE_URL = getBaseUrl(ACTIVE_PROVIDER);

  const schemaInfo = getSchemaForPrompt();

  let tokenUsage: ReturnType<typeof buildTokenUsageResponse> = null;

  const prompt = generateIntentWithCuePrompt(lastAssistantContent, lastMessage, schemaInfo);

  let text;
  try {
    const resp = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: prompt }],
        temperature: 0,
        max_tokens: 1000,  // Intent: JSON output (sufficient)
        stream: false
      })
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error(`Groq API error (${resp.status}):`, errorText);
      throw new Error(`Groq API returned ${resp.status}: ${errorText}`);
    }

    const data = await resp.json();
    text = data.choices?.[0]?.message?.content || "";
    tokenUsage = buildTokenUsageResponse(MODEL, data.usage, TIER);
    
    if (!text || text.trim().length === 0) {
      console.error("Groq API returned empty response:", JSON.stringify(data, null, 2));
      throw new Error("Groq API returned empty content");
    }

  } catch (err) {
    const formatError = `/intent api error: ${err}`;
    console.error(formatError);
    return c.json({
      error: "Our AI understanding service is experiencing technical difficulties at the moment. Please try again.",
      service: "intent",
      intent: "general",
      filters: {},
      semantic_search: "",
      assistantQuery: assistantQuery,
      details: {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        provider: ACTIVE_PROVIDER
      }
    }, 503);
  }

  // Parse and validate response using robust JSON parser
  const parseResult = parseRobustJSON(text);

  if (!parseResult.success) {
    console.error("Failed to parse intent response:", {
      error: parseResult.error,
      rawResponse: text?.substring(0, 500)
    });

    return c.json({
      error: "Filter extraction failed - JSON parsing error",
      errorType: "JSON_PARSE_ERROR",
      errorMessage: parseResult.error || "Unknown parsing error",
      details: {
        parseError: "The AI response could not be parsed as valid JSON",
        suggestion: "This is likely due to incomplete or malformed JSON from the LLM. The response has been logged."
      },
      intent: "recommendation",
      filters: {},
      semantic_search: "",
      product_query: null,
      assistantQuery: assistantQuery
    }, 400);
  }

  const parsed = parseResult.data;

  try {

    // Response structure (intent is already determined by CODEX detection)
    const response = {
      filters: parsed.filters || {},
      semantic_search: parsed.semantic_search || ""
    };

    // Validate and normalize filters
    const normalizedFilters: Record<string, any> = {};

    try {
      // Normalize and validate category (handle both single value and array)
      if (response.filters.category) {
      const categoryValue = response.filters.category;
      if (Array.isArray(categoryValue)) {
        // Validate each category in the array
        const normalizedCategories = categoryValue
          .map((cat: any) => normalizeCategory(cat))
          .filter((cat: string | null): cat is string => cat !== null);
        if (normalizedCategories.length > 0) {
          normalizedFilters.category = normalizedCategories;
        }
        // If all invalid, omit it (better to omit than be wrong)
      } else {
        // Single value
        const normalizedCategory = normalizeCategory(categoryValue);
        if (normalizedCategory) {
          normalizedFilters.category = normalizedCategory;
        }
      }
    }
    
    // Normalize type to lowercase (handle both single value and array)
    if (response.filters.type) {
      const typeValue = response.filters.type;
      const validTypes = ["indica", "sativa", "hybrid", "indica-hybrid", "sativa-hybrid"];

      if (Array.isArray(typeValue)) {
        // Validate each type in the array
        const normalizedTypes = typeValue
          .map((t: any) => String(t).toLowerCase())
          .filter((t: string) => validTypes.includes(t));
        if (normalizedTypes.length > 0) {
          normalizedFilters.type = normalizedTypes;
        }
        // If all invalid, omit it (better to omit than be wrong)
      } else {
        // Single value
        const normalizedType = String(typeValue).toLowerCase();
        if (validTypes.includes(normalizedType)) {
          normalizedFilters.type = normalizedType;
        }
      }
    }
    
    // Normalize and validate subcategory (only if category is valid)
    // Handle both single value and array
    // Note: If category is an array, we can't validate subcategory against multiple categories
    // So we only validate subcategory if category is a single value
    if (response.filters.subcategory && normalizedFilters.category) {
      if (Array.isArray(normalizedFilters.category)) {
        // If category is an array, we can't validate subcategory (it could belong to any category)
        // So we normalize subcategory values but don't validate against schema
        const subcategoryValue = response.filters.subcategory;
        if (Array.isArray(subcategoryValue)) {
          // Normalize each subcategory to lowercase
          const normalizedSubcategories = subcategoryValue
            .map((subcat: any) => String(subcat).toLowerCase())
            .filter((subcat: string) => subcat.length > 0);
          if (normalizedSubcategories.length > 0) {
            normalizedFilters.subcategory = normalizedSubcategories;
          }
        } else {
          // Single value - normalize to lowercase
          const normalizedSubcategory = String(subcategoryValue).toLowerCase();
          if (normalizedSubcategory.length > 0) {
            normalizedFilters.subcategory = normalizedSubcategory;
          }
        }
      } else {
        // Category is single value - validate subcategory against it
        const subcategoryValue = response.filters.subcategory;
        if (Array.isArray(subcategoryValue)) {
          // Validate each subcategory in the array
          const normalizedSubcategories = subcategoryValue
            .map((subcat: any) => normalizeSubcategory(normalizedFilters.category, subcat))
            .filter((subcat: string | null): subcat is string => subcat !== null);
          if (normalizedSubcategories.length > 0) {
            normalizedFilters.subcategory = normalizedSubcategories;
          }
          // If all invalid, omit it (better to omit than be wrong)
        } else {
          // Single value
          const normalizedSubcategory = normalizeSubcategory(
            normalizedFilters.category,
            subcategoryValue
          );
          if (normalizedSubcategory) {
            normalizedFilters.subcategory = normalizedSubcategory;
          }
          // If invalid, omit it (better to omit than be wrong)
        }
      }
    }
    
    // Normalize effects array to lowercase
    if (response.filters.effects && Array.isArray(response.filters.effects)) {
      normalizedFilters.effects = response.filters.effects
        .map((e: any) => String(e).toLowerCase())
        .filter((e: string) => e.length > 0);
    }
    
    // Normalize flavor array to lowercase
    if (response.filters.flavor && Array.isArray(response.filters.flavor)) {
      normalizedFilters.flavor = response.filters.flavor
        .map((f: any) => String(f).toLowerCase())
        .filter((f: string) => f.length > 0);
    }
    
    // Brand - keep original case (brand names are case-sensitive)
    if (response.filters.brand) {
      normalizedFilters.brand = String(response.filters.brand);
    }
    
    // Price fields
    if (response.filters.price_min !== null && response.filters.price_min !== undefined) {
      normalizedFilters.price_min = Number(response.filters.price_min);
    }
    if (response.filters.price_max !== null && response.filters.price_max !== undefined) {
      normalizedFilters.price_max = Number(response.filters.price_max);
    }

    // Strip subcategory if category is CBD (Dutchie data doesn't support CBD subcategories for filtering)
    if (normalizedFilters.category === 'cbd' && normalizedFilters.subcategory) {
      delete normalizedFilters.subcategory;
    }

    // Validate THC fields based on category
    const category = normalizedFilters.category;
    if (category) {
      // Handle array of categories - if any category uses percentage, allow percentage fields
      // If any category uses per-unit-mg, allow per-unit-mg fields
      if (Array.isArray(category)) {
        const usesPercentage = category.some((cat: string) => shouldUseTHCPercentage(cat));
        const usesPerUnitMg = category.some((cat: string) => shouldUseTHCPerUnitMg(cat));
        
        if (usesPercentage) {
          if (response.filters.thc_percentage_min !== null && response.filters.thc_percentage_min !== undefined) {
            normalizedFilters.thc_percentage_min = Number(response.filters.thc_percentage_min);
          }
          if (response.filters.thc_percentage_max !== null && response.filters.thc_percentage_max !== undefined) {
            normalizedFilters.thc_percentage_max = Number(response.filters.thc_percentage_max);
          }
        }
        if (usesPerUnitMg) {
          if (response.filters.thc_per_unit_mg_min !== null && response.filters.thc_per_unit_mg_min !== undefined) {
            normalizedFilters.thc_per_unit_mg_min = Number(response.filters.thc_per_unit_mg_min);
          }
          if (response.filters.thc_per_unit_mg_max !== null && response.filters.thc_per_unit_mg_max !== undefined) {
            normalizedFilters.thc_per_unit_mg_max = Number(response.filters.thc_per_unit_mg_max);
          }
        }
      } else {
        // Single category
        if (shouldUseTHCPercentage(category)) {
          // For flower/prerolls/vaporizers/concentrates: use thc_percentage_min/max
          if (response.filters.thc_percentage_min !== null && response.filters.thc_percentage_min !== undefined) {
            normalizedFilters.thc_percentage_min = Number(response.filters.thc_percentage_min);
          }
          if (response.filters.thc_percentage_max !== null && response.filters.thc_percentage_max !== undefined) {
            normalizedFilters.thc_percentage_max = Number(response.filters.thc_percentage_max);
          }
          // Remove thc_per_unit_mg fields if present (wrong field for this category)
        } else if (shouldUseTHCPerUnitMg(category)) {
          // For edibles: use thc_per_unit_mg_min/max
          if (response.filters.thc_per_unit_mg_min !== null && response.filters.thc_per_unit_mg_min !== undefined) {
            normalizedFilters.thc_per_unit_mg_min = Number(response.filters.thc_per_unit_mg_min);
          }
          if (response.filters.thc_per_unit_mg_max !== null && response.filters.thc_per_unit_mg_max !== undefined) {
            normalizedFilters.thc_per_unit_mg_max = Number(response.filters.thc_per_unit_mg_max);
          }
          // Remove thc_percentage fields if present (wrong field for this category)
        }
      }

      // Safety: remap THC if LLM used wrong category's potency scale (e.g. vape 85 for prerolls)
      // Skip if min==max (explicit number like "85% THC flower") — only remap natural language extractions
      // const _remapCat: string = Array.isArray(category) ? category[0] : category;
      // const _wrongScaleMap: Record<string, Record<number, number>> = {
      //   'flower': { 66: 13, 75: 18, 85: 22, 90: 28 },
      //   'prerolls': { 66: 13, 75: 18, 85: 22, 90: 28 },
      //   'vaporizers': { 13: 66, 18: 75, 22: 85, 28: 90 },
      //   'concentrates': { 13: 66, 18: 75, 22: 85, 28: 90 },
      // };
      // const _remap = _wrongScaleMap[_remapCat];
      // if (_remap && !(normalizedFilters.thc_percentage_min !== undefined && normalizedFilters.thc_percentage_min === normalizedFilters.thc_percentage_max)) {
      //   if (normalizedFilters.thc_percentage_min !== undefined && _remap[normalizedFilters.thc_percentage_min] !== undefined)
      //     normalizedFilters.thc_percentage_min = _remap[normalizedFilters.thc_percentage_min];
      //   if (normalizedFilters.thc_percentage_max !== undefined && _remap[normalizedFilters.thc_percentage_max] !== undefined)
      //     normalizedFilters.thc_percentage_max = _remap[normalizedFilters.thc_percentage_max];
      // }
    } else {
      // If category is missing but THC fields are present, remove THC fields (can't validate without category)
      // Default to thc_percentage if no category (for backward compatibility)
      if (response.filters.thc_percentage_min !== null && response.filters.thc_percentage_min !== undefined) {
        normalizedFilters.thc_percentage_min = Number(response.filters.thc_percentage_min);
      }
      if (response.filters.thc_percentage_max !== null && response.filters.thc_percentage_max !== undefined) {
        normalizedFilters.thc_percentage_max = Number(response.filters.thc_percentage_max);
      }
    }
    } catch (normalizationErr) {
      // Normalization error - provide detailed field-level error
      const errorMessage = normalizationErr instanceof Error ? normalizationErr.message : String(normalizationErr);

      console.error("Filter normalization error:", {
        error: errorMessage,
        filters: response.filters,
        rawResponse: text
      });

      return c.json({
        error: "Filter normalization failed",
        errorType: "NORMALIZATION_ERROR",
        errorMessage: errorMessage,
        details: {
          parseError: "Failed to normalize filter fields (category, type, subcategory, etc.)",
          receivedFilters: response.filters,
          suggestion: "One of the filter fields (category, type, etc.) may be in an unexpected format. Check if arrays are handled correctly."
        },
        // Return recommendation intent with empty filters
        intent: "recommendation",
        filters: {},
        semantic_search: response.semantic_search || "",
        product_query: null
      }, 400);
    }

    return c.json({
      intent: "recommendation", // Intent is always "recommendation" when LLM is called (CODEX:RECOMMEND detected)
      filters: normalizedFilters,
      semantic_search: response.semantic_search,
      product_query: null, // Product queries are handled separately by CODEX:PRODUCT_LOOKUP
      assistantQuery: assistantQuery,
      ...(tokenUsage ? { tokenUsage } : {})
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;

    console.error("Failed to parse intent response:", {
      error: errorMessage,
      stack: errorStack,
      rawResponse: text
    });

    // Return detailed error response (400 Bad Request)
    return c.json({
      error: "Filter extraction failed",
      errorType: "FILTER_PARSE_ERROR",
      errorMessage: errorMessage,
      details: {
        parseError: "Failed to parse or normalize the filter extraction response from LLM",
        rawResponse: text ? text.substring(0, 500) : "(empty)", // Truncate for safety
        suggestion: "This is likely a normalization bug in the backend. Check server logs for full details."
      },
      // Fallback values - intent is "recommendation" since we only call LLM when CODEX:RECOMMEND detected
      intent: "recommendation",
      filters: {},
      semantic_search: "",
      product_query: null,
      assistantQuery: assistantQuery
    }, 400);
  }
});

// Product lookup endpoint - searches for a product by semantic similarity
// Used when user asks about a product NOT in conversation history
app.post("/chat/product-lookup", async (c) => {
  const body = await c.req.json();
  const productQuery = body.product_query || "";

  if (!productQuery) {
    return c.json({
      product: null,
      confidence: 0,
      needsClarification: false,
      message: "No product query provided"
    });
  }

  try {
    // 1. Generate embedding for the query using Cloudflare Workers AI
    const embeddingResponse = await c.env.AI.run("@cf/baai/bge-large-en-v1.5", {
      text: [productQuery],
    });
    const queryVector = embeddingResponse.data[0];

    // 2. Query Vectorize directly (native API with confidence scores)
    const matches = await c.env.VECTORIZE_INDEX.query(queryVector, {
      topK: 3,
      returnMetadata: true,
    });

    if (matches.matches.length === 0) {
      return c.json({
        product: null,
        confidence: 0,
        needsClarification: false,
        message: "I couldn't find that product in our inventory. Would you like me to search for recommendations?"
      });
    }

    // 3. Access confidence score (Cloudflare uses Cosine Similarity)
    // Score interpretation:
    // - 0.95+: Almost exact name match
    // - 0.75-0.85: Good semantic match
    // - Below 0.70: AI guessing, should trigger follow-up
    const topMatch = matches.matches[0];
    const confidence = topMatch.score || 0;

    // High confidence (>0.7): Return single product
    if (confidence > 0.7) {
      return c.json({
        product: { id: topMatch.id, ...topMatch.metadata },
        confidence,
        needsClarification: false
      });
    }

    // Medium/Low confidence (<0.7): Return top matches for follow-up question
    // Frontend will use these names in a clarifying question
    const topNames = matches.matches
      .slice(0, 2)
      .map(m => m.metadata?.name)
      .filter(Boolean);

    return c.json({
      product: null,
      confidence,
      needsClarification: true,
      suggestedNames: topNames,
      message: topNames.length > 0
        ? `I'm not quite sure which one you mean. Did you mean ${topNames.join(' or ')}?`
        : "I couldn't find that exact product. Could you tell me more, like the brand or type?"
    });

  } catch (err) {
    console.error("Product lookup error:", err);
    return c.json({
      product: null,
      confidence: 0,
      needsClarification: false,
      error: "Product lookup service temporarily unavailable",
      message: "I'm having trouble searching for that product. Would you like me to search for recommendations instead?"
    });
  }
});

app.post("/chat/stream", async (c) => {
  const body = await c.req.json();
  const messages = body.messages || [];
  const productContext = body.productContext || null;  // Full product data for product-question intent
  const clarificationContext = body.clarificationContext || null;  // Follow-up question context

  const API_KEY = getApiKey(ACTIVE_PROVIDER, c.env);
  const MODEL = getModelForRole(ACTIVE_PROVIDER, "STREAM");
  const BASE_URL = getBaseUrl(ACTIVE_PROVIDER);

  const lastMessages = messages.slice(-10);  // Keep sufficient context for natural conversation
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

  const prompt = generatePrompt(
    MODEL_PROVIDER.LLAMA,
    user_message,
    conversation_history,
    productContext || "",  // Pass product context if available
    clarificationContext || undefined,  // Pass clarification context if available
    USE_FIRE_AT_2_PROMPT  // Pass feature flag
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
        max_tokens: 900,  // Stream: Conversational responses (was 1200, reduced to 900)
        stream: true
      })
    });

    if (!response || !response.ok) {
      const errorText = response ? await response.text() : "Network error";
      console.error(`Stream API error (${response?.status || 'network'}):`, errorText);
      return c.json({
        error: "Our streaming service is experiencing technical difficulties at the moment. Please try again.",
        service: "stream",
        details: {
          status: response?.status || null,
          statusText: response?.statusText || "Network error",
          errorText: errorText,
          provider: ACTIVE_PROVIDER
        }
      }, 503);
    }

  } catch (err) {
    const formatError = `Stream Error: ${err}`;
    console.error(formatError);
    return c.json({
      error: "Our streaming service is experiencing technical difficulties at the moment. Please try again.",
      service: "stream",
      details: {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        provider: ACTIVE_PROVIDER
      }
    }, 503);
  }
  
  if (response) {
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
  let filters = body.filters || {};
  const semantic_search = body.semantic_search || "";

  // Validate, normalize, and expand filters
  filters = validateAndExpandFilters(filters);
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
  let filtersToUse;
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
    filtersToUse = buildVectorizeFilters(filters);
        // return c.json({ queryString: queryString, filtersToUse: vectorizeFilters }, 200);
    
    searchResults = await store.similaritySearch(queryString, 10, filtersToUse);
    // searchResults = await store.similaritySearch(queryString, 10, { "effects": { "$in": ["energetic", "happy"] } });
  } catch (err) {
    console.error("Vector search error:", err);
    return c.json({ recommendations: [], filtersToUse: filtersToUse, error: "Vector search error" }, 200);
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

  // return c.json({ recommendations: results }, 200);

  const API_KEY = getApiKey(ACTIVE_PROVIDER, c.env);
  const MODEL = getModelForRole(ACTIVE_PROVIDER, "RECOMMEND");
  const BASE_URL = getBaseUrl(ACTIVE_PROVIDER);

  let tokenUsage: ReturnType<typeof buildTokenUsageResponse> = null;

  const reRankPrompt = generateReRankPrompt(user_message, filters, results);

  let text;
  try {
    const resp = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        // model: "qwen/qwen3-32b",
        messages: [{ role: "system", content: reRankPrompt }],
        temperature: 0.1,
        max_tokens: 1200,  // Re-rank: JSON array of products (was 3000, reduced to 1200)
        stream: false
      })
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error(`Groq Re-ranking API error (${resp.status}):`, errorText);
      // Fallback to original search results without re-ranking
      return c.json({
        recommendations: results,
        error: "Our recommendation service is experiencing technical difficulties. Showing results without AI ranking.",
        service: "recommendations",
        details: {
          status: resp.status,
          statusText: resp.statusText,
          errorText: errorText,
          provider: ACTIVE_PROVIDER
        }
      }, 200);
    }

    const data = await resp.json();
    text = data.choices?.[0]?.message?.content || "";
    tokenUsage = buildTokenUsageResponse(MODEL, data.usage, TIER);
    
    if (!text || text.trim().length === 0) {
      console.error("Groq Re-ranking API returned empty response:", JSON.stringify(data, null, 2));
      // Fallback to original search results
      return c.json({
        recommendations: results,
        error: "Our recommendation service is experiencing technical difficulties. Showing results without AI ranking.",
        service: "recommendations",
        details: {
          message: "Empty response from re-ranking API",
          responseData: data,
          provider: ACTIVE_PROVIDER
        },
        ...(tokenUsage ? { tokenUsage } : {})
      }, 200);
    }

    // Parse response using robust JSON parser
    const parseResult = parseRobustJSON(text);

    if (!parseResult.success) {
      console.error("Failed to parse re-ranking response:", {
        error: parseResult.error,
        rawResponse: text?.substring(0, 500)
      });

      // Fallback to original search results without re-ranking
      return c.json({
        recommendations: results,
        filtersToUse: filtersToUse,
        error: "Re-ranking JSON parse error - showing unranked results",
        ...(tokenUsage ? { tokenUsage } : {})
      }, 200);
    }

    const parsed = parseResult.data;
    const rankedNames = parsed.ranked_names || [];

    // Map ranked names back to full product objects
    const rankedProducts = rankedNames
      .map((name: string) => productMap.get(name))
      .filter((product: any) => product !== undefined);

    // If re-ranking failed or returned empty, fallback to original search results
    if (rankedProducts.length === 0) {
      return c.json({
        recommendations: results,
        filtersToUse: filtersToUse,
        error: "No ranked names found - showing unranked results",
        ...(tokenUsage ? { tokenUsage } : {})
      }, 200);
    }

    return c.json({
      recommendations: rankedProducts,
      preRankedProducts: results,
      filtersToUse: filtersToUse,
      ...(tokenUsage ? { tokenUsage } : {})
    }, 200);

  } catch (err) {
    console.error("Recommendation service error:", err);
    // Fallback to original search results
    return c.json({
      recommendations: results,
      error: "Our recommendation service is experiencing technical difficulties. Showing results without AI ranking.",
      service: "recommendations",
      details: {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        provider: ACTIVE_PROVIDER
      }
    }, 200);
  }
});

export default app;