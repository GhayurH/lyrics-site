# Kalam Archive

[Kalam Archive](https://kalamarchive.com) preserves Urdu nohas, salams, manqabats, and other devotional poetry in a searchable, accessible format. Entries include Urdu text, Roman Urdu transliteration, and original lyric-sheet images where available. Source wording and structure are preserved rather than modernized.

## Features

- **Kalam archive:** Search and browse standalone kalams by type, with Urdu, Roman Urdu, and original images where available.
- **[Basta](https://kalamarchive.com/basta/):** A digital edition of *Basta* by Professor Syed Sibt-i-Jaafar Zaidi, with scans, corrected Urdu text, Roman Urdu, a linked index, and page-by-page or continuous reading.
- **Reading tools:** Choose available editions, use distraction-free Focus Mode, save favorites or Basta locations, and resume reading on the same device.
- **[Recitation Sets](https://kalamarchive.com/recite/):** Arrange kalams and verified Marsiya stanzas into shareable programmes, assign reciters, add notes, print or save an offline copy, and optionally guide participants through a live programme.

## Technology

- [Astro](https://astro.build/) for the static website
- [Pagefind](https://pagefind.app/) for full-text search
- [Cloudflare Pages](https://pages.cloudflare.com/) for deployment
- [Cloudflare R2](https://developers.cloudflare.com/r2/) for large images and PDFs
- Cloudflare D1 and Pages Functions for published Recitation Sets
- Noto Nastaliq Urdu for Urdu typography

Large binary assets are stored in R2, **not Git**. The public `/images/` and `/files/` paths remain stable.

## Getting started

Requires **Node.js 22.12+** and npm.

```bash
git clone https://github.com/GhayurH/lyrics-site.git
cd lyrics-site
npm ci
npm run dev
```

The development server normally runs at `http://localhost:4321/`. For local scans and PDFs, follow the [asset workflow](docs/ASSET_WORKFLOW.md#local-development).

```bash
npm test           # Node regression tests
npm run build      # Tests, source-ID checks, Astro build, and Pagefind
npm run preview    # Preview the built site
```

See [contribution and validation guidance](docs/CONTRIBUTING.md#validation) for browser tests and CI behavior.

## Repository layout

```text
src/
  client/       Browser-side interactions and local state
  components/   Reusable Astro components
  data/         Lyric and Basta source content
  layouts/      Site layouts
  lib/          Shared domain models and data utilities
  pages/        Routes and static data endpoints
  styles/       Global and feature-owned styles
functions/      Cloudflare Pages Functions
schema/         D1 database schema
workers/        Scheduled recitation maintenance
scripts/        Local maintenance commands
public/         Small static assets and deployment routing
docs/           Maintenance documentation
```

## Documentation

Each subject has one primary reference:

- [Contributing](docs/CONTRIBUTING.md) — content fidelity, metadata, editorial changes, and validation.
- [Architecture](docs/ARCHITECTURE.md) — component boundaries, reader behavior, and performance contracts.
- [Asset workflow](docs/ASSET_WORKFLOW.md) — local assets, R2 uploads, previews, and cache management.
- [Recitation Sets](docs/RECITATION_SETS.md) — stable source IDs, sharing, security, D1, and retention.
- [Agent guide](AGENTS.md) — short operational instructions for coding assistants.

## Corrections and additions

Corrections to lyrics, transliteration, scans, metadata, or the Basta index are welcome. Read the [content contribution rules](docs/CONTRIBUTING.md#content-rules) before editing source material.

Contact: **lyricsadmin@gmail.com**
