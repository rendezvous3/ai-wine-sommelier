# Codex Context Policy

## Local Terminal Note

On this Mac, `node`, `npm`, `npx`, `wrangler`, and `pywrangler` may be missing in a fresh terminal until `nvm` is activated. Before running any Node/Wrangler command in a new terminal, run:

```bash
nvm use --lts
```

This repository should be treated with a strict development-only context window.

## Model Catalog Maintenance

- Last reviewed: March 20, 2026
- Fast-model constants updated on this date:
  - OpenAI `gpt-5-mini` replaces `gpt-4o-mini`
  - Google `gemini-2.5-flash-lite` was added to the backend model registry
- Periodically re-check official OpenAI, Google Gemini, xAI, and Groq model catalogs and proactively bring it to the maintainer's attention.
- When backend model constants change, update [backend/src/types-and-constants.ts](/Users/bojanjovanovic/Desktop/Svelte/AiChatBot/backend/src/types-and-constants.ts) comments and the maintained Markdown docs in the same change.

## Primary Working Set

- `backend/`
- `client/`
- `vectorizer/`
- Root operational docs/config used during development

## Hard Exclusions (Recursive)

- `**/node_modules/**`
- `**/venv/**`
- `**/.venv/**`
- `**/env/**`
- `**/__pycache__/**`
- `**/*.pyc`
- `**/dist/**`
- `**/build/**`
- `**/.svelte-kit/**`
- `**/.cache/**`
- `**/coverage/**`
- `**/test-results/**`
- `**/.idea/**`
- `**/.vscode/**`
- `**/*.log`
- `**/*.tmp`
- `**/.DS_Store`

## Behavior

- Read only files needed for the current task.
- Skip excluded paths during search/index operations.
- Only enter excluded paths when the user explicitly asks.
- Chat analytics D1 work must stay aligned with [CHAT_ANALYTICS_SCHEMA.md](/Users/bojanjovanovic/Desktop/Svelte/AiChatBot/CHAT_ANALYTICS_SCHEMA.md).
- Any change to chat analytics schema or interpretation rules must update:
  - [CHAT_ANALYTICS_SCHEMA.md](/Users/bojanjovanovic/Desktop/Svelte/AiChatBot/CHAT_ANALYTICS_SCHEMA.md)
  - [CHAT_ANALYTICS_DASHBOARD_PROMPT.md](/Users/bojanjovanovic/Desktop/Svelte/AiChatBot/CHAT_ANALYTICS_DASHBOARD_PROMPT.md)
- If chat analytics schema changes, remind the user to update the dashboard project too.
- Vectorizer reporting schema work must stay aligned with [VECTORIZER_REPORTING_SCHEMA.md](/Users/bojanjovanovic/Desktop/Svelte/AiChatBot/VECTORIZER_REPORTING_SCHEMA.md).
- Any change to vectorizer reporting schema or interpretation rules must update:
  - [VECTORIZER_REPORTING_SCHEMA.md](/Users/bojanjovanovic/Desktop/Svelte/AiChatBot/VECTORIZER_REPORTING_SCHEMA.md)
  - [VECTORIZER_REPORTING_DASHBOARD_PROMPT.md](/Users/bojanjovanovic/Desktop/Svelte/AiChatBot/VECTORIZER_REPORTING_DASHBOARD_PROMPT.md)
- If vectorizer reporting schema changes, remind the user to update the dashboard project too.

## Current Operational Topology (Mandatory)

- Runtime split:
  - `vectorizer/src/core/**` = shared sync/reconcile logic
  - `vectorizer/src/*.py` = local CLI entrypoints
  - `vectorizer/src/worker_entry.py` = Cloudflare Python Worker
  - `backend/src/index.ts` = backend Worker
  - `client/` = widget bundle / Pages output
- Production/live-ish lane:
  - Vectorize index `products-prod`
  - Backend `ecom-chat-backend`
  - Vectorizer Worker `vectorizer-worker`
  - Pages `https://cannavita-widget.pages.dev`
- QA automation lane:
  - Vectorize index `products-qa`
  - D1 database `vectorizer-qa`
  - Backend `ecom-chat-backend-qa`
  - Vectorizer Worker `vectorizer-worker-qa`
  - Pages project `cannavita-widget-qa`
- `products-prod` remains the manual/live-ish lane. `products-qa` is for automation validation and must stay full-catalog only when stale reconciliation is enabled.
- For the current QA-to-prod cron promotion procedure, refer to [QA_TO_PROD_INSTR.md](/Users/bojanjovanovic/Desktop/Svelte/AiChatBot/QA_TO_PROD_INSTR.md).
- Local `.env` files are for CLI runs only. Deployed Workers use Cloudflare Worker secrets.
- On localhost, the client does not choose the Vectorize index. The backend chooses it via `backend/wrangler.toml` (`products-prod`) or `backend/wrangler.qa.toml` (`products-qa`). The client only chooses which backend URL to call.
- `wrangler --config ...` and `pywrangler --config ...` resolve relative to the current working directory. Give deploy instructions from the correct service directory or use absolute config paths.
- `npx wrangler pages deploy ...` from a non-production branch creates a preview alias. Use `--branch=main` to publish to the stable Pages root URL.
- QA vectorizer Worker secrets must include `CF_AI_API_TOKEN`. `CF_D1_API_TOKEN` must have D1 edit permission.
- Tinctures are now a first-class category. Plain `tincture` / `tinctures` maps to category `tinctures`; `CBD tincture` remains category `cbd` with subcategory `tincture`.
- `vectorizer-worker-qa` currently relies on explicit Worker limits (`cpu_ms = 300000`, `subrequests = 50000`) and has been validated against the full current QA catalog with `limit = 1500` (`fetched_count = 824`, `uploaded_count = 682`, `transform_errors = 0`).
- `postrun-verifier-qa` is currently authoritative in `categories_only` mode only. The deployed `full` verifier suite still has a flaky backend API probe, so direct backend curls remain the API sanity source of truth.

## UI Development Flow (Mandatory)

- `client/src/Widget.svelte` is composition-only. Keep it focused on wiring state, callbacks, and imports.
- Implement feature UI as reusable components in `Svelte-Component-Library/src/lib/custom/**`.
- Do not ship new large inline UI sections in `Widget.svelte` (HTML/CSS/function bundles).
- Reuse components across related features:
  - Welcome/assistant intro
  - Quick Start container
  - Tag/chip items
  - Disclosure panels
  - Feedback form panel
- Prefer shared chat primitives (`ChatMessage`, chat bubble patterns) for welcome/disclosure messaging to keep visual consistency.

## Accessibility Compliance (Mandatory)

- Treat accessibility as a release requirement, not a polish task.
- Preserve WCAG 2.1 AA behavior for all widget changes.
- Do not remove or regress:
  - Chat live-region/log semantics
  - Dialog focus trap/restore behavior
  - Keyboard navigation for custom controls
  - Reduced-motion support
  - Visible focus indicators
- Any UI-affecting change must include accessibility verification notes in testing output.

## Vectorizer Data Quality (Mandatory)

- Preserve vectorizer ingestion safeguards:
  - `--limit none` for full-catalog runs
  - optional `--min-quantity` low-stock filtering
  - duplicate prevention by `id` and normalized `name`
  - per-index D1 uniqueness tables (`vector_uniques_<index>`) for cross-run protection
  - stale reconciliation (`reconcile_stale.py`) to remove vectors no longer present
- Duplicate hits must be skipped/logged without crashing scheduled sync jobs.
- When validating cron behavior, verify `GET /last-run` returns `"trigger_source": "scheduled"` instead of assuming deployment means execution.
