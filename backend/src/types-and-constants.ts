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

const STORE_NAME = "Cannavita"

export {
    MODEL_PROVIDER,
    LLM_PROVIDER,
    AGENT_ROLE,
    STORE_NAME,
    AGENT_ROLE_MODEL
}