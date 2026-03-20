# Chat Analytics Dashboard Handoff Prompt

Last updated: March 18, 2026
Schema source of truth: [CHAT_ANALYTICS_SCHEMA.md](/Users/bojanjovanovic/Desktop/Svelte/AiChatBot/CHAT_ANALYTICS_SCHEMA.md)

## Model Catalog Maintenance

- Last reviewed: March 20, 2026
- Fast-model constants updated on this date:
  - OpenAI `gpt-5-mini` replaces `gpt-4o-mini`
  - Google `gemini-2.5-flash-lite` was added to the backend model registry
- Periodically re-check official OpenAI, Google Gemini, xAI, and Groq model catalogs and proactively bring it to the maintainer's attention.
- When backend model constants change, update [backend/src/types-and-constants.ts](/Users/bojanjovanovic/Desktop/Svelte/AiChatBot/backend/src/types-and-constants.ts) comments and the maintained Markdown docs in the same change.

Use this prompt when handing the dashboard/FastAPI project the live chat analytics contract.

## Prompt

Prepare Chat Analytics to consume real Cloudflare D1 data instead of dummy data.

Use this D1 schema as the source of truth:
- `chat_sessions`
- `chat_messages`
- `chat_search_sequences`
- `chat_message_products`
- `chat_events`

Important interpretation rules:
- `chat_messages` is the main source for the Queries tab.
- One `chat_messages` row represents one user-authored message plus the backend handling and final assistant response for that ask.
- `chat_search_sequences` is for unresolved/sequence-quality analysis, not the primary source for Queries.
- The Unresolved tab must only use `chat_search_sequences` where `status = 'unresolved'`.
- Do not treat `open` sequences as unresolved.
- Do not treat `clarification` inside an open sequence as unresolved by itself.
- Sessions should represent full chat visits from `chat_sessions`, not a flattened latest-query summary.

Build or update these screens:

### 1. Overview
- Aggregate from `chat_messages` and `chat_search_sequences`
- Total Queries = count of filtered query messages, not count of sequences
- No-results rate = based on query messages with `result_count = 0`
- Click-through rate = clicks / results shown using `chat_message_products`
- Unresolved rate = count of `chat_search_sequences` with `status = 'unresolved'`
- Top bucket = based on query/message grouping, not latest sequence text

### 2. Queries
- Source: `chat_messages`
- Group by `user_text_normalized`
- Exclude low-signal confirmations such as:
  - `yes`, `yeah`, `yep`, `ok`, `okay`, `sure`, `that one`, `this one`
- Show:
  - query
  - searches
  - results shown
  - clicks
  - ctr
  - unresolved count
  - last seen
- Use `created_at` for time-based aggregation

### 3. Unresolved
- Source: `chat_search_sequences`
- Only rows with `status = 'unresolved'`
- Show:
  - `resolved_query_text`
  - `reason_codes_json`
  - `message_count`
  - `cue_verdict`
  - `intent_verdict`
  - `recommendation_verdict`
  - `satisfaction_verdict`
  - `started_at`
  - `ended_at`

### 4. Products
- Source: `chat_message_products`
- Aggregate by `product_id` and/or `product_name`
- Show:
  - mentions
  - clicks
  - external clicks
  - ctr
  - last seen

### 5. Sessions
- Source: `chat_sessions`
- One row per `session_id`
- Show:
  - session_id
  - message_count
  - sequence_count
  - total results shown
  - total clicks
  - reformulated yes/no
  - exited yes/no
  - started_at
  - last_activity_at

### 6. Session detail
- Clicking a session row should open a detail page or drawer
- Load `chat_messages` for the session ordered by `message_index ASC`
- For each message show:
  - `user_text_raw`
  - `assistant_response_text`
  - `predicted_cue`
  - `predicted_intent`
  - `result_count`
  - `status`
  - `fallback_reason`
  - `created_at`
- Under each message show products from `chat_message_products` ordered by `rank_position`
- Also show related `chat_events` ordered by `occurred_at`

### Read-layer requirements
- Build read-only FastAPI endpoints over Cloudflare D1
- Visualize fields returned by the API
- Do not invent new classification logic in the dashboard
- Tolerate nulls
- Keep existing UI structure and styling; this is a data interpretation update, not a redesign

## Maintenance Reminder

If the schema or interpretation rules change in this repo:
- update [CHAT_ANALYTICS_SCHEMA.md](/Users/bojanjovanovic/Desktop/Svelte/AiChatBot/CHAT_ANALYTICS_SCHEMA.md)
- update this prompt file
- notify the dashboard project that the contract changed
