# Vectorizer Reporting Dashboard Handoff Prompt

Last updated: April 3, 2026

## Model Catalog Maintenance

- Last reviewed: March 20, 2026
- Fast-model constants updated on this date:
  - OpenAI `gpt-5-mini` replaces `gpt-4o-mini`
  - Google `gemini-2.5-flash-lite` was added to the backend model registry
- Periodically re-check official OpenAI, Google Gemini, xAI, and Groq model catalogs and proactively bring it to the maintainer's attention.
- When backend model constants change, update [backend/src/types-and-constants.ts](/Users/bojanjovanovic/Desktop/Svelte/AiChatBot/backend/src/types-and-constants.ts) comments and the maintained Markdown docs in the same change.

Use this prompt when handing the dashboard/FastAPI project the vectorizer reporting contract.

## Prompt

Update the Vectorize dashboard to support full last-run product snapshots and per-product quantity history.

Use this reporting contract as the source of truth:
- `vectorizer_runs`
- `postrun_verifications`
- `postrun_verification_checks`
- `vectorizer_run_events`
- `vectorizer_run_event_fields`
- `vectorizer_run_reason_counts`
- `vector_uniques_<index>` such as `vector_uniques_products_qa`
- `vectorizer_run_product_snapshots`

Important interpretation rules:
- `vectorizer_runs.status` is vectorizer execution state, not verifier state.
- `postrun_verifications.status` is verifier state and can differ from `vectorizer_runs.status`.
- Treat verifier `deferred` as “verification not yet final,” not as a vectorization failure.
- Surface `vectorizer_runs.summary_json.reporting.status` and `vectorizer_runs.summary_json.reporting.warnings` as reporting-health metadata.
- `vectorizer_run_events` is delta-based and does not prove unchanged by itself.
- `vectorizer_run_product_snapshots` is the source of truth for explicit unchanged confirmation.
- `vector_uniques_<index>` is the current active ledger state only.
- `vector_uniques_<index>.updated_at` should be treated as last synced/upserted, not guaranteed last materially changed quantity time.
- Product deletion from the active ledger should not erase recent snapshot history immediately. History remains until retention purges it.

Build or update these screens:

### 1. Last Run Snapshot
- Source: `vectorizer_run_product_snapshots`
- Filtered by the selected `run_id`
- Show one row per product in that run
- Recommended columns:
  - product_id
  - raw_name
  - category
  - subcategory
  - quantity
  - previous_quantity
  - price
  - previous_price
  - disposition
  - reason_label
  - status

### 2. Product Inspector
- Search by `product_id` or product name
- Show current ledger state from `vector_uniques_<index>`:
  - product_id
  - raw_name
  - category
  - subcategory
  - quantity
  - price
  - updated_at
  - last_seen_at
- Show product snapshot history from `vectorizer_run_product_snapshots`
- Show field-level change history from `vectorizer_run_event_fields`

### 3. Product Quantity History
- Source: `vectorizer_run_product_snapshots`
- Join to `vectorizer_runs` for run timestamps
- For each run show:
  - run_id
  - started_at
  - quantity
  - previous_quantity
  - disposition
  - reason_label
  - status
  - changed_fields_json

### 4. Last Quantity Change
- Source: `vectorizer_run_event_fields`
- Filter:
  - `field_name = 'quantity'`
  - `field_role = 'changed'`
- Join to `vectorizer_run_events` for event time and reason

### 5. Existing run detail
- Keep current:
  - Removed
  - Updated
  - Excluded
  - Reason counts
- Add:
  - Unchanged
  - Full snapshot
- Add separate status presentation for:
  - vectorizer status
  - verifier status
  - reporting health (`ok` vs `warning`)
- Prefer `vectorizer_run_product_snapshots` for the full list rather than trying to infer unchanged rows from event absence.

### 6. Verification detail / verification list
- Source: `postrun_verifications`
- Show:
  - verification_id
  - suite
  - source
  - index_name
  - status
  - vectorizer_run_id
  - active_unique_count
  - expected_active_delta
  - actual_active_delta
  - started_at
  - finished_at
- On verification detail pages, resolve and show the linked vectorizer run status alongside verifier status.
- If verifier status is `deferred`, explain that the linked vectorizer run may still be `running` or may have succeeded later.
- Show the underlying verification checks from `postrun_verification_checks`, including deferred checks separately from failed checks.

### 7. QA/PROD lane UX
- Keep the interactive `QA | PROD` lane selector on top-level list pages only:
  - Sync Runs
  - Verifications
  - Products
- Do not keep that toggle on drilldown pages such as:
  - run detail
  - full snapshot
  - product inspector
- On drilldown pages, show a passive lane badge (`QA` or `PROD`) instead of an interactive toggle.
- When `lane=prod`, the top-level lists must exclude QA/test/local rows that do not belong to the prod lane.
- When `lane=qa`, the top-level lists must exclude prod/test/local rows that do not belong to the QA lane.

### Read-layer requirements
- Build read-only FastAPI endpoints over D1.
- Do not invent unchanged history from current ledger alone.
- If a product has no quantity change event, but snapshot rows exist, use snapshot rows as the authoritative per-run qty history.
- Tolerate null quantity and price values.
- Do not collapse verifier status and vectorizer status into a single field in the read model.
- Keep the current UI structure and styling; this is a reporting/data-model expansion, not a redesign.
- Preserve lane in top-level navigation URLs, but treat individual run pages as lane-fixed by the selected run.

## Maintenance Reminder

If the vectorizer reporting schema or interpretation rules change in the main repo:
- update `VECTORIZER_REPORTING_SCHEMA.md`
- update this prompt file
- update the dashboard project’s read model and UI assumptions
