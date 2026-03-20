# Development Context Scope

## Local Terminal Note

On this Mac, `node`, `npm`, `npx`, `wrangler`, and `pywrangler` may be missing in a fresh terminal until `nvm` is activated. Before running any Node/Wrangler command in a new terminal, run:

```bash
nvm use --lts
```

Use only files required for coding, debugging, testing, and architecture decisions.

## Include By Default

- `backend/**` (except ignored paths below)
- `client/**` (except ignored paths below)
- `vectorizer/**` (except ignored paths below)
- Root config and docs needed for active work:
  - `README.md`
  - `TESTING.md`
  - `TESTING_QUICK_REFERENCE.md`
  - `STREAM_FIRST_IMPLEMENTATION.md`
  - `CHAT_ANALYTICS_SCHEMA.md`
  - `CHAT_ANALYTICS_DASHBOARD_PROMPT.md`
  - `VECTORIZER_REPORTING_SCHEMA.md`
  - `VECTORIZER_REPORTING_DASHBOARD_PROMPT.md`
  - `.gitignore`
  - `CLAUDE.md`
  - `CODEX.md`
  - `AGENTS.md`

## Always Ignore (Root + All Subfolders)

- `**/node_modules/**`
- `**/.pnpm-store/**`
- `**/.npm/**`
- `**/.yarn/**`
- `**/venv/**`
- `**/.venv/**`
- `**/env/**`
- `**/__pycache__/**`
- `**/*.pyc`
- `**/.pytest_cache/**`
- `**/.mypy_cache/**`
- `**/.ruff_cache/**`
- `**/dist/**`
- `**/build/**`
- `**/.svelte-kit/**`
- `**/.next/**`
- `**/.cache/**`
- `**/coverage/**`
- `**/test-results/**`
- `**/.DS_Store`
- `**/*.log`
- `**/*.tmp`
- `**/*.swp`
- `**/.idea/**`
- `**/.vscode/**`

## Agent Rules

- Prefer reading the smallest relevant file set before expanding scope.
- Do not index ignored paths unless explicitly requested by the user.
- If context is missing, expand scope incrementally and justify why.
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

## Operational Topology Rules (Mandatory)

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
- `products-prod` stays manual/live-ish until QA automation is trusted.
- `products-qa` must stay full-catalog only when stale reconciliation is enabled.
- For the current QA-to-prod cron promotion procedure, refer to [QA_TO_PROD_INSTR.md](/Users/bojanjovanovic/Desktop/Svelte/AiChatBot/QA_TO_PROD_INSTR.md).
- Local `.env` files are CLI-only. Deployed Workers use Cloudflare Worker secrets.
- On localhost, the client does not choose the Vectorize index. The backend chooses it via `backend/wrangler.toml` (`products-prod`) or `backend/wrangler.qa.toml` (`products-qa`). The client only chooses which backend URL to call.
- `wrangler --config ...` and `pywrangler --config ...` resolve relative to the current working directory. Always run deploy commands from the correct service directory or use absolute config paths.
- Pages deploys from feature branches create preview aliases; use `--branch=main` for the stable project root URL.
- QA vectorizer Worker secrets must include `CF_AI_API_TOKEN`. `CF_D1_API_TOKEN` must have D1 edit permission.
- Tinctures are now a first-class category. Plain `tincture` / `tinctures` maps to category `tinctures`; `CBD tincture` remains category `cbd` with subcategory `tincture`.
- `vectorizer-worker-qa` currently depends on explicit Worker limits (`cpu_ms = 300000`, `subrequests = 50000`) and has been validated against the current full QA catalog with a bounded `limit = 1500` run (`fetched_count = 824`, `uploaded_count = 682`, `transform_errors = 0`).
- `postrun-verifier-qa` should currently be trusted in `categories_only` mode only. The deployed `full` verifier suite still has a flaky backend API probe, so direct backend curls remain the authoritative API check.

## UI Architecture Rules (Mandatory)

- Do not embed large UI markup, feature logic, and styles directly inside `client/src/Widget.svelte`.
- Build reusable UI in `Svelte-Component-Library/src/lib/custom/**` and import into the widget.
- Treat these as componentized building blocks:
  - Welcome/intro experience
  - Quick Start section
  - Quick Start tags/chips
  - Sidebar panels (disclosures and feedback)
- Disclosure screens should share reusable panel components whenever possible.
- Feedback should be implemented as its own reusable component.
- Prefer existing shared components for message rendering (for example `ChatMessage`/chat bubble patterns) over ad-hoc HTML blocks.
- Keep `Widget.svelte` as orchestration/composition only (state wiring + callbacks), not a monolithic UI file.

## Accessibility Rules (Mandatory)

- Maintain WCAG 2.1 AA widget compliance in all frontend changes.
- Any change to interactive UI must preserve:
  - keyboard-only operation,
  - visible focus states,
  - assistive announcements for important state changes,
  - and reduced-motion behavior where animations exist.
- Panel/disclosure experiences must remain accessible dialog flows (focus trap, Escape close, focus restore).
- Custom controls (dropdowns/cards/toggles) must keep ARIA roles/states synchronized with behavior.

## Vectorizer Data Quality Rules (Mandatory)

- Keep vectorizer commands and docs aligned with current ingestion controls:
  - full pull via `--limit none` / `all-products`
  - optional stock filter via `--min-quantity`
  - dedup by product `id` and normalized `name`
  - per-index D1 uniqueness ledger table
  - stale reconciliation by `last_seen_at` to remove vectors no longer in catalog
- Sync jobs must be resilient: duplicates are skipped and logged, not fatal.
