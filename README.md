# Kalam Archive

[Kalam Archive](https://kalamarchive.com) preserves Urdu nohas, salams, manqabats, and other devotional poetry in a searchable, accessible format. Entries include Urdu text, Roman Urdu transliteration, and original lyric-sheet images where available. Source wording, meaningful editorial markers, stanza boundaries, and reviewed refrains are preserved rather than silently modernized.

## Features

- **Kalam archive:** Search and browse standalone kalams by type, with Urdu, Roman Urdu, and original images where available.
- **[Basta](https://kalamarchive.com/basta/):** A digital edition of *Basta* by Professor Syed Sibt-i-Jaafar Zaidi, with scans, corrected Urdu text, Roman Urdu, a linked index, and page-by-page or continuous reading.
- **Reading tools:** Select available editions, use distraction-free Focus Mode, save favourites or Basta locations, and resume reading on the same device. Choose device-following or curated light/dark colour themes and separate Urdu and Roman reading fonts.
- **[Recitation Sets](https://kalamarchive.com/recite/):** Arrange kalams and verified Marsiya stanzas into shareable programmes, assign reciters, add notes, print or save an offline copy, and optionally guide participants through a live programme.

## Technology

- [Astro](https://astro.build/) for the static website
- [Pagefind](https://pagefind.app/) for full-text search
- [Cloudflare Pages](https://pages.cloudflare.com/) for deployment
- [Cloudflare R2](https://developers.cloudflare.com/r2/) for large images and PDFs
- Cloudflare D1 and Pages Functions for published Recitation Sets
- Self-hosted Urdu and Roman Urdu reading fonts, with licensing and fallback rules in [Architecture](docs/ARCHITECTURE.md).

Theme and font choices stay on the reader's device and are reset independently under **Appearance → Colors / Fonts**. Font options and groups live in `src/client/fonts.ts`; shared typography and palette tokens live in `src/styles/tokens.css`.

Large binary assets are stored in R2, **not Git**. The public `/images/` and `/files/` paths remain stable.

## Getting started

Requires **Node.js 24** (recommended; minimum 22.23.4) and npm.

```bash
git clone https://github.com/GhayurH/lyrics-site.git
cd lyrics-site
npm ci
npm run dev
```

The development server normally runs at `http://localhost:4321/`. For local scans and PDFs, follow the [asset workflow](docs/ASSET_WORKFLOW.md#local-development). Published scans live in R2 and may not load directly on local previews without those assets.

```bash
npm run build         # Node tests, ID checks, Astro and Pagefind
npm run test:smoke    # Fast, critical Chromium browser checks
npm run test:browser  # Full Chromium suite at milestones
npm run preview       # Preview the built site
```

See [contribution and validation guidance](docs/CONTRIBUTING.md#validation) for smoke/full selection and CI behavior. The reduced smoke suite checks critical user journeys; the full suite covers additional edge cases.

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
- [Recitation Sets](docs/RECITATION_SETS.md) — programme behavior, source IDs, sharing, and retention.
- [Recitation Sets operations](docs/RECITATION_OPERATIONS.md) — D1 setup, scheduled cleanup, and deployment verification.
- [Agent guide](AGENTS.md) — short operational instructions for coding assistants.
- [Audit utilities](audit/README.md) — manual OCR checks and Pages deployment cleanup.

## Corrections and additions

Corrections to lyrics, transliteration, scans, metadata, or the Basta index are welcome. Read the [content contribution rules](docs/CONTRIBUTING.md#content-rules) before editing source material.

Contact: **lyricsadmin@gmail.com**
