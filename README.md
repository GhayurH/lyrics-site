# Kalam Archive

**Kalam Archive** is a searchable collection of Urdu nohas, salams, manqabats, and related devotional literature.

The archive is intended to preserve this material in a **simple, organized, and easily accessible format**, with searchable text and, where available, Roman Urdu transliteration and original source images.

**Website:** https://kalamarchive.com

## About the archive

The main lyrics archive presents Urdu kalam in a format designed for both reading and searching. Entries may include:

- Urdu lyrics
- Roman Urdu transliteration
- original lyric-sheet images
- titles in Urdu and Roman Urdu
- full-text search

The repository also contains a digital edition of **_Basta_ by Professor Syed Sibt-i-Jaafar Zaidi**, including:

- original scanned book pages
- cleaned Urdu text
- Roman Urdu transliteration
- a searchable, hyperlinked book index
- page-by-page reading
- a progressively loaded continuous Urdu/Roman reader

The aim is preservation rather than modernization: source wording, stanza structure, punctuation, page numbering, and other meaningful features are retained as far as practical.

For content conventions, correction rules, and the workflow for adding or updating material, see [CONTRIBUTING.md](CONTRIBUTING.md).

## اس ذخیرے کے بارے میں

یہ ویب سائٹ اردو نوحوں، سلاموں، منقبتوں اور متعلقہ کلام کا ایک قابلِ تلاش ذخیرہ ہے۔ اس کا مقصد اس کلام کو ایک سادہ، منظم اور آسانی سے قابلِ رسائی صورت میں محفوظ کرنا ہے۔

جہاں ممکن ہو وہاں اردو متن کے ساتھ رومن اردو، اصل صفحات یا تصاویر، اور قابلِ تلاش متن بھی فراہم کیا جاتا ہے۔

## Technology

Kalam Archive is a static site built with:

- [Astro](https://astro.build/)
- [Pagefind](https://pagefind.app/) for full-text search
- [Cloudflare Pages](https://pages.cloudflare.com/) for site deployment
- [Cloudflare R2](https://developers.cloudflare.com/r2/) for large static assets
- Noto Nastaliq Urdu for Urdu typography

The project requires **Node.js 22.12 or newer**.

## Architecture

The project deliberately separates code/text from large binary assets and separates global UI from route-specific behavior.

### Git repository

Git tracks:

- Astro source code
- layouts, components, pages, and route-owned styles
- browser-only controllers under `src/client/`
- lyric Markdown content and metadata
- Basta Urdu/Roman text and index data
- configuration and maintenance documentation
- small public/static files

Large images and PDFs are intentionally excluded from Git.

### Cloudflare R2

Cloudflare R2 stores lyric-sheet images, Basta page scans, downloadable PDFs, and other large public files. Production content continues to use stable URLs under:

```text
https://kalamarchive.com/images/...
https://kalamarchive.com/files/...
```

Cloudflare Cloud Connector routes those paths to R2. For the local asset layout, upload commands, overwrite behavior, and publishing workflow, see [Asset storage and publishing](CONTRIBUTING.md#asset-storage-and-publishing).

## Repository structure

```text
src/
├── client/       # browser-only state/controllers and DOM helpers
├── components/   # reusable Astro UI
├── content.config.ts
├── data/
│   ├── lyrics/
│   └── basta/
├── layouts/
├── lib/          # domain models and server-only data helpers
├── pages/        # routes plus pre-rendered JSON endpoints
└── styles/       # core CSS plus route/feature-owned CSS

public/
└── ...            # small Git-tracked public files only
```

The production `/images/` and `/files/` trees live in R2 rather than the Git repository.

For implementation boundaries and performance architecture, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Content model

`src/content.config.ts` is the source of truth for content metadata. Lyrics use the explicit required `kalamType` field for broad classification instead of inferring type from legacy categories or tags.

Detailed content and transliteration conventions are documented in [Content contribution rules](CONTRIBUTING.md#content-contribution-rules).

## Search and local user state

Search is powered by Pagefind and is generated during the production build. Pagefind assets are loaded only on `/search/`.

The Saved/Recent page does not embed the complete lyrics catalog into every page. Its catalog is exposed as `/data/saved-catalog.json` and fetched only where needed. Favorites, recent history, theme, and reading preferences remain browser-local.

## Continuous Basta reader

The page-by-page Basta reader remains fully static. The continuous reader keeps the same reading modes but avoids shipping the whole book in its initial HTML: the first chunk and linked index are server-rendered, while later eight-page chunks are pre-rendered as static JSON and loaded as the reader approaches them.

Direct `/basta/read/#page-N` links remain supported; the target chunk is loaded on demand.

## Development

Clone the repository and install dependencies:

```bash
git clone https://github.com/GhayurH/lyrics-site.git
cd lyrics-site
npm install
```

Start the local development server:

```bash
npm run dev
```

Build the production site and Pagefind index:

```bash
npm run build
```

Preview a production build locally:

```bash
npm run preview
```

Astro's development server normally runs at `http://localhost:4321/`.

Because large assets are not stored in Git, local development needs access to the external asset directory if images/PDFs are to be served locally. See [Local development with R2 assets](CONTRIBUTING.md#local-development-with-r2-assets).

## Corrections and additions

Corrections are welcome, especially for transcription errors, missing text, incorrect transliteration, metadata/classification mistakes, Basta index issues, and layout/rendering issues.

Before editing content, see [CONTRIBUTING.md](CONTRIBUTING.md) for the archive's preservation and transliteration conventions.

To report a correction, suggest a lyric, or ask a question, contact the site owner:

**lyricsadmin@gmail.com**

---

Preserving Urdu literature in searchable digital form.
