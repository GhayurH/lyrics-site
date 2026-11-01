# Coding agent instructions

Read [Contributing](docs/CONTRIBUTING.md) for editorial/validation rules, [Architecture](docs/ARCHITECTURE.md) for code ownership, [Assets](docs/ASSET_WORKFLOW.md) for R2, and [Recitation Sets](docs/RECITATION_SETS.md) / [Operations](docs/RECITATION_OPERATIONS.md) for publication and D1.

## Invariants

- Preserve reviewed wording, harakat, punctuation, meaningful asterisks, stanza numbers, Basta page numbers, public URLs, and published recitation IDs unless explicitly instructed otherwise.
- Keep the required `kalamType`, stable source IDs, and paired Basta `---***---` boundaries. Source markdown remains authoritative; no silent editorial substitutions.
- Roman conventions: **Husain**, **Hasan**, `ڑ` → `r`, Urdu `ے` → `e` (Punjabi pronunciation excepted). Capitalize Roman titles.
- All readers share `ReadingControls.astro`, `reader-state.ts`, `reading-columns.css`, and the relevant stanza/Basta parsers. Never wrap verses or introduce horizontal text scrolling. Reading works without JavaScript.
- Centralize shared design values in `tokens.css` and shared UI rules in `core.css`; keep route-only styles local. Maintain consistent static/streamed rendering.
- R2 binaries stay outside Git; retain `/images/` and `/files/` paths. Pagefind loads only on Search; Pages Functions serve only programme endpoints. Browser bookmarks/drafts/history stay local.
- Explain non-obvious code with useful comments, not WIP notes.

## Before committing

Run `npm run build`, `git diff --check`, and applicable `npm run test:smoke` / `npm run test:browser` checks. Do not commit `dist/`, `.astro/`, dependencies, scratch files, or binaries. CI selection is in [Validation](docs/CONTRIBUTING.md#validation).
