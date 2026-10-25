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
- a progressively loaded continuous Urdu/Roman reader with original scans

The aim is preservation rather than modernization: source wording, stanza structure, punctuation, page numbering, and other meaningful features are retained as far as practical.

For content conventions, correction rules, and the workflow for adding or updating material, see [CONTRIBUTING.md](docs/CONTRIBUTING.md).

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

Cloudflare Cloud Connector routes those paths to R2.

For the day-to-day process of adding images or files, see [Asset workflow](docs/ASSET_WORKFLOW.md). For the full storage model, overwrite behavior, verification commands, and publishing details, see [Asset storage and publishing](docs/CONTRIBUTING.md#asset-storage-and-publishing).

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

Detailed content and transliteration conventions are documented in [Content contribution rules](docs/CONTRIBUTING.md#content-contribution-rules).

## Search and local user state

Search is powered by Pagefind and is generated during the production build. Pagefind assets are loaded only on `/search/`.

The Saved/Recent page does not embed the complete lyrics catalog into every page. Its catalog is exposed as `/data/saved-catalog.json` and fetched only where needed. Favorites, recent history, theme, and reading preferences remain browser-local.

## Continuous Basta reader

The page-by-page Basta reader remains server-rendered and usable without JavaScript. The continuous reader keeps the same reading modes but avoids shipping the whole book in its initial HTML: the first chunk and linked index are server-rendered, while later eight-page chunks are pre-rendered as static JSON and loaded as the reader approaches them.

Direct `/basta/read/#page-N` links remain supported; the target chunk is loaded on demand.

### Reader editions and immersive Reading Mode

On standalone kalams, Basta page-by-page, and the continuous Basta reader, choose any available combination of **Image**, **Urdu**, and **Roman** using independent checkboxes. At least one edition must remain selected. Text editions are shown by default, with the original scan available on demand. Preferences are remembered per reader. The same container-width layout works in portrait, landscape, desktop, and Focus mode: texts appear in parallel when they fit legibly, otherwise they stack. On narrow screens, **Text options** reveals size, spacing, and optional wrapping for unusually long verses. The linked Basta index uses compact entries at phone widths. All server-rendered readers display usable text without JavaScript.

**Focus mode** removes site navigation and metadata while preserving text formatting, typography preferences, and synchronized text scrolling. Tap the content or **Options** to reveal controls; leave using **× Exit**, Escape, or the browser Back gesture. The optional **Browser fullscreen** button requests the fullscreen API. Selecting an original scan opens a shared, keyboard-accessible viewer with Fit, 100%, and 200% zoom controls (normal image links remain usable without JavaScript). On mobile, an **↑ Top** control appears as you scroll.

The continuous reader offers a validated page-number jump in both views, a **Contents** control (also available inside Focus mode), and a link to open the current page in the page-by-page reader. Printed index-page numbers open Contents. Link directly into an immersive page using `/basta/read/?reading=1#page-202`; without `?reading=1`, the same page hash opens in the normal reader. Entering or leaving Focus mode and rotating preserve reading position. The last Basta page is saved **locally in this browser**, with a Continue Basta link on the homepage and Saved page.

### Parallel reading and kalam boundaries

When Urdu, Roman Urdu, and (for Basta) an original scan appear side by side, each scrollable column retains its own content height. Scrolling one moves the other visible columns by the corresponding percentage. On Basta pages containing multiple kalams, Urdu and Roman progress is mapped **within each matching kalam**, keeping their boundaries aligned rather than stretching shorter poems to the height of longer ones. The scan follows its page-wide scroll percentage.

The explicit `---***---` line in Basta Markdown separates kalams. These boundaries are preserved in both Urdu and Roman editions, including the page-by-page reader and streamed continuous-reader chunks. Titles identified in the text preface are bold and underlined; poet credits are not. Standalone lyrics use bold, underlined page titles. Narrow layouts stack the editions and use ordinary document scrolling.

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

Build the production site and Pagefind index (the pre-build hook runs the regression tests first):

```bash
npm run build
```

Run the regression tests:

```bash
npm test
```

Preview a production build locally:

```bash
npm run preview
```

Astro's development server normally runs at `http://localhost:4321/`.

Because large assets are not stored in Git, local development needs access to the external asset directory if images/PDFs are to be served locally. See [Local development with R2 assets](docs/CONTRIBUTING.md#local-development-with-r2-assets).

For the normal add-image/add-file publishing sequence, see [docs/ASSET_WORKFLOW.md](docs/ASSET_WORKFLOW.md).

## Corrections and additions

Corrections are welcome, especially for transcription errors, missing text, incorrect transliteration, metadata/classification mistakes, Basta index issues, and layout/rendering issues.

Before editing content, see [CONTRIBUTING.md](docs/CONTRIBUTING.md) for the archive's preservation and transliteration conventions.

To report a correction, suggest a lyric, or ask a question, contact the site owner:

**lyricsadmin@gmail.com**

---

Preserving Urdu literature in searchable digital form.

### Browser-level regression checks

The GitHub Actions reader-validation workflow builds the site and runs Playwright Chromium checks across static/no-JavaScript reading, mobile portrait/landscape, image selection, Focus mode, and streamed deep links. To run these checks locally after a production build:

```bash
npm install --no-save @playwright/test
npx playwright install chromium
npx playwright test
```

The normal `npm test` suite does not require a browser. Browser traces/screenshots are saved only on test failure.
