# System architecture

## Architectural rules

Kalam Archive is **static HTML first**, enhanced by focused browser controllers. Canonical poetry remains immutable to readers, search, bookmarking and Recitation Sets. Each behavior has one implementing module; integration layers adapt its output rather than reimplementing parsing, numbering, sorting, token semantics or visual states.

Dependency direction:

```text
Editorial Markdown + reviewed JSON
          ↓
Pure domain/source parsing in src/lib
          ↓
Astro routes + static JSON catalog endpoints
          ↓
HTML and progressive browser controllers
          ↓
Optional browser-local storage / R2 scans / published D1 programmes
```

Keep `src/lib/` free of browser globals. The common browser `client/dom.ts` creates nodes, while Astro owns server HTML. Both rely on the same **pure layout models**, not duplicate template parsers.

## Source of truth and publication

| Owner | Contract |
| --- | --- |
| `src/data/lyrics/*.md` | Standalone Urdu text and Roman `romanLyrics` metadata |
| `src/data/basta/pages/*.md` | Printed Urdu body, optional `romanLyrics: |-` block, original scan and page metadata in one file |
| `src/data/basta/index.json` | Printed index entries, source locations and index identity |
| `src/data/basta/fragment-roles.json` | Explicitly reviewed non-indexed/continuation fragment decisions |
| `src/data/recitation/identity-lock.json` | Permanent lyric, kalam and stanza anchors |
| `src/data/basta/review-baseline.json` | Accepted editorial review baseline, not permission to skip structural errors |
| `src/content.config.ts` | Astro collection schema and file-glob ingestion |

The `scripts/source-workflow.mjs` command orchestrates source checks and sync. The shared filesystem/frontmatter contract is `scripts/lib/source-files.mjs`; specialist scripts own **different** operations, never independent substitutes for a central pipeline. `source:sync` may update derived labels and safe fingerprints but does not approve uncertain fragments or recycle IDs. `source:check` runs without writes.

`lib/stanza-numbers.ts` owns printed numeral parsing; `lib/basta-stanzas.ts` extracts numbered stanzas, alignment and page provenance independently of index mapping. `lib/basta-source-roles.ts` identifies actual title/byline/credit roles. `lib/basta-text.ts` owns the single physical Basta separator parser (with review line offsets) and visual stanza layout; `lib/basta-kalam-units.ts` maps verified printed fragments to persistent individual kalams. `lib/lyric-stanzas.ts` owns standalone layouts. `lib/source-review.ts` owns editorial/structural checks and publication-wide Markdown rules (final newline, stanza numbers, six-verse declarations and nonempty existing Roman blocks). The read-only `scripts/review-content.mjs` walks the corpus **once** and applies those checks alongside catalog mapping; unit tests cover pure edge cases rather than reading every Markdown file again. No browser component should parse these semantics again.

## Delivery and interfaces

`src/pages/` owns routes, static catalog JSON and source-specific endpoints. `src/components/` contains reusable Astro markup. `src/layouts/BaseLayout.astro` owns global HTML, metadata and theme initialization.

- Individual lyrics: `/lyrics/[id]/`. The route delegates metadata/header and Pagefind indexing to `LyricHeader.astro` and `LyricSearchIndex.astro`.
- Basta: landing, printed pages (`/basta/[page]/`), index, continuous (`/basta/read/`), verified individual poem (`/basta/kalam/[id]/`). Unverified source mappings retain printed-page access but do **not** acquire verified poem URLs.
- Catalog endpoints under `/data/` are generated from published sources. `lib/catalog.ts` owns lyric card and Recitation catalog adapters, including canonical identities.
- Search: Pagefind is built from rendered pages; `lib/search-normalization.ts` adds search-only aliases without modifying displayed poetry.

## Browser features

The entrypoint initializes focused controllers. `ReadingControls.astro` + `client/reader-state.ts` own edition and spacing preferences. `client/reading-focus.ts` owns immersive navigation/history; `reading-focus-shell.ts` isolates outside landmarks and retains the browser scroll policy; `reading-focus-position.ts` owns anchor/page position snapshots. `basta-navigation.ts` is the **only** printed-page jump validator, used by regular and Focus navigation.

`client/basta-stream.ts` loads chunks and resolves deep links; `basta-stream-render.ts` creates pages; `basta-dom.ts` renders the canonical Basta display lines. `reading-column-split.ts` owns the resizable Urdu/Roman divider and per-reader width preferences, with pure bounds in `lib/reading-split.ts`. Side-by-side editions retain natural heights and share the page/Focus scroll; `verse-fitting.ts` recomputes one-line sizes when widths change. Each lyric stanza or numbered Basta stanza grows up to a capped optical scale as its column widens; font growth starts when the longest natural verse covers under 95% of the text track, while **all verses remain fully justified**, including when growth reaches its ceiling. Titles retain shrink-only fitting. `floating-scans.ts` and `scan-viewer.ts` own scan positioning and enlargement. `basta-kalam-scans.ts` handles **one-at-a-time source-page navigation on individual kalam routes**, preserving `#scan-page-N` links without stacking scans or paging the poem. `verse-fitting.ts` enforces single-line verse readability; `reading-progress.ts` stores position in the actual scroll container.

`storage.ts` and focused bookmark modules own local-only records; `saved-library.ts` presents them. `library-backup.ts` validates imported/exported JSON and may carry **private** organizer capabilities—treat exported backups accordingly.

### Recitation Sets

`recitation-builder.ts` owns draft selection, editing state and event orchestration; `recitation-builder-view.ts` renders programme/search/stanza, publishing-status and saved-draft controls; `recitation-templates.ts` materializes independently cloned templates; `recitation-source-validation.ts` checks references; `recitation-remote.ts` owns publishing/edit/live API calls.

`recitation-catalog.ts` caches indexed sources; `recitation-poem-source.ts` retrieves canonical text. `recitation-reader.ts` controls navigation and live following; `recitation-reader-view.ts` renders source editions. `recitation-export.ts` builds portable HTML/print representations. No module duplicates permanent IDs, title detection or stanza layout.

Published sets hold source references and organizer metadata in D1, **not copies of the archive's poetry**. The Pages Functions authenticate organizer capabilities and reject stale revisions. See [Recitation Sets](RECITATION_SETS.md).

## Design system and responsive layout

`styles/global.css` imports the globally shared system in dependency order:

1. `tokens.css` and `theme-palettes.css` — semantic dimensions, typography and validated theme roles.
2. `base.css`, `site-shell.css` and `catalog-cards.css` — shared surfaces, navigation and browse cards.
3. `reading-foundations.css` — canonical poetry typography, stanza numbers, reader shell width/container and shared navigation style.

`ReadingControls.astro` imports `reading-focus.css`, `reading-toolbar.css`, `reading-columns.css`, `reading-index-layout.css`, `reading-scan-layout.css`, `reading-utilities.css` and `scan-viewer.css`. Edition geometry uses shared **64rem** (scan above two text editions) and **46rem** (all editions stacked) reader container thresholds; `client/viewport.ts` owns the 700px browser-mode breakpoint. Avoid new route-specific counterparts.

All reader articles opt into `data-reader-shell`, so their maximum width and breakpoint geometry cannot drift. `ReaderSubnav.astro` owns reader breadcrumbs across Basta, standalone lyrics and recitation; routes supply only their links. `client/floating-scans.ts` handles inline scan behavior by geometry, not route-specific JavaScript.

Basta CSS is separated by *actual consumers*: `basta-shell`, `basta-home`, `basta-navigation`, `basta-index`, `basta-text` and continuous-only `basta-reader`. Recitation pages load `recitation-common` plus either `recitation-builder` or `recitation-reader`. Individual routes import only the styles required for their features.

`appearance.ts` owns preference changes and storage events; `appearance-view.ts` renders color, font and contrast controls. The narrow/wide edition rules intentionally share selectors under mutually exclusive container thresholds.

A CSS custom property must have one owner: static tokens in `tokens.css`, preset variables in `theme-palettes.css`, scoped layout variables where used, runtime `--theme-*` values in `client/theme.ts`, and vendor `--pf-*` inputs in Pagefind. `tests/design-tokens.test.mjs` enforces definition/reference ownership; unused first-party tokens and undefined references are regressions. Do not remove vendor inputs because CSS-only scans see no `var()` reads.

## Offline and infrastructure boundaries

`public/sw.js` caches only explicitly requested pages, scans and search data; the build produces the offline Pagefind manifest. Never cache private edit URLs, capabilities or API responses. Offline Recitation exports embed necessary text/fonts but intentionally omit scans and live synchronization.

R2 supplies the large binaries via stable `/images/` and `/files/` paths. `functions/` handles published programmes, `schema/` defines D1 bootstrap schema and `workers/` runs cleanup. [Assets](ASSET_WORKFLOW.md) and [Operations](RECITATION_OPERATIONS.md) own platform procedures.

## Change policy

Add behavior in its existing domain owner or define a new owner with a precise contract. Prefer pure helpers over DOM-dependent algorithms; keep errors explicit, preserve meaningful no-JavaScript HTML and write tests around visible behavior and immutable identities. Document the implemented state and tradeoffs, not the development sequence.
