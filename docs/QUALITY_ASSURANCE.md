# Quality assurance and release acceptance

There are **two distinct gates**: technical integrity and human editorial acceptance. Neither substitutes for the other. This document covers final validation for changes to poetry, its readers, search, Recitation Sets and deployment.

## Automated checks

| Command | Verification |
| --- | --- |
| `npm run check` | Astro and TypeScript diagnostics |
| `npm run source:check` | Read-only Bibi/Roman normalization, Basta index, IDs and editorial regression |
| `npm run content:review -- --summary` | Advisory source findings; not an edit or sign-off |
| `npm run build` | Node tests + `source:check` via `prebuild`; Astro HTML + sitemap inventory audit + Pagefind + offline manifest + deterministic build budgets |
| `npm run sitemap:verify` | Local generated HTML vs sitemap inventory (after build) |
| `npm run test:smoke` | Critical `@smoke` Chromium journeys |
| `npm run test:browser` | All functional Chromium journeys, including smoke; excludes `@perf` |
| `npm run test:editorial` | Private workspace browser journeys using a temporary fixture repository and ledger |
| `npm run perf:assets` / `npm run perf:browser` | Optional asset and browser performance |
| `npm run perf:check` | Enforce HTML/tag, initial JavaScript, catalog, Pagefind and deployment-file budgets |
| `npm run search:verify` | Query the actual generated Pagefind/WASM index with permanent-identity relevance fixtures |
| `git diff --check` | Patch whitespace errors |

CI builds once, then runs **smoke OR full**, never both; full includes smoke. Normal PRs get smoke. Weekly/manual and explicitly marked `[full-ci]` checks get the full browser suite; `[check-ci]` opts into Astro diagnostics. Scheduled/manual jobs also publish the detailed editorial review artifact. `[skip ci]` is for unfinished editorial commits, not the final release. Screenshots and traces belong to failing CI artifacts, not the repository.

The review baseline permits known **historical** findings but rejects new regressions and structural mapping failures. Successful tests demonstrate code and source consistency; they do **not** establish that every imported poem, alternative title, poet, transcription or apparent duplicate has been adjudicated.

Build budgets live in `scripts/lib/build-budgets.mjs`. Initial JavaScript counts the static import graph and inline script bytes; deferred export/font chunks are reported separately. Compression figures are local gzip estimates, not production traffic or field Web Vitals. The default deployment budget is 20,000 files; change it through an explicit reviewed budget file only after confirming the actual hosting plan. `npm run perf:check -- --budgets /path/to/budgets.json` supports that documented override. Do not raise a budget merely to silence an unexpected regression.

For local machines with an already installed Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to its executable path. CI uses the version-pinned Playwright image. A restricted environment that cannot launch browser processes is not evidence that browser tests passed: run the same committed suite in CI or a supported development environment.

## Editorial release checklist

For the Round 2 publishing commit/PR:

1. **Deduplicate fully.** Compare candidates with existing standalone poems, reviewed Basta index/kalams and original sources. Merge only verified unique verses and valid metadata. Keep genuinely distinct poems. The final corpus should not contain duplicate scraper records dressed as separate poems.
2. **Complete manual passes.** Check original-language completeness, poet and metadata, language code/direction, stanza boundaries and numbering, Roman accuracy and alignment, title/aliases, and any disputed source reading. Do not mark a bulk-normalized or spot-checked item fully reviewed. Flag unresolved material explicitly; decide whether it blocks publication rather than disguising it.
3. **Finalize records.** Keep `audit/lyric-md-rounds.csv` unchanged from `main` while editorial work is ongoing. Immediately before merge, reconcile the resolved Round 2 decisions from `audit/round2-dedup-wip.csv` into the final round register, preserving its existing history. Remove temporary WIP-only audit data from the published branch when it is no longer needed. The separate manual review register is for **open** decisions and is not a duplicate permanent log.
4. **Clean publication content.** Remove import `source_id`, `source_url`, scrape hashes, raw HTML/snapshot paths and redundant provenance comments from final lyric Markdown, **retaining meaningful editorial data and permanent identities**. Do not remove evidence from still-pending unpublished editorial review until it has served its purpose.
5. **Protect URLs and identity.** Compare the final corpus with `main`. Validate published `recitationId`, Basta poem/stanza anchors, retired IDs, source-page links, alias/slug behavior and any Recitation Set references. Never replace deleted IDs with a new poem. Verify actual printed `---***---` fragment mappings before authorizing role changes.
6. **Review exact diffs.** Run `npm run whitespace:fix`, `npm run source:sync`, inspect all Markdown and derived changes poem-by-poem, and run `git diff --check`. A normalizer changing wording is a candidate for human checking, not automatic approval.
7. **Complete technical verification at the final head.** Run `npm run check`, `npm run build` and `npm run test:browser` (Chromium), and confirm the final commit receives **unskipped** CI validation. Verify no new source-review regressions, stale sitemap routes or dropped public pages.
8. **Test real Cloudflare behavior.** Verify R2 image/PDF redirects on Pages preview, production/preview D1 bindings, Recitation Set create/read/expiry/capabilities, bot/sitemap fetches and private capability caching. Do not use Astro preview as evidence for Cloudflare APIs.

Only after these checks should the branch be described as publication-ready. Do not insert projected file counts or review totals in permanent documentation; they become stale as imports and deduplication change.

## Reader acceptance matrix

| Viewport or mode | Essentials |
| --- | --- |
| 320×568 / 390×844 | Original-only, Roman-only and scan fallback; stacked editions; legible headers and toolbar |
| 640×360 touch landscape | Focus controls, safe areas, scan navigation and no obstructed poetry |
| 768×1024 | Container-based bilingual layouts and index legibility |
| 1440×900 | All available parallel editions, adjustable Urdu/Roman widths and scan positioning |
| 200–400% zoom | Verses fit or pan **individually**; no document-wide sideways scroll; keyboard access |
| No JavaScript / offline / low bandwidth | Useful HTML, obvious errors, recoverable image/source access and safe cached content |

Across representative pages also test Light, Dark, Sepia, AMOLED and Custom themes, a Nastaliq and Naskh face, a Roman font, reduced motion, keyboard Tab/Escape, focus restoration and readable screen-reader announcements.

## Critical journeys

- **Standalone:** correct original/Roman titles and poet, stanza semantics, no-JS text, bookmarks, independent source types, search aliases and source links.
- **Basta:** printed page identity; index and continuous reader; verified individual kalam; continuation/page anchors; one-at-a-time `#scan-page-N` scan navigation; missing Roman and image-only fallback; Focus exit restores location.
- **Reader layout:** consistent toolbar; parallel three editions at sufficient width, stacked when narrow; draggable text divider; font size tracks column width without wrapping the source verse; justified Urdu, proper scroll container and no clipping.
- **Recitation:** draft edit/reorder/duplicate, 40-entry cap, stanza selections, preserved IDs, safe export and backup; published link read-only, capability edit, concurrency conflict, retention, deletion, opt-in live following.
- **Search/offline:** visible source verses rather than duplicated excerpts, language-agnostic Pagefind retrieval, aliases and filters, keyboard navigation, offline downloads and restoration, private API/edit token exclusion from caches.
- **Discovery:** bounded category/hub pages and directory pagination without JavaScript; next/previous and canonical links; literal published metadata; contextual facet counts, back/forward state and rejection of stale search responses; actual built-index relevance queries.
- **Passage reading:** original/Roman stanza copying, reloadable anchors, existing Basta bookmark aliases, correct source-language controls, clipboard fallback, matching-verse navigation, scan failure/retry, wide desktop and pinch magnification without source wrapping.
- **Editorial workspace:** source and ledger changes during an open review, rename identity, duplicate-ID isolation, pass-specific invalidation, explicit publication decisions, comparison dependencies, private exports, malformed requests and cross-origin rejection. Use temporary fixture repositories and state directories, never the real review ledger.

## Deployment and investigation

`npm run sitemap:verify:live` compares the deployed sitemap to a **local build of the exact deployed commit**. A mismatch from another build is not proof of missing live pages. A Cloudflare challenge against an automation client is not proof that verified search-engine crawlers are blocked; examine Security Events and actual Google/Bing access before changing WAF settings. Search Console's historic “discovered” counts are not the current site's route count.

Use an actual Pages preview for API, R2 and Worker interactions and a controlled production verification for bindings/retention. Record device, viewport, zoom, selected language/edition, affected source/URL and reproducible steps for any defect. Operational commands are in [Operations](OPERATIONS.md).
