const enum MODEL_PROVIDER {
    DEEPSEEK = "deepseek",
    LLAMA = "llama"
}

const enum LLM_PROVIDER {
    CEREBRAS = "cerebras",
    GROQ = "groq"
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

// Model mappings for each provider
const GROQ_MODELS = {
  INTENT: "llama-3.1-8b-instant",
  STREAM: "llama-3.3-70b-versatile",
  RECOMMEND: "qwen/qwen3-32b",
} as const;

const CEREBRAS_MODELS = {
  INTENT: "llama3.1-8b",
  STREAM: "llama-3.3-70b",
  RECOMMEND: "qwen-3-32b",
} as const;

// Type for environment bindings (minimal interface for API keys)
interface EnvBindings {
  GROQ_API_KEY?: string;
  CEREBRAS_API_KEY: string;
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
    getApiKey: (env: EnvBindings) => env.CEREBRAS_API_KEY,
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

export {
    MODEL_PROVIDER,
    LLM_PROVIDER,
    AGENT_ROLE,
    STORE_NAME,
    AGENT_ROLE_MODEL, // Keep for backwards compatibility if needed
    GROQ_MODELS,
    CEREBRAS_MODELS,
    PROVIDER_CONFIG,
    getModelForRole,
    getBaseUrl,
    getApiKey,
}