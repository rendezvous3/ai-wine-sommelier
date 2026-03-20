# Chat Analytics Schema Contract

Last confirmed: March 18, 2026
Verification source: live `vectorizer-qa` D1 via `PRAGMA table_info(...)`
Database: `vectorizer-qa`

This file is the source-of-truth contract for the chat analytics tables currently written by the QA backend.

Maintenance rule:
- Any change to chat analytics D1 tables, columns, defaults, or interpretation rules must update this file in the same change.
- If the schema or interpretation rules change, update [CHAT_ANALYTICS_DASHBOARD_PROMPT.md](/Users/bojanjovanovic/Desktop/Svelte/AiChatBot/CHAT_ANALYTICS_DASHBOARD_PROMPT.md) too.
- If the schema changes, the dashboard project must be told to update its read model and UI assumptions.

## Confirmed Tables

### `chat_sessions`
Meaning:
- One row per chat visit / session.

Confirmed columns:
- `session_id` `TEXT` primary key
- `store_id` `TEXT`
- `source_page` `TEXT`
- `started_at` `TEXT` not null
- `ended_at` `TEXT`
- `message_count` `INTEGER` not null default `0`
- `sequence_count` `INTEGER` not null default `0`
- `last_activity_at` `TEXT` not null
- `created_at` `TEXT` not null
- `updated_at` `TEXT` not null

### `chat_messages`
Meaning:
- One row per user-authored message plus the backend handling for that ask.
- This table is the main source for Queries analytics.
- `assistant_response_text` is stored on the same row; assistant bubbles are not stored as separate rows in v1.

Confirmed columns:
- `message_id` `TEXT` primary key
- `session_id` `TEXT` not null
- `search_sequence_id` `TEXT` not null
- `message_index` `INTEGER` not null
- `user_text_raw` `TEXT`
- `user_text_normalized` `TEXT`
- `assistant_response_text` `TEXT`
- `predicted_cue` `TEXT`
- `predicted_intent` `TEXT`
- `predicted_filters_json` `TEXT`
- `semantic_search` `TEXT`
- `product_query` `TEXT`
- `result_count` `INTEGER`
- `pre_rank_count` `INTEGER`
- `final_rank_count` `INTEGER`
- `latency_ms` `INTEGER`
- `status` `TEXT`
- `error_code` `TEXT`
- `fallback_reason` `TEXT`
- `created_at` `TEXT` not null
- `updated_at` `TEXT` not null

### `chat_search_sequences`
Meaning:
- One row per related chain of messages around the same user need.
- This table is the source for unresolved and sequence-quality analytics.
- This table is not the source for the Queries tab.

Confirmed columns:
- `search_sequence_id` `TEXT` primary key
- `session_id` `TEXT` not null
- `started_at` `TEXT` not null
- `ended_at` `TEXT`
- `status` `TEXT` not null default `'open'`
- `first_message_id` `TEXT`
- `last_message_id` `TEXT`
- `message_count` `INTEGER` not null default `0`
- `resolved_query_text` `TEXT`
- `resolved_query_normalized` `TEXT`
- `resolved_bucket_label` `TEXT`
- `resolved_product_id` `TEXT`
- `cue_verdict` `TEXT` not null default `'unknown'`
- `intent_verdict` `TEXT` not null default `'unknown'`
- `recommendation_verdict` `TEXT` not null default `'unknown'`
- `satisfaction_verdict` `TEXT` not null default `'open'`
- `reason_codes_json` `TEXT`
- `created_at` `TEXT` not null
- `updated_at` `TEXT` not null

### `chat_message_products`
Meaning:
- One row per product shown for a given message.
- This table powers Products analytics and message/session drilldown.

Confirmed columns:
- `message_product_id` `TEXT` primary key
- `message_id` `TEXT` not null
- `session_id` `TEXT` not null
- `search_sequence_id` `TEXT` not null
- `product_id` `TEXT`
- `product_name` `TEXT`
- `brand` `TEXT`
- `category` `TEXT`
- `subcategory` `TEXT`
- `rank_position` `INTEGER`
- `source_kind` `TEXT`
- `shown_at` `TEXT` not null
- `clicked_at` `TEXT`
- `external_clicked_at` `TEXT`

### `chat_events`
Meaning:
- Append-only interaction/event log.

Confirmed columns:
- `event_id` `TEXT` primary key
- `session_id` `TEXT` not null
- `message_id` `TEXT`
- `search_sequence_id` `TEXT`
- `event_type` `TEXT` not null
- `product_id` `TEXT`
- `rank_position` `INTEGER`
- `payload_json` `TEXT`
- `occurred_at` `TEXT` not null

## Interpretation Rules

These rules are part of the schema contract for downstream consumers.

### Queries tab
- Source: `chat_messages`
- Group by: `user_text_normalized`
- Display text source: `user_text_raw` or normalized representative
- Timestamp source: `created_at`
- Exclude low-signal confirmation messages such as:
  - `yes`
  - `yeah`
  - `yep`
  - `ok`
  - `okay`
  - `sure`
  - `that one`
  - `this one`

### Sessions tab
- Source: `chat_sessions`
- One row per `session_id`
- Session detail must load `chat_messages` by `session_id`, ordered by `message_index ASC`
- Session detail should attach:
  - products from `chat_message_products` by `message_id`
  - events from `chat_events` by `session_id` and/or `message_id`

### Unresolved tab
- Source: `chat_search_sequences`
- Only include rows where `status = 'unresolved'`
- `status = 'open'` is not unresolved
- A clarification inside an open sequence is not unresolved by itself

### Products tab
- Source: `chat_message_products`
- Aggregate by `product_id` and/or `product_name`
- Use:
  - `shown_at`
  - `clicked_at`
  - `external_clicked_at`
  - `rank_position`

### Sequence semantics
- `chat_search_sequences` groups related messages for one user need
- It should be used for:
  - unresolved analysis
  - quality verdicts
  - reformulation chains
- It should not be used as the primary source of “most searched queries”

## Recommended Verification Queries

### Verify schema live
```sql
PRAGMA table_info(chat_sessions);
PRAGMA table_info(chat_messages);
PRAGMA table_info(chat_search_sequences);
PRAGMA table_info(chat_message_products);
PRAGMA table_info(chat_events);
```

### Verify counts
```sql
SELECT 'sessions' AS metric, COUNT(*) AS count FROM chat_sessions
UNION ALL
SELECT 'messages' AS metric, COUNT(*) AS count FROM chat_messages
UNION ALL
SELECT 'search_sequences' AS metric, COUNT(*) AS count FROM chat_search_sequences
UNION ALL
SELECT 'message_products' AS metric, COUNT(*) AS count FROM chat_message_products
UNION ALL
SELECT 'events' AS metric, COUNT(*) AS count FROM chat_events;
```

### Verify recent message activity
```sql
SELECT
  message_id,
  session_id,
  user_text_raw,
  predicted_cue,
  predicted_intent,
  result_count,
  status,
  fallback_reason,
  created_at
FROM chat_messages
ORDER BY created_at DESC
LIMIT 20;
```
