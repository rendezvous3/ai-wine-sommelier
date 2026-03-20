# Vectorizer Reporting Schema Contract

Last updated: March 19, 2026
Verification source:
- existing live tables verified previously in `vectorizer-qa`
- new snapshot contract verified against the current code in:
  - [run_reports.py](/Users/bojanjovanovic/Desktop/Svelte/AiChatBot/vectorizer/src/core/run_reports.py)
  - [pipeline.py](/Users/bojanjovanovic/Desktop/Svelte/AiChatBot/vectorizer/src/core/pipeline.py)
  - [run_sync_cycle.py](/Users/bojanjovanovic/Desktop/Svelte/AiChatBot/vectorizer/src/run_sync_cycle.py)

This file is the source-of-truth contract for vectorizer reporting tables used by the dashboard and product-history tooling.

## Model Catalog Maintenance

- Last reviewed: March 20, 2026
- Fast-model constants updated on this date:
  - OpenAI `gpt-5-mini` replaces `gpt-4o-mini`
  - Google `gemini-2.5-flash-lite` was added to the backend model registry
- Periodically re-check official OpenAI, Google Gemini, xAI, and Groq model catalogs and proactively bring it to the maintainer's attention.
- When backend model constants change, update [backend/src/types-and-constants.ts](/Users/bojanjovanovic/Desktop/Svelte/AiChatBot/backend/src/types-and-constants.ts) comments and the maintained Markdown docs in the same change.

Maintenance rule:
- Any change to vectorizer reporting tables, columns, defaults, retention behavior, or interpretation rules must update this file in the same change.
- If the reporting contract changes, update [VECTORIZER_REPORTING_DASHBOARD_PROMPT.md](/Users/bojanjovanovic/Desktop/Svelte/AiChatBot/VECTORIZER_REPORTING_DASHBOARD_PROMPT.md) too.
- If the reporting contract changes, remind the dashboard project to update its read model and UI assumptions.

## Confirmed / Intended Tables

### `vectorizer_runs`
Meaning:
- One row per vectorizer run.

Key columns:
- `run_id`
- `trigger_source`
- `status`
- `index_name`
- `min_quantity`
- `limit_value`
- `started_at`
- `finished_at`
- `fetched_count`
- `transformed_count`
- `document_count`
- `uploaded_count`
- `new_count`
- `updated_count`
- `missing_from_fetch_count`
- `low_stock_removed_count`
- `stale_deleted_count`
- `summary_json`

### `vectorizer_run_events`
Meaning:
- Delta/event log for products that were added, updated, excluded, warned, or removed in a run.
- This is not a full per-run snapshot.

Key columns:
- `event_id`
- `run_id`
- `index_name`
- `product_id`
- `event_type`
- `disposition`
- `stage`
- `severity`
- `reason`
- `reason_code`
- `reason_label`
- `status`
- `raw_name`
- `normalized_name`
- `category`
- `subcategory`
- `previous_state_json`
- `current_state_json`
- `source_snapshot_json`
- `normalized_snapshot_json`
- `details_json`
- `missing_field_count`
- `changed_field_count`
- `created_at`

### `vectorizer_run_event_fields`
Meaning:
- Field-level diff records attached to `vectorizer_run_events`.
- This is the source for “what changed quantity from X to Y”.

Key columns:
- `event_field_id`
- `event_id`
- `run_id`
- `product_id`
- `field_name`
- `field_role`
- `source_value_text`
- `previous_value_text`
- `current_value_text`
- `notes`
- `created_at`

### `vectorizer_run_reason_counts`
Meaning:
- Per-run rollup of event reason counts.

Key columns:
- `run_id`
- `stage`
- `severity`
- `reason_code`
- `event_count`
- `product_count`
- `created_at`

### `vector_uniques_<index>`
Example:
- `vector_uniques_products_qa`

Meaning:
- Current uniqueness ledger / active state table for a vector index.
- This is the current latest-known row, not history.

Key columns:
- `product_id`
- `normalized_name`
- `raw_name`
- `category`
- `subcategory`
- `quantity`
- `price`
- `updated_at`
- `last_seen_at`

Important interpretation:
- `updated_at` here is effectively “last synced/upserted”, not a guaranteed “last materially changed quantity” timestamp.
- `last_seen_at` is the latest run where the product was seen and successfully upserted into the ledger.

### `vectorizer_run_product_snapshots`
Meaning:
- One compact row per product per run.
- This is the new table that powers:
  - full last-run product snapshots
  - per-product quantity history
  - explicit `unchanged` confirmation for the tracked fields

Tracked-change scope:
- `raw_name`
- `category`
- `subcategory`
- `quantity`
- `price`

Columns:
- `snapshot_id` `TEXT` primary key
- `run_id` `TEXT` not null
- `index_name` `TEXT` not null
- `product_id` `TEXT` not null
- `raw_name` `TEXT`
- `normalized_name` `TEXT`
- `category` `TEXT`
- `subcategory` `TEXT`
- `source_seen` `INTEGER` default `0`
- `active_after_run` `INTEGER` default `0`
- `disposition` `TEXT` not null
- `reason_code` `TEXT`
- `reason_label` `TEXT`
- `status` `TEXT` not null
- `quantity` `INTEGER`
- `previous_quantity` `INTEGER`
- `price` `REAL`
- `previous_price` `REAL`
- `changed_fields_json` `TEXT`
- `created_at` `TEXT` not null

Interpretation:
- `source_seen = 1` means the product was present in the source fetch for that run.
- `active_after_run = 1` means it remained active in the index/ledger after the run.
- `disposition` is the final run outcome for that product:
  - `new`
  - `updated`
  - `unchanged`
  - `excluded`
  - `removed`
- `status` is the final application status:
  - `applied`
  - `skipped`
  - `pending_removal`
  - `failed`
- `quantity` is the best known quantity for that run.
- `previous_quantity` is the prior ledger quantity when applicable.
- `changed_fields_json` lists tracked fields that changed for `updated` rows.

## What Can Be Answered Reliably

### Current product state
Use:
- `vector_uniques_<index>`

### Last quantity change for a product
Use:
- `vectorizer_run_event_fields`
- filter `field_name = 'quantity'`
- join back to `vectorizer_run_events`

### Was the product unchanged in the last run?
Use:
- `vectorizer_run_product_snapshots`
- one row for that `run_id` + `product_id`
- check `disposition = 'unchanged'`

### What quantity did the product have on each recent run?
Use:
- `vectorizer_run_product_snapshots`
- filter by `product_id`
- order by `created_at DESC` or join to `vectorizer_runs.started_at`

## Current Retention Contract

Config:
- `PRODUCT_HISTORY_RETENTION_DAYS`
- or `VECTORIZER_PRODUCT_HISTORY_RETENTION_DAYS`
- default: `14`

Behavior:
- `vectorizer_run_product_snapshots` is purged after each run for rows older than the configured retention window.
- Historical snapshot rows for deleted products are intentionally kept until they age out.
- Product deletion from the active ledger does not immediately delete snapshot history, because that history is needed for recent audit/debugging.

## Important Caveats

- `vectorizer_run_events` is delta-based; it does not prove “unchanged” by itself.
- `vectorizer_run_product_snapshots` is the source of truth for explicit unchanged confirmation.
- Storefront “out of stock” is not yet a first-class tracked field in the vectorizer reporting contract.
- Today’s tracked change scope is only:
  - `raw_name`
  - `category`
  - `subcategory`
  - `quantity`
  - `price`

## Recommended Dashboard Use

### Last Run Snapshot tab
Source:
- `vectorizer_run_product_snapshots`

Recommended columns:
- `product_id`
- `raw_name`
- `category`
- `subcategory`
- `quantity`
- `previous_quantity`
- `price`
- `previous_price`
- `disposition`
- `reason_label`
- `status`

### Product Inspector / Product History
Sources:
- current state from `vector_uniques_<index>`
- history from `vectorizer_run_product_snapshots`
- detailed diffs from `vectorizer_run_event_fields`

Recommended product-history fields:
- run time
- quantity
- previous quantity
- disposition
- reason
- status
- changed fields

## Verification Queries

### Latest run
```sql
SELECT run_id, started_at, finished_at, status
FROM vectorizer_runs
ORDER BY started_at DESC
LIMIT 1;
```

### Last-run snapshot
```sql
SELECT *
FROM vectorizer_run_product_snapshots
WHERE run_id = 'RUN_ID_HERE'
ORDER BY disposition ASC, raw_name ASC, product_id ASC;
```

### Product history
```sql
SELECT s.*, r.started_at, r.finished_at
FROM vectorizer_run_product_snapshots s
LEFT JOIN vectorizer_runs r
  ON r.run_id = s.run_id
WHERE s.index_name = 'products-qa'
  AND s.product_id = 'PRODUCT_ID_HERE'
ORDER BY r.started_at DESC, s.created_at DESC;
```

### Last quantity change
```sql
SELECT
  f.run_id,
  e.created_at,
  f.previous_value_text AS previous_qty,
  f.current_value_text AS current_qty
FROM vectorizer_run_event_fields f
JOIN vectorizer_run_events e
  ON e.event_id = f.event_id
WHERE f.product_id = 'PRODUCT_ID_HERE'
  AND f.field_name = 'quantity'
  AND f.field_role = 'changed'
ORDER BY e.created_at DESC
LIMIT 1;
```
