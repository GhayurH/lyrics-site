# Quality assurance checklist

Use this checklist for shared reader, appearance, search, offline and publishing changes. Record device, browser, viewport, zoom, font, theme, selected editions and observed defect when filing a report. Passing CI alone does **not** mean these checks were performed.

## Automated checks

```bash
npm run check
npm run build
npm run test:smoke
npm run test:browser
npm run perf:assets
npm run perf:browser  # Optional, non-gating browser measurements
```

GitHub Actions runs **smoke Chromium on every PR and main push**, and **full Chromium every Sunday**, through manual workflow dispatch, or when the latest commit contains `[full-ci]`. Node unit and identity checks run during every build; Astro diagnostics run when `.astro`, TypeScript or JavaScript sources change (or during full scheduled/manual runs). The Sunday full run generates the `content-review` artifact, covering every Basta and standalone Markdown file with source-alignment, Unicode, metadata and mapping checks. The same `content:review` command also supports `--summary`, `--json`, and `--csv` output. Run `npm run test:browser` locally when changing an integration not covered by smoke.

## Viewports and input

| Scenario | Representative viewport |
| --- | --- |
| Narrow phone portrait | 320×568 |
| Standard phone portrait | 390×844 |
| Narrow landscape/touch | 640×360 |
| Tablet portrait | 768×1024 |
| Wide desktop | 1440×900 |
| Magnified / responsive reflow | Browser zoom at 200% and 400% |

For each representative page test selected Urdu only, Roman only where available, image only and combinations. Check no page-wide horizontal scrollbar, correct focus location, no obscured lines, and one-line poetry remaining readable. At extreme zoom, long lines may pan individually via keyboard rather than shrinking indefinitely. Respect reduced motion.

## Reader journeys

- Standalone lyrics: title/poet styling, stanza numbering, long verses, source image, correction form and bookmarks.
- Basta page and continuous reader: scan navigation, missing Roman edition, cross-page position, scroll synchronization, Focus Options, deep links, image viewer and printed-page bookmarking.
- Individual Basta: kalam index, search facets, all source-page scans, stanza-to-scan anchors and local favourites. Only verified kalams get permanent individual reading URLs.
- Recitation Sets: local draft/template, source selection, repeat/borrow Marsiya stanzas, programme notes, publishing, read-only share, conflict handling across organizer tabs, live following, offline HTML and print/PDF.
- Saved & recent: JSON export/import warning and conflict preview, optional offline page/scan/search downloads, storage counts and removal. Test offline after a **fresh** browser visit as well as revisiting a saved route.

Use keyboard Tab, Shift+Tab, Enter and Escape; test focus visibility, announcements and dialog return focus. Review with an actual screen reader such as NVDA, VoiceOver or Orca when available. Run at least Light, Dark, Sepia, AMOLED and a contrasting Custom palette; include Nastaliq and Naskh fonts.

## Cloudflare and source verification

- Test R2 image redirects on preview/production, slow or blocked scans, and book-chunk retry. Local `astro preview` cannot reproduce all Pages behavior.
- Verify published programme create/edit/delete and expiry against the target D1 environment; do not expose edit tokens in public QR codes or caches.
- Use `npm run content:review` (or `npm run content:review -- --markdown > review.md`) to inspect all potential source, script, numbering, and index issues. Review uncertain Basta index/fragment mappings against original scans before editing source. Pixel-accurate highlighting requires *confirmed* scan coordinates; a linked printed page alone is not a verified image region.
- Measure cold/mobile network font/CSS/JS requests, first/largest contentful paint and cumulative layout shift. Record browser/network conditions, not just an asset-size total.
