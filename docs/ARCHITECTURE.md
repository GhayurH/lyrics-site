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
- `reader-state.ts` owns shared reading preferences, and `basta-bookmarks.ts` manages optional page bookmarks.
- `floating-scans.ts` enables centred, sticky source images only when they share a grid row with text; its clearance respects the visible header and reader toolbar.
- `lyric-card.ts` and `saved-library.ts` provide the client-rendered Saved/Recent view while reusing the same card data/class contract as Astro cards.
- `search.ts` owns Pagefind URL synchronization and active-filter chips.
- `basta-stream.ts` owns progressive continuous-reader chunk loading.
- `synced-columns.ts` synchronizes visible side-by-side Urdu and Roman text panels, excluding viewport-sticky scans; for Basta text, matching kalam breaks anchor per-kalam proportional progress.
- `verse-fitting.ts` automatically fits each stanza/couplet to the available width, including extra-long verses, keeping all verses single-line without horizontal scrolling. The width calculation is in `src/lib/verse-fit.ts`; there is no minimum-font overflow or selectable text size.
- `reading-progress.ts` records the current Basta page and within-page fraction locally and populates resume/current-page links. Continuous tracking observes nearby pages rather than traversing all loaded pages on every scroll.
- `scan-viewer.ts` provides an accessible image dialog with two-axis zoom, pointer/keyboard panning, and links that work without scripting.
- `recitation-builder.ts` manages browser-local draft programmes, verified stanza arrangements, and authenticated publication; `recitation-reader.ts` renders referenced source kalams without altering the archive. `recitation-storage.ts` owns the local draft key.

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
- `recitation.css` (Recitation Sets builder and reader)

Shared reader features load through `ReadingControls.astro`, not every page:

- `reading-columns.css` — edition selections and container-responsive grids
- `reading-focus.css` — immersive reading shell
- `scan-viewer.css` — original-scan dialog and zoom

Do not recreate an override stack. If a rule only serves one route, put it with that route. If several unrelated routes genuinely share a primitive, move that primitive to `core.css` instead of copying it.

## Canonical lyric cards

`src/lib/catalog.ts` defines `LyricCardData`. `LyricCard.astro` is the server-rendered implementation used by browse/category pages. Saved/Recent necessarily creates its cards after reading local browser state, but `src/client/lyric-card.ts` uses the same data contract, classes, bookmark attributes, and icon constant.

Any future card fields should be added to `LyricCardData` first.

## Reader state

Normal lyrics, page-by-page Basta, the linked Basta index, the continuous reader, and Recitation Sets all use `ReadingControls.astro` and `src/client/reader-state.ts`. Reader preferences are stored under one browser key and should not be reimplemented route-by-route.

On narrow screens the regular reader shows a compact sticky bar with Focus mode and an expandable Options button; edition selectors, line spacing, and continuous-reader tools appear when expanded. Focus mode retains its independent Options interface. The mobile site header is a single-row title/menu/theme toolbar that retracts on downscroll and reappears on upscroll. Poetry verses remain single-line through automatic text fitting; readers cannot force wrapping or horizontal scrolling. Edition availability and text-first defaults are rendered into the HTML so the static page is legible without JavaScript. Edition layout is centralized in `reading-columns.css` using container queries. The explicit small-screen portrait exception ensures page-by-page Basta language panels stack at full width.

Basta kalam boundaries come from the explicit `---***---` marker in page Markdown and are never inferred from stanza lengths. The two editions render separate, naturally sized kalam blocks; the client synchronizes their scroll positions by matching kalam number plus fraction within that kalam. A source scan shown beside text floats in a viewport-centred column and is excluded from text-height synchronization; when stacked, it remains in normal document flow. Synchronization activates only for panels that appear side by side; stacked and single-language modes use ordinary flow. Standalone lyrics use page-wide proportional scrolling. This keeps the short ending *Bain* on page 138 aligned without requiring the shorter Roman text to occupy artificial whitespace.

`src/client/reading-focus.ts` manages Focus mode, browser history, fullscreen, and position restoration. `reading-focus.css` owns its immersive shell; `reading-columns.css` owns the actual edition geometry.

`src/lib/basta-text.ts` classifies titles without confusing a repeated opening verse, poet byline, or credit for a heading. Shared `basta.css` styles those headings as bold and underlined; non-Basta page titles use the lyric route stylesheet. The static `BastaText.astro` and streamed `basta-stream.ts` paths must retain identical markup semantics and class names.


## Responsive and scan viewing contracts

- Reading articles use `reader-shell` CSS containers; the edition grid chooses parallel/stacked at the usable 40rem threshold. The page-by-page Basta mobile-portrait exception always gives selected text editions full-width stacked rows. Keep page-specific typography in route CSS, not competing grid rules.
- A Basta page without Roman text falls back to its scan when Roman is the only chosen edition and explains why. Image-only pages always retain a scan.
- `BastaContinuousPage.astro` and `basta-stream.ts` must render the same scan links, unavailable-edition labels, edition sections, page numbers, and kalam boundaries. Add parity assertions when changing either path.
- The index switches from two tables to accessible compact linked entries only at very narrow container widths; no content source is duplicated.
- Reading history, reader preferences, and explicit Basta page bookmarks use distinct localStorage keys. None leaves the browser. The Saved page also lists local recitation programme drafts.

## Continuous Basta streaming

The continuous reader no longer serializes the entire book into its initial HTML.

- `src/lib/basta-reader-data.ts` joins Urdu/Roman source collections at build time.
- The book is split into eight-page chunks around the physical index gap.
- `src/pages/data/basta-reader/[chunk].json.ts` pre-renders those chunks as static JSON.
- `/basta/read/` server-renders the first chunk and the linked index.
- `src/client/basta-stream.ts` loads later chunks before they approach the viewport and resolves direct `#page-N` links by loading the required chunk.
- The page-by-page reader remains the server-rendered/no-JavaScript fallback.

Keep chunk size conservative. Larger chunks reduce requests but increase parse/render bursts; smaller chunks do the opposite.

## Recitation Sets and Cloudflare boundaries

Recitation Sets is a progressive feature: `/recite/` stores drafts in browser
localStorage; the reader uses static JSON endpoints for original source text
and scans. The permanent source ID registry is checked during builds. Published
programme metadata and private edit-token hashes use Cloudflare D1, not
Markdown or R2; expiry, deletion, and creation throttling are handled by
Pages Functions under `functions/`.

`public/_routes.json` restricts Pages Functions to Recitation Set API routes
and `/r/*` short links. Static pages and R2-backed assets remain outside
Functions. The root `wrangler.toml` defines `lyrics-site` Pages settings,
with separate preview and production D1 bindings. The standalone cleanup
Worker lives in `workers/` and uses its own `wrangler.cleanup.jsonc`
configuration and daily Cron Trigger. The authoritative D1 creation schema
is `schema/recitation.sql`; application-specific operations and retention
are documented in [Recitation Sets](RECITATION_SETS.md).

## Performance rules

- Pagefind JavaScript/CSS is loaded only on `/search/`.
- Off-screen continuous-reader pages use `content-visibility` when supported; the scroll controller avoids measuring distant page columns until they approach the viewport.
- R2 scans and covers use native lazy loading where they are not the primary above-the-fold image, `decoding="async"`, and fallback aspect ratios to reserve layout space before intrinsic dimensions are known.
- Do not import route CSS from `BaseLayout.astro` merely for convenience.
- Do not move the full Saved/Recent catalog into initial page HTML; keep using the static catalog endpoint.
- Keep `basta.css` as the single shared Basta stylesheet; do not reintroduce a separate kalam-break CSS import in a component.

## Validation

`npm test` runs the Node regression suite, including source-ID checks, D1 permission and retention tests, Basta stanza boundaries, scrolling, and verse-fitting math. The `prebuild` hook runs Node tests and recitation identity validation before the Astro/Pagefind build. `.github/workflows/reader-validation.yml` builds the site, checks Cloudflare routing files, and runs focused Chromium `@smoke` tests for the core readers and Recitation Sets. The complete Chromium suite remains available locally; CI avoids remote R2 availability probes and screenshot comparisons.

## Repository hygiene

Editor-specific files, generated output, and local maintenance scratch directories are not source and should stay out of Git. Build-driving configuration, documentation, content, and lockfiles remain versioned.

The Basta landing page and pager share `src/client/basta-navigation.ts` for page-jump validation and index-gap routing.

Page-by-page and linked-index Basta navigation is passed through the `navigation` slot of `ReadingControls.astro` to create one sticky toolbar. End-of-page navigation remains independently available. Visible generic edition headings are removed while accessible labels and Focus Mode poetry titles remain.
