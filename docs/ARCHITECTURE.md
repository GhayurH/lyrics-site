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

### CSS ownership

`core.css` is deliberately small in scope: tokens, reset, site shell, shared buttons/controls, and the canonical lyric card.

Route/feature styles are imported only where needed:

- `home.css`
- `about.css`
- `saved.css`
- `search.css`
- `lyrics.css`
- `basta.css`
- `basta-reader.css`
- `basta-stream.css`

Do not recreate an override stack. If a rule only serves one route, put it with that route. If several unrelated routes genuinely share a primitive, move that primitive to `core.css` instead of copying it.

## Canonical lyric cards

`src/lib/catalog.ts` defines `LyricCardData`. `LyricCard.astro` is the server-rendered implementation used by browse/category pages. Saved/Recent necessarily creates its cards after reading local browser state, but `src/client/lyric-card.ts` uses the same data contract, classes, bookmark attributes, and icon constant.

Any future card fields should be added to `LyricCardData` first.

## Reader state

Normal lyrics, page-by-page Basta, the linked Basta index, and the continuous reader all use `ReadingControls.astro` and `src/client/reader-state.ts`. Reader preferences are stored under one browser key and should not be reimplemented route-by-route.

On narrow screens the reading controls become a compact sticky toolbar so mode, size, and spacing stay reachable during long readings.

## Continuous Basta streaming

The continuous reader no longer serializes the entire book into its initial HTML.

- `src/lib/basta-reader-data.ts` joins Urdu/Roman source collections at build time.
- The book is split into eight-page chunks around the physical index gap.
- `src/pages/data/basta-reader/[chunk].json.ts` pre-renders those chunks as static JSON.
- `/basta/read/` server-renders the first chunk and the linked index.
- `src/client/basta-stream.ts` loads later chunks before they approach the viewport and resolves direct `#page-N` links by loading the required chunk.
- The page-by-page reader remains the static/no-JavaScript fallback.

Keep chunk size conservative. Larger chunks reduce requests but increase parse/render bursts; smaller chunks do the opposite.

## Performance rules

- Pagefind JavaScript/CSS is loaded only on `/search/`.
- Off-screen continuous-reader pages use `content-visibility` when supported.
- R2 scans and covers use native lazy loading where they are not the primary above-the-fold image, `decoding="async"`, and fallback aspect ratios to reserve layout space before intrinsic dimensions are known.
- Do not import route CSS from `BaseLayout.astro` merely for convenience.
- Do not move the full Saved/Recent catalog into initial page HTML; keep using the static catalog endpoint.

## Repository hygiene

Editor-specific files, duplicated AI-agent instruction files, generated output, and local maintenance scratch directories are not source and should stay out of Git. Build-driving configuration, documentation, content, and lockfiles remain versioned.


The Basta landing page and pager components share `src/client/basta-navigation.ts` for page-jump validation and index-gap routing.
