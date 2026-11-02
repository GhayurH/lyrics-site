# Coding agent contract

Use [Contributing](docs/CONTRIBUTING.md) for poetry and tests, [Architecture](docs/ARCHITECTURE.md) for ownership, [Quality assurance](docs/QUALITY_ASSURANCE.md) for validation, and [Operations](docs/RECITATION_OPERATIONS.md) for production bindings.

- Preserve reviewed Urdu/Roman wording, stanza order and numbers, meaningful punctuation, printed Basta pages, public routes and permanent recitation IDs. Do not auto-approve uncertain source mappings.
- Roman spelling conventions: **Husain**, **Hasan**, `ڑ` → `r`, Urdu `ے` → `e`, with Punjabi pronunciation treated separately.
- Share reader controls, source models, CSS tokens and responsive breakpoints. No page-wide horizontal text scrolling; only an individual long line may pan under extreme zoom for readability. Reading remains functional without JavaScript.
- Keep R2 binaries outside Git and retain root-relative `/images/` and `/files/` URLs. Search is Pagefind-based; D1/Pages Functions handle published Recitation Sets, not poetry text.
- Preserve local-only drafts, bookmarks and private organizer capabilities. Never cache or publicly share edit tokens.
- After editing poetry Markdown run `npm run source:sync`, then `git diff --check`, `npm run check`, `npm run build` and relevant browser tests. Use existing tests for additional cases instead of creating duplicate smoke/full scenarios.
- Document current contracts, not chronological development notes. Avoid speculative or WIP comments.
