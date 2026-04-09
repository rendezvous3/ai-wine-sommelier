import type { D1Database } from "@cloudflare/workers-types";

const SEARCH_SEQUENCE_TIMEOUT_MS = 10 * 60 * 1000;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS chat_sessions (
  session_id TEXT PRIMARY KEY,
  store_id TEXT,
  source_page TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  message_count INTEGER NOT NULL DEFAULT 0,
  sequence_count INTEGER NOT NULL DEFAULT 0,
  last_activity_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_search_sequences (
  search_sequence_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  first_message_id TEXT,
  last_message_id TEXT,
  message_count INTEGER NOT NULL DEFAULT 0,
  resolved_query_text TEXT,
  resolved_query_normalized TEXT,
  resolved_bucket_label TEXT,
  resolved_product_id TEXT,
  cue_verdict TEXT NOT NULL DEFAULT 'unknown',
  intent_verdict TEXT NOT NULL DEFAULT 'unknown',
  recommendation_verdict TEXT NOT NULL DEFAULT 'unknown',
  satisfaction_verdict TEXT NOT NULL DEFAULT 'open',
  reason_codes_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
  message_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  search_sequence_id TEXT NOT NULL,
  message_index INTEGER NOT NULL,
  user_text_raw TEXT,
  user_text_normalized TEXT,
  assistant_response_text TEXT,
  predicted_cue TEXT,
  predicted_intent TEXT,
  predicted_filters_json TEXT,
  semantic_search TEXT,
  product_query TEXT,
  result_count INTEGER,
  pre_rank_count INTEGER,
  final_rank_count INTEGER,
  latency_ms INTEGER,
  status TEXT,
  error_code TEXT,
  fallback_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_message_products (
  message_product_id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  search_sequence_id TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT,
  brand TEXT,
  category TEXT,
  subcategory TEXT,
  rank_position INTEGER,
  source_kind TEXT,
  shown_at TEXT NOT NULL,
  clicked_at TEXT,
  external_clicked_at TEXT
);

CREATE TABLE IF NOT EXISTS chat_events (
  event_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  message_id TEXT,
  search_sequence_id TEXT,
  event_type TEXT NOT NULL,
  product_id TEXT,
  rank_position INTEGER,
  payload_json TEXT,
  occurred_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_activity_at
  ON chat_sessions(last_activity_at);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id
  ON chat_messages(session_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_sequence_id
  ON chat_messages(search_sequence_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_text_normalized
  ON chat_messages(user_text_normalized);

CREATE INDEX IF NOT EXISTS idx_chat_sequences_session_id
  ON chat_search_sequences(session_id);

CREATE INDEX IF NOT EXISTS idx_chat_sequences_status
  ON chat_search_sequences(status);

CREATE INDEX IF NOT EXISTS idx_chat_message_products_message_id
  ON chat_message_products(message_id);

CREATE INDEX IF NOT EXISTS idx_chat_message_products_product_id
  ON chat_message_products(product_id);

CREATE INDEX IF NOT EXISTS idx_chat_events_session_id
  ON chat_events(session_id);

CREATE INDEX IF NOT EXISTS idx_chat_events_message_id
  ON chat_events(message_id);

CREATE INDEX IF NOT EXISTS idx_chat_events_type
  ON chat_events(event_type);

CREATE INDEX IF NOT EXISTS idx_chat_events_occurred_at
  ON chat_events(occurred_at);
`;

const schemaByDb = new WeakMap<D1Database, Promise<void>>();

export interface AnalyticsContext {
  sessionId?: string | null;
  messageId?: string | null;
  sourcePage?: string | null;
  storeId?: string | null;
}

export interface ShownProduct {
  id?: string | null;
  name?: string | null;
  brand?: string | null;
  category?: string | null;
  subcategory?: string | null;
  rankPosition?: number | null;
  sourceKind?: string | null;
}

export interface StreamAnalyticsInput {
  analytics: AnalyticsContext;
  userTextRaw?: string | null;
  assistantResponseText?: string | null;
  latencyMs?: number | null;
  status?: string | null;
  errorCode?: string | null;
}

export interface IntentAnalyticsInput {
  analytics: AnalyticsContext;
  userTextRaw?: string | null;
  predictedCue?: string | null;
  predictedIntent?: string | null;
  predictedFilters?: unknown;
  semanticSearch?: string | null;
  productQuery?: string | null;
  status?: string | null;
  errorCode?: string | null;
  latencyMs?: number | null;
}

export interface RecommendationAnalyticsInput {
  analytics: AnalyticsContext;
  userTextRaw?: string | null;
  predictedCue?: string | null;
  predictedIntent?: string | null;
  predictedFilters?: unknown;
  semanticSearch?: string | null;
  recommendations?: ShownProduct[];
  preRankedCount?: number | null;
  finalRankCount?: number | null;
  status?: string | null;
  errorCode?: string | null;
  fallbackReason?: string | null;
  latencyMs?: number | null;
}

export interface ProductLookupAnalyticsInput {
  analytics: AnalyticsContext;
  userTextRaw?: string | null;
  productQuery?: string | null;
  predictedCue?: string | null;
  predictedIntent?: string | null;
  product?: ShownProduct | null;
  needsClarification?: boolean;
  status?: string | null;
  fallbackReason?: string | null;
  latencyMs?: number | null;
}

export interface AnalyticsEventInput {
  eventId?: string | null;
  sessionId?: string | null;
  messageId?: string | null;
  eventType?: string | null;
  productId?: string | null;
  rankPosition?: number | null;
  payload?: unknown;
  occurredAt?: string | null;
}

interface MessageRecord {
  message_id: string;
  session_id: string;
  search_sequence_id: string;
  message_index: number;
  user_text_raw: string | null;
  user_text_normalized: string | null;
  assistant_response_text: string | null;
  predicted_cue: string | null;
  predicted_intent: string | null;
  semantic_search: string | null;
  product_query: string | null;
  updated_at: string;
}

interface SequenceRecord {
  search_sequence_id: string;
  session_id: string;
  status: string;
  updated_at: string;
  reason_codes_json: string | null;
}

function nowIso(): string {
  return new Date().toISOString();
}

function toTimestamp(value?: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toJson(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function parseReasonCodes(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((value) => String(value)).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function mergeReasonCodes(
  currentRaw: string | null | undefined,
  ...values: Array<string | null | undefined>
): string {
  const merged = new Set(parseReasonCodes(currentRaw));
  for (const value of values) {
    if (value) merged.add(value);
  }
  return JSON.stringify(Array.from(merged));
}

function normalizeQueryText(raw: string | null | undefined): string | null {
  const base = safeString(raw);
  if (!base) return null;

  return base
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^a-z0-9$%+\-./\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanAssistantResponseText(raw: string | null | undefined): string | null {
  const base = safeString(raw);
  if (!base) return null;

  let cleaned = base;
  const productContextIndex = cleaned.indexOf("**PRODUCT CONTEXT**");
  if (productContextIndex !== -1) {
    cleaned = cleaned.slice(0, productContextIndex).trim();
  }

  cleaned = cleaned.replace(/```\s*\{[\s\S]*?\}\s*```/g, "").trim();
  cleaned = cleaned.replace(/```/g, "").trim();
  return cleaned || null;
}

function mergeAssistantResponseText(
  existing: string | null | undefined,
  incoming: string | null | undefined
): string | null {
  const current = cleanAssistantResponseText(existing);
  const next = cleanAssistantResponseText(incoming);

  if (!next) return current;
  if (!current) return next;
  if (current === next || current.includes(next)) return current;
  if (next.includes(current)) return next;
  return `${current}\n\n${next}`;
}

function detectPredictedCue(text: string | null | undefined): string | null {
  const content = text ?? "";
  if (
    content.includes("I completely understand what you're looking for") ||
    content.includes("Let me check what we have that matches your preferences") ||
    content.includes("I'm pulling up wines that fit your criteria") ||
    content.includes("Checking our selection based on what you described")
  ) {
    return "RECOMMEND";
  }

  if (
    content.includes("Let me look up") ||
    content.includes("Let me check on") ||
    content.includes("Let me pull up") ||
    content.includes("I'll pull up the details") ||
    content.includes("Getting more details on")
  ) {
    return "PRODUCT_LOOKUP";
  }

  return null;
}

function inferBucketLabel(params: {
  predictedIntent?: string | null;
  userTextRaw?: string | null;
  semanticSearch?: string | null;
  productQuery?: string | null;
}): string | null {
  const predictedIntent = safeString(params.predictedIntent)?.toLowerCase();
  if (predictedIntent === "recommendation" || predictedIntent === "product-question") {
    return "Product search";
  }

  const haystack = [
    params.userTextRaw,
    params.semanticSearch,
    params.productQuery,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!haystack) return null;

  if (/\b(price|deal|deals|sale|sales|cheap|under \$|cost)\b/.test(haystack)) {
    return "Deals & pricing";
  }
  if (/\b(hours|open|close|delivery|deliver|pickup|location|address)\b/.test(haystack)) {
    return "Store info";
  }
  if (/\b(loyalty|points|account|login|return|refund|job|apply)\b/.test(haystack)) {
    return "Account";
  }
  if (/\b(what is|what are|difference|terpene|terpenes|cannabinoid|cannabinoids|thc|cbd|rs o|rso)\b/.test(haystack)) {
    return "Education";
  }
  return null;
}

async function ensureSchema(db: D1Database): Promise<void> {
  const existing = schemaByDb.get(db);
  if (existing) {
    await existing;
    return;
  }

  const initPromise = (async () => {
    const statements = SCHEMA_SQL
      .split(";")
      .map((statement) => statement.trim())
      .filter(Boolean)
      .map((statement) => statement.replace(/\s+/g, " "));

    for (const statement of statements) {
      try {
        await db.exec(statement);
      } catch (error) {
        throw new Error(
          `Schema statement failed: ${statement}. Original error: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  })()
    .catch((error) => {
      schemaByDb.delete(db);
      throw error;
    });
  schemaByDb.set(db, initPromise);
  await initPromise;
}

async function getMessageRecord(
  db: D1Database,
  messageId: string
): Promise<MessageRecord | null> {
  const record = await db
    .prepare(
      `SELECT
        message_id,
        session_id,
        search_sequence_id,
        message_index,
        user_text_raw,
        user_text_normalized,
        assistant_response_text,
        predicted_cue,
        predicted_intent,
        semantic_search,
        product_query,
        updated_at
      FROM chat_messages
      WHERE message_id = ?`
    )
    .bind(messageId)
    .first<MessageRecord>();

  return record ?? null;
}

async function getSequenceRecord(
  db: D1Database,
  searchSequenceId: string
): Promise<SequenceRecord | null> {
  const record = await db
    .prepare(
      `SELECT
        search_sequence_id,
        session_id,
        status,
        updated_at,
        reason_codes_json
      FROM chat_search_sequences
      WHERE search_sequence_id = ?`
    )
    .bind(searchSequenceId)
    .first<SequenceRecord>();

  return record ?? null;
}

async function ensureSession(
  db: D1Database,
  analytics: AnalyticsContext,
  currentIso: string
): Promise<void> {
  const sessionId = safeString(analytics.sessionId);
  if (!sessionId) return;

  const existing = await db
    .prepare(
      `SELECT started_at
       FROM chat_sessions
       WHERE session_id = ?`
    )
    .bind(sessionId)
    .first<{ started_at: string }>();

  if (!existing) {
    await db
      .prepare(
        `INSERT INTO chat_sessions (
          session_id,
          store_id,
          source_page,
          started_at,
          ended_at,
          message_count,
          sequence_count,
          last_activity_at,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, NULL, 0, 0, ?, ?, ?)`
      )
      .bind(
        sessionId,
        safeString(analytics.storeId),
        safeString(analytics.sourcePage),
        currentIso,
        currentIso,
        currentIso,
        currentIso
      )
      .run();
    return;
  }

  await db
    .prepare(
      `UPDATE chat_sessions
       SET store_id = COALESCE(?, store_id),
           source_page = COALESCE(?, source_page),
           ended_at = NULL,
           last_activity_at = ?,
           updated_at = ?
       WHERE session_id = ?`
    )
    .bind(
      safeString(analytics.storeId),
      safeString(analytics.sourcePage),
      currentIso,
      currentIso,
      sessionId
    )
    .run();
}

async function createSearchSequence(
  db: D1Database,
  sessionId: string,
  messageId: string,
  currentIso: string,
  userTextRaw: string | null,
  predictedIntent?: string | null
): Promise<string> {
  const searchSequenceId = crypto.randomUUID();
  const normalized = normalizeQueryText(userTextRaw);
  const bucket = inferBucketLabel({
    predictedIntent,
    userTextRaw,
  });

  await db
    .prepare(
      `INSERT INTO chat_search_sequences (
        search_sequence_id,
        session_id,
        started_at,
        ended_at,
        status,
        first_message_id,
        last_message_id,
        message_count,
        resolved_query_text,
        resolved_query_normalized,
        resolved_bucket_label,
        resolved_product_id,
        cue_verdict,
        intent_verdict,
        recommendation_verdict,
        satisfaction_verdict,
        reason_codes_json,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, NULL, 'open', ?, ?, 0, ?, ?, ?, NULL, 'unknown', 'unknown', 'unknown', 'open', '[]', ?, ?)`
    )
    .bind(
      searchSequenceId,
      sessionId,
      currentIso,
      messageId,
      messageId,
      userTextRaw,
      normalized,
      bucket,
      currentIso,
      currentIso
    )
    .run();

  await db
    .prepare(
      `UPDATE chat_sessions
       SET sequence_count = sequence_count + 1,
           updated_at = ?
       WHERE session_id = ?`
    )
    .bind(currentIso, sessionId)
    .run();

  return searchSequenceId;
}

async function finalizeSequenceAsUnresolved(
  db: D1Database,
  searchSequenceId: string,
  currentIso: string,
  reasonCode: string
): Promise<void> {
  const sequence = await getSequenceRecord(db, searchSequenceId);
  if (!sequence || sequence.status === "resolved") return;

  const messageStats = await db
    .prepare(
      `SELECT
        MAX(COALESCE(result_count, 0)) AS max_result_count,
        SUM(CASE WHEN COALESCE(result_count, 0) = 0 THEN 1 ELSE 0 END) AS zero_result_messages,
        SUM(CASE WHEN fallback_reason IS NOT NULL THEN 1 ELSE 0 END) AS fallback_messages,
        SUM(CASE WHEN error_code IS NOT NULL THEN 1 ELSE 0 END) AS error_messages
      FROM chat_messages
      WHERE search_sequence_id = ?`
    )
    .bind(searchSequenceId)
    .first<{
      max_result_count: number | null;
      zero_result_messages: number | null;
      fallback_messages: number | null;
      error_messages: number | null;
    }>();

  const clickStats = await db
    .prepare(
      `SELECT
        SUM(CASE WHEN external_clicked_at IS NOT NULL THEN 1 ELSE 0 END) AS external_clicks
      FROM chat_message_products
      WHERE search_sequence_id = ?`
    )
    .bind(searchSequenceId)
    .first<{ external_clicks: number | null }>();

  const externalClicks = Number(clickStats?.external_clicks ?? 0);
  const maxResultCount = Number(messageStats?.max_result_count ?? 0);
  const zeroResultMessages = Number(messageStats?.zero_result_messages ?? 0);
  const fallbackMessages = Number(messageStats?.fallback_messages ?? 0);
  const errorMessages = Number(messageStats?.error_messages ?? 0);

  let recommendationVerdict = "unknown";
  if (externalClicks > 0) {
    recommendationVerdict = "good";
  } else if (maxResultCount > 0) {
    recommendationVerdict = "weak";
  } else if (zeroResultMessages > 0 || fallbackMessages > 0 || errorMessages > 0) {
    recommendationVerdict = "miss";
  }

  const reasonCodesJson = mergeReasonCodes(
    sequence.reason_codes_json,
    reasonCode,
    zeroResultMessages > 0 ? "no_results" : null,
    fallbackMessages > 0 ? "fallback" : null,
    errorMessages > 0 ? "error" : null
  );

  await db
    .prepare(
      `UPDATE chat_search_sequences
       SET status = 'unresolved',
           ended_at = COALESCE(ended_at, ?),
           recommendation_verdict = CASE
             WHEN recommendation_verdict = 'unknown' THEN ?
             ELSE recommendation_verdict
           END,
           satisfaction_verdict = CASE
             WHEN satisfaction_verdict = 'open' THEN 'unresolved'
             ELSE satisfaction_verdict
           END,
           reason_codes_json = ?,
           updated_at = ?
       WHERE search_sequence_id = ?`
    )
    .bind(currentIso, recommendationVerdict, reasonCodesJson, currentIso, searchSequenceId)
    .run();
}

async function getOrCreateSearchSequence(
  db: D1Database,
  analytics: AnalyticsContext,
  messageId: string,
  currentIso: string,
  userTextRaw: string | null,
  predictedIntent?: string | null
): Promise<string> {
  const sessionId = safeString(analytics.sessionId);
  if (!sessionId) {
    throw new Error("session_id is required to create a search sequence");
  }

  const latest = await db
    .prepare(
      `SELECT
        search_sequence_id,
        status,
        updated_at
      FROM chat_search_sequences
      WHERE session_id = ?
      ORDER BY started_at DESC
      LIMIT 1`
    )
    .bind(sessionId)
    .first<{
      search_sequence_id: string;
      status: string;
      updated_at: string;
    }>();

  if (!latest) {
    return createSearchSequence(db, sessionId, messageId, currentIso, userTextRaw, predictedIntent);
  }

  const latestUpdatedAt = toTimestamp(latest.updated_at);
  const isExpired =
    latestUpdatedAt === null ||
    Date.now() - latestUpdatedAt > SEARCH_SEQUENCE_TIMEOUT_MS;

  if (latest.status === "resolved") {
    return createSearchSequence(db, sessionId, messageId, currentIso, userTextRaw, predictedIntent);
  }

  if (isExpired) {
    await finalizeSequenceAsUnresolved(db, latest.search_sequence_id, currentIso, "sequence_timeout");
    return createSearchSequence(db, sessionId, messageId, currentIso, userTextRaw, predictedIntent);
  }

  return latest.search_sequence_id;
}

async function touchSearchSequence(
  db: D1Database,
  searchSequenceId: string,
  currentIso: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE chat_search_sequences
       SET updated_at = ?
       WHERE search_sequence_id = ?`
    )
    .bind(currentIso, searchSequenceId)
    .run();
}

async function ensureMessageRecord(
  db: D1Database,
  analytics: AnalyticsContext,
  userTextRaw?: string | null
): Promise<{ messageId: string; sessionId: string; searchSequenceId: string } | null> {
  const sessionId = safeString(analytics.sessionId);
  const messageId = safeString(analytics.messageId);
  if (!sessionId || !messageId) return null;

  const currentIso = nowIso();
  await ensureSchema(db);
  await ensureSession(db, analytics, currentIso);

  const existing = await getMessageRecord(db, messageId);
  if (existing) {
    await touchSearchSequence(db, existing.search_sequence_id, currentIso);
    return {
      messageId: existing.message_id,
      sessionId: existing.session_id,
      searchSequenceId: existing.search_sequence_id,
    };
  }

  const normalizedUserText = normalizeQueryText(userTextRaw);
  const searchSequenceId = await getOrCreateSearchSequence(
    db,
    analytics,
    messageId,
    currentIso,
    userTextRaw ?? null
  );

  const nextIndexRow = await db
    .prepare(
      `SELECT COALESCE(MAX(message_index), 0) + 1 AS next_index
       FROM chat_messages
       WHERE session_id = ?`
    )
    .bind(sessionId)
    .first<{ next_index: number }>();

  const messageIndex = Number(nextIndexRow?.next_index ?? 1);

  await db
    .prepare(
      `INSERT INTO chat_messages (
        message_id,
        session_id,
        search_sequence_id,
        message_index,
        user_text_raw,
        user_text_normalized,
        assistant_response_text,
        predicted_cue,
        predicted_intent,
        predicted_filters_json,
        semantic_search,
        product_query,
        result_count,
        pre_rank_count,
        final_rank_count,
        latency_ms,
        status,
        error_code,
        fallback_reason,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'open', NULL, NULL, ?, ?)`
    )
    .bind(
      messageId,
      sessionId,
      searchSequenceId,
      messageIndex,
      userTextRaw ?? null,
      normalizedUserText,
      currentIso,
      currentIso
    )
    .run();

  await db
    .prepare(
      `UPDATE chat_sessions
       SET message_count = message_count + 1,
           last_activity_at = ?,
           updated_at = ?
       WHERE session_id = ?`
    )
    .bind(currentIso, currentIso, sessionId)
    .run();

  await db
    .prepare(
      `UPDATE chat_search_sequences
       SET last_message_id = ?,
           message_count = message_count + 1,
           resolved_query_text = COALESCE(?, resolved_query_text),
           resolved_query_normalized = COALESCE(?, resolved_query_normalized),
           updated_at = ?
       WHERE search_sequence_id = ?`
    )
    .bind(
      messageId,
      userTextRaw ?? null,
      normalizedUserText,
      currentIso,
      searchSequenceId
    )
    .run();

  return { messageId, sessionId, searchSequenceId };
}

async function refreshSequenceSummary(
  db: D1Database,
  searchSequenceId: string,
  messageId: string,
  currentIso: string
): Promise<void> {
  const latest = await db
    .prepare(
      `SELECT
        user_text_raw,
        user_text_normalized,
        predicted_intent,
        semantic_search,
        product_query
      FROM chat_messages
      WHERE message_id = ?`
    )
    .bind(messageId)
    .first<{
      user_text_raw: string | null;
      user_text_normalized: string | null;
      predicted_intent: string | null;
      semantic_search: string | null;
      product_query: string | null;
    }>();

  const bucketLabel = inferBucketLabel({
    predictedIntent: latest?.predicted_intent ?? null,
    userTextRaw: latest?.user_text_raw ?? null,
    semanticSearch: latest?.semantic_search ?? null,
    productQuery: latest?.product_query ?? null,
  });

  await db
    .prepare(
      `UPDATE chat_search_sequences
       SET last_message_id = ?,
           resolved_query_text = COALESCE(?, resolved_query_text),
           resolved_query_normalized = COALESCE(?, resolved_query_normalized),
           resolved_bucket_label = COALESCE(?, resolved_bucket_label),
           updated_at = ?
       WHERE search_sequence_id = ?`
    )
    .bind(
      messageId,
      latest?.user_text_raw ?? null,
      latest?.user_text_normalized ?? null,
      bucketLabel,
      currentIso,
      searchSequenceId
    )
    .run();
}

async function upsertShownProducts(
  db: D1Database,
  ids: { messageId: string; sessionId: string; searchSequenceId: string },
  products: ShownProduct[],
  shownAtIso: string
): Promise<void> {
  for (const [index, product] of products.entries()) {
    const rankPosition = Number(product.rankPosition ?? index + 1);
    const productId = safeString(product.id);
    const messageProductId = `${ids.messageId}:${safeString(product.sourceKind) ?? "shown"}:${productId ?? `rank-${rankPosition}`}`;

    await db
      .prepare(
        `INSERT OR REPLACE INTO chat_message_products (
          message_product_id,
          message_id,
          session_id,
          search_sequence_id,
          product_id,
          product_name,
          brand,
          category,
          subcategory,
          rank_position,
          source_kind,
          shown_at,
          clicked_at,
          external_clicked_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(
          (SELECT clicked_at FROM chat_message_products WHERE message_product_id = ?),
          NULL
        ), COALESCE(
          (SELECT external_clicked_at FROM chat_message_products WHERE message_product_id = ?),
          NULL
        ))`
      )
      .bind(
        messageProductId,
        ids.messageId,
        ids.sessionId,
        ids.searchSequenceId,
        productId,
        safeString(product.name),
        safeString(product.brand),
        safeString(product.category),
        safeString(product.subcategory),
        rankPosition,
        safeString(product.sourceKind) ?? "shown",
        shownAtIso,
        messageProductId,
        messageProductId
      )
      .run();
  }
}

async function markSequenceResolved(
  db: D1Database,
  searchSequenceId: string,
  currentIso: string,
  productId?: string | null
): Promise<void> {
  await db
    .prepare(
      `UPDATE chat_search_sequences
       SET status = 'resolved',
           ended_at = COALESCE(ended_at, ?),
           resolved_product_id = COALESCE(?, resolved_product_id),
           recommendation_verdict = CASE
             WHEN recommendation_verdict = 'unknown' THEN 'good'
             ELSE recommendation_verdict
           END,
           satisfaction_verdict = 'resolved',
           updated_at = ?
       WHERE search_sequence_id = ?`
    )
    .bind(currentIso, safeString(productId), currentIso, searchSequenceId)
    .run();
}

export async function recordStreamCompletion(
  db: D1Database,
  input: StreamAnalyticsInput
): Promise<void> {
  const userTextRaw = safeString(input.userTextRaw);
  const ids = await ensureMessageRecord(db, input.analytics, userTextRaw);
  if (!ids) return;

  const currentIso = nowIso();
  const existing = await getMessageRecord(db, ids.messageId);
  const cleanedText = cleanAssistantResponseText(input.assistantResponseText);
  const mergedText = mergeAssistantResponseText(existing?.assistant_response_text, cleanedText);
  const detectedCue = detectPredictedCue(cleanedText);

  await db
    .prepare(
      `UPDATE chat_messages
       SET assistant_response_text = ?,
           predicted_cue = COALESCE(?, predicted_cue),
           latency_ms = COALESCE(?, latency_ms),
           status = COALESCE(?, status),
           error_code = COALESCE(?, error_code),
           updated_at = ?
       WHERE message_id = ?`
    )
    .bind(
      mergedText,
      detectedCue,
      input.latencyMs ?? null,
      safeString(input.status),
      safeString(input.errorCode),
      currentIso,
      ids.messageId
    )
    .run();

  await refreshSequenceSummary(db, ids.searchSequenceId, ids.messageId, currentIso);
}

export async function recordIntentAnalysis(
  db: D1Database,
  input: IntentAnalyticsInput
): Promise<void> {
  const userTextRaw = safeString(input.userTextRaw);
  const ids = await ensureMessageRecord(db, input.analytics, userTextRaw);
  if (!ids) return;

  const currentIso = nowIso();

  await db
    .prepare(
      `UPDATE chat_messages
       SET predicted_cue = COALESCE(?, predicted_cue),
           predicted_intent = COALESCE(?, predicted_intent),
           predicted_filters_json = COALESCE(?, predicted_filters_json),
           semantic_search = COALESCE(?, semantic_search),
           product_query = COALESCE(?, product_query),
           latency_ms = COALESCE(?, latency_ms),
           status = COALESCE(?, status),
           error_code = COALESCE(?, error_code),
           updated_at = ?
       WHERE message_id = ?`
    )
    .bind(
      safeString(input.predictedCue),
      safeString(input.predictedIntent),
      toJson(input.predictedFilters),
      safeString(input.semanticSearch),
      safeString(input.productQuery),
      input.latencyMs ?? null,
      safeString(input.status),
      safeString(input.errorCode),
      currentIso,
      ids.messageId
    )
    .run();

  await refreshSequenceSummary(db, ids.searchSequenceId, ids.messageId, currentIso);
}

export async function recordRecommendationResults(
  db: D1Database,
  input: RecommendationAnalyticsInput
): Promise<void> {
  const userTextRaw = safeString(input.userTextRaw);
  const ids = await ensureMessageRecord(db, input.analytics, userTextRaw);
  if (!ids) return;

  const currentIso = nowIso();
  const recommendations = input.recommendations ?? [];
  const resultCount = recommendations.length;

  await db
    .prepare(
      `UPDATE chat_messages
       SET predicted_cue = COALESCE(?, predicted_cue),
           predicted_intent = COALESCE(?, predicted_intent),
           predicted_filters_json = COALESCE(?, predicted_filters_json),
           semantic_search = COALESCE(?, semantic_search),
           result_count = ?,
           pre_rank_count = COALESCE(?, pre_rank_count),
           final_rank_count = COALESCE(?, final_rank_count),
           latency_ms = COALESCE(?, latency_ms),
           status = COALESCE(?, status),
           error_code = COALESCE(?, error_code),
           fallback_reason = COALESCE(?, fallback_reason),
           updated_at = ?
       WHERE message_id = ?`
    )
    .bind(
      safeString(input.predictedCue),
      safeString(input.predictedIntent),
      toJson(input.predictedFilters),
      safeString(input.semanticSearch),
      resultCount,
      input.preRankedCount ?? null,
      input.finalRankCount ?? resultCount,
      input.latencyMs ?? null,
      safeString(input.status),
      safeString(input.errorCode),
      safeString(input.fallbackReason),
      currentIso,
      ids.messageId
    )
    .run();

  if (recommendations.length > 0) {
    await upsertShownProducts(db, ids, recommendations, currentIso);
  }

  const existingSequence = await getSequenceRecord(db, ids.searchSequenceId);
  if (resultCount === 0 && existingSequence?.status === "open") {
    await db
      .prepare(
        `UPDATE chat_search_sequences
         SET reason_codes_json = ?,
             updated_at = ?
         WHERE search_sequence_id = ?`
      )
      .bind(
        mergeReasonCodes(existingSequence.reason_codes_json, "no_results"),
        currentIso,
        ids.searchSequenceId
      )
      .run();
  }

  await refreshSequenceSummary(db, ids.searchSequenceId, ids.messageId, currentIso);
}

export async function recordProductLookupResult(
  db: D1Database,
  input: ProductLookupAnalyticsInput
): Promise<void> {
  const userTextRaw = safeString(input.userTextRaw);
  const ids = await ensureMessageRecord(db, input.analytics, userTextRaw);
  if (!ids) return;

  const currentIso = nowIso();
  const resolvedProduct = input.product ? [input.product] : [];
  const resultCount = resolvedProduct.length;
  const fallbackReason = input.needsClarification
    ? "clarification"
    : safeString(input.fallbackReason);

  await db
    .prepare(
      `UPDATE chat_messages
       SET predicted_cue = COALESCE(?, predicted_cue),
           predicted_intent = COALESCE(?, predicted_intent),
           product_query = COALESCE(?, product_query),
           result_count = ?,
           final_rank_count = ?,
           latency_ms = COALESCE(?, latency_ms),
           status = COALESCE(?, status),
           fallback_reason = COALESCE(?, fallback_reason),
           updated_at = ?
       WHERE message_id = ?`
    )
    .bind(
      safeString(input.predictedCue),
      safeString(input.predictedIntent),
      safeString(input.productQuery),
      resultCount,
      resultCount,
      input.latencyMs ?? null,
      safeString(input.status),
      fallbackReason,
      currentIso,
      ids.messageId
    )
    .run();

  if (resolvedProduct.length > 0) {
    await upsertShownProducts(
      db,
      ids,
      resolvedProduct.map((product, index) => ({
        ...product,
        rankPosition: product.rankPosition ?? index + 1,
        sourceKind: product.sourceKind ?? "product_lookup",
      })),
      currentIso
    );
  } else if (input.needsClarification) {
    const sequence = await getSequenceRecord(db, ids.searchSequenceId);
    if (sequence?.status === "open") {
      await db
        .prepare(
          `UPDATE chat_search_sequences
           SET reason_codes_json = ?,
               updated_at = ?
           WHERE search_sequence_id = ?`
        )
        .bind(
          mergeReasonCodes(sequence.reason_codes_json, "clarification"),
          currentIso,
          ids.searchSequenceId
        )
        .run();
    }
  }

  await refreshSequenceSummary(db, ids.searchSequenceId, ids.messageId, currentIso);
}

export async function recordAnalyticsEvent(
  db: D1Database,
  event: AnalyticsEventInput
): Promise<void> {
  const sessionId = safeString(event.sessionId);
  const eventType = safeString(event.eventType);
  if (!sessionId || !eventType) return;

  await ensureSchema(db);
  const occurredAt = safeString(event.occurredAt) ?? nowIso();
  const messageId = safeString(event.messageId);
  const eventId = safeString(event.eventId) ?? crypto.randomUUID();

  await ensureSession(
    db,
    {
      sessionId,
      messageId,
      sourcePage: null,
      storeId: null,
    },
    occurredAt
  );

  let searchSequenceId: string | null = null;
  if (messageId) {
    const message = await getMessageRecord(db, messageId);
    searchSequenceId = message?.search_sequence_id ?? null;
  }

  await db
    .prepare(
      `INSERT OR REPLACE INTO chat_events (
        event_id,
        session_id,
        message_id,
        search_sequence_id,
        event_type,
        product_id,
        rank_position,
        payload_json,
        occurred_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      eventId,
      sessionId,
      messageId,
      searchSequenceId,
      eventType,
      safeString(event.productId),
      event.rankPosition ?? null,
      toJson(event.payload),
      occurredAt
    )
    .run();

  await db
    .prepare(
      `UPDATE chat_sessions
       SET last_activity_at = ?,
           updated_at = ?,
           ended_at = CASE
             WHEN ? = 'session_closed' THEN ?
             ELSE ended_at
           END
       WHERE session_id = ?`
    )
    .bind(occurredAt, occurredAt, eventType, occurredAt, sessionId)
    .run();

  if (messageId && searchSequenceId) {
    await touchSearchSequence(db, searchSequenceId, occurredAt);
  }

  if (eventType === "external_link_clicked" && messageId && searchSequenceId) {
    const productId = safeString(event.productId);
    if (productId) {
      await db
        .prepare(
          `UPDATE chat_message_products
           SET clicked_at = COALESCE(clicked_at, ?),
               external_clicked_at = COALESCE(external_clicked_at, ?)
           WHERE message_id = ?
             AND product_id = ?`
        )
        .bind(occurredAt, occurredAt, messageId, productId)
        .run();
    }

    await markSequenceResolved(db, searchSequenceId, occurredAt, productId);
  }
}

export function isAnalyticsEnabled(db?: D1Database | null): db is D1Database {
  return Boolean(db);
}
