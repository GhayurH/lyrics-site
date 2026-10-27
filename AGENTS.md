# Coding agent instructions

This is the short operational entry point. Canonical details live in [CONTRIBUTING.md](docs/CONTRIBUTING.md) (content and validation), [ARCHITECTURE.md](docs/ARCHITECTURE.md) (implementation boundaries), [ASSET_WORKFLOW.md](docs/ASSET_WORKFLOW.md) (R2), and [RECITATION_SETS.md](docs/RECITATION_SETS.md) (source IDs and programme storage).

## Non-negotiable invariants

- Preserve reviewed Urdu wording, harakat, punctuation, line divisions, stanza numbering, Basta page numbers, and public URLs unless specifically asked to change them.
- Use `src/content.config.ts` and the required `kalamType` model; do not recreate legacy category inference.
- Keep R2 images/PDFs outside Git and preserve root-relative `/images/` and `/files/` URLs.
- Keep published recitation IDs stable, including when moving or correcting source text; follow the ID maintenance guide.
- Preserve server-rendered/no-JavaScript reading and the paired Basta `---***---` kalam boundaries.
- Reuse `ReadingControls.astro`, `reader-state.ts`, and `reading-columns.css` rather than duplicating reader state or layout. Verses never wrap or horizontally scroll.
- Keep static and streamed Basta markup consistent; keep scan links usable without JavaScript and missing editions explicit.
- Keep browsing/search/static assets out of Pages Functions; Pagefind loads only on the Search route. Browser reading history, bookmarks, and drafts stay local.
- Put shared primitives in `src/styles/core.css` and route styling in feature CSS. Add purposeful `File role:` comments; remove obsolete WIP commentary.

## Before committing

Run `npm run build`, inspect `git diff --check` and `git status --short`; for UI work run Chromium `@smoke` tests, and use the complete suite at milestones. Consult [validation guidance](docs/CONTRIBUTING.md#validation) for CI conditions and browser coverage.

Never commit generated build output, dependencies, local scratch files, or R2-hosted binaries.
