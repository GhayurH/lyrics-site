# Kalam Archive agent guide

This file is the short operational contract for coding agents. Human-facing setup and content rules live in `README.md` and `CONTRIBUTING.md`; architecture boundaries live in `docs/ARCHITECTURE.md`.

## Preserve behavior and content

- Treat Urdu wording, line breaks, stanza numbering, punctuation, harakat, Basta page numbering, and stable public URLs as preserved data unless the task explicitly changes them.
- Use the required `kalamType` metadata model; do not reintroduce legacy category inference.
- Keep large `/images/` and `/files/` assets in Cloudflare R2, not Git.

## Architecture boundaries

- `src/layouts/BaseLayout.astro`: global shell only.
- `src/styles/core.css`: genuinely cross-route primitives only; route styles stay route-local.
- `src/client/`: browser-side controllers and local persistence.
- `src/lib/`: shared domain/data helpers; `*-data.ts` and collection loaders are server/build-time code.
- `src/components/`: reusable presentation with minimal behavior.
- `src/pages/`: route composition, not duplicated domain logic.

Prefer extending an existing shared helper/component over copying logic into another route. Keep `File role:` comments on substantive source/style/config scripts, but comment decisions and boundaries rather than obvious syntax.

## Reader/search rules

- Normal lyrics and all Basta readers share `ReadingControls.astro` and `src/client/reader-state.ts`.
- The continuous Basta reader is chunked; do not regress it to shipping the entire book HTML on first load.
- The page-by-page Basta reader is the static/non-JavaScript fallback and must remain usable.
- Pagefind assets belong on the Search route only.
- Saved/Recent cards must use the canonical `LyricCardData`/lyric-card class contract.

## Before committing

Run:

```bash
npm run build
git diff --check
git status --short
```

Review `git diff` before committing. Do not commit `dist/`, `.astro/`, dependencies, local tooling, or R2-hosted binary assets.
