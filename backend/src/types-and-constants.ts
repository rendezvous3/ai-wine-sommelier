const enum MODEL_PROVIDER {
    DEEPSEEK = "deepseek",
    LLAMA = "llama"
}

const enum LLM_PROVIDER {
    CEREBRAS = "cerebras",
    GROQ = "groq",
    GOOGLE = "google",
    OPENAI = "openai",
    MULTI = "multi"
}

const enum AGENT_ROLE {
    MAITRED = "matried",
    RECOMMEND = "recommend"
}

const enum AGENT_ROLE_MODEL {
    // STREAMING = "llama-3.1-8b-instant",
    INTENT = "llama-3.1-8b-instant",
    STREAM = "llama-3.3-70b-versatile",
    // RECOMMEND = "llama-3.1-8b-instant",
    RECOMMEND = "qwen/qwen3-32b",
}

// ============================================
// MODEL NAME CONSTANTS (no more magic strings)
// ============================================
const enum GROQ_MODEL_NAMES {
  LLAMA_31_8B_INSTANT = "llama-3.1-8b-instant",
  LLAMA_33_70B_VERSATILE = "llama-3.3-70b-versatile",
  QWEN_3_32B = "qwen/qwen3-32b",
}

const enum CEREBRAS_MODEL_NAMES {
  LLAMA_33_70B = "llama-3.3-70b",
  QWEN_3_32B = "qwen-3-32b",
}

const enum GOOGLE_MODEL_NAMES {
  GEMINI_25_FLASH = "gemini-2.5-flash",
}

const enum OPENAI_MODEL_NAMES {
  GPT_4O_MINI = "gpt-4o-mini",
  GPT_4O = "gpt-4o",
}

// ============================================
// ROLE → MODEL MAPPINGS (using constants)
// ============================================
const GROQ_MODELS = {
  INTENT: GROQ_MODEL_NAMES.LLAMA_33_70B_VERSATILE,  // 70B for HYDE + Potency Gate
  STREAM: GROQ_MODEL_NAMES.LLAMA_33_70B_VERSATILE,
  RECOMMEND: GROQ_MODEL_NAMES.QWEN_3_32B,
} as const;

const CEREBRAS_MODELS = {
  INTENT: CEREBRAS_MODEL_NAMES.LLAMA_33_70B,
  STREAM: CEREBRAS_MODEL_NAMES.LLAMA_33_70B,
  RECOMMEND: CEREBRAS_MODEL_NAMES.QWEN_3_32B,
} as const;

const GOOGLE_MODELS = {
  INTENT: GOOGLE_MODEL_NAMES.GEMINI_25_FLASH,
  STREAM: GOOGLE_MODEL_NAMES.GEMINI_25_FLASH,
  RECOMMEND: GOOGLE_MODEL_NAMES.GEMINI_25_FLASH,
} as const;

const OPENAI_MODELS = {
  INTENT: OPENAI_MODEL_NAMES.GPT_4O,
  STREAM: OPENAI_MODEL_NAMES.GPT_4O_MINI,
  RECOMMEND: OPENAI_MODEL_NAMES.GPT_4O_MINI,
} as const;

// Type for environment bindings (minimal interface for API keys)
interface EnvBindings {
  GROQ_API_KEY?: string;
  CEREBRAS_API_KEY_PROD: string;
  GEMINI_API_KEY?: string;
  OPENAI_API_KEY?: string;
}

// Provider configuration
const PROVIDER_CONFIG = {
  [LLM_PROVIDER.GROQ]: {
    models: GROQ_MODELS,
    baseUrl: "https://api.groq.com/openai/v1",
    getApiKey: (env: EnvBindings) => env.GROQ_API_KEY,
  },
  [LLM_PROVIDER.CEREBRAS]: {
    models: CEREBRAS_MODELS,
    baseUrl: "https://api.cerebras.ai/v1",
    getApiKey: (env: EnvBindings) => env.CEREBRAS_API_KEY_PROD,
  },
  [LLM_PROVIDER.GOOGLE]: {
    models: GOOGLE_MODELS,
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    getApiKey: (env: EnvBindings) => env.GEMINI_API_KEY,
  },
  [LLM_PROVIDER.OPENAI]: {
    models: OPENAI_MODELS,
    baseUrl: "https://api.openai.com/v1",
    getApiKey: (env: EnvBindings) => env.OPENAI_API_KEY,
  },
} as const;

// Helper function to get model for a role based on provider
function getModelForRole(provider: LLM_PROVIDER, role: keyof typeof GROQ_MODELS): string {
  return PROVIDER_CONFIG[provider].models[role];
}

// Helper function to get base URL for provider
function getBaseUrl(provider: LLM_PROVIDER): string {
  return PROVIDER_CONFIG[provider].baseUrl;
}

// Helper function to get API key for provider
function getApiKey(provider: LLM_PROVIDER, env: EnvBindings): string | undefined {
  return PROVIDER_CONFIG[provider].getApiKey(env);
}

const STORE_NAME = "Cannavita"

// Feature flags
const USE_FIRE_AT_2_PROMPT = false // Set to true to use streamFireAt2 (Version B), false for stream (Version A)

// ============================================
// MULTI-PROVIDER CONFIGURATION
// ============================================
// Active mode: MULTI allows different providers per endpoint
const ACTIVE_PROVIDER = LLM_PROVIDER.MULTI;

// Per-endpoint provider assignments (used when ACTIVE_PROVIDER = MULTI)
const enum MULTI_ENDPOINT_PROVIDERS {
  STREAM = LLM_PROVIDER.OPENAI,   // GPT-4o-mini - Fast, reliable streaming
  INTENT = LLM_PROVIDER.GROQ,     // Llama 3.3 70B - Smart for HYDE + Potency Gate
  RERANK = LLM_PROVIDER.GROQ,     // Qwen 3 32B - Good for ranking
}

// Legacy constants for backward compatibility (reference MULTI_ENDPOINT_PROVIDERS)
const STREAM_PROVIDER = MULTI_ENDPOINT_PROVIDERS.STREAM;
const INTENT_PROVIDER = MULTI_ENDPOINT_PROVIDERS.INTENT;
const RERANK_PROVIDER = MULTI_ENDPOINT_PROVIDERS.RERANK;

// ---------- MODEL IDS (NEW, ADDITIVE) ----------
const enum MODEL_ID {
  // GROQ
  GROQ_LLAMA_31_8B_INSTANT = "groq_llama_31_8b_instant",
  GROQ_LLAMA_33_70B = "groq_llama_33_70b",
  GROQ_QWEN_3_32B = "groq_qwen_3_32b",

  // CEREBRAS
  CEREBRAS_LLAMA_31_8B = "cerebras_llama_31_8b",
  CEREBRAS_LLAMA_33_70B = "cerebras_llama_33_70b",
  CEREBRAS_QWEN_3_32B = "cerebras_qwen_3_32b",
  CEREBRAS_ZAI_GLM_4_7 = "zai-glm-4.7",
  CEREBRAS_GPT_OSS_120B = "gpt-oss-120b"
}

// ---------- MODEL → ID MAP (NEW) ----------
const MODEL_ID_MAP = {
  // Groq
  [GROQ_MODELS.INTENT]: MODEL_ID.GROQ_LLAMA_31_8B_INSTANT,
  [GROQ_MODELS.STREAM]: MODEL_ID.GROQ_LLAMA_33_70B,
  [GROQ_MODELS.RECOMMEND]: MODEL_ID.GROQ_QWEN_3_32B,

  // Cerebras
  [CEREBRAS_MODELS.INTENT]: MODEL_ID.CEREBRAS_LLAMA_31_8B,
  [CEREBRAS_MODELS.STREAM]: MODEL_ID.CEREBRAS_LLAMA_33_70B,
  [CEREBRAS_MODELS.RECOMMEND]: MODEL_ID.CEREBRAS_QWEN_3_32B,
} as const;

// ---------- TOKEN LIMITS (NEW) ----------
type Tier = "FREE" | "PAID";

interface ModelTokenLimits {
  contextWindow: number;
  maxOutputTokens: number;
}

const MODEL_TOKEN_LIMITS: Record<
  MODEL_ID,
  Record<Tier, ModelTokenLimits>
> = {
  // ---------- GROQ  ----------
  [MODEL_ID.GROQ_LLAMA_31_8B_INSTANT]: {
    FREE: { contextWindow: 128_000, maxOutputTokens: 8_192 },
    PAID: { contextWindow: 128_000, maxOutputTokens: 8_192 },
  },

  [MODEL_ID.GROQ_LLAMA_33_70B]: {
    FREE: { contextWindow: 131_072, maxOutputTokens: 32_768 },
    PAID: { contextWindow: 131_072, maxOutputTokens: 32_768 },
  },

  [MODEL_ID.GROQ_QWEN_3_32B]: {
    FREE: { contextWindow: 131_072, maxOutputTokens: 40_960 },
    PAID: { contextWindow: 131_072, maxOutputTokens: 40_960 },
  },

  // ---------- CEREBRAS ----------
  [MODEL_ID.CEREBRAS_LLAMA_31_8B]: {
    FREE: { contextWindow: 32_000, maxOutputTokens: 4_096 },
    PAID: { contextWindow: 64_000, maxOutputTokens: 8_192 },
  },

  [MODEL_ID.CEREBRAS_LLAMA_33_70B]: {
    FREE: { contextWindow: 32_000, maxOutputTokens: 8_192 },
    PAID: { contextWindow: 128_000, maxOutputTokens: 32_768 },
  },

  [MODEL_ID.CEREBRAS_QWEN_3_32B]: {
    FREE: { contextWindow: 32_000, maxOutputTokens: 8_192 },
    PAID: { contextWindow: 131_072, maxOutputTokens: 32_768 },
  },
};

// ---------- SAFE TOKEN CLAMP (NEW) ----------
function getTokenLimitsForModel(
  modelName: string,
  tier: Tier,
): ModelTokenLimits {
  const modelId = MODEL_ID_MAP[modelName as keyof typeof MODEL_ID_MAP];
  if (!modelId) {
    // Fallback to conservative defaults if model not found
    return { contextWindow: 32_000, maxOutputTokens: 4_096 };
  }
  return MODEL_TOKEN_LIMITS[modelId][tier];
}

function clampMaxTokens(
  modelName: string,
  tier: Tier,
  promptTokens: number,
  requestedOutputTokens: number,
): number {
  const { contextWindow, maxOutputTokens } =
    getTokenLimitsForModel(modelName, tier);

  const remaining = contextWindow - promptTokens;
  return Math.max(
    0,
    Math.min(requestedOutputTokens, remaining, maxOutputTokens),
  );
}

function getModelId(modelName: string): MODEL_ID | null {
  return MODEL_ID_MAP[modelName as keyof typeof MODEL_ID_MAP] || null;
}

export {
    MODEL_PROVIDER,
    LLM_PROVIDER,
    AGENT_ROLE,
    STORE_NAME,
    USE_FIRE_AT_2_PROMPT,
    // Multi-provider configuration
    ACTIVE_PROVIDER,
    MULTI_ENDPOINT_PROVIDERS,
    // Legacy endpoint providers (backward compatibility)
    STREAM_PROVIDER,
    INTENT_PROVIDER,
    RERANK_PROVIDER,
    // Model name constants
    GROQ_MODEL_NAMES,
    CEREBRAS_MODEL_NAMES,
    GOOGLE_MODEL_NAMES,
    OPENAI_MODEL_NAMES,
    // Model role mappings
    AGENT_ROLE_MODEL, // Keep for backwards compatibility if needed
    GROQ_MODELS,
    CEREBRAS_MODELS,
    GOOGLE_MODELS,
    OPENAI_MODELS,
    // Provider configuration
    PROVIDER_CONFIG,
    getModelForRole,
    getBaseUrl,
    getApiKey,
    getTokenLimitsForModel,
}
export type { Tier }