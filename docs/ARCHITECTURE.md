# Kalam Archive architecture

This document describes the source-code boundaries used by the site. Content and asset-maintenance conventions remain in `CONTRIBUTING.md`.

## Design goals

- Keep the public HTML and URLs stable while implementation details evolve.
- Prefer static generation; browser JavaScript is reserved for user state, search controls, and progressive reading features.
- Keep route-specific CSS out of the global payload.
- Give each piece of domain data one canonical TypeScript model.
- Keep large binary assets in R2 rather than Git.

## Source layout

```text
src/
├── client/       # Browser-only controllers and DOM helpers
├── components/   # Reusable Astro/server-rendered UI
├── data/         # Content/data owned by the repository
├── layouts/      # Site-level document shells
├── lib/          # Shared domain models and server helpers
├── pages/        # Astro routes and static data endpoints
└── styles/       # Core CSS plus route/feature-owned CSS
```

### `src/client/`

Browser code lives here rather than in a generic `scripts/` directory. This prevents source modules from being confused with local maintenance scripts and makes the server/client boundary explicit.

- `storage.ts` owns localStorage parsing/writes and storage keys.
- `site.ts` owns global theme and favorite-button enhancement.
- `reader-state.ts` owns shared reading preferences.
- `lyric-card.ts` and `saved-library.ts` provide the client-rendered Saved/Recent view while reusing the same card data/class contract as Astro cards.
- `search.ts` owns Pagefind URL synchronization and active-filter chips.
- `basta-stream.ts` owns progressive continuous-reader chunk loading.
- `synced-columns.ts` synchronizes visible side-by-side Urdu, Roman, and scan panels; for Basta text, matching kalam breaks anchor per-kalam proportional progress.
- `verse-fitting.ts` measures and fits individual poetry lines without wrapping them.

### CSS ownership

`core.css` is deliberately small in scope: tokens, reset, site shell, shared buttons/controls, and the canonical lyric card.

Route/feature styles are imported only where needed:

- `home.css`
- `about.css`
- `saved.css`
- `search.css`
- `lyrics.css`
- `basta.css`
- `basta-reader.css` (continuous reader and bilingual Basta index)

Do not recreate an override stack. If a rule only serves one route, put it with that route. If several unrelated routes genuinely share a primitive, move that primitive to `core.css` instead of copying it.

## Canonical lyric cards

`src/lib/catalog.ts` defines `LyricCardData`. `LyricCard.astro` is the server-rendered implementation used by browse/category pages. Saved/Recent necessarily creates its cards after reading local browser state, but `src/client/lyric-card.ts` uses the same data contract, classes, bookmark attributes, and icon constant.

Any future card fields should be added to `LyricCardData` first.

## Reader state

Normal lyrics, page-by-page Basta, the linked Basta index, and the continuous reader all use `ReadingControls.astro` and `src/client/reader-state.ts`. Reader preferences are stored under one browser key and should not be reimplemented route-by-route.

On narrow screens the reading controls become a compact sticky toolbar so mode, size, and spacing stay reachable during long readings.

Basta kalam boundaries come from the explicit `---***---` marker in page Markdown and are never inferred from stanza lengths. The two editions render separate, naturally sized kalam blocks; the client synchronizes their scroll positions by matching kalam number plus fraction within that kalam. Scan images are synchronized using their overall scroll percentage. Synchronization activates only for panels that appear side by side; stacked and single-language modes use ordinary flow. Standalone lyrics use page-wide proportional scrolling. This keeps the short ending *Bain* on page 138 aligned without requiring the shorter Roman text to occupy artificial whitespace.

`src/lib/basta-text.ts` classifies titles without confusing a repeated opening verse, poet byline, or credit for a heading. Shared `basta.css` styles those headings as bold and underlined; non-Basta page titles use the lyric route stylesheet. The static `BastaText.astro` and streamed `basta-stream.ts` paths must retain identical markup semantics and class names.

## Continuous Basta streaming

The continuous reader no longer serializes the entire book into its initial HTML.

- `src/lib/basta-reader-data.ts` joins Urdu/Roman source collections at build time.
- The book is split into eight-page chunks around the physical index gap.
- `src/pages/data/basta-reader/[chunk].json.ts` pre-renders those chunks as static JSON.
- `/basta/read/` server-renders the first chunk and the linked index.
- `src/client/basta-stream.ts` loads later chunks before they approach the viewport and resolves direct `#page-N` links by loading the required chunk.
- The page-by-page reader remains the server-rendered/no-JavaScript fallback.

Keep chunk size conservative. Larger chunks reduce requests but increase parse/render bursts; smaller chunks do the opposite.

## Performance rules

- Pagefind JavaScript/CSS is loaded only on `/search/`.
- Off-screen continuous-reader pages use `content-visibility` when supported; the scroll controller avoids measuring distant page columns until they approach the viewport.
- R2 scans and covers use native lazy loading where they are not the primary above-the-fold image, `decoding="async"`, and fallback aspect ratios to reserve layout space before intrinsic dimensions are known.
- Do not import route CSS from `BaseLayout.astro` merely for convenience.
- Do not move the full Saved/Recent catalog into initial page HTML; keep using the static catalog endpoint.
- Keep `basta.css` as the single shared Basta stylesheet; do not reintroduce a separate kalam-break CSS import in a component.

## Validation

`npm test` runs the Node regression suite; the `prebuild` npm hook runs it again before every production build, including Cloudflare Pages deployments. The tests cover text parsing, source stanza boundaries, proportional scrolling, and explicit multi-kalam alignment on Basta page 138.

## Repository hygiene

Editor-specific files, generated output, and local maintenance scratch directories are not source and should stay out of Git. Build-driving configuration, documentation, content, and lockfiles remain versioned.

The Basta landing page and pager share `src/client/basta-navigation.ts` for page-jump validation and index-gap routing.
