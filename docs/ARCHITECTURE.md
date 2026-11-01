# Architecture

Code ownership and reader behavior. Editorial rules: [Contributing](CONTRIBUTING.md); R2: [Assets](ASSET_WORKFLOW.md); programme data and permissions: [Recitation Sets](RECITATION_SETS.md); deployment: [Operations](RECITATION_OPERATIONS.md).

## Principles and source layout

Prefer static, readable HTML with progressive enhancement. Keep public URLs, source fidelity, and single owners for shared behavior. Use Node 24 (minimum 22.23.4).

| Location | Responsibility |
| --- | --- |
| `src/data/`, `src/content.config.ts` | Source poetry, Basta data, lyric metadata (`kalamType` required) |
| `src/lib/` | Canonical domain models, parsing, build/server utilities |
| `src/components/`, `src/pages/`, `src/layouts/` | Astro UI, routes/JSON endpoints, site shell |
| `src/client/` | Browser controllers, storage, DOM helpers |
| `src/styles/` | Shared tokens/primitives and feature styles |
| `functions/`, `workers/`, `schema/` | Pages Functions, cleanup Worker, D1 schema |

## Styling and shared components

- `tokens.css` owns theme palettes, typefaces, reading widths, typography, spacing, control sizes, and radii. `core.css` imports it and owns global styles. Keep component defaults together instead of appending corrective overrides later in a feature stylesheet.
- `reading-columns.css` owns reader edition grid tracks (including Basta pages and streamed pages), single-edition sizing, the **46rem** container threshold, and Compact/Default/Relaxed spacing values (`--reading-active-*-leading`). Route CSS owns content typography and non-grid decorations; index and poetry deliberately use different leading. `reading-focus.css` owns immersive layout and `scan-viewer.css` owns zoom UI.
- `client/viewport.ts` owns the **700px** JavaScript mobile boundary and reduced-motion scrolling choice. Very short touch-landscape viewports release sticky controls to give poetry more vertical space; fine-pointer desktop windows retain them.
- `--ui-border`, `--ui-target`, `--ui-control-padding`, and `--ui-control-font-size` are shared controls. Keep unique component measurements local rather than introducing meaningless tokens. `tests/design-tokens.test.mjs` enforces ownership.
- `kalam-reading-title` centers, bolds, underlines, and colors verified titles using `--reading-title-color` (derived from the active theme). `kalam-poet-credit` centers an adjacent verified byline without title emphasis. `core.css` owns one-line verse justification.
- `LyricCard.astro` and `client/lyric-card.ts` use the shared `LyricCardData` model in `lib/catalog.ts`.

### Appearance and fonts

`BaseLayout.astro` restores appearance before paint; `client/theme.ts` validates palettes; `AppearanceDialog.astro`/`client/appearance.ts` manage Colors and Fonts. Presets include Auto, Light, Dark, AMOLED, Sepia, curated palettes, and Custom. Custom derives readable text/borders unless overridden; it retains its saved palette until explicitly copied/reset. Colors and Fonts reset separately. Pagefind and browser theme-color follow the active palette.

`client/fonts.ts` owns the font allowlist, early restoration, and grouped previews. The UI uses `--font-ui`; only poetry uses `--font-urdu`/`--font-roman`. Fontsource packages and OFL-licensed Beaconhouse Nastaliq are self-hosted (keep license/source files). **Do not bundle Alvi Nastaleeq**; it can use an installed copy with Noto fallback.

## Reader contract

Standalone lyrics, Basta pages/index/continuous mode, and Recitation Sets share `ReadingControls.astro`, `client/reader-state.ts`, and the reader CSS above.

- **Editions:** Image, Urdu, and Roman may be combined; at least one remains selected. Mobile defaults to Urdu; wide text readers default to Urdu + Roman, and desktop Basta page reading to Image + Urdu. Preferences persist per reader type. Missing Roman text gets an explanation, never a silent substitution. Scans and text remain readable without JavaScript.
- **Layout:** Container width decides stacked versus parallel columns, including Focus Mode on narrow and rotated screens. Narrow Basta panels stack full-width; route CSS must not redefine edition tracks. `client/verse-fitting.ts` and `lib/verse-fit.ts` keep every verse on one line without horizontal scrolling.
- **Scrolling:** `client/synced-columns.ts` synchronizes corresponding text, with shorter columns static. `floating-scans.ts` uses adjacent-panel geometry (not device orientation) to float scans only alongside text. `reading-progress.ts` measures and restores page position using the document in regular mode and the independent reading root in Focus Mode. Never synchronize a scan as a text panel.
- **Focus Mode:** `reading-focus.ts` preserves position, history, fullscreen state, and independent Options. Desktop/mobile toolbars and retracting headers must not obscure verses or anchor targets. Retracted headers stay keyboard-focusable so their `focusin` handler can reveal them.
- **Images:** Native scan links work without JS; `scan-viewer.ts` adds zoom/pan. Readers remain usable if R2 is unavailable.

**Lyric stanzas:** `lib/lyric-stanzas.ts` owns stanza breaks, 4+2 joining, and class names for both `LyricVerses.astro` and `client/recitation-reader.ts`. Reviewed `sixVerseLayout: "pairs"` uses 2+2+2 with alternating indentation and couplet rules; source text remains unchanged by the renderer.

**Basta text:** The `---***---` marker defines kalam boundaries in *both* languages. `lib/basta-text.ts` owns title/byline identification, verse layout, and class names. Static `BastaText.astro`, `client/basta-dom.ts` (shared by streaming and Recitation Sets), and the export must preserve the same wording, numbering, and boundaries.

## Basta navigation and streaming

`/basta/read/` renders its first eight-page chunk and index at build time; `client/basta-stream.ts` loads further pre-rendered JSON chunks. `lib/basta-reader-data.ts` aligns Urdu/Roman source pages and respects the physical index gap.

`basta-navigation.ts` handles `#page-N`, invalid pages, and index-gap navigation. Use the `ReadingControls.astro` navigation slot rather than another pager. `reading-progress.ts` records within-page resume offsets without scanning the entire book; `basta-selections.ts` stores page-qualified kalam/stanza bookmarks separately from reader preferences.

## Search, discovery, and saved state

Pagefind loads **only** on `/search/` (`client/search.ts`); homepage search uses a normal form. `/data/saved-catalog.json` is fetched on demand. `client/storage.ts` owns local storage primitives; `saved-library.ts` and `home-continue.ts` present saved/recent items and resume links. Never require a catalog fetch for locally saved drafts or bookmarks.

## Recitation Sets boundary

`recitation-builder.ts` edits/publishes sets; `recitation-catalog.ts` fetches sources; `recitation-workflow.ts` manages builder navigation; `recitation-reader.ts` renders canonical poetry; `recitation-export.ts` generates offline HTML and print views. Validated IDs and set models belong to `src/lib/` and `src/data/recitation/`.

Programme publishing uses D1 via narrowly routed Pages Functions; archives and R2-backed assets remain static. See [Recitation Sets](RECITATION_SETS.md) for authorization, source integrity, retention, and sharing. See [Operations](RECITATION_OPERATIONS.md) for bindings and cleanup.

## Performance boundaries

Reserve scan dimensions and lazy-load R2 assets. Use `content-visibility` for offscreen book chunks when supported; do not measure distant pages on every scroll. Load the full book, Saved catalog, and Pagefind only where needed. Test commands and CI markers: [Validation](CONTRIBUTING.md#validation).
