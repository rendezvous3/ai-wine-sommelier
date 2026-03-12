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
  - `.gitignore`
  - `CLAUDE.md`

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
