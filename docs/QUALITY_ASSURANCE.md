# Quality assurance

Test **contracts and user journeys**, not the current selector structure. Automated verification is necessary but does not replace checking representative readers and Cloudflare integrations.

## Automated pipeline

| Command | Purpose |
| --- | --- |
| `npm run check` | Astro and TypeScript diagnostics |
| `npm run build` | Node unit tests + read-only editorial/source/ID regression, then production pages, Pagefind and offline manifest |
| `npm run test:smoke` | Critical Chromium journeys explicitly tagged `@smoke` |
| `npm run test:browser` | All functional Chromium journeys, including smoke; excludes opt-in `@perf` |
| `npm run perf:assets` / `npm run perf:browser` | Opt-in asset and browser performance review |

CI runs **one build** and selects smoke or full, never both. The smoke subset protects no-JS source access, homepage/browse/search, saved lyrics, a local Recitation Set, Basta page navigation, edition controls/Focus, and one-at-a-time kalam scans. Full runs on schedule, manual dispatch or a `[full-ci]` commit marker and includes smoke. Browser tests are isolated and grouped into general reader, Basta reader, recitation, site, responsive and appearance suites. CI uses file-level concurrency instead of `fullyParallel`, keeping expensive font-loading amortized within each worker. Tests use event/locator assertions, not arbitrary sleeps. Every build runs the corpus-wide source regression gate once; the separate detailed editorial artifact is reserved for scheduled/manual reviews. Existing reviewed OCR debt does not fail builds, but **new findings and structural mapping errors** do. Failure-only traces and screenshots are CI artifacts, not tracked files.

## Editorial acceptance and merging

**A green CI build is a technical gate, not editorial sign-off.** `source:check` enforces published structural consistency, Roman normalizer stability, Basta index labels, permanent IDs and **zero new** findings compared with the approved review baseline. It does not prove that all historical or imported poetry, transcriptions, title variants, potential duplicates or source credits have been manually verified.

Before merging a large import:

1. Complete or explicitly adjudicate source decisions for duplicate comparison, original-source Urdu completeness, Roman accuracy, stanza alignment and metadata. Record open work in `audit/manual-md-review-tracker.csv`; an empty register does not replace human editorial acceptance. `pending`, `partial_review`, `spot_checked` and `blocked` are not acceptance. Compare with existing site and Basta content; preserve genuinely distinct variants and source notes.
2. Review large normalization/content diffs **poem by poem** against originals. Resolve ambiguous readings with source images, source HTML or recitations rather than treating script conversion or a matching line count as verification.
3. Preserve pre-existing live recitation IDs and stanza anchors. Check any removed, renamed or consolidated poem against `main`; keep published historical IDs retired, and do not invent replacements. Verify generated Basta labels, standalone titles, search URLs and recitation deep links.
4. Run `npm run check`, `npm run build`, the **full** Chromium functional suite and `git diff --check` at the final head. Use an actual Pages preview to confirm R2 scan links and D1/Recitation Set behavior, which Astro preview cannot reproduce.

A not-yet-reviewed import may pass automated validation, but must not be described as editorially approved. The source reviewer's scan-linked findings remain advisory until checked by a person.

## Representative manual matrix

| Environment | Essential checks |
| --- | --- |
| 320×568 and 390×844 portrait | Single Urdu, Roman, scan-only, stacked editions, toolbar collapse, legible headings |
| 640×360 touch landscape | Focus entry/exit, scan not overlapping poems, safe-area controls |
| 768×1024 portrait | Container breakpoints and bilingual index readability |
| 1440×900 desktop | All three editions parallel where space permits, shared article width/navigation, sticky scan/toolbar |
| 200–400% zoom | No page-wide horizontal scroll; very long lines pan **individually** with keyboard access |

Verify bilingual source coverage, permitted exceptions and spelling against [Transliteration](TRANSLITERATION.md). The whitespace normalizer removes all terminal newlines from changed Markdown; editorial validation does not enforce EOF style. Preserve internal stanza spacing, source separators and permanent anchors. Across representative pages test Light, Dark, Sepia, AMOLED and a Custom palette; default Nastaliq, Naskh and at least one Roman alternate. Check focus rings, Tab order, Escape, modal return focus, reduced motion and screen-reader announcements.

## Journeys to protect

1. **Standalone lyrics:** page content without JavaScript, Urdu/Roman-only stanza layout, title and poet roles, bookmarks, corrections and search aliases.
2. **Basta:** frameless, uncropped original scans (preserving their printed borders) across page, individual-kalam, continuous and Focus readers; all eligible three-edition readers float scans beside text above 64rem and stack scans above two resizable texts below it; individual kalam pages use the same wide reader shell; adjustable bilingual width up to 85% Roman, 95%-triggered font growth with every verse justified, single-line fitting and shared scrolling, printed-page navigation, image-only/missing-Roman fallback, continuous chunk retry, `#page-N` direct links, Focus back/exit restoration, Urdu–Roman bookmark identity and verified individual-kalam scans (Previous/Next, one source visible, direct `#scan-page-N` links, Focus and mobile).
3. **Recitation editor:** create/duplicate/reorder drafts, templates, 40-item cap, reciter/notes, borrowed/repeated Marsiya stanzas, source warnings and saved drafts after navigation.
4. **Published programmes:** read-only public link, private capability, concurrent edit conflicts, expiry, authorized deletion, opt-in live follower, full offline HTML and browser print.
5. **Saved/offline/search:** backup preview/restore, fresh-device offline downloads, Pagefind filters, keyboard-accessible menus and no unsafe caching of private capabilities.

## Deployment checks

Local `astro preview` does not reproduce R2 redirect routing, D1 bindings or scheduled Workers. On a **preview deployment**, test source-scan redirects, blocked/slow images, API errors and 30-day programme retention. On **production**, verify configured D1 access and production retention without altering live records unnecessarily. Confirm the offline service worker never caches private edit URLs or API responses.

For editorial changes, inspect original scans before updating `fragment-roles.json` or identities. See [Contributing](CONTRIBUTING.md) for the only supported approval process. Record device, viewport, zoom, font, selected editions, network conditions and reproducible steps with each defect.