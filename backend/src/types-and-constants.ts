const enum MODEL_PROVIDER {
    DEEPSEEK = "deepseek",
    LLAMA = "llama"
}

const enum LLM_PROVIDER {
    CEREBRAS = "cerebras",
    GROQ = "groq",
    GOOGLE = "google",
    OPENAI = "openai",
    GROK = "grok",  // X.AI (Elon's company, NOT Groq)
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

const enum GROK_MODEL_NAMES {
  GROK_4_1_FAST_NON_REASONING = "grok-4-1-fast-non-reasoning",
  GROK_4_1_FAST_REASONING = "grok-4-1-fast-reasoning",
  GROK_3_MINI = "grok-3-mini",
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

const GROK_MODELS = {
  INTENT: GROK_MODEL_NAMES.GROK_4_1_FAST_REASONING,
  STREAM: GROK_MODEL_NAMES.GROK_4_1_FAST_NON_REASONING,
  RECOMMEND: GROK_MODEL_NAMES.GROK_4_1_FAST_REASONING,  // Switched to fast model for speed
} as const;

// Type for environment bindings (minimal interface for API keys)
interface EnvBindings {
  GROQ_API_KEY?: string;
  CEREBRAS_API_KEY_PROD: string;
  GEMINI_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GROK_API_KEY?: string;
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
  [LLM_PROVIDER.GROK]: {
    models: GROK_MODELS,
    baseUrl: "https://api.x.ai/v1",
    getApiKey: (env: EnvBindings) => env.GROK_API_KEY,
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
  STREAM = LLM_PROVIDER.GROK,     // Grok 4.1 Fast Non-Reasoning - X.AI
  INTENT = LLM_PROVIDER.GROQ,     // Llama 3.3 70B - Smart for HYDE + Potency Gate
  RERANK = LLM_PROVIDER.GROK,     // Grok 3 Mini - Testing if it follows instructions better
}

// Legacy constants for backward compatibility (reference MULTI_ENDPOINT_PROVIDERS)
const STREAM_PROVIDER = MULTI_ENDPOINT_PROVIDERS.STREAM as unknown as LLM_PROVIDER;
const INTENT_PROVIDER = MULTI_ENDPOINT_PROVIDERS.INTENT as unknown as LLM_PROVIDER;
const RERANK_PROVIDER = MULTI_ENDPOINT_PROVIDERS.RERANK as unknown as LLM_PROVIDER;

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
  CEREBRAS_ZAI_GLM_4_7 = "cerebras_zai_glm_4_7",
  CEREBRAS_GPT_OSS_120B = "cerebras_gpt_oss_120b",

  // GOOGLE
  GOOGLE_GEMINI_25_FLASH = "google_gemini_25_flash",

  // OPENAI
  OPENAI_GPT_4O_MINI = "openai_gpt_4o_mini",
  OPENAI_GPT_4O = "openai_gpt_4o",

  // GROK (X.AI)
  GROK_4_1_FAST_NON_REASONING = "grok_4_1_fast_non_reasoning",
  GROK_4_1_FAST_REASONING = "grok_4_1_fast_reasoning",
  GROK_3_MINI = "grok_3_mini"
}

// ---------- MODEL → ID MAP (NEW) ----------
const MODEL_ID_MAP = {
  // Groq (INTENT and STREAM both use 70B, so only one entry)
  [GROQ_MODEL_NAMES.LLAMA_33_70B_VERSATILE]: MODEL_ID.GROQ_LLAMA_33_70B,
  [GROQ_MODEL_NAMES.QWEN_3_32B]: MODEL_ID.GROQ_QWEN_3_32B,

  // Cerebras (INTENT and STREAM both use 70B, so only one entry)
  [CEREBRAS_MODEL_NAMES.LLAMA_33_70B]: MODEL_ID.CEREBRAS_LLAMA_33_70B,
  [CEREBRAS_MODEL_NAMES.QWEN_3_32B]: MODEL_ID.CEREBRAS_QWEN_3_32B,

  // Google
  [GOOGLE_MODEL_NAMES.GEMINI_25_FLASH]: MODEL_ID.GOOGLE_GEMINI_25_FLASH,

  // OpenAI
  [OPENAI_MODEL_NAMES.GPT_4O_MINI]: MODEL_ID.OPENAI_GPT_4O_MINI,
  [OPENAI_MODEL_NAMES.GPT_4O]: MODEL_ID.OPENAI_GPT_4O,

  // Grok (X.AI)
  [GROK_MODEL_NAMES.GROK_4_1_FAST_NON_REASONING]: MODEL_ID.GROK_4_1_FAST_NON_REASONING,
  [GROK_MODEL_NAMES.GROK_4_1_FAST_REASONING]: MODEL_ID.GROK_4_1_FAST_REASONING,
  [GROK_MODEL_NAMES.GROK_3_MINI]: MODEL_ID.GROK_3_MINI,
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

  [MODEL_ID.CEREBRAS_ZAI_GLM_4_7]: {
    FREE: { contextWindow: 32_000, maxOutputTokens: 8_192 },
    PAID: { contextWindow: 128_000, maxOutputTokens: 16_384 },
  },

  [MODEL_ID.CEREBRAS_GPT_OSS_120B]: {
    FREE: { contextWindow: 32_000, maxOutputTokens: 8_192 },
    PAID: { contextWindow: 128_000, maxOutputTokens: 32_768 },
  },

  // ---------- GOOGLE ----------
  [MODEL_ID.GOOGLE_GEMINI_25_FLASH]: {
    FREE: { contextWindow: 1_000_000, maxOutputTokens: 8_192 },
    PAID: { contextWindow: 1_000_000, maxOutputTokens: 8_192 },
  },

  // ---------- OPENAI ----------
  [MODEL_ID.OPENAI_GPT_4O_MINI]: {
    FREE: { contextWindow: 128_000, maxOutputTokens: 16_384 },
    PAID: { contextWindow: 128_000, maxOutputTokens: 16_384 },
  },

  [MODEL_ID.OPENAI_GPT_4O]: {
    FREE: { contextWindow: 128_000, maxOutputTokens: 16_384 },
    PAID: { contextWindow: 128_000, maxOutputTokens: 16_384 },
  },

  // ---------- GROK (X.AI) ----------
  [MODEL_ID.GROK_4_1_FAST_NON_REASONING]: {
    FREE: { contextWindow: 2_000_000, maxOutputTokens: 32_768 },
    PAID: { contextWindow: 2_000_000, maxOutputTokens: 32_768 },
  },

  [MODEL_ID.GROK_4_1_FAST_REASONING]: {
    FREE: { contextWindow: 2_000_000, maxOutputTokens: 32_768 },
    PAID: { contextWindow: 2_000_000, maxOutputTokens: 32_768 },
  },

  [MODEL_ID.GROK_3_MINI]: {
    FREE: { contextWindow: 131_072, maxOutputTokens: 16_384 },
    PAID: { contextWindow: 131_072, maxOutputTokens: 16_384 },
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
    GROK_MODEL_NAMES,
    // Model role mappings
    AGENT_ROLE_MODEL, // Keep for backwards compatibility if needed
    GROQ_MODELS,
    CEREBRAS_MODELS,
    GOOGLE_MODELS,
    OPENAI_MODELS,
    GROK_MODELS,
    // Provider configuration
    PROVIDER_CONFIG,
    getModelForRole,
    getBaseUrl,
    getApiKey,
    getTokenLimitsForModel,
}
export type { Tier }