# Architecture

Kalam Archive uses Astro-generated static reading pages with progressive enhancement. Authoritative source text lives in Markdown; readers, indexes and exports must not rewrite the underlying poetry. See [Contributing](CONTRIBUTING.md) for editorial rules and [Quality assurance](QUALITY_ASSURANCE.md) for verification.

## Code ownership

| Directory | Responsibility |
| --- | --- |
| `src/data/`, `src/content.config.ts` | Poetry, Basta source pages and index, metadata and permanent source identities |
| `src/lib/` | Parsing, domain models, search aliases and build/server validation |
| `src/pages/`, `src/components/`, `src/layouts/` | Static routes, JSON endpoints and shared Astro markup |
| `src/client/` | Browser controllers and browser-local state |
| `src/styles/` | Design tokens, reader layouts and feature presentation |
| `functions/`, `workers/`, `schema/` | Cloudflare API, cleanup Worker and D1 schema |

**Source update contract:** `scripts/source-workflow.mjs` is the single write/check entrypoint. Markdown is authoritative text; `basta/index.json` retains printed index identities; `fragment-roles.json` retains human-reviewed boundaries; `recitation/identity-lock.json` retains published IDs. Its ordered checks use the same catalog parser as the live readers. A build regenerates rendered pages, Pagefind and the offline search manifest; none is separately maintained. A changed reviewed fragment opening requires explicit page-scoped approval, and ambiguous recitation identity edits stop synchronization rather than silently generating new IDs.

Only verified individual Basta kalams generate `/basta/kalam/[id]/`; the original `/basta/[page]/` links remain authoritative. `/basta/kalams/` lists both verified and review-pending entries. `lib/basta-kalam-data.ts` and `lib/basta-kalam-units.ts` own boundaries and source-page mapping. The editorial review command reports uncertain mappings without guessing.

## Shared reader contract

- `ReadingControls.astro` and `client/reader-state.ts` own edition visibility and line-spacing preferences. `client/reading-focus.ts` owns Focus Mode, overlays, history and fullscreen interactions.
- `styles/tokens.css` owns semantic palette, size, width and border values; `core.css` owns global primitives. `reading-toolbar.css` owns reading controls; `reading-columns.css` owns edition tracks and the **46rem** reader-container threshold; `reading-utilities.css` owns shared spacing and reader utilities; `reading-focus.css` owns immersive presentation. Do not add competing reader breakpoints to individual routes.
- `client/viewport.ts` owns the **700px** JavaScript mobile breakpoint. Narrow or rotated readers stack selected editions; wide readers use parallel columns. A single edition must not create an empty track.
- `client/synced-columns.ts` scrolls only a taller text column when columns are parallel; `floating-scans.ts` positions scans from physical column geometry. `reading-progress.ts` stores position in the active scroll container, including Focus Mode.
- `client/verse-fitting.ts` keeps every verse on one line. At extreme zoom, a line that would become unreadably small can scroll *within that line* and remains keyboard accessible; ordinary reader modes do not allow horizontally scrolling pages.
- `client/scan-viewer.ts` enhances native scan links with zoom and pan. Static text and source links remain available without JavaScript.

`lib/lyric-stanzas.ts` owns standalone stanza semantics and 4+2 / reviewed 2+2+2 layouts. `lib/basta-text.ts` owns Basta headings, credits and stanza layout; `---***---` marks source kalam boundaries. `BastaText.astro`, `client/basta-dom.ts`, streaming and recitation/export renderers share these rules. The printed index is not a substitute for source verification.

## Appearance and search

`BaseLayout.astro` restores saved colour and font choices before paint. `client/theme.ts` validates theme palettes; `AppearanceDialog.astro` and `client/appearance.ts` own the UI. `client/fonts.ts` owns the font allowlist; default Nastaliq/Naskh faces are included initially while optional Fontsource faces are loaded on selection by `client/font-assets.ts`. The locally installed Alvi fallback is not distributed.

Pagefind is loaded only on `/search/`; homepage search uses a standard form. `lib/search-normalization.ts` adds search-only Urdu/Roman aliases without changing displayed text. Printed Basta pages and individual kalams use common collection/type facets.

`client/basta-selections.ts` owns shared Urdu/Roman stanza and kalam bookmarks, storing one page-and-ordinal key independently of edition. `client/storage.ts` owns basic local storage, `saved-library.ts` presents saved/recent reading, `basta-kalam-favorites.ts` manages individual kalam bookmarks, and `library-backup.ts` validates versioned backup imports. Bookmarks and drafts remain device-local; backup exports may include private organizer credentials.

## Offline boundaries

`public/sw.js` supports **explicitly requested** downloaded pages, scans and search data. The post-build `scripts/generate-offline-search-manifest.mjs` enumerates Pagefind files and the compiled app assets needed to search on a previously unvisited device. Saved & recent offers cache counts and clearing. Ordinary network reading continues to use native scan URLs.

Never cache `/api/` programme responses, edit links or private capabilities. Scan images are large and optional. Offline Recitation Set HTML/print exports are a separate, self-contained output; public/live published programmes still require a connection.

## Recitation Sets

`recitation-builder.ts` orchestrates editing and publication; `recitation-catalog.ts` loads indexed sources; `recitation-poem-source.ts` fetches canonical reader content; `recitation-reader.ts` renders it; `recitation-export.ts` generates print/offline copies; `recitation-templates.ts` owns device-local templates.

Source and set models live in `src/lib/`; `src/data/recitation/identity-lock.json` reserves stable IDs. D1 stores published references and organizer metadata, not poetry. Authorized edits and live navigation require matching document revisions, rejecting stale organizer sessions. See [Recitation Sets](RECITATION_SETS.md) and [Operations](RECITATION_OPERATIONS.md).

## Performance and reliability

Reserve scan dimensions, lazy-load remote images and optional font faces, stream continuous Basta chunks, and avoid measuring offscreen pages on each scroll. `npm run perf:assets` reports built sizes; `npm run perf:browser` records resource transfers, paint times and layout shift. Automated metrics are not a substitute for network-throttled testing on real devices.
