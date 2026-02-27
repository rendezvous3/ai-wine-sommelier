# Development Context Scope

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
