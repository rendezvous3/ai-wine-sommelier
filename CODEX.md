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
