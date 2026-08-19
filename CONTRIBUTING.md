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

Lyrics live under:

```text
src/data/lyrics/
```

`src/content.config.ts` defines the content schema and should be treated as the source of truth.

Every lyric entry uses an explicit:

```yaml
kalamType:
```

for its broad classification. Do not reintroduce the old pattern of deriving the broad type from `category` or general-purpose tags.

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

The goal is to avoid accidental duplication while preserving the intended recitation structure.

### Source fidelity

Do not silently modernize spelling, punctuation, line division, or wording merely for stylistic consistency.

When correcting obvious source or transcription errors, make the smallest change needed and preserve the character of the original text.

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

The page-by-page and continuous readers rely on the shared data remaining internally consistent.

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

The R2 bucket also has the custom domain:

```text
r2-assets.kalamarchive.com
```

That hostname is the R2 origin/custom domain. Normal site content should continue using the stable public paths:

```text
/images/...
/files/...
```

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

`rclone copy` adds new objects and updates changed objects without deleting unrelated destination objects.

Using `--checksum` provides content-based change detection where supported.

### Replacing an existing image

Corrections often require regenerating an image while keeping its filename and public URL.

Replace the local file at the same path, for example:

```text
~/KalamArchiveAssets/images/lyrics/example.png
```

and run the normal image upload command again.

The R2 object at:

```text
images/lyrics/example.png
```

will be updated while the public site URL remains:

```text
https://kalamarchive.com/images/lyrics/example.png
```

Cloudflare caching may temporarily serve a previous cached version after an overwrite. If an updated object is not visible promptly, purge that URL from Cloudflare cache rather than renaming the object solely to defeat caching.

### Do not use destructive syncing by default

Prefer:

```bash
rclone copy ...
```

for normal maintenance.

Do not casually replace it with `rclone sync`, because `sync` can delete destination objects that are absent from the local source.

Do not use `--immutable` for this archive's normal asset workflow because existing images are intentionally corrected and overwritten from time to time.

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

When checking routing, an object that exists only in R2 can be requested through the normal site path to prove that Cloud Connector is serving the request.

## Local development with R2 assets

A Git clone intentionally does not contain:

```text
public/images/
public/files/
```

For local development, symlink the external asset master into `public/`:

```bash
cd ~/Projects/lyrics-site

ln -s ~/KalamArchiveAssets/images public/images
ln -s ~/KalamArchiveAssets/files public/files
```

If needed, keep those local symlinks out of Git using the repository-local exclude file:

```bash
cat >> .git/info/exclude <<'EOF'

# Local links to Cloudflare R2 asset masters
public/images
public/files
EOF
```

This keeps the normal local URLs working:

```text
http://localhost:4321/images/...
http://localhost:4321/files/...
```

without putting the binary assets back into repository history.

## Normal publishing workflow

For a content correction that changes both text and an image:

1. Edit the Markdown/data in the Git repository.
2. Replace or add the corresponding file under `~/KalamArchiveAssets/`.
3. Run the appropriate `rclone copy ... --checksum --progress` command.
4. Verify the R2 object if necessary.
5. Run:

   ```bash
   npm run build
   ```

6. Commit only the Git-tracked code/text changes:

   ```bash
   git add .
   git commit -m "Describe the correction"
   git push
   ```

7. If the image was overwritten and the old version remains visible, purge the affected Cloudflare cache URL.

Large image/PDF binaries should not be added back to Git.

## Code and maintenance notes

### CSS ownership

Keep route-specific styles route-specific.

Current responsibilities include:

- `src/styles/global.css` — shared base site styling
- `src/styles/ui-upgrades.css` — shared UI enhancements
- `src/styles/responsive-reading.css` — reading-mode layout behavior
- `src/styles/basta.css` — Basta page/index presentation
- `src/styles/basta-reader.css` — continuous-reader and bilingual-index reader presentation

Avoid moving reader-only rules into global CSS unless they are genuinely shared across the whole site.

### Basta reading layouts

Basta pages may contain:

- scan only
- scan + Urdu
- scan + Urdu + Roman

When changing grid rules, test both desktop and narrow/mobile layouts. In particular, Urdu-only pages and Roman-enabled pages use different grid combinations and should not accidentally occupy the same named grid area.

### Saved/Recent catalog

The Saved/Recent catalog is exposed as:

```text
/data/saved-catalog.json
```

by:

```text
src/pages/data/saved-catalog.json.ts
```

It is fetched only by the Saved/Recent experience rather than embedded broadly into page output.

### File-role comments

Source/style/config files contain concise `File role:` comments.

When adding a new substantive source or style file, add a short comment describing:

- what the file owns
- what it should not own when that boundary matters
- how it relates to nearby files if the distinction is not obvious

Do not add comments merely to restate syntax.

### Audit tooling

There is currently no required metadata-audit command in the normal npm workflow. Validation should come from the content schema, the production build, and targeted checks appropriate to the change being made.

## Before committing

For normal code/content changes, run:

```bash
npm run build
git diff --check
git status --short
```

Review the diff before committing.

For asset changes, verify that the corresponding R2 object has also been uploaded. A successful Git commit does not publish files stored only in `~/KalamArchiveAssets/`.

## Corrections and questions

Corrections, missing material, and cataloguing/index issues can be reported to:

**lyricsadmin@gmail.com**
