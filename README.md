# Kalam Archive

[Kalam Archive](https://kalamarchive.com) is a static-first archive of Urdu devotional poetry, Roman Urdu readings and original source scans. It supports browsing, search, bookmarks, offline reading and organizer-created recitation programmes without user accounts.

## Architecture

Astro builds accessible HTML from editorially maintained Markdown. Pagefind indexes the rendered pages. Cloudflare Pages serves the site; R2 holds large image/PDF assets; Pages Functions and D1 are used **only** for explicitly published Recitation Sets. Saved items, reading preferences and unfinished programme drafts live in the visitor's browser.

Source text remains authoritative: neither the search pipeline nor browser rendering rewrites poetry. The same parsing and design contracts serve page readers, the continuous Basta reader and recitation exports.

## Develop

Node.js 24 is recommended (minimum 22.23.4).

```bash
npm ci
npm run dev              # Local Astro development
npm run check            # Astro + TypeScript
npm run build            # Tests + source integrity, then Astro, Pagefind and offline manifest
npm run preview          # Inspect the built site
```

When changing poetry, run `npm run source:sync` and **review its diff** before building. Builds run `source:check` read-only. For integration changes, run `npm run test:browser` against a production build; `test:smoke` selects only critical journeys. Use `npm run content:review` for the editorial review queue and `perf:assets` / `perf:browser` for performance checks. Browser tests require Chromium (`npx playwright install chromium`).

Local Astro preview does not emulate Cloudflare D1 Functions or R2 routing; test those in an appropriate Pages deployment.

## Contributor documentation

- [Architecture](docs/ARCHITECTURE.md) — dependency boundaries and **single owners** for source models, browser features and CSS.
- [Contributing](docs/CONTRIBUTING.md) — editorial conventions, change procedure and engineering standards.
- [Quality assurance](docs/QUALITY_ASSURANCE.md) — automated and manual verification.
- [Assets](docs/ASSET_WORKFLOW.md) — external scans, fonts, upload and preview routing.
- [Recitation Sets](docs/RECITATION_SETS.md) — product behavior, source identity and security.
- [Operations](docs/RECITATION_OPERATIONS.md) — D1, scheduled cleanup and deployment.

Suggest poetry corrections at **lyricsadmin@gmail.com**.
