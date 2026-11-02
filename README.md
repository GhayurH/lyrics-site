# Kalam Archive

[Kalam Archive](https://kalamarchive.com) is a searchable collection of Urdu devotional poetry with Roman Urdu editions and original scans where available.

## Features

- **Kalam:** Browse by type, search Urdu/Roman titles and verses, and save favourites.
- **Basta:** Read the original book page by page or continuously; verified individual kalams have shareable URLs, indexed source pages, and source scans.
- **Readers:** Choose Urdu, Roman, and image editions, fonts and themes; use Focus Mode, bookmarks and reading progress.
- **Saved & recent:** Keep browser-local bookmarks and drafts, import/export a JSON backup, and optionally download selected pages, source scans, and the search index for offline use.
- **Recitation Sets:** Arrange kalams and verified Marsiya stanzas, assign reciters, use optional programme templates, share read-only links and public QR codes, print/save as PDF, export standalone offline HTML, and optionally guide live navigation.

Built with Astro and Pagefind on Cloudflare Pages. R2 stores scans and PDFs; Pages Functions and D1 store explicitly published Recitation Sets. Browsing, saved items and drafts do not require an account.

## Development

Use Node.js **24** (minimum **22.23.4**).

```bash
git clone https://github.com/GhayurH/lyrics-site.git
cd lyrics-site
npm ci
npm run dev             # Local development (localhost:4321)
npm run source:sync     # Reconcile source-linked metadata after Markdown edits
npm run source:check    # Read-only index, fragment, source and identity checks
npm run check           # Astro and TypeScript validation
npm run build           # Unit tests, stable IDs, Astro and Pagefind
npm run test:smoke      # Critical Chromium journeys
npm run test:browser    # Full functional Chromium regression
npm run content:review  # All Basta/standalone source-review candidates
npm run perf:assets     # Inspect built asset sizes
npm run perf:browser    # Optional browser performance measurements
```

`npm run build` validates all source-linked metadata, regenerates Pagefind from rendered reading pages, and creates the downloadable offline search asset manifest. Urdu and Roman stanza bookmarks share one source key and appear together in Saved Library. Browser commands require a build and Chromium (`npx playwright install chromium`). Local preview does not emulate Cloudflare Functions or R2 redirects; see [Asset workflow](docs/ASSET_WORKFLOW.md).

## Documentation

- [Contributing](docs/CONTRIBUTING.md) — editorial conventions and validation
- [Architecture](docs/ARCHITECTURE.md) — code ownership and reader contracts
- [Quality assurance](docs/QUALITY_ASSURANCE.md) — responsive, accessibility and deployment checks
- [Assets](docs/ASSET_WORKFLOW.md) — R2 and local media
- [Recitation Sets](docs/RECITATION_SETS.md) — features, IDs, publishing and permissions
- [Operations](docs/RECITATION_OPERATIONS.md) — D1, Worker and retention
- [Manual audits](audit/README.md) — maintenance commands

Corrections or additions: **lyricsadmin@gmail.com**.
