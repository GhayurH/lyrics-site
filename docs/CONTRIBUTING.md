# Contributing to Kalam Archive

This document describes the maintenance workflow for Kalam Archive, including content conventions, local development, Cloudflare R2 asset storage, and publishing.

The archive prioritizes **faithful preservation, consistency, and stable public URLs** over stylistic modernization.

## Development setup

Requirements:

- Node.js 22.12 or newer
- npm
- Git
- `rclone` for maintaining R2-hosted assets

Clone and install:

```bash
git clone https://github.com/GhayurH/lyrics-site.git
cd lyrics-site
npm install
```

Useful commands:

```bash
npm run dev
npm run build
npm run preview
```

`npm run build` runs the regression tests first via `prebuild`, then the Astro production build and Pagefind indexing.

## Content contribution rules

### Lyrics metadata

Lyrics live under `src/data/lyrics/`. `src/content.config.ts` defines the content schema and is the source of truth.

Every lyric entry uses an explicit `kalamType` for its broad classification. Do not reintroduce the old pattern of deriving the broad type from `category` or general-purpose tags.

`haal` / `romanHaal`, poet, reciter, occasion, language, and tags are separate cross-cutting metadata and should not be overloaded to replace `kalamType`.

To link a standalone kalam to its printed Basta edition, set both optional frontmatter fields: `bastaPage` (the printed page number) and `bastaNote` (`original-selection` or `additional-stanzas`). The lyric route renders the appropriate note beneath the reading panels. Keep these editorial cross-references out of the Urdu and Roman poetry text.

### Permanent recitation source IDs

Published standalone kalams and verified Basta stanzas may be referenced by
shared Recitation Sets. Retain their existing `recitationId` when moving a
Markdown file or renumbering a Basta index entry. Run
`npm run recitation:ids:check` before committing source changes; for genuinely
new published sources, run `npm run recitation:ids:sync` and review its
lockfile diff. Never reuse an old ID for different text. See
[Recitation Sets](RECITATION_SETS.md#data-and-source-integrity) for stanza
anchor updates and retirement.

### Urdu and Roman lyrics

When transcribing or correcting lyrics:

- preserve the Urdu wording and meaningful harakat from the source
- preserve commas inside lines
- remove only stray spaces before commas
- keep Roman Urdu comma placement in exactly the same positions as the Urdu
- when Urdu and supplied Roman line breaks disagree, use the Urdu line breaks as authoritative unless there is a deliberate reason not to
- preserve useful vowel and izafat cues in Roman Urdu where they assist recitation
- transliterate Urdu **ڑ** as **`r`**
- transliterate **والے** as **`wale`**

### Stanza numbering

For numbered lyrics:

- stanza numbers must appear before the Urdu stanza
- the same stanza numbers must also appear before the corresponding Roman stanza
- exported ODG source layouts should retain stanza numbers in the middle/numbering column

### Refrains

If a refrain is separately displayed and also repeated as the final line of a stanza, omit that repeated final-line copy from the stanza.

### Source fidelity

Do not silently modernize spelling, punctuation, line division, or wording merely for stylistic consistency. When correcting obvious source or transcription errors, make the smallest change needed and preserve the character of the original text.

## Basta contribution rules

Basta data is organized under:

```text
src/data/basta/
├── pages/
├── roman/
├── index.json
└── settings.json
```

The page scans themselves are stored in R2 rather than Git.

When editing Basta material:

- preserve the original book page numbering
- keep Urdu page text aligned with its corresponding scan
- keep Roman text associated with the same page
- update the structured index when a correction affects index navigation
- refresh Urdu/Roman index labels with `npm run basta:index:sync`, or check drift with `npm run basta:index:check`; these commands do not modify reviewed page Markdown
- `npm run basta:sync` and `npm run basta:sync:check` are also index-only for safe use after proofreading
- `npm run basta:breaks:rebuild` explicitly reconstructs poem separators and **must not** be run on manually reviewed page text without checking the results
- preserve image paths such as `/images/basta/...`; do not replace them with the R2 custom-domain hostname
- preserve explicit `---***---` between-kalam markers in **both** language files: parallel scrolling uses these to align matching kalams within one page
- keep kalam title/byline prefaces intact; only genuine headings are bold and underlined by the renderer

The page-by-page and continuous readers both derive from these shared sources. The continuous reader's JSON chunks are generated at build time; they are not hand-maintained files.

## Asset storage and publishing

Large binaries are **not stored in Git**.

Production assets are stored in the Cloudflare R2 bucket:

```text
kalam-archive-assets
```

The bucket contains:

```text
images/
├── lyrics/
└── basta/

files/
└── ...
```

Cloudflare Cloud Connector routes:

```text
kalamarchive.com/images/*  -> Cloudflare R2
kalamarchive.com/files/*   -> Cloudflare R2
```

The R2 bucket also has the custom domain `r2-assets.kalamarchive.com`. That hostname is the R2 origin/custom domain. Normal site content should continue using the stable public paths `/images/...` and `/files/...`.

Do **not** replace normal content URLs with `r2-assets.kalamarchive.com` unless there is a specific architectural reason to do so.

Cloudflare Pages preview hostnames (`*.lyrics-site.pages.dev`) do not match the production-only Cloud Connector host rules. The two rules in `public/_redirects` send missing `/images/*` and `/files/*` requests on Pages preview deployments to the same publicly accessible objects on `r2-assets.kalamarchive.com`. This is deliberately a **302 fallback**, not a rewrite of the content metadata. Keep the production Cloud Connector configuration in place. When testing a preview deployment, verify that its image URLs redirect successfully to R2; local Astro preview does not emulate Pages redirects.

### Local asset master

The recommended local asset master is:

```text
~/KalamArchiveAssets/
├── images/
└── files/
```

This directory is outside the Git repository.

### Uploading new or changed assets

Upload images with:

```bash
rclone copy \
  ~/KalamArchiveAssets/images \
  r2:kalam-archive-assets/images \
  --checksum \
  --progress
```

Upload files/PDFs with:

```bash
rclone copy \
  ~/KalamArchiveAssets/files \
  r2:kalam-archive-assets/files \
  --checksum \
  --progress
```

`rclone copy` adds new objects and updates changed objects without deleting unrelated destination objects. Using `--checksum` provides content-based change detection where supported.

### Replacing an existing image

Replace the local file at the same path and run the normal image upload command again. The R2 object is updated while the public site URL remains stable.

Cloudflare caching may temporarily serve a previous cached version after an overwrite. If an updated object is not visible promptly, purge that URL from Cloudflare cache rather than renaming the object solely to defeat caching.

### Do not use destructive syncing by default

Prefer `rclone copy ...` for normal maintenance. Do not casually replace it with `rclone sync`, because `sync` can delete destination objects that are absent from the local source. Do not use `--immutable` for the normal archive workflow because existing images are intentionally corrected and overwritten from time to time.

## Verifying R2 uploads

To compare local images against R2:

```bash
rclone check \
  ~/KalamArchiveAssets/images \
  r2:kalam-archive-assets/images \
  --one-way
```

For files:

```bash
rclone check \
  ~/KalamArchiveAssets/files \
  r2:kalam-archive-assets/files \
  --one-way
```

To inspect total object count and size:

```bash
rclone size r2:kalam-archive-assets
```

## Local development with R2 assets

A Git clone intentionally does not contain `public/images/` or `public/files/`.

For local development, symlink the external asset master into `public/`:

```bash
cd ~/Projects/lyrics-site
ln -s ~/KalamArchiveAssets/images public/images
ln -s ~/KalamArchiveAssets/files public/files
```

These paths are ignored by Git, so repository-local `.git/info/exclude` entries are no longer required for normal clones.

## Normal publishing workflow

For a content correction that changes both text and an image:

1. Edit the Markdown/data in the Git repository.
2. Replace or add the corresponding file under `~/KalamArchiveAssets/`.
3. Run the appropriate `rclone copy ... --checksum --progress` command.
4. Verify the R2 object if necessary.
5. Run `npm run build`.
6. Review `git diff --check` and `git status --short`.
7. Commit only the Git-tracked code/text changes and push.
8. If an overwritten image remains cached, purge the affected Cloudflare cache URL.

Large image/PDF binaries should not be added back to Git.

## Code and maintenance notes

The detailed implementation map lives in [ARCHITECTURE.md](ARCHITECTURE.md). The following rules are the maintenance contract.

### CSS ownership

`src/styles/core.css` contains only genuinely global tokens, shell styles, controls, and shared primitives such as the canonical lyric card.

Route/feature styles live in their own files:

- `home.css`
- `about.css`
- `saved.css`
- `search.css`
- `lyrics.css`
- `basta.css`
- `basta-reader.css` (continuous reader and bilingual Basta index)

The shared reader component owns the feature styles: `reading-columns.css` (responsive edition grids), `reading-focus.css` (immersive shell), and `scan-viewer.css` (the scan dialog). These stay separate because they have distinct responsibilities; short file size alone is not a reason to fold route styles into `core.css`.

Do not recreate a global override stack. A route-specific rule belongs with its route; a genuinely shared primitive belongs in `core.css`.

### Browser code

Production browser modules live under `src/client/`. Do not place required source code in a root-local `scripts/` or `tools/` directory: those locations are for local maintenance work and may be ignored.

Browser-local persistence should use `src/client/storage.ts` rather than parsing/writing the same localStorage keys independently in each route.

### Lyric cards

`src/lib/catalog.ts` defines the canonical lightweight card model. Server-rendered cards use `LyricCard.astro`; Saved/Recent uses the matching browser helper because those entries are only known after local state is read. Keep their data/class/bookmark contracts aligned through the shared model and UI constants rather than introducing a second card design.

### Reading controls

Normal lyrics, all Basta reading views, and the Recitation Sets reader share `ReadingControls.astro` and `src/client/reader-state.ts`. On mobile the ordinary controls start collapsed, with a separate Options button; Focus mode continues to use its own Options controls. The site header hides on downscroll, returns on upscroll, and stays visible when the navigation menu is open. Do not reimplement edition selection, line spacing, single-line automatic fitting, or Focus-mode behavior inside individual routes. Keep server-rendered `data-reading-columns` in agreement with the text-first initial selection; no-JavaScript readers must remain legible.

`src/client/synced-columns.ts` handles parallel scrolling and uses kalam boundaries only for Basta text. Keep the static `BastaText.astro` and dynamically streamed markup in agreement. Original scans remain centred and sticky when beside text; they are not synchronized as text scrollers. Stacked and single-language layouts remain in ordinary document flow.

### Basta layouts and streaming

Basta pages may contain scan only, scan + Urdu, or scan + Urdu + Roman. Reader grid rules belong to `reading-columns.css` and adapt primarily to the container's usable width. The existing mobile-portrait exception deliberately stacks page-by-page Basta text editions at full width. Test portrait/landscape, narrow/wide containers, and Focus mode for all edition combinations. Preserve the missing-Roman scan fallback and the image enlargement link contract.

The continuous reader uses pre-rendered eight-page JSON chunks. If changing chunk behavior, preserve:

- direct `#page-N` links
- the linked index between the correct page ranges
- the page-by-page reader as the static fallback
- shared reader preferences

### Saved/Recent catalog

The Saved page also shows locally bookmarked Basta pages and recitation drafts. Those records must work independently even if the lyric catalog cannot load. The Saved/Recent catalog is exposed as `/data/saved-catalog.json` by `src/pages/data/saved-catalog.json.ts`. It is fetched only by the Saved/Recent experience rather than embedded broadly into page output.

### File-role comments

New substantive source/style/config files should contain a concise `File role:` comment describing responsibility and, where useful, the boundary with nearby files. Do not add comments merely to restate syntax.

## Before committing

For normal code/content changes, run:

```bash
npm test
npm run build
git diff --check
git status --short
```

Review the diff before committing. For asset changes, verify that the corresponding R2 object has also been uploaded.

## Browser validation for UI changes

For reader or responsive changes, run `npm run build` (which invokes `npm test` through `prebuild`), then install browser dependencies and run `npx playwright test`. GitHub Actions runs a focused Chromium `@smoke` suite on pushes to `main` and pull requests; run `npx playwright test` locally for the full Chromium browser suite. The fast CI tests check interactions and geometry rather than fetching remote R2 images or comparing screenshot baselines.

Cover no-JavaScript reading, a paired Basta page such as 138, a Roman-unavailable page, the linked index, continuous-reader deep links and Contents, scan links/zoom, and Focus-mode exit. Local Astro preview does not implement Cloudflare Pages asset redirects. CI verifies the generated `_redirects` configuration rather than making external source-image availability requests.

Every poem verse must remain on one line, with no wrapping, horizontal scrolling, or manual text-size selector. Keep the functional mobile tests for standalone lyrics, page-by-page Basta, and the continuous reader.

## Corrections and questions

Corrections, missing material, and cataloguing/index issues can be reported to:

**lyricsadmin@gmail.com**

Keep Basta page/index top navigation in `ReadingControls.astro` via the `navigation` slot, without duplicating a separate top pager. The scan dialog alone permits both-axis zoom and drag-to-pan; narrower images stay centred with no horizontal overflow.

Offline recitation printouts must bundle the site's Nastaliq faces instead of relying on system Naskh. Preserve text edition fonts, order, and offline operation; await font readiness before printing. Basta no longer has a second bottom pager.
