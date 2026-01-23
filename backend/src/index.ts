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
import { MODEL_PROVIDER, LLM_PROVIDER, STORE_NAME, AGENT_ROLE, AGENT_ROLE_MODEL, getModelForRole, getBaseUrl, getApiKey } from "./types-and-constants";
import { formatConversationHistory, validateAndExpandFilters, buildVectorizeFilters } from "./utils";
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
  CEREBRAS_API_KEY: string;
  GROQ_API_KEY?: string;     // optional
  VECTORIZE_INDEX: VectorizeIndex;
  AI: Ai<AiModels>;
}

// ============================================
// MODEL PROVIDER CONFIGURATION
// Change this to switch between Groq and Cerebras
// ============================================
const ACTIVE_PROVIDER = LLM_PROVIDER.CEREBRAS; // or LLM_PROVIDER.GROQ

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
  
  // Get last 5 messages for context, or all if less than 5
  const lastMessages = messages.slice(-7);
  const lastMessage = lastMessages[lastMessages.length - 1]?.content || "";
  
  // Format conversation history for context
  const conversationHistory = lastMessages.length > 1 
    ? formatConversationHistory(lastMessages.slice(0, -1))
    : "";

  const API_KEY = getApiKey(ACTIVE_PROVIDER, c.env);
  const MODEL = getModelForRole(ACTIVE_PROVIDER, "INTENT");
  const BASE_URL = getBaseUrl(ACTIVE_PROVIDER);

  const schemaInfo = getSchemaForPrompt();

  const prompt = `
You are the Brain of a Cannabis Dispensary AI.
Analyze the conversation history and the latest user message.

**INTENT CLASSIFICATION (CRITICAL - Determine this FIRST):**
- Use "recommendation" intent when user:
  - Asks about products ("tell me about products", "what products", "show me products")
  - Wants products ("I want", "I need", "looking for", "any", "something for")
  - Insinuates desired effect ("Something for sleep", "How about for social setting", "anything for partying", "stuff to cheer me up")
  - Requests recommendations ("recommend", "suggest", "best options", "what's good for")
  - Mentions effects, categories, types, or product preferences
- Use "general" intent ONLY when user asks about:
  - Store information (hours, location, address, contact)
  - Policies (returns, age requirements, payment methods)
  - General cannabis information (education, laws, regulations)
  - Non-product questions

**Examples of "recommendation" intent:**
- "Can you tell me about products for deep sleep?" → recommendation
- "any pre roll or flower for deep sleep" → recommendation
- "anything for deep sleep" → recommendation
- "what's good for sleep?" → recommendation
- "I need something to help me sleep" → recommendation
- "How about for partying?" → recommendation
- "How about for XYZ?" → recommendation
- "good stuff for social setting" → recommendation

**Examples of "general" intent:**
- "What are your hours?" → general
- "Where are you located?" → general
- "What's your return policy?" → general

Review the conversation. Extract the current active preferences. 
If a user changes their mind (e.g., from Flower to Pre-roll), the new choice replaces the old one. 
If they add a preference (e.g., 'And make it strong'), append it.

CRITICAL VALIDATION RULE: ONLY use a field if there is EXPLICIT, CLEAR evidence in the conversation. Do NOT infer or assume preferences.

- **Category**: Only extract if user explicitly mentions category name (flower, prerolls, edibles, concentrates, vaporizers, cbd) OR mentions a subcategory (which implies category)
- **Type**: Only extract if user explicitly mentions indica, indica-hybrid, sativa, sativa-hybrid, or hybrid
- **THC/Potency**: Only extract if user explicitly mentions:
  - Numbers (e.g., "5mg", "22%", "below 66%", "from 18 to 22%")
  - Guided flow format (e.g., "Strong (22-28%)")
  - Natural language potency terms (Mild, Balanced, Moderate, Strong, Very Strong, or synonyms)
- **Effects/Flavor**: Extract if explicitly mentioned (this is working well - keep it)
- **Price**: Only extract if explicit numbers or ranges mentioned

DO NOT infer category from effects (e.g., "sleepy" does NOT imply "flower" or "indica")
DO NOT infer THC preferences from effects or type alone
DO NOT add fields that weren't explicitly mentioned

${schemaInfo}

Valid Categories: flower, prerolls, edibles, concentrates, vaporizers, cbd

Category Notes:
- Category can be a single value or an array of categories (e.g., ["prerolls", "flower"])
- Use array format when user wants products from multiple categories
- ONLY extract category if:
  1. User explicitly mentions category name (flower, prerolls, edibles, concentrates, vaporizers, cbd), OR
  2. User mentions a subcategory (which implies the parent category - see subcategory mapping below)
- DO NOT infer category from effects, type, or other preferences
- If category is not explicitly mentioned, omit it entirely (null)

Subcategory → Category Mapping:
- edibles subcategories (chews, chocolates, gummies, cooking-baking, drinks, etc.) → category: "edibles"
- vaporizers subcategories (cartridges, disposables, all-in-one, etc.) → category: "vaporizers"
- prerolls subcategories (blunts, singles, infused-prerolls, etc.) → category: "prerolls"
- important for infused, if infused prerolls are mentioned add both ["infused-prerolls", "infused-preroll-packs"]
- flower subcategories (premium-flower, whole-flower, small-buds, etc.) → category: "flower"
- concentrates subcategories (badder, hash, live-resin, tinctures) → category: "concentrates"

Category-Specific THC Fields:
- For flower, prerolls, vaporizers, concentrates: Use thc_percentage_min and thc_percentage_max when THC preference is mentioned
- For edibles: Use thc_per_unit_mg_min and thc_per_unit_mg_max when THC/dosage preference is mentioned
- NEVER mix these fields - use the correct one based on category

THC Potency Extraction - Three Scenarios:

**Scenario 1: Explicit Numbers**
- User mentions specific numbers: "5mg", "22%", "below 66%", "above 28%", "from 18 to 22%"
- For EXACT values ("5mg", "10mg THC", "22% THC"):
  - Use BOTH min AND max with the SAME value
  - "5mg edibles" → thc_per_unit_mg_min: 5, thc_per_unit_mg_max: 5
  - "22% flower" → thc_percentage_min: 22, thc_percentage_max: 22
- For ranges ("from 18 to 22%", "between 5 and 10mg"):
  - Use different min and max values
- For bounds ("below 66%", "above 28%", "at least 10mg"):
  - Use only the relevant min or max

**Scenario 2: Guided Flow Format**
- User mentions classification with range in Guided Flow format: "Strong (22-28%)", "Moderate (18-22%)", "Mild (<66%)"
- These use the Guided Flow classification scales (5 categories):
  - Flower/Prerolls: Mild (<13%), Balanced (13-18%), Moderate (18-22%), Strong (22-28%), Very Strong (>28%)
  - Vaporizers/Concentrates: Mild (<66%), Balanced (66-75%), Moderate (75-85%), Strong (85-90%), Very Strong (>90%)
- Extract according to the format shown:
  - Single bound (Mild <X%, Very Strong >X%) → Use ONLY the relevant min or max (omit the other)
  - Range (Balanced X-Y%, Moderate X-Y%, Strong X-Y%) → Use BOTH thc_percentage_min and thc_percentage_max

**Scenario 3: Natural Language Potency Terms (OPEN-ENDED)**
- User mentions potency terms WITHOUT Guided Flow format or explicit number ranges
- CRITICAL RULE: For strong/potent direction → Use ONLY thc_percentage_min (no max, open ceiling)
- CRITICAL RULE: For mild/weak direction → Use ONLY thc_percentage_max (no min, open floor)
- ONLY use BOTH min AND max when user provides:
  1. Guided Flow format with range: "Strong (85-90%)", "Moderate (18-22%)"
  2. Explicit numeric range: "from 72 to 95%", "between 75 and 90"
- SUPERLATIVES ("most potent", "strongest", "highest THC", "maximum strength"):
  - ALWAYS use ONLY minimum, NEVER maximum
  - "most potent vapes" → thc_percentage_min: 90 (NO max)
  - "strongest flower" → thc_percentage_min: 28 (NO max)
  - Superlatives imply "the highest available" - no upper bound

  **For Flower/Prerolls:**
  - Mild/Weak/Light/Low/Gentle/Beginner-friendly → thc_percentage_max: 13 (no min)
  - Balanced/Moderate/Medium/Average → thc_percentage_min: 13 (no max)
  - Strong/Potent/High/Intense → thc_percentage_min: 22 (no max)
  - Very Strong/Most Potent/Extreme/Maximum → thc_percentage_min: 28 (no max)

  **For Edibles:**
  - Mild/Weak/Light/Low/Gentle/Beginner-friendly → thc_per_unit_mg_max: 4 (no min)
  - Balanced/Moderate/Medium/Average → thc_per_unit_mg_min: 5 (no max)
  - Strong/Potent/High/Intense → thc_per_unit_mg_min: 10 (no max)
  - Very Strong/Most Potent/Extreme/Maximum → thc_per_unit_mg_min: 15 (no max)

  **For Vaporizers/Concentrates:**
  - Mild/Weak/Light/Low/Gentle/Beginner-friendly → thc_percentage_max: 66 (no min)
  - Balanced/Moderate/Medium/Average → thc_percentage_min: 66 (no max)
  - Strong/Potent/High/Intense → thc_percentage_min: 85 (no max)
  - Very Strong/Most Potent/Extreme/Maximum → thc_percentage_min: 90 (no max)

- **CRITICAL**: If user says "something strong" without category, DO NOT extract THC (category must be known first)
- Only extract if category is explicitly mentioned or can be inferred from subcategory

When extracting THC preferences:
- If category is "flower" or "prerolls", use Flower/Prerolls scale with thc_percentage_min/max
- If category is "vaporizers" or "concentrates", use Vaporizers/Concentrates scale with thc_percentage_min/max
- If category is "edibles", use thc_per_unit_mg_min/max (not percentage)
- If no category is specified, DO NOT extract THC preferences (category must be known first)

Subcategory Notes:
- Subcategory is most important for edibles when specifically mentioned, but can be omitted if uncertain
- For other categories, subcategory is less critical unless explicitly mentioned
- Only use subcategory if you are 100% certain it matches one of the valid options listed above
- If uncertain about subcategory, omit it entirely
- If user mentions multiple subcategories (e.g., "Chews and Gummies"), return as an array: ["chews", "gummies"]
- Subcategory can be a single string or an array of strings
- IMPORTANT: Subcategory must be a VALID subcategory value (premium-flower, gummies, cartridges, etc.)
- NEVER put category names (flower, edibles, prerolls, etc.) in the subcategory field
- DO NOT infer subcategory from potency, effects, or quality terms
- "potent vapes" → category: vaporizers, NO subcategory
- "potent flower" → category: flower, NO subcategory (NOT premium-flower!)
- "strong flower" → category: flower, NO subcategory
- "best flower" → category: flower, NO subcategory (NOT premium-flower!)
- Only extract subcategory when user EXPLICITLY says the subcategory name (cartridges, gummies, premium-flower, etc.)
- CRITICAL: Subcategory must EXACTLY match a valid subcategory value - NEVER create compound subcategories
- NEVER combine adjectives with subcategory names:
  - "fruity drinks" → subcategory: "drinks", flavor: ["fruity"] (NOT subcategory: "fruity drinks")
  - "berry gummies" → subcategory: "gummies", flavor: ["berry"] (NOT subcategory: "berry gummies")
- CRITICAL: These words ARE subcategories - if user mentions them, ALWAYS add as subcategory:
  - "drinks" → MUST add subcategory: "drinks" AND category: "edibles"
  - "chocolates" → MUST add subcategory: "chocolates" AND category: "edibles"
  - "gummies" → MUST add subcategory: "gummies" AND category: "edibles"
  - "infused" or "infused prerolls" → MUST add subcategory: ["infused-prerolls", "infused-preroll-packs"] AND category: "prerolls"
  - "cartridges" or "carts" → MUST add subcategory: "cartridges" AND category: "vaporizers"
- Example: "concentrates and drinks" → category: ["concentrates", "edibles"], subcategory: ["drinks"]
- Example: "flower and gummies" → category: ["flower", "edibles"], subcategory: ["gummies"]

Effects Notes:
- Valid canonical effects: calm, happy, relaxed, energetic, clear-mind, creative, focused, inspired, sleepy, uplifted
- When extracting effects, ALWAYS map to canonical effects using the mapping below:
  
  **Effects Mapping (phrase → canonical effect):**
  - Sleep-related: "deep sleep", "sleep", "rest", "restful", "drowsy", "tired", "bedtime", "nighttime", "sedated", "sedative" → "sleepy"
  - Relaxation-related: "chilling", "chill", "unwind", "unwinding", "mellow", "couch lock", "couch-lock", "body high", "body melt" → "relaxed"
  - Calm-related: "peaceful", "peace", "serene", "tranquil" → "calm"
  - Energy-related: "energized", "energy", "awake", "alert" → "energetic"
  - Uplift-related: "uplifting", "uplift", "elevated" → "uplifted"
  - Happy-related: "euphoric", "euphoria", "joy", "joyful" → "happy"
  - Focus-related: "concentration", "concentrated", "attentive", "alertness" → "focused"
  - Clarity-related: "clarity", "clear headed", "clear head", "mental clarity" → "clear-mind"
  - Creative-related: "creativity", "artistic", "imaginative" → "creative"
  - Inspiration-related: "inspiring", "motivated", "motivation" → "inspired"
  Deeper-context examples:
  - social setting, party, gathering → happy, creative, focused, energized, uplifted, relaxed, uplifted
  - artistic, creative, imaginative, expoloratory, djing → creative, focused, inspired
  - deep sleep, bedtime, nighttime → sleepy, relaxed

  
- If an effect phrase doesn't match any mapping above, still include it in lowercase (don't be too restrictive)
- Effects should be lowercase
- Effects can be an array of strings
- Always prefer canonical effects when mapping is available
- ALWAYS apply effect mapping and DEDUPLICATE - never return both original and mapped effect
- DO NOT EVER return non-canonical effects like "joyful", "tired", "euphoric" in the effects array
- "joyful" → MUST become "happy" (do NOT return "joyful")
- "happy and joyful" → return ONLY ["happy"] since joyful maps to happy
- "sleepy and tired" → return ONLY ["sleepy"] since tired maps to sleepy
- If user mentions ANY word from the effects mapping, return ONLY the canonical effect it maps to

Type mapping:
- "indica", "indica-dominant" → "indica"
- "sativa", "sativa-dominant" → "sativa"
- "hybrid" → "hybrid"
- "indica-hybrid", "indica-hybrid-dominant" → "indica-hybrid"
- "sativa-hybrid", "sativa-hybrid-dominant" → "sativa-hybrid"

Return ONLY valid JSON with:
1. "intent": "recommendation" or "general"
2. "filters": { 
    "category": (flower, prerolls, edibles, concentrates, vaporizers, cbd) or array of these categories or null,
    "type": (indica, sativa, hybrid, indica-hybrid, sativa-hybrid) or array of these types or null,
    "thc_percentage_min": (number) or null,
    "thc_percentage_max": (number) or null,
    "thc_per_unit_mg_min": (number) or null,
    "thc_per_unit_mg_max": (number) or null,
    "subcategory": (string or array of strings) or null,
    "effects": (array of strings) or null,
    "flavor": (array of strings) or null,
    "brand": (string) or null,
    "price_min": (number) or null,
    "price_max": (number) or null
}
3. "semantic_search": "3-5 keywords describing desired mood/effect/flavor" or empty string

Semantic Search Generation Guidelines:
- Focus on EFFECT-RELATED keywords that match product description vocabulary
- Include effect synonyms: energizing → energetic, uplifting, focused, creative, sativa, daytime
- Include mood/context words: party → social, festive, upbeat; sleep → nighttime, bedtime, restful
- De-emphasize category names (category is filtered via metadata, not semantic search)
- Good: "energetic uplifting focused creative sativa daytime" (effect-vocabulary focused)
- Bad: "energizing flower edibles" (category-blended, doesn't match embeddings)

Examples:
- "Can you recommend something to get me sleepy and relaxed?"
  Result: {
    "intent": "recommendation",
    "filters": {
      "effects": ["sleepy", "relaxed"]
    },
    "semantic_search": "sleepy relaxed nighttime"
  }
  Note: Extract effects (working well), but NO category, type, or THC extracted - user didn't specify them

- "Any decent Indica hybrid?"
  Result: {
    "intent": "recommendation",
    "filters": {
      "type": "indica-hybrid"
    },
    "semantic_search": "indica hybrid"
  }
  Note: "indica-hybrid" is a TYPE, not a category. Do NOT infer category - user didn't mention flower, prerolls, or any other category.

- "How about energizing flower and edibles?"
  Result: {
    "intent": "recommendation",
    "filters": {
      "category": ["flower", "edibles"],
      "effects": ["energized"]
    },
    "semantic_search": "energetic uplifting focused creative sativa daytime boost"
  }
  Note: semantic_search focuses on effect vocabulary that matches product embeddings, not category names. Categories are filtered via metadata.

- "Can you recommend sativa flower that keeps me energized and is uplifting?"
  Result: {
    "intent": "recommendation",
    "filters": {
      "category": "flower",
      "type": "sativa",
      "effects": ["energized", "uplifting"]
    },
    "semantic_search": "energized uplifting sativa flower"
  }
  Note: All fields explicitly mentioned - extract them all

- "Looking for Concentrates products with Mild (<66%) THC percentage"
  Result: {
    "intent": "recommendation",
    "filters": { "category": "concentrates", "thc_percentage_max": 66 },
    "semantic_search": "concentrates products"
  }
  Note: Guided Flow format with single bound - use ONLY thc_percentage_max (no min)

- "Looking for Flower products with Moderate (18-22%) THC percentage"
  Result: {
    "intent": "recommendation",
    "filters": { "category": "flower", "thc_percentage_min": 18, "thc_percentage_max": 22 },
    "semantic_search": "flower products"
  }
  Note: Guided Flow format with range - use BOTH thc_percentage_min and thc_percentage_max

- "I want 5mg gummies/chocolate/cookie/baked"
  Result: {
    "intent": "recommendation",
    "filters": { 
      "category": "edibles", 
      "subcategory": ["gummies"/"chocolates"/"cooking-baking"],
      "thc_per_unit_mg_min": 5, 
      "thc_per_unit_mg_max": 5 
    },
    "semantic_search": "gummies edible products"
  }
  Note: "gummies", "chocolates",  is a subcategory that implies "edibles" category - extract both category and subcategory
  Note: With edibles, terms like cookie, cake etc. should be mapped to "cooking-baking" subcategory

- "How about some 5mg gummies with berry flavor?"
  Result: {
    "intent": "recommendation",
    "filters": {
      "category": "edibles",
      "subcategory": ["gummies"],
      "flavor": ["berry"],
      "thc_per_unit_mg_min": 5
    },
    "semantic_search": "berry flavored gummies"
  }
  Note: Extract subcategory, flavor, and THC dosage when explicitly mentioned

- "Show me all-in-one vaporizers"
  Result: {
    "intent": "recommendation",
    "filters": {
      "category": "vaporizers",
      "subcategory": ["all-in-one"]
    },
    "semantic_search": "all-in-one vaporizers"
  }
  Note: "all-in-one" is a subcategory that implies "vaporizers" category

- "I want cartridges"
  Result: {
    "intent": "recommendation",
    "filters": {
      "category": "vaporizers",
      "subcategory": ["cartridges"]
    },
    "semantic_search": "cartridges vaporizers"
  }
  Note: "cartridges" is a subcategory that implies "vaporizers" category

- "Show me infused prerolls"
  Result: {
    "intent": "recommendation",
    "filters": {
      "category": "prerolls",
      "subcategory": ["infused-prerolls", "infused-preroll-packs"]
    },
    "semantic_search": "infused prerolls"
  }
  Note: "infused-prerolls" is a subcategory that implies "prerolls" category

- "I want premium flower"
  Result: {
    "intent": "recommendation",
    "filters": {
      "category": "flower",
      "subcategory": ["premium-flower"]
    },
    "semantic_search": "premium flower"
  }
  Note: "premium-flower" is a subcategory that implies "flower" category (note: use "premium-flower" not just "premium")

- "Show me flower with 22% THC"
  Result: {
    "intent": "recommendation",
    "filters": { "category": "flower", "thc_percentage_min": 22, "thc_percentage_max": 22 },
    "semantic_search": "flower products"
  }

- "I want something strong for sleep"
  Result: {
    "intent": "recommendation",
    "filters": {
      "effects": ["sleepy"]
    },
    "semantic_search": "strong sleep nighttime"
  }
  Note: Extract effects ("sleep" → "sleepy"), but "strong" is ambiguous without category - omit THC fields

- "I want strong flower for sleep"
  Result: {
    "intent": "recommendation",
    "filters": { 
      "category": "flower", 
      "effects": ["sleepy"],
      "thc_percentage_min": 22
    },
    "semantic_search": "strong sleep nighttime"
  }
  Note: Category is known, "strong" maps to min 22% using 3-category natural language classification, extract effects too

Additional recommendation intent examples:
- "Can you tell me about products for deep sleep?" → "intent": "recommendation",
  Note: Asking about products → recommendation intent. "deep sleep" maps to "sleepy" effect.
- "cool any pre roll or flower for deep sleep" → "intent": "recommendation",
  Note: Asking for products ("any") → recommendation intent. Category and effects extracted.
- "anything for deep deep sleep, like a baby?" → "intent": "recommendation",
  Note: Asking for products ("anything for") → recommendation intent. "deep sleep" maps to "sleepy" effect.
- Followup on existing conversation: how about effect XYZ, or how about category XYZ? 
- We should refer to the most recent request and also be able to interpet short requests like that as "recommendation" intent.

- "What are your hours?"
  Result: {
    "intent": "general",
    "filters": {},
    "semantic_search": ""
  }

${conversationHistory ? `Conversation history:\n${conversationHistory}\n\n` : ""}

Latest user message: "${lastMessage}"

Return ONLY valid JSON. Do not wrap in markdown code blocks.`;

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
        max_tokens: 2000,
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

    if (!cleanedText || cleanedText.length === 0) {
      console.error("Cleaned text is empty after processing. Original text:", text);
      throw new Error("Empty response from LLM after cleaning");
    }

    const parsed = JSON.parse(cleanedText);
    
    // Validate and normalize response structure
    const response = {
      intent: parsed.intent === "recommendation" ? "recommendation" : "general",
      filters: parsed.filters || {},
      semantic_search: parsed.semantic_search || ""
    };

    // Validate and normalize filters
    const normalizedFilters: Record<string, any> = {};
    
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
    
    // Normalize type to lowercase
    if (response.filters.type) {
      const normalizedType = response.filters.type.toLowerCase();
      if (["indica", "sativa", "hybrid", "indica-hybrid", "sativa-hybrid"].includes(normalizedType)) {
        normalizedFilters.type = normalizedType;
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

  const API_KEY = getApiKey(ACTIVE_PROVIDER, c.env);
  const MODEL = getModelForRole(ACTIVE_PROVIDER, "STREAM");
  const BASE_URL = getBaseUrl(ACTIVE_PROVIDER);

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

    if (!response || !response.ok) {
      const errorText = response ? await response.text() : "Network error";
      console.error(`Groq Stream API error (${response?.status || 'network'}):`, errorText);
      return c.json({ 
        error: "Our streaming service is experiencing technical difficulties at the moment. Please try again.",
        service: "stream"
      }, 503);
    }

  } catch (err) {
    const formatError = `Groq Stream Error: ${err}`;
    console.error(formatError);
    return c.json({ 
      error: "Our streaming service is experiencing technical difficulties at the moment. Please try again.",
      service: "stream"
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
  // console.log("filters", JSON.stringify(filters, null, 2));

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
    
    // console.log("filtersToUse", JSON.stringify(filtersToUse, null, 2));
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

  const reRankPrompt = `
You are a Master Budtender with deep domain expertise. Your goal is to rank cannabis products based on how perfectly they match a user's specific request.

### DOMAIN KNOWLEDGE: POTENCY & BIOAVAILABILITY

1. **Numerical Discrepancy**: Inhalable products (Flower, Prerolls, Vapes) will always show higher raw THC mg counts (e.g., 180mg+) than Edibles (capped at 100mg/package).

2. **Bioavailability**: Smoking is inefficient (~20-30% absorption), while Edibles are processed by the liver into 11-Hydroxy-THC, which is significantly more potent and long-lasting.

3. **Safety Advice**: Never compare 100mg of a Preroll to 100mg of an Edible. 100mg of an edible is considered a very high dose for most users, whereas 100mg in a preroll is a standard single-session amount.

4. **Guidance**: If a user asks for "the strongest," provide top options from both categories (e.g., a "Diamond Dusted Preroll" and a "100mg Nano-Enhanced Gummy") rather than just the one with the highest math-based THC number.

### RANKING PRIORITIES (in order of importance):

1. **EFFECTS MATCH** (CRITICAL - highest priority):
   - If user requests effects like "energized", "uplifting", "focused", "creative", "energetic" → STRONGLY prefer Sativa products (rank Sativa highest)
   - If user requests effects like "sleepy", "sedated", "calm", "relaxed", "sleep", "rest" → STRONGLY prefer Indica products (rank Indica highest)
   - Effects matching is MORE important than category diversity - don't sacrifice effect quality for variety
   - CRITICAL EXCLUSION: If user requests stimulating effects (energized, uplifting, focused, creative) and a product has ONLY relaxing effects (sleepy, sedated, calm, relaxed) with NO stimulating effects, EXCLUDE it from ranking entirely
   - CRITICAL EXCLUSION: If user requests relaxing effects (sleepy, calm, relaxed) and a product has ONLY stimulating effects with NO relaxing effects, EXCLUDE it from ranking entirely
   - Only include products that have AT LEAST ONE effect matching or compatible with the user's request

2. **Category Match** (when category is specified):
   - Rank products matching the specified category(s) highest
   - If multiple categories specified, rank within each category by effect match

3. **Category Preference** (when category NOT specified):
   - When no category is specified, prefer this order: Prerolls > Flower > Edibles > Vapes > Concentrates/Tinctures
   - BUT still maintain variety: include best match from each category (best preroll, best flower, best edible, best vape)
   - Don't sacrifice effect importance for category diversity - effects are more important than category variety
   - Example: If user wants "most uplifting products", show: best uplifting preroll, best uplifting flower, best uplifting edible, best uplifting vape (not just prerolls)

4. **Type Match** (Sativa/Indica/Hybrid):
   - Rank products matching requested type highest
   - If effects suggest a type (energized → Sativa, sleepy → Indica), prioritize that type even if not explicitly mentioned

5. **THC/Potency Match**:
   - Consider THC percentage or mg ranges when specified
   - Use domain knowledge: don't compare raw THC numbers across categories (see bioavailability section)

6. **Price Consideration**:
   - DO NOT rank most expensive products first unless:
     - User explicitly mentions price (e.g., "most expensive", "premium", "high-end")
     - User asks for "best quality" or "premium"
   - Most expensive can be 2nd or 3rd, but avoid putting it first unless price/quality is mentioned
   - When price range is specified, rank products within that range highest

7. **Other Factors**:
   - Subcategory match (when specified)
   - Flavor match (when specified)
   - Brand preference (when specified)
   - Description relevance

### USER REQUEST:
"${user_message}"

### USER PREFERENCES (from conversation):
${filters?.effects?.length ? `- Requested Effects: ${JSON.stringify(filters.effects)}` : ''}
${filters?.flavor?.length ? `- Requested Flavors: ${JSON.stringify(filters.flavor)}` : ''}
${filters?.category ? `- Category: ${filters.category}` : '- Category: NOT SPECIFIED (use category preference hierarchy)'}
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
1. Analyze the User Request holistically - consider effects (CRITICAL), category, type, flavors, price, THC level, and any other preferences.
2. Apply ranking priorities in order: Effects Match > Category Match/Preference > Type Match > THC/Potency > Price > Other factors
3. Evaluate each candidate product based on ALL relevant fields: category, type, subcategory, description, effects, flavors, price, THC percentage (considering min/max ranges), brand, etc.
4. When category is NOT specified:
   - Use category preference hierarchy (Prerolls > Flower > Edibles > Vapes > Concentrates)
   - BUT maintain variety: include best match from each category
   - Effects are MORE important than category variety - don't sacrifice effect quality
5. Effects-based ranking:
   - Energized/Uplifting/Focused/Partying/Social Setting → STRONGLY prefer Sativa
   - Sleepy/Sedated/Calm/Relaxed/Bedtime/Nighttime → STRONGLY prefer Indica
6. Price ranking:
   - DO NOT put most expensive first unless price/premium/quality explicitly mentioned
   - Most expensive can be 2nd or 3rd position
7. Rank products from BEST overall match to LEAST match, considering how well each product satisfies the complete user request.
8. If a product clearly contradicts the user's request (e.g., user wants "not sleepy" but product says "heavy sedative"), remove it entirely.
9. Return ONLY a JSON object with a "ranked_names" array containing product names in order of best match.

### RESPONSE FORMAT (STRICT):
{
  "ranked_names": ["Product Name 1", "Product Name 2", "Product Name 3", ...]
}

Return ONLY valid JSON. Do not wrap in markdown code blocks.
`;

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
        max_tokens: 3000,
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
        service: "recommendations"
      }, 200);
    }

    const data = await resp.json();
    text = data.choices?.[0]?.message?.content || "";
    
    if (!text || text.trim().length === 0) {
      console.error("Groq Re-ranking API returned empty response:", JSON.stringify(data, null, 2));
      // Fallback to original search results
      return c.json({ 
        recommendations: results,
        error: "Our recommendation service is experiencing technical difficulties. Showing results without AI ranking.",
        service: "recommendations"
      }, 200);
    }

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
          recommendations: results,
          filtersToUse: filtersToUse,
          error: "No ranked names found"
        }, 200);
      }
      
      return c.json({ 
        recommendations: rankedProducts, 
        preRankedProducts: results, 
        filtersToUse: filtersToUse }, 200);
    } catch (err) {
      console.error("Invalid JSON from LLM:", text);
      console.error("Extracted JSON:", jsonText);
      console.error("Error:", err);
      // Fallback to original search results if re-ranking fails
      return c.json({ 
        recommendations: results,
        filtersToUse: filtersToUse,
        error: "Invalid JSON from LLM"
      }, 200);
    }

  } catch (err) {
    console.error("Recommendation service error:", err);
    // Fallback to original search results
    return c.json({ 
      recommendations: results,
      error: "Our recommendation service is experiencing technical difficulties. Showing results without AI ranking.",
      service: "recommendations"
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