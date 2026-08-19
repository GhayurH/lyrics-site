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

`npm run build` runs the Astro production build followed by Pagefind indexing.

## Content contribution rules

### Lyrics metadata

Lyrics live under `src/data/lyrics/`. `src/content.config.ts` defines the content schema and is the source of truth.

Every lyric entry uses an explicit `kalamType` for its broad classification. Do not reintroduce the old pattern of deriving the broad type from `category` or general-purpose tags.

`haal` / `romanHaal`, poet, reciter, occasion, language, and tags are separate cross-cutting metadata and should not be overloaded to replace `kalamType`.

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
- preserve image paths such as `/images/basta/...`; do not replace them with the R2 custom-domain hostname

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

The detailed implementation map lives in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). The following rules are the maintenance contract.

### CSS ownership

`src/styles/core.css` contains only genuinely global tokens, shell styles, controls, and shared primitives such as the canonical lyric card.

Route/feature styles live in their own files:

- `home.css`
- `about.css`
- `saved.css`
- `search.css`
- `lyrics.css`
- `basta.css`
- `basta-reader.css`
- `basta-stream.css`

Do not recreate a global override stack. A route-specific rule belongs with its route; a genuinely shared primitive belongs in `core.css`.

### Browser code

Production browser modules live under `src/client/`. Do not place required source code in a root-local `scripts/` or `tools/` directory: those locations are for local maintenance work and may be ignored.

Browser-local persistence should use `src/client/storage.ts` rather than parsing/writing the same localStorage keys independently in each route.

### Lyric cards

`src/lib/catalog.ts` defines the canonical lightweight card model. Server-rendered cards use `LyricCard.astro`; Saved/Recent uses the matching browser helper because those entries are only known after local state is read. Keep their data/class/bookmark contracts aligned through the shared model and UI constants rather than introducing a second card design.

### Reading controls

Normal lyrics and all Basta reading views share `ReadingControls.astro` and `src/client/reader-state.ts`. Do not reimplement mode/text-size/spacing persistence inside an individual route.

### Basta layouts and streaming

Basta pages may contain scan only, scan + Urdu, or scan + Urdu + Roman. When changing grid rules, test both desktop and narrow/mobile layouts.

The continuous reader uses pre-rendered eight-page JSON chunks. If changing chunk behavior, preserve:

- direct `#page-N` links
- the linked index between the correct page ranges
- the page-by-page reader as the static fallback
- shared reader preferences

### Saved/Recent catalog

The Saved/Recent catalog is exposed as `/data/saved-catalog.json` by `src/pages/data/saved-catalog.json.ts`. It is fetched only by the Saved/Recent experience rather than embedded broadly into page output.

### File-role comments

New substantive source/style/config files should contain a concise `File role:` comment describing responsibility and, where useful, the boundary with nearby files. Do not add comments merely to restate syntax.

## Before committing

For normal code/content changes, run:

```bash
npm run build
git diff --check
git status --short
```

Review the diff before committing. For asset changes, verify that the corresponding R2 object has also been uploaded.

## Corrections and questions

Corrections, missing material, and cataloguing/index issues can be reported to:

**lyricsadmin@gmail.com**


The Basta landing page and pager components share `src/client/basta-navigation.ts` for page-jump validation and index-gap routing.
