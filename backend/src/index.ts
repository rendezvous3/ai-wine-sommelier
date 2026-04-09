import { Hono } from "hono";
import { cors } from 'hono/cors';
import { generatePrompt } from "./prompt";
import {
  generateIntentWithCuePrompt,
  generateReRankPrompt
} from "./prompts";
import {
  LLM_PROVIDER,
  STREAM_PROVIDER,
  INTENT_PROVIDER,
  RERANK_PROVIDER,
  getModelForRole,
  getBaseUrl,
  getApiKey,
  getTokenLimitsForModel,
  type Tier
} from "./types-and-constants";
import {
  formatConversationHistory,
  validateWineFilters,
  parseRobustJSON,
  buildCompactRerankCandidates,
} from "./utils";
import { getWineSchemaForPrompt } from './wine-schema';
import { searchWines, lookupWineByName, surpriseMe } from './wine-search';
import type { WineFilters } from './wine-search';
import { getProfile } from './profiles';
import {
  isAnalyticsEnabled,
  recordAnalyticsEvent,
  recordIntentAnalysis,
  recordProductLookupResult,
  recordRecommendationResults,
  recordStreamCompletion,
} from "./chat-analytics";
import type {
  D1Database,
  ExecutionContext,
} from "@cloudflare/workers-types";

interface Bindings {
  CEREBRAS_API_KEY_PROD: string;
  GROQ_API_KEY?: string;
  GEMINI_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GROK_API_KEY?: string;
  RESEND_API_KEY: string;
  WINE_DB: D1Database;
  ANALYTICS_DB?: D1Database;
  PROFILE_TYPE?: string;
  ENVIRONMENT?: string;
}

const TIER: Tier = "FREE";
const RERANK_SKIP_CANDIDATE_MAX = 3;

function devLog(env: Bindings | undefined, ...args: any[]) {
  if (env?.ENVIRONMENT === 'development') {
    console.log(...args);
  }
}

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
  if (!usage) return null;

  const promptTokens = usage.prompt_tokens || 0;
  const completionTokens = usage.completion_tokens || 0;
  const totalTokens = usage.total_tokens || (promptTokens + completionTokens);
  const tokenLimits = getTokenLimitsForModel(modelName, tier);

  return {
    tokenUsage: { promptTokens, completionTokens, totalTokens },
    model: modelName,
    modelContextLimit: tokenLimits.contextWindow,
  };
}

function getLastUserMessage(messages: any[]): string {
  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message?.role === "user" && typeof message?.content === "string");
  return lastUserMessage?.content || "";
}

function getAnalyticsContext(body: any) {
  return {
    sessionId: typeof body?.analytics?.session_id === "string" ? body.analytics.session_id : null,
    messageId: typeof body?.analytics?.message_id === "string" ? body.analytics.message_id : null,
    sourcePage: typeof body?.analytics?.source_page === "string" ? body.analytics.source_page : null,
    storeId: typeof body?.analytics?.store_id === "string" ? body.analytics.store_id : null,
  };
}

function trackAnalytics(
  c: { env: Bindings; executionCtx: ExecutionContext },
  fn: (db: D1Database) => Promise<void>
) {
  if (!isAnalyticsEnabled(c.env.ANALYTICS_DB)) return;

  c.executionCtx.waitUntil(
    fn(c.env.ANALYTICS_DB!).catch((error) => {
      console.error("[Chat Analytics] Background write failed:", error);
    })
  );
}

const app = new Hono<{ Bindings: Bindings }>();

// ============================================
// FEEDBACK ROUTE
// ============================================

const FEEDBACK_FROM = "Wine Shop Feedback <noreply@xtscale.com>";
const FEEDBACK_TO = "info@xtscale.com";
const FEEDBACK_MAX_MESSAGE_LEN = 4000;
const FEEDBACK_MAX_FILE_SIZE = 5 * 1024 * 1024;
const FEEDBACK_RATE_WINDOW_MS = 10 * 60 * 1000;
const FEEDBACK_RATE_MAX = 5;
const ALLOWED_SCREENSHOT_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

const feedbackRateLimitStore = new Map<string, number[]>();

function cleanupRateLimitStore(now: number) {
  for (const [key, timestamps] of feedbackRateLimitStore.entries()) {
    const fresh = timestamps.filter((ts) => now - ts < FEEDBACK_RATE_WINDOW_MS);
    if (fresh.length === 0) {
      feedbackRateLimitStore.delete(key);
      continue;
    }
    feedbackRateLimitStore.set(key, fresh);
  }
}

function isRateLimited(ip: string, now: number): boolean {
  cleanupRateLimitStore(now);
  const timestamps = feedbackRateLimitStore.get(ip) ?? [];
  const fresh = timestamps.filter((ts) => now - ts < FEEDBACK_RATE_WINDOW_MS);
  if (fresh.length >= FEEDBACK_RATE_MAX) {
    feedbackRateLimitStore.set(ip, fresh);
    return true;
  }
  fresh.push(now);
  feedbackRateLimitStore.set(ip, fresh);
  return false;
}

function normalizeStore(rawStore: string): string {
  return rawStore
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// ============================================
// MIDDLEWARE
// ============================================

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.onError((err, c) => {
  if (err instanceof SyntaxError) {
    return c.json({ error: "Invalid JSON format", message: err.message }, 400);
  }
  console.error(`Status: ${err.name}`, err.message);
  return c.json({ error: "Internal Server Error" }, 500);
});

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
  const profile = getProfile(c.env.PROFILE_TYPE);
  return c.text(`${profile.storeName} Wine Chat API`);
});

// ============================================
// FEEDBACK
// ============================================

app.post("/feedback", async (c) => {
  const profile = getProfile(c.env.PROFILE_TYPE);

  try {
    const formData = await c.req.formData();

    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const type = String(formData.get("type") ?? "").trim().toLowerCase();
    const message = String(formData.get("message") ?? "").trim();
    const rawStore = String(formData.get("store") ?? "");
    const source = String(formData.get("source") ?? "widget").trim();
    const pageUrl = String(formData.get("pageUrl") ?? "").trim();
    const userAgent = String(formData.get("userAgent") ?? "").trim() || c.req.header("user-agent") || "";
    const screenshot = formData.get("screenshot");
    const ip = c.req.header("CF-Connecting-IP") || "unknown";

    const store = normalizeStore(rawStore);
    if (!store) {
      return c.json({ ok: false, error: "validation_error", message: "Store is required." }, 400);
    }
    if (!["bug", "quality", "safety", "other"].includes(type)) {
      return c.json({ ok: false, error: "validation_error", message: "Invalid feedback type." }, 400);
    }
    if (!message || message.length < 5 || message.length > FEEDBACK_MAX_MESSAGE_LEN) {
      return c.json({ ok: false, error: "validation_error", message: "Message must be between 5 and 4000 characters." }, 400);
    }
    if (email && !isValidEmail(email)) {
      return c.json({ ok: false, error: "validation_error", message: "Email format is invalid." }, 400);
    }

    const now = Date.now();
    if (isRateLimited(ip, now)) {
      return c.json({ ok: false, error: "rate_limited", message: "Too many submissions. Please try again later." }, 429);
    }

    let attachment: { filename: string; content: string; content_type: string } | undefined;
    if (screenshot && screenshot instanceof File && screenshot.size > 0) {
      if (screenshot.size > FEEDBACK_MAX_FILE_SIZE) {
        return c.json({ ok: false, error: "file_too_large", message: "Screenshot must be 5MB or smaller." }, 413);
      }
      if (!ALLOWED_SCREENSHOT_MIME.has(screenshot.type)) {
        return c.json({ ok: false, error: "unsupported_file_type", message: "Only PNG, JPEG, and WEBP screenshots are allowed." }, 415);
      }

      const bytes = new Uint8Array(await screenshot.arrayBuffer());
      attachment = {
        filename: screenshot.name || "feedback-screenshot",
        content: toBase64(bytes),
        content_type: screenshot.type
      };
    }

    const submittedAt = new Date(now).toISOString();
    const subject = `[${profile.storeName} Feedback][store:${store}][type:${type}]`;
    const textBody = [
      `Store (normalized): ${store}`,
      `Store (raw): ${rawStore || "N/A"}`,
      `Source: ${source || "N/A"}`,
      `Submitted At (UTC): ${submittedAt}`,
      `Name: ${name || "N/A"}`,
      `Email: ${email || "N/A"}`,
      `Type: ${type}`,
      `Page URL: ${pageUrl || "N/A"}`,
      `User Agent: ${userAgent || "N/A"}`,
      `IP: ${ip}`,
      `Screenshot: ${attachment ? "Attached" : "None"}`,
      "",
      "Message:",
      message
    ].join("\n");

    const htmlBody = `
      <h2>${escapeHtml(profile.storeName)} Feedback Submission</h2>
      <p><strong>Store (normalized):</strong> ${escapeHtml(store)}</p>
      <p><strong>Store (raw):</strong> ${escapeHtml(rawStore || "N/A")}</p>
      <p><strong>Source:</strong> ${escapeHtml(source || "N/A")}</p>
      <p><strong>Submitted At (UTC):</strong> ${escapeHtml(submittedAt)}</p>
      <p><strong>Name:</strong> ${escapeHtml(name || "N/A")}</p>
      <p><strong>Email:</strong> ${escapeHtml(email || "N/A")}</p>
      <p><strong>Type:</strong> ${escapeHtml(type)}</p>
      <p><strong>Page URL:</strong> ${escapeHtml(pageUrl || "N/A")}</p>
      <p><strong>User Agent:</strong> ${escapeHtml(userAgent || "N/A")}</p>
      <p><strong>IP:</strong> ${escapeHtml(ip)}</p>
      <p><strong>Screenshot:</strong> ${attachment ? "Attached" : "None"}</p>
      <hr />
      <p><strong>Message</strong></p>
      <p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>
    `;

    const resendPayload: Record<string, unknown> = {
      from: FEEDBACK_FROM,
      to: [FEEDBACK_TO],
      subject,
      text: textBody,
      html: htmlBody
    };
    if (attachment) {
      resendPayload.attachments = [attachment];
    }

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(resendPayload)
    });

    const resendData = await resendResp.json().catch(() => ({}));
    if (!resendResp.ok || !resendData?.id) {
      console.error("[Feedback] Resend error:", resendData);
      return c.json({ ok: false, error: "email_provider_error", message: "Feedback could not be delivered." }, 502);
    }

    return c.json({ ok: true, id: resendData.id });
  } catch (err) {
    console.error("[Feedback] Unexpected error:", err);
    return c.json({ ok: false, error: "internal_error", message: "Unexpected error while sending feedback." }, 500);
  }
});

// ============================================
// INTENT
// ============================================

app.post("/chat/intent", async (c) => {
  const body = await c.req.json();
  const messages = body.messages || [];
  const analytics = getAnalyticsContext(body);
  const userTextRaw = getLastUserMessage(messages);
  const intentStartedAt = Date.now();

  const lastMessage = messages[messages.length - 1]?.content || "";

  const lastAssistantMsg = messages.filter((m: any) => m.role === 'assistant').pop();
  const lastAssistantContent = lastAssistantMsg?.content || '';

  const assistantQuery = lastAssistantContent;

  // CODEX cue detection — preserved from original
  const RECOMMEND_CUES = [
    'I completely understand what you\'re looking for',
    'Let me check what we have that matches your preferences',
    'I\'m pulling up wines that fit your criteria',
    'Checking our selection based on what you described'
  ];

  const PRODUCT_CUES = [
    'Let me look up',
    'I\'ll pull up the details on'
  ];

  const hasRecommendCue = RECOMMEND_CUES.some(cue => lastAssistantContent.includes(cue));
  const hasProductCue = PRODUCT_CUES.some(cue => lastAssistantContent.includes(cue));

  // No CODEX cue → return general immediately
  if (!hasRecommendCue && !hasProductCue) {
    trackAnalytics(c, (db) =>
      recordIntentAnalysis(db, {
        analytics,
        userTextRaw,
        predictedIntent: "general",
        status: "completed",
        latencyMs: Date.now() - intentStartedAt,
      })
    );

    return c.json({
      intent: 'general',
      filters: {},
      product_query: null,
      assistantQuery: assistantQuery
    });
  }

  // PRODUCT_LOOKUP cue — extract product name
  if (hasProductCue) {
    const lookupMatch = lastAssistantContent.match(/Let me look up (.+?) for you/i)
                     || lastAssistantContent.match(/I'll pull up the details on (.+)/i);
    const productName = lookupMatch ? lookupMatch[1].trim() : lastMessage;

    trackAnalytics(c, (db) =>
      recordIntentAnalysis(db, {
        analytics,
        userTextRaw,
        predictedCue: "PRODUCT_LOOKUP",
        predictedIntent: "product-question",
        productQuery: productName,
        status: "completed",
        latencyMs: Date.now() - intentStartedAt,
      })
    );

    return c.json({
      intent: 'product-question',
      filters: {},
      product_query: productName,
      assistantQuery: assistantQuery
    });
  }

  // CODEX:RECOMMEND — call LLM for wine filter extraction
  const API_KEY = getApiKey(INTENT_PROVIDER, c.env);
  const MODEL = getModelForRole(INTENT_PROVIDER, "INTENT");
  const BASE_URL = getBaseUrl(INTENT_PROVIDER);

  const schemaInfo = getWineSchemaForPrompt();
  let tokenUsage: ReturnType<typeof buildTokenUsageResponse> = null;

  const prompt = generateIntentWithCuePrompt(lastAssistantContent, lastMessage, schemaInfo);

  let text: string;
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
        max_tokens: 1000,
        stream: false
      })
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error(`Intent API error (${resp.status}):`, errorText);
      throw new Error(`Intent API returned ${resp.status}: ${errorText}`);
    }

    const data = await resp.json();
    text = data.choices?.[0]?.message?.content || "";
    tokenUsage = buildTokenUsageResponse(MODEL, data.usage, TIER);

    if (!text || text.trim().length === 0) {
      console.error("Intent API returned empty response:", JSON.stringify(data, null, 2));
      throw new Error("Intent API returned empty content");
    }

  } catch (err) {
    console.error(`/intent api error: ${err}`);

    trackAnalytics(c, (db) =>
      recordIntentAnalysis(db, {
        analytics,
        userTextRaw,
        predictedCue: "RECOMMEND",
        predictedIntent: "recommendation",
        status: "error",
        errorCode: "intent_api_error",
        latencyMs: Date.now() - intentStartedAt,
      })
    );

    return c.json({
      error: "Our AI understanding service is experiencing technical difficulties. Please try again.",
      service: "intent",
      intent: "general",
      filters: {},
      assistantQuery: assistantQuery,
      details: {
        message: err instanceof Error ? err.message : String(err),
        provider: INTENT_PROVIDER
      }
    }, 503);
  }

  // Parse response
  const parseResult = parseRobustJSON(text);

  if (!parseResult.success) {
    console.error("Failed to parse intent response:", {
      error: parseResult.error,
      rawResponse: text?.substring(0, 500)
    });

    trackAnalytics(c, (db) =>
      recordIntentAnalysis(db, {
        analytics,
        userTextRaw,
        predictedCue: "RECOMMEND",
        predictedIntent: "recommendation",
        status: "error",
        errorCode: "intent_json_parse_error",
        latencyMs: Date.now() - intentStartedAt,
      })
    );

    return c.json({
      error: "Filter extraction failed - JSON parsing error",
      intent: "recommendation",
      filters: {},
      product_query: null,
      assistantQuery: assistantQuery
    }, 400);
  }

  const parsed = parseResult.data;

  // Check for "surprise" intent
  const isSurprise = parsed.intent === "surprise";

  // Validate and normalize wine filters
  const normalizedFilters = validateWineFilters(parsed.filters || {});

  // Apply brand constraint for Brand Concierge profile
  const profile = getProfile(c.env.PROFILE_TYPE);
  if (!profile.allowCrossBrand && profile.brandName) {
    normalizedFilters.brand = profile.brandName;
  }

  trackAnalytics(c, (db) =>
    recordIntentAnalysis(db, {
      analytics,
      userTextRaw,
      predictedCue: "RECOMMEND",
      predictedIntent: isSurprise ? "surprise" : "recommendation",
      predictedFilters: normalizedFilters,
      status: "completed",
      latencyMs: Date.now() - intentStartedAt,
    })
  );

  return c.json({
    intent: isSurprise ? "surprise" : "recommendation",
    filters: normalizedFilters,
    product_query: null,
    assistantQuery: assistantQuery,
    ...(tokenUsage ? { tokenUsage } : {})
  });
});

// ============================================
// PRODUCT LOOKUP (D1 name search)
// ============================================

app.post("/chat/product-lookup", async (c) => {
  const body = await c.req.json();
  const productQuery = body.product_query || "";
  const messages = body.messages || [];
  const analytics = getAnalyticsContext(body);
  const userTextRaw = getLastUserMessage(messages) || productQuery;
  const lookupStartedAt = Date.now();

  if (!productQuery) {
    trackAnalytics(c, (db) =>
      recordProductLookupResult(db, {
        analytics,
        userTextRaw,
        predictedCue: "PRODUCT_LOOKUP",
        predictedIntent: "product-question",
        status: "error",
        fallbackReason: "missing_product_query",
        latencyMs: Date.now() - lookupStartedAt,
      })
    );

    return c.json({
      product: null,
      confidence: 0,
      needsClarification: false,
      message: "No product query provided"
    });
  }

  try {
    // D1 name search — replaces Vectorize semantic search
    const results = await lookupWineByName(c.env.WINE_DB, productQuery, 3);

    if (results.length === 0) {
      trackAnalytics(c, (db) =>
        recordProductLookupResult(db, {
          analytics,
          userTextRaw,
          productQuery,
          predictedCue: "PRODUCT_LOOKUP",
          predictedIntent: "product-question",
          status: "completed",
          fallbackReason: "no_match",
          latencyMs: Date.now() - lookupStartedAt,
        })
      );

      return c.json({
        product: null,
        confidence: 0,
        needsClarification: false,
        message: "I couldn't find that wine in our catalog. Would you like me to search for recommendations?"
      });
    }

    // Confidence based on result count (replaces cosine similarity)
    // 1 result = high confidence, 2-3 = needs clarification
    if (results.length === 1) {
      const wine = results[0];

      trackAnalytics(c, (db) =>
        recordProductLookupResult(db, {
          analytics,
          userTextRaw,
          productQuery,
          predictedCue: "PRODUCT_LOOKUP",
          predictedIntent: "product-question",
          product: {
            id: wine.id,
            name: wine.name,
            brand: wine.brand,
            category: wine.wine_type,
            rankPosition: 1,
            sourceKind: "product_lookup",
          },
          status: "completed",
          latencyMs: Date.now() - lookupStartedAt,
        })
      );

      return c.json({
        product: wine,
        confidence: 1.0,
        needsClarification: false
      });
    }

    // Multiple matches — needs clarification
    const topNames = results.map(r => r.name).filter(Boolean);

    trackAnalytics(c, (db) =>
      recordProductLookupResult(db, {
        analytics,
        userTextRaw,
        productQuery,
        predictedCue: "PRODUCT_LOOKUP",
        predictedIntent: "product-question",
        needsClarification: true,
        status: "completed",
        fallbackReason: "clarification",
        latencyMs: Date.now() - lookupStartedAt,
      })
    );

    return c.json({
      product: null,
      confidence: 0.5,
      needsClarification: true,
      suggestedNames: topNames,
      message: topNames.length > 1
        ? `Did you mean ${topNames.slice(0, -1).join(', ')} or ${topNames[topNames.length - 1]}?`
        : `Did you mean ${topNames[0]}?`
    });

  } catch (err) {
    console.error("Product lookup error:", err);
    trackAnalytics(c, (db) =>
      recordProductLookupResult(db, {
        analytics,
        userTextRaw,
        productQuery,
        predictedCue: "PRODUCT_LOOKUP",
        predictedIntent: "product-question",
        status: "error",
        fallbackReason: "lookup_error",
        latencyMs: Date.now() - lookupStartedAt,
      })
    );
    return c.json({
      product: null,
      confidence: 0,
      needsClarification: false,
      error: "Product lookup service temporarily unavailable",
      message: "I'm having trouble searching for that wine. Would you like me to search for recommendations instead?"
    });
  }
});

// ============================================
// STREAM (SSE passthrough — preserved from original)
// ============================================

app.post("/chat/stream", async (c) => {
  const body = await c.req.json();
  const messages = body.messages || [];
  const productContext = body.productContext || null;
  const clarificationContext = body.clarificationContext || null;
  const analytics = getAnalyticsContext(body);
  const userTextRaw = getLastUserMessage(messages);
  const streamStartedAt = Date.now();

  // Clarification bypass — return text directly as SSE
  if (clarificationContext) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const sseEvent = `data: ${JSON.stringify({
          choices: [{
            delta: { content: clarificationContext },
            finish_reason: null
          }]
        })}\n\n`;
        controller.enqueue(encoder.encode(sseEvent));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    });

    trackAnalytics(c, (db) =>
      recordStreamCompletion(db, {
        analytics,
        userTextRaw,
        assistantResponseText: clarificationContext,
        latencyMs: Date.now() - streamStartedAt,
        status: "completed",
      })
    );

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  const API_KEY = getApiKey(STREAM_PROVIDER, c.env);
  const MODEL = getModelForRole(STREAM_PROVIDER, "STREAM");
  const BASE_URL = getBaseUrl(STREAM_PROVIDER);

  const lastMessages = messages.slice(-10);
  const enrichedHistory = lastMessages.map((msg: any) => {
    if (msg.recommendations?.length > 0) {
      const names = msg.recommendations.map((p: any) => p.name).join(", ");
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
    "llama",
    user_message,
    conversation_history,
    productContext || "",
    clarificationContext || undefined,
    false,
    c.env.PROFILE_TYPE
  );

  const cleanMessages = lastMessages.map((msg: any) => {
    const { recommendations, ...rest } = msg;
    return rest;
  });

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
        max_tokens: 900,
        stream: true
      })
    });

    if (!response || !response.ok) {
      const errorText = response ? await response.text() : "Network error";
      console.error(`Stream API error (${response?.status || 'network'}):`, errorText);
      trackAnalytics(c, (db) =>
        recordStreamCompletion(db, {
          analytics,
          userTextRaw,
          latencyMs: Date.now() - streamStartedAt,
          status: "error",
          errorCode: "stream_api_error",
        })
      );
      return c.json({
        error: "Our streaming service is experiencing technical difficulties. Please try again.",
        service: "stream",
        details: {
          status: response?.status || null,
          statusText: response?.statusText || "Network error",
          provider: STREAM_PROVIDER
        }
      }, 503);
    }

  } catch (err) {
    console.error(`Stream Error: ${err}`);
    trackAnalytics(c, (db) =>
      recordStreamCompletion(db, {
        analytics,
        userTextRaw,
        latencyMs: Date.now() - streamStartedAt,
        status: "error",
        errorCode: "stream_network_error",
      })
    );
    return c.json({
      error: "Our streaming service is experiencing technical difficulties. Please try again.",
      service: "stream",
      details: {
        message: err instanceof Error ? err.message : String(err),
        provider: STREAM_PROVIDER
      }
    }, 503);
  }

  if (!response?.body) {
    trackAnalytics(c, (db) =>
      recordStreamCompletion(db, {
        analytics,
        userTextRaw,
        latencyMs: Date.now() - streamStartedAt,
        status: "error",
        errorCode: "stream_missing_body",
      })
    );

    return c.json({
      error: "Our streaming service is experiencing technical difficulties. Please try again.",
      service: "stream",
      details: {
        status: response?.status || null,
        statusText: response?.statusText || "Missing response body",
        provider: STREAM_PROVIDER
      }
    }, 503);
  }

  // SSE passthrough with analytics mirroring — preserved from original
  const { readable, writable } = new TransformStream();
  const upstreamReader = response.body.getReader();
  const downstreamWriter = writable.getWriter();
  const decoder = new TextDecoder("utf-8");

  if (isAnalyticsEnabled(c.env.ANALYTICS_DB)) {
    c.executionCtx.waitUntil((async () => {
      let buffer = "";
      let assistantResponseText = "";

      const consumeSseBuffer = (rawBuffer: string, flush = false): string => {
        const parts = rawBuffer.split("\n\n");
        const completeParts = flush ? parts : parts.slice(0, -1);

        for (const part of completeParts) {
          const event = part.trim();
          if (!event) continue;

          const dataIndex = event.indexOf("data: ");
          if (dataIndex === -1) continue;

          const jsonStr = event.slice(dataIndex + 6);
          if (jsonStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const token = parsed.choices?.[0]?.delta?.content ?? "";
            if (token) {
              assistantResponseText += token;
            }
          } catch (error) {
            console.error("[STREAM] Failed to parse SSE chunk for analytics:", error);
          }
        }

        return flush ? "" : parts[parts.length - 1];
      };

      try {
        while (true) {
          const { done, value } = await upstreamReader.read();
          if (done) break;

          if (value) {
            await downstreamWriter.write(value);
            buffer += decoder.decode(value, { stream: true });
            buffer = consumeSseBuffer(buffer, false);
          }
        }

        buffer += decoder.decode();
        consumeSseBuffer(buffer, true);
      } catch (error) {
        console.error("[STREAM] Failed while mirroring upstream SSE:", error);
      } finally {
        try {
          await downstreamWriter.close();
        } catch {
          // Ignore close races if the client disconnects mid-stream.
        }
      }

      await recordStreamCompletion(c.env.ANALYTICS_DB!, {
        analytics,
        userTextRaw,
        assistantResponseText,
        latencyMs: Date.now() - streamStartedAt,
        status: "completed",
      });
    })().catch((error) => {
      console.error("[STREAM] Analytics mirror task failed:", error);
    }));
  } else {
    c.executionCtx.waitUntil((async () => {
      try {
        while (true) {
          const { done, value } = await upstreamReader.read();
          if (done) break;
          if (value) {
            await downstreamWriter.write(value);
          }
        }
      } finally {
        try {
          await downstreamWriter.close();
        } catch {
          // Ignore close races if the client disconnects mid-stream.
        }
      }
    })());
  }

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*"
    }
  });
});

// ============================================
// RECOMMENDATIONS (D1 SQL + optional LLM re-ranking)
// ============================================

app.post("/chat/recommendations", async (c) => {
  const body = await c.req.json();
  const messages = body.messages || [];
  let filters: WineFilters = body.filters || {};
  const analytics = getAnalyticsContext(body);
  const userTextRaw = getLastUserMessage(messages);
  const recommendationsStartedAt = Date.now();
  const isSurprise = body.intent === "surprise";

  // Validate filters
  filters = validateWineFilters(filters);

  // Apply brand constraint for Brand Concierge profile
  const profile = getProfile(c.env.PROFILE_TYPE);
  if (!profile.allowCrossBrand && profile.brandName) {
    filters.brand = profile.brandName;
  }

  const lastMessages = messages.slice(-5);
  const enrichedHistory = lastMessages.map((msg: any) => {
    if (msg.recommendations?.length > 0) {
      const names = msg.recommendations.map((p: any) => p.name).join(", ");
      return {
        role: "assistant",
        content: `${msg.content}\n\nI recommended: ${names}.`
      };
    }
    return { role: msg.role, content: msg.content };
  });

  const user_message = enrichedHistory[enrichedHistory.length - 1]?.content || "";
  const lastAssistantMessage = enrichedHistory.slice(-2).find((m: any) => m.role === 'assistant')?.content || "";

  // D1 SQL search — replaces Vectorize
  let results;
  try {
    if (isSurprise) {
      results = await surpriseMe(c.env.WINE_DB, filters, 8);
    } else {
      results = await searchWines(c.env.WINE_DB, filters, 8);
    }
  } catch (err) {
    console.error("Wine search error:", err);
    trackAnalytics(c, (db) =>
      recordRecommendationResults(db, {
        analytics,
        userTextRaw,
        predictedCue: "RECOMMEND",
        predictedIntent: isSurprise ? "surprise" : "recommendation",
        predictedFilters: filters,
        recommendations: [],
        preRankedCount: 0,
        finalRankCount: 0,
        status: "error",
        errorCode: "wine_search_error",
        fallbackReason: "wine_search_error",
        latencyMs: Date.now() - recommendationsStartedAt,
      })
    );
    return c.json({ recommendations: [], error: "Wine search error" }, 200);
  }

  if (results.length === 0) {
    trackAnalytics(c, (db) =>
      recordRecommendationResults(db, {
        analytics,
        userTextRaw,
        predictedCue: "RECOMMEND",
        predictedIntent: isSurprise ? "surprise" : "recommendation",
        predictedFilters: filters,
        recommendations: [],
        preRankedCount: 0,
        finalRankCount: 0,
        status: "completed",
        fallbackReason: "no_valid_catalog_results",
        latencyMs: Date.now() - recommendationsStartedAt,
      })
    );

    return c.json({
      recommendations: [],
      error: "No wines found matching your criteria",
      service: "recommendations",
    }, 200);
  }

  // Create product map for re-ranking lookup
  const productMap = new Map(results.map((r) => [r.id, r]));

  // Skip re-ranking for small result sets
  if (results.length <= RERANK_SKIP_CANDIDATE_MAX) {
    trackAnalytics(c, (db) =>
      recordRecommendationResults(db, {
        analytics,
        userTextRaw,
        predictedCue: "RECOMMEND",
        predictedIntent: isSurprise ? "surprise" : "recommendation",
        predictedFilters: filters,
        recommendations: results.map((result, index) => ({
          id: typeof result.id === "string" ? result.id : null,
          name: typeof result.name === "string" ? result.name : null,
          brand: typeof result.brand === "string" ? result.brand : null,
          category: result.wine_type || null,
          rankPosition: index + 1,
          sourceKind: "recommendation",
        })),
        preRankedCount: results.length,
        finalRankCount: results.length,
        status: "completed",
        fallbackReason: "rerank_skipped_small_candidate_set",
        latencyMs: Date.now() - recommendationsStartedAt,
      })
    );

    return c.json({
      recommendations: results,
      preRankedProducts: results,
      reasoning: "Skipped rerank because the candidate set was already narrow.",
    }, 200);
  }

  // LLM re-ranking
  const API_KEY = getApiKey(RERANK_PROVIDER, c.env);
  const MODEL = getModelForRole(RERANK_PROVIDER, "RECOMMEND");
  const BASE_URL = getBaseUrl(RERANK_PROVIDER);

  let tokenUsage: ReturnType<typeof buildTokenUsageResponse> = null;

  const queryForReranking = lastAssistantMessage || user_message;
  const rerankCandidates = buildCompactRerankCandidates(results);
  const reRankPrompt = generateReRankPrompt(queryForReranking, filters, rerankCandidates);

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
        messages: [{ role: "system", content: reRankPrompt }],
        temperature: 0.1,
        max_tokens: 2500,
        stream: false
      })
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error(`Re-ranking API error (${resp.status}):`, errorText);

      trackAnalytics(c, (db) =>
        recordRecommendationResults(db, {
          analytics,
          userTextRaw,
          predictedCue: "RECOMMEND",
          predictedIntent: isSurprise ? "surprise" : "recommendation",
          predictedFilters: filters,
          recommendations: results.map((result, index) => ({
            id: typeof result.id === "string" ? result.id : null,
            name: typeof result.name === "string" ? result.name : null,
            brand: typeof result.brand === "string" ? result.brand : null,
            category: result.wine_type || null,
            rankPosition: index + 1,
            sourceKind: "recommendation",
          })),
          preRankedCount: results.length,
          finalRankCount: results.length,
          status: "completed",
          errorCode: "rerank_api_error",
          fallbackReason: "rerank_api_error",
          latencyMs: Date.now() - recommendationsStartedAt,
        })
      );

      return c.json({
        recommendations: results,
        error: "Showing results without AI ranking.",
        service: "recommendations",
      }, 200);
    }

    const data = await resp.json();
    text = data.choices?.[0]?.message?.content || "";
    tokenUsage = buildTokenUsageResponse(MODEL, data.usage, TIER);

    if (!text || text.trim().length === 0) {
      console.error("Re-ranking API returned empty response");

      trackAnalytics(c, (db) =>
        recordRecommendationResults(db, {
          analytics,
          userTextRaw,
          predictedCue: "RECOMMEND",
          predictedIntent: isSurprise ? "surprise" : "recommendation",
          predictedFilters: filters,
          recommendations: results.map((result, index) => ({
            id: typeof result.id === "string" ? result.id : null,
            name: typeof result.name === "string" ? result.name : null,
            brand: typeof result.brand === "string" ? result.brand : null,
            category: result.wine_type || null,
            rankPosition: index + 1,
            sourceKind: "recommendation",
          })),
          preRankedCount: results.length,
          finalRankCount: results.length,
          status: "completed",
          errorCode: "rerank_empty_response",
          fallbackReason: "rerank_empty_response",
          latencyMs: Date.now() - recommendationsStartedAt,
        })
      );

      return c.json({
        recommendations: results,
        error: "Showing results without AI ranking.",
        service: "recommendations",
        ...(tokenUsage ? { tokenUsage } : {})
      }, 200);
    }

    // Parse re-ranking response
    const parseResult = parseRobustJSON(text);

    if (!parseResult.success) {
      console.error("Failed to parse re-ranking response:", {
        error: parseResult.error,
        rawResponse: text?.substring(0, 500)
      });

      trackAnalytics(c, (db) =>
        recordRecommendationResults(db, {
          analytics,
          userTextRaw,
          predictedCue: "RECOMMEND",
          predictedIntent: isSurprise ? "surprise" : "recommendation",
          predictedFilters: filters,
          recommendations: results.map((result, index) => ({
            id: typeof result.id === "string" ? result.id : null,
            name: typeof result.name === "string" ? result.name : null,
            brand: typeof result.brand === "string" ? result.brand : null,
            category: result.wine_type || null,
            rankPosition: index + 1,
            sourceKind: "recommendation",
          })),
          preRankedCount: results.length,
          finalRankCount: results.length,
          status: "completed",
          errorCode: "rerank_json_parse_error",
          fallbackReason: "rerank_json_parse_error",
          latencyMs: Date.now() - recommendationsStartedAt,
        })
      );

      return c.json({
        recommendations: results,
        error: "Re-ranking parse error - showing unranked results",
        ...(tokenUsage ? { tokenUsage } : {})
      }, 200);
    }

    const parsedRerank = parseResult.data;
    const rankedIds = parsedRerank.ranked_ids || [];
    const reasoning = parsedRerank.reasoning || "No reasoning provided";

    devLog(c.env, "Re-ranking reasoning:", reasoning);

    // Map ranked IDs back to full wine objects
    const rankedProducts = rankedIds
      .map((id: string) => productMap.get(id))
      .filter((product: any) => product !== undefined);

    if (rankedProducts.length === 0) {
      trackAnalytics(c, (db) =>
        recordRecommendationResults(db, {
          analytics,
          userTextRaw,
          predictedCue: "RECOMMEND",
          predictedIntent: isSurprise ? "surprise" : "recommendation",
          predictedFilters: filters,
          recommendations: results.map((result, index) => ({
            id: typeof result.id === "string" ? result.id : null,
            name: typeof result.name === "string" ? result.name : null,
            brand: typeof result.brand === "string" ? result.brand : null,
            category: result.wine_type || null,
            rankPosition: index + 1,
            sourceKind: "recommendation",
          })),
          preRankedCount: results.length,
          finalRankCount: results.length,
          status: "completed",
          fallbackReason: "no_ranked_ids",
          latencyMs: Date.now() - recommendationsStartedAt,
        })
      );

      return c.json({
        recommendations: results,
        error: "No ranked IDs found - showing unranked results",
        ...(tokenUsage ? { tokenUsage } : {})
      }, 200);
    }

    trackAnalytics(c, (db) =>
      recordRecommendationResults(db, {
        analytics,
        userTextRaw,
        predictedCue: "RECOMMEND",
        predictedIntent: isSurprise ? "surprise" : "recommendation",
        predictedFilters: filters,
        recommendations: rankedProducts.map((product: any, index: number) => ({
          id: typeof product.id === "string" ? product.id : null,
          name: typeof product.name === "string" ? product.name : null,
          brand: typeof product.brand === "string" ? product.brand : null,
          category: product.wine_type || null,
          rankPosition: index + 1,
          sourceKind: "recommendation",
        })),
        preRankedCount: results.length,
        finalRankCount: rankedProducts.length,
        status: "completed",
        latencyMs: Date.now() - recommendationsStartedAt,
      })
    );

    return c.json({
      recommendations: rankedProducts,
      preRankedProducts: results,
      reasoning: reasoning,
      ...(tokenUsage ? { tokenUsage } : {})
    }, 200);

  } catch (err) {
    console.error("Recommendation service error:", err);
    trackAnalytics(c, (db) =>
      recordRecommendationResults(db, {
        analytics,
        userTextRaw,
        predictedCue: "RECOMMEND",
        predictedIntent: isSurprise ? "surprise" : "recommendation",
        predictedFilters: filters,
        recommendations: results.map((result, index) => ({
          id: typeof result.id === "string" ? result.id : null,
          name: typeof result.name === "string" ? result.name : null,
          brand: typeof result.brand === "string" ? result.brand : null,
          category: result.wine_type || null,
          rankPosition: index + 1,
          sourceKind: "recommendation",
        })),
        preRankedCount: results.length,
        finalRankCount: results.length,
        status: "completed",
        errorCode: "recommendation_service_error",
        fallbackReason: "recommendation_service_error",
        latencyMs: Date.now() - recommendationsStartedAt,
      })
    );

    return c.json({
      recommendations: results,
      error: "Showing results without AI ranking.",
      service: "recommendations",
    }, 200);
  }
});

// ============================================
// ANALYTICS EVENT
// ============================================

app.post("/chat/analytics/event", async (c) => {
  const body = await c.req.json();

  if (!isAnalyticsEnabled(c.env.ANALYTICS_DB)) {
    return c.json({ ok: false, error: "analytics_disabled" }, 503);
  }

  try {
    await recordAnalyticsEvent(c.env.ANALYTICS_DB!, {
      eventId: typeof body?.event_id === "string" ? body.event_id : null,
      sessionId: typeof body?.session_id === "string" ? body.session_id : null,
      messageId: typeof body?.message_id === "string" ? body.message_id : null,
      eventType: typeof body?.event_type === "string" ? body.event_type : null,
      productId: typeof body?.product_id === "string" ? body.product_id : null,
      rankPosition: typeof body?.rank_position === "number" ? body.rank_position : null,
      payload: body?.payload,
      occurredAt: typeof body?.occurred_at === "string" ? body.occurred_at : null,
    });

    return c.json({ ok: true }, 202);
  } catch (error) {
    console.error("[Chat Analytics] Event write failed:", error);
    return c.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

export default app;
