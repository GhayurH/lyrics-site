# Kalam Archive

[Kalam Archive](https://kalamarchive.com) preserves original-language devotional poetry, readable Roman transcriptions and the printed scans of the Basta collection. The site supports browsing, multilingual search, reading preferences, bookmarks, offline access and organizer-created Recitation Sets without requiring reader accounts.

## How it works

Astro publishes canonical Markdown as accessible static HTML. Pagefind indexes the rendered public pages; the browser adds reader controls, local storage, downloaded/offline content and optional recitation features. Cloudflare Pages serves the site, R2 stores large scans and PDFs, and Pages Functions + D1 store only explicitly published Recitation Sets. The source text—not search aliases, an import snapshot or a display component—is authoritative.

Standalone poems live in `src/data/lyrics/`; printed Basta pages live in `src/data/basta/pages/`. Reviewed source identities remain stable across corrections and file renames. Published original-language metadata distinguishes Urdu, Punjabi/Shahmukhi, Saraiki and Balti from Roman **transcriptions**; a Roman edition is never labeled a separate “Roman Urdu” original.

## Develop

Use Node.js 24 (minimum 22.23.4) and the npm version pinned in `package.json`.

```bash
npm ci
npm run dev             # Astro development server
npm run check           # Astro/TypeScript diagnostics
npm run build           # Unit + source checks, HTML, sitemap audit, Pagefind, offline manifest
npm run preview         # Preview the completed static build
```

For a source edit, review [Editorial standards](docs/EDITORIAL.md), run `npm run source:sync`, inspect **every** resulting source/identity change, and validate before publication. `npm run whitespace:fix` performs mechanical cleanup; `npm run content:review` reports editorial candidates without rewriting poetry. For browser tests see [Quality assurance](docs/QUALITY_ASSURANCE.md).

## Documentation map

| Guide | Authority |
| --- | --- |
| [Editorial standards](docs/EDITORIAL.md) | Source languages, schema, poem formatting, deduplication, Roman transliteration |
| [Contributing](docs/CONTRIBUTING.md) | Editing and engineering workflow, safe synchronization, review requirements |
| [Architecture](docs/ARCHITECTURE.md) | Source-of-truth boundaries, readers, search, storage and module ownership |
| [Quality assurance](docs/QUALITY_ASSURANCE.md) | Automated/manual checks and release acceptance |
| [Recitation Sets](docs/RECITATION_SETS.md) | Programme behavior, permanent IDs, privacy and retention |
| [Operations](docs/OPERATIONS.md) | Cloudflare, R2, D1, scans, sitemap, indexing and deployment |
| [Audit tools](audit/README.md) | Editorial reports and record-keeping, without publishing WIP logs |

For repository-wide invariants, see [AGENTS.md](AGENTS.md). Suggest corrections at **lyricsadmin@gmail.com**.

Local `astro preview` cannot emulate Cloudflare D1 bindings, Pages Functions or R2 routing. Verify these on a real deployment.