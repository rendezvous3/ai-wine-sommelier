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
