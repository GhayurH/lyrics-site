# Architecture

Kalam Archive is a **static-first publishing system**. Source Markdown and reviewed book mappings determine the published poems; build-time pure models determine stanza structure and identities; Astro produces accessible HTML; the browser enhances reading and local organization. Cloudflare APIs are optional and exist only for explicitly published Recitation Sets.

```text
Reviewed Markdown + Basta index + permanent identity lock
                   ↓
         Shared source/domain logic (src/lib)
                   ↓
      Astro routes, HTML and static catalog data
                   ↓
      Pagefind search + local browser controllers
                   ↓
 Optional offline storage, R2 scans, published D1 Recitation Sets
```

**Dependency rule:** do not have one reader, search adapter or export path re-parse the poetry differently from another. Pure source models should not depend on DOM/browser globals.

## Authoritative inputs

| Location | Owner of |
| --- | --- |
| `src/data/lyrics/*.md` | Standalone original-language poem, optional Roman edition, display metadata, aliases and stable `recitationId` |
| `src/data/basta/pages/*.md` | Printed single-page original and optional Roman edition, scan reference, physical `---***---` fragment breaks |
| `src/data/basta/index.json` | Original printed index and page-to-poem mappings |
| `src/data/basta/fragment-roles.json` | Explicitly reviewed supplement/continuation decisions |
| `src/data/recitation/identity-lock.json` | Immutable public lyric/Basta/stanza references and retired identities |
| `src/data/basta/review-baseline.json` | Existing accepted source-review findings, **not** approval of new errors |
| `src/content.config.ts` | Content collections, required metadata, permitted language/layout fields |

An import website's post is not a permanent source identity. Provenance and scrapes belong to the **temporary** source-review process; published lyric Markdown retains poetry and editorial metadata, not a collection of source-post hashes. The historical round/disposition register is for editorial accounting, never a runtime input. [Editorial standards](EDITORIAL.md) is the single human source contract.

## Parsing, publication and identity

- `src/lib/stanza-numbers.ts` parses printed/Western/Eastern digits; `basta-stanzas.ts` groups verified source stanzas; `basta-text.ts` parses physical `---***---` separators; `basta-source-roles.ts` interprets titles/credits; `basta-kalam-units.ts` maps verified poem fragments to permanent units.
- `src/lib/lyric-stanzas.ts` owns standalone stanza block parsing and `stanzaPattern` display grouping; `stanza-pattern.ts` owns pattern types/layout counts. The UI **does not** write inferred stanza structure back into source.
- `src/lib/source-review.ts` + related source checks own editorial/structural findings; `scripts/review-content.mjs` scans the corpus and applies the regression baseline. Source checks do not repair uncertain lyrics.
- `scripts/source-workflow.mjs` is the source `--sync`/`--check` orchestrator. `scripts/lib/roman-normalize.mjs`, `normalize-bibi.mjs`, `sync-basta-index.mjs` and `recitation-identities.mjs` each own a distinct operation. `tidy-whitespace.mjs` removes mechanical whitespace (including **all** EOF newlines from changed text) separately.
- `recitationId` and reviewed Basta/stanza IDs survive filename, title and punctuation edits. A review may retire an ID, but cannot recycle it. Existing source identity guarantees are detailed in [Recitation Sets](RECITATION_SETS.md).

The build creates derived browse/search/recitation catalogs and HTML; these are **outputs**, not independent editable source directories.

## Routes and rendered readers

`src/pages/` owns routes, static data endpoints and per-route composition. `src/components/` owns shared Astro HTML, while `src/layouts/BaseLayout.astro` owns global metadata and theme bootstrap.

- Standalone: `/lyrics/[id]/`; source editions are the original body and any Roman transcription, **not** a Basta scan.
- Basta: `/basta/`, `/basta/[page]/`, the printed index, `/basta/read/` continuous reading and verified `/basta/kalam/[id]/`. A speculative index fragment has page access but no fabricated verified individual-kalam page.
- Recitation: `/recite/` draft/editor, `/recite/read/` reader, `/r/{id}` public read-only published set.
- Catalog endpoints under `/data/` come from the published sources. `src/lib/catalog.ts` owns adapters and canonical source/recitation identity.

Static HTML shows the poem even without JavaScript. Reader controls must not become prerequisites to viewing source text.

## Reader controllers and layout

Interactive features live in focused `src/client/` modules, with shared pure calculations in `src/lib/`:

| Owner | Responsibility |
| --- | --- |
| `reader-state.ts`, `ReadingControls.astro` | Available editions, toolbar and line-spacing preferences |
| `reading-focus.ts`, `reading-focus-shell.ts`, `reading-focus-position.ts` | Focus navigation, surrounding page state, direct links and restoration |
| `basta-navigation.ts`, `basta-stream.ts`, `basta-stream-render.ts`, `basta-dom.ts` | Validated page jumps, lazy continuous chunks and consistent displayed stanza lines |
| `reading-column-split.ts`, `lib/reading-split.ts`, `verse-fitting.ts` | Resizable Urdu/Roman columns, bounds and one-line verse fitting |
| `floating-scans.ts`, `scan-viewer.ts`, `basta-kalam-scans.ts` | Scan position/zoom and one-at-a-time individual-kalam source-page navigation |
| `reading-progress.ts` and bookmark/storage modules | Correct scroll-position/bookmark ownership; local persistence |

Wide layouts place available editions in parallel, with the scan beside text when space permits. At narrower container widths scans stack above text, then Urdu/Roman stack. The common reader geometry uses 64rem and 46rem container thresholds; the browser-mode breakpoint in `client/viewport.ts` is a different concern. The editable text divider supports source-line fitting, capped Roman width and single-line justified verses; extra width may scale text rather than leave visually tiny lines. Scan zoom/pan cannot break lyric navigation or cover accessible text.

Individual Basta kalam scans use Previous/Next with one source image at a time and stable `#scan-page-N` deep links; do not restore the old multi-page vertical scan stack. Focus exit preserves the current page/position. Keep a single navigation and reader controls contract across routes.

## Design ownership

`styles/global.css` imports semantic tokens, themes, base layout, shared site shell, catalog cards and reading foundations. `ReadingControls.astro` imports the common reader toolbar, column, index, focus, scan and utility styles. Basta CSS is split by actual consumer (shell, navigation, index, text, continuous reader), and Recitation CSS by common/editor/reader.

- Global static variables live in `tokens.css`; theme palettes in `theme-palettes.css`; runtime theme roles in `client/theme.ts`; feature geometry in its owning stylesheet.
- The common `data-reader-shell` prevents unrelated routes from drifting in width and responsive behavior; `ReaderSubnav.astro` owns reader navigation markup.
- Search vendor variables (`--pf-*`) are valid Pagefind inputs and need not have another CSS read. Design-token tests protect variable ownership.

Avoid patch-on-patch route-specific CSS and duplicated width/breakpoint logic.

## Search, SEO and offline

The build renders pages, verifies generated sitemap coverage against every produced HTML route, then builds **one** Pagefind index from published pages. `pagefind.yml` explicitly uses `force_language: en` for the unified multi-script index; original-language HTML tags are semantic metadata, not separate Pagefind language indexes.

`src/lib/search-normalization.ts` handles Arabic/Urdu keyboard variants, harakat, ZWNJ, aliases and reviewed Roman spelling variants **for search only**. Original verses, user-typed query and URL are not rewritten. Index the visible standalone/verified Basta poem text once; printed Basta page indexing deliberately covers only unclaimed fragments to avoid duplicate local search results.

`public/sw.js` and the generated offline search manifest cache only requested public pages/scans/search data. Never cache unpublished/private editor capabilities or API responses. Offline Recitation HTML embeds eligible text/font data but omits live state and bulky source scans.

## Cloudflare boundary

Cloudflare Pages serves the static result. R2 supplies large scans/PDFs through stable `/images/` and `/files/` paths. `functions/` validates published Recitation Set access against D1. `schema/` provides initial D1 setup; `workers/` provides scheduled expiry cleanup. Browser-local drafts, bookmarks and preferences never become server records unless a Recitation Set is explicitly published.

All binding, upload, sitemap and deployment procedures live in [Operations](OPERATIONS.md). Recitation permissions and retention contracts live in [Recitation Sets](RECITATION_SETS.md).

## Change rule

Assign any change to one owner. Refactor a shared contract rather than creating separate copies for Basta pages, standalone poetry, search, Recitation exports or mobile screens. Preserve immutable public identities, useful no-JS text, accessibility and clear error handling.