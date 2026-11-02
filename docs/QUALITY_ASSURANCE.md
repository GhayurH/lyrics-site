# Quality assurance checklist

Use this checklist for shared reader, appearance, search, offline and publishing changes. Record device, browser, viewport, zoom, font, theme, selected editions and observed defect when filing a report. Passing CI alone does **not** mean these checks were performed.

## Automated checks

```bash
npm run build         # Unit tests, source/index/ID checks, Astro and Pagefind (once)
npm run check         # Astro and TypeScript diagnostics
npm run test:smoke    # Five distinct critical browser journeys
npm run test:browser  # Complete functional browser suite (includes smoke)
npm run perf:assets   # Built asset sizes
npm run perf:browser  # Optional non-gating measurements
```

GitHub Actions runs **smoke Chromium on every PR and main push**, and **full Chromium every Sunday**, through manual workflow dispatch, or when the latest commit contains `[full-ci]`. The build's prebuild hook runs Node unit tests and `source:check` exactly once across **all** Markdown sources, index labels, reviewed fragments and permanent IDs (not only files detected as changed); Astro diagnostics run when `.astro`, TypeScript or JavaScript sources change (or during full scheduled/manual runs). The unified `source:check` runs `npm run content:review -- --summary --regression`: all structural index/mapping errors and any increases over the tracked per-file editorial baseline fail validation. Lower counts are permitted; the baseline must only be updated after explicit source review. The Sunday full run generates one Markdown `content-review` artifact (rather than rereading the corpus separately for Markdown and CSV), covering every Basta and standalone Markdown file with source-alignment, Unicode, metadata and mapping checks. The same `content:review` command also supports `--summary`, `--json`, and `--csv` output. Run `npm run test:browser` locally when changing an integration not covered by smoke.

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
- Basta page and continuous reader: scan navigation, missing Roman edition, cross-page position, scroll synchronization, Focus Options, deep links, image viewer and bookmarking. Save a stanza in Roman-only mode, verify its Urdu counterpart and Saved Library deep link, and test the same in streamed pages.
- Individual Basta: kalam index, search facets, all source-page scans, stanza-to-scan anchors and local favourites. Only verified kalams get permanent individual reading URLs.
- Recitation Sets: local draft/template, source selection, repeat/borrow Marsiya stanzas, programme notes, publishing, read-only share, conflict handling across organizer tabs, live following, offline HTML and print/PDF.
- Saved & recent: JSON export/import warning and conflict preview, optional offline page/scan/search downloads, storage counts and removal. Test offline after a **fresh** browser visit as well as revisiting a saved route.

Use keyboard Tab, Shift+Tab, Enter and Escape; test focus visibility, announcements and dialog return focus. Review with an actual screen reader such as NVDA, VoiceOver or Orca when available. Run at least Light, Dark, Sepia, AMOLED and a contrasting Custom palette; include Nastaliq and Naskh fonts.

## Cloudflare and source verification

- Test R2 image redirects on preview/production, slow or blocked scans, and book-chunk retry. Local `astro preview` cannot reproduce all Pages behavior.
- Verify published programme create/edit/delete and expiry against the target D1 environment; do not expose edit tokens in public QR codes or caches.
- Run `npm run source:sync` after changes to any Markdown source. If a reviewed fragment opening changes, recheck it against the scan and approve the printed page explicitly with `--approve-fragments=PAGE`; never silently refresh a role or permanent ID. `source:check` gates every build and PR, including unchanged Markdown.
- Keep the reviewed supplementary-fragment manifest current when separators or printed index associations change. The audit must warn on missing and stale role declarations; source snippets still undergo normal Unicode, OCR, and Urdu/Roman comparisons. Do not approve uncertain scanned text automatically.
- Use `npm run content:review` (or `npm run content:review -- --markdown > review.md`) to inspect all potential source, script, numbering, and index issues. Review uncertain Basta index/fragment mappings against original scans before editing source. Pixel-accurate highlighting requires *confirmed* scan coordinates; a linked printed page alone is not a verified image region.
- Measure cold/mobile network font/CSS/JS requests, first/largest contentful paint and cumulative layout shift. Record browser/network conditions, not just an asset-size total.
