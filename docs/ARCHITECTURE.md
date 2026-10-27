# Architecture

This document owns implementation boundaries and reader behavior. See [CONTRIBUTING.md](CONTRIBUTING.md) for source-editing rules, [ASSET_WORKFLOW.md](ASSET_WORKFLOW.md) for R2 operations, and [RECITATION_SETS.md](RECITATION_SETS.md) for programme storage and authorization.

## Principles and source layout

- Prefer static, usable HTML. Add browser JavaScript for progressive enhancements, interactive search, and local user state.
- Keep domain models canonical, route behavior local, and shared UI controls consistent.
- Keep route-specific CSS out of the global payload and large binary assets out of Git.
- Preserve public URLs and content structure when reorganizing code.

```text
src/
  client/          Browser-only controllers, local storage, and DOM helpers
  components/      Reusable Astro UI
  data/            Markdown and structured content
  layouts/         Site shell
  lib/             Domain models and build/server data utilities
  pages/           Routes and pre-rendered JSON endpoints
  styles/          Global primitives and feature-owned CSS
```

`src/layouts/BaseLayout.astro` owns the site shell, not feature CSS. `src/client/storage.ts` owns browser-storage parsing and keys; other controllers should not independently implement storage formats. `src/content.config.ts` defines lyric metadata, including required `kalamType`.

## Styling and shared components

`src/styles/core.css` owns tokens, resets, the shell, common controls, and the canonical lyric card. Route styles belong to their feature: `home.css`, `about.css`, `saved.css`, `search.css`, `category.css`, `lyrics.css`, `basta.css`, `basta-reader.css`, and `recitation.css`.

Readers import the shared `reading-columns.css` (edition grids, container queries, and toolbar placement), `reading-focus.css` (Focus Mode), and `scan-viewer.css` (zoomable scans) through `ReadingControls.astro`. Do not add competing route-local edition grids or rebuild an override stack; consolidate CSS only when specificity, conditions, and cascade still agree. `basta.css` is the one shared Basta text stylesheet.

`src/lib/catalog.ts` defines `LyricCardData`. `LyricCard.astro` and `src/client/lyric-card.ts` share that model, class contract, and bookmark attributes. Extend the model rather than maintaining separate card designs.

## Reader contract

Standalone lyrics, Basta page-by-page, the linked Basta index, the continuous reader, and Recitation Sets share `ReadingControls.astro` and `src/client/reader-state.ts`.

- **Edition selection:** Image, Urdu, and Roman are independently selectable when available, with at least one edition selected. Text is the initial default where present. Unavailable Roman editions must be explained; never silently substitute Urdu. Scan-only pages retain the scan. Render correct initial availability and `data-reading-columns` in HTML, even without JavaScript.
- **Layout:** `reading-columns.css` uses available container width to display editions in parallel or stack them. In narrow page-by-page Basta portrait layouts, text panels stack at full width. Verses fit one line using `src/client/verse-fitting.ts` and `src/lib/verse-fit.ts`: no wrapping, horizontal text scrolling, or manual font-size selector.
- **Scroll and scans:** `src/client/synced-columns.ts` synchronizes side-by-side text, anchored within matching Basta kalams rather than the entire page. Panels keep their natural heights; scans use `floating-scans.ts` for viewport-centred positioning beside text and remain in normal flow when stacked. Do not synchronize scan scroll as a text column.
- **Focus Mode:** `reading-focus.ts` and `reading-focus.css` handle immersive controls, browser history/fullscreen, and position restoration. The compact ordinary mobile controls are separate from Focus Mode's own options. The mobile header retracts on downward scrolling and reappears on upward scrolling or when navigation is open.
- **Scan access:** Keep native links functional without JavaScript; `scan-viewer.ts` enhances them with accessible zoom and pan. Absent R2 images must not make text navigation unusable.

The explicit `---***---` separators in both Basta language files define matching kalam boundaries. `src/lib/basta-text.ts` distinguishes actual titles from poet credits and repeated opening lines; title styling is bold and underlined. Static `BastaText.astro` and streamed `basta-stream.ts` output must agree on headings, scan links, edition labels, page numbers, and kalam boundaries. Do not infer boundaries from stanza length.

## Basta navigation and streaming

The page-by-page Basta reader renders HTML without JavaScript. Continuous `/basta/read/` renders its first eight-page chunk and the book index at build time, then loads subsequent pre-rendered JSON chunks from `src/pages/data/basta-reader/[chunk].json.ts` through `src/client/basta-stream.ts`. `src/lib/basta-reader-data.ts` joins the Urdu/Roman sources. The chunks respect the physical index gap.

Keep `#page-N` deep links, page-number validation and index-gap routing (`basta-navigation.ts`), Contents access, and the page-by-page fallback. Navigation uses the `navigation` slot of `ReadingControls.astro`, not a second pager. `src/client/reading-progress.ts` observes nearby pages rather than measuring all loaded pages; progress and within-page resume offsets stay browser-local and survive rotation or view changes.

`src/client/basta-selections.ts` adds page-qualified kalam/stanza bookmarks without altering Markdown or verse flow. Keep bookmark keys separate from reader preferences and reading history.

## Search, discovery, and saved state

Pagefind assets load only on `/search/`; the homepage submits a normal search form. Search filtering and URL state belong to `src/client/search.ts`. Category listings distinguish standalone lyrics from Basta selections.

The Saved/Recent catalog is fetched on demand from `/data/saved-catalog.json`, not embedded throughout the site. Favorites, bookmarks, recent reading, drafts, theme, and reading preferences are local to the browser. `home-continue.ts` conditionally shows local resume links; `saved-library.ts` still displays local bookmarks/drafts if the catalog fails to load.

## Recitation Sets boundary

`recitation-builder.ts` owns draft editing and publication; `recitation-workflow.ts` enhances builder navigation; `recitation-reader.ts` resolves source poetry without changing it; `recitation-export.ts` produces portable offline/print HTML. Shared source identifiers and set validation live under `src/lib/` and `src/data/recitation/`.

Published programme documents and hashed private edit credentials use Cloudflare D1 through Pages Functions under `functions/`; source Markdown, scanned assets, and browsing remain static. `public/_routes.json` restricts dynamic invocation, root `wrangler.toml` configures Pages, and `workers/` contains independent scheduled cleanup. The [Recitation Sets reference](RECITATION_SETS.md) owns the schema, retention, exports, edit permissions, and deployment procedure.

## Performance and validation boundaries

- Lazy-load noncritical R2 scans with reserved dimensions and async decoding; retain the original direct URLs.
- Use `content-visibility` for off-screen continuous-reader content when supported, and avoid measuring distant reader panels during scrolling.
- Do not load the full Saved catalog, entire Basta book, or Pagefind JavaScript in unrelated initial HTML.
- Keep browser tests focused on navigation, responsive geometry, availability fallbacks, no-JavaScript access, and source/streamed markup parity.

Validation commands and CI conditions are documented once in [CONTRIBUTING.md](CONTRIBUTING.md#validation).
