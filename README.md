# Kalam Archive

[Kalam Archive](https://kalamarchive.com) is a searchable collection of Urdu devotional poetry, with Roman Urdu and original scans where available.

## Features

- **Kalam:** Browse and search nohas, salams, manqabats, and other poetry.
- **[Basta](https://kalamarchive.com/basta/):** Scans, corrected Urdu, Roman Urdu, and linked page-by-page/continuous editions of Professor Syed Sibt-i-Jaafar Zaidi's book.
- **Reading:** Choose editions, fonts, and colour themes; use Focus Mode, favourites, bookmarks, and local reading progress.
- **[Recitation Sets](https://kalamarchive.com/recite/):** Arrange kalams and Marsiya stanzas, assign reciters, share programmes, export offline/print copies, and optionally guide live navigation.

Built with **Astro**, **Pagefind**, and **Cloudflare Pages**. Cloudflare **R2** hosts images/PDFs; **D1** and Pages Functions store published programmes. Reader preferences and drafts remain on the device.

## Development

Node.js **24** recommended (minimum **22.23.4**).

```bash
git clone https://github.com/GhayurH/lyrics-site.git
cd lyrics-site
npm ci
npm run dev             # localhost:4321
npm run build           # Node tests, ID checks, Astro, Pagefind
npm run test:smoke      # Critical Chromium journeys
npm run test:browser    # Full browser regression suite
npm run preview
```

Images/PDFs are stored in R2, not Git. Local scans need the [asset setup](docs/ASSET_WORKFLOW.md#local-development). See [validation](docs/CONTRIBUTING.md#validation) for CI rules.

## Documentation

- [Contributing](docs/CONTRIBUTING.md): editorial conventions and tests
- [Architecture](docs/ARCHITECTURE.md): shared UI, readers, and code ownership
- [Assets](docs/ASSET_WORKFLOW.md): local assets and R2
- [Recitation Sets](docs/RECITATION_SETS.md): source IDs, programme behavior, and permissions
- [Operations](docs/RECITATION_OPERATIONS.md): D1 and cleanup Worker
- [Audits](audit/README.md): manual maintenance utilities
- [Agent instructions](AGENTS.md)

Corrections and additions: **lyricsadmin@gmail.com**.
