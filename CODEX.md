# Codex Context Policy

This repository should be treated with a strict development-only context window.

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
