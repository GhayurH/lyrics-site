# Contributing to Kalam Archive

Preserve the original devotional literature faithfully: corrections should improve transcription and accessibility without silently modernizing wording, punctuation, line breaks, or stanza structure. This document owns editorial conventions and contributor validation. Use [ARCHITECTURE.md](ARCHITECTURE.md) for implementation ownership, [ASSET_WORKFLOW.md](ASSET_WORKFLOW.md) for large files, and [RECITATION_SETS.md](RECITATION_SETS.md) for permanent source IDs and published programmes.

## Content rules

### Metadata and cross-references

Standalone lyrics live in `src/data/lyrics/`. `src/content.config.ts` defines their schema. Set the required `kalamType` explicitly; do not infer broad types from legacy categories or tags. Keep poet, reciter, `haal`/`romanHaal`, occasion, language, and tags as separate metadata.

When linking a standalone kalam to its printed Basta edition, set `bastaPage` and `bastaNote` (`original-selection` or `additional-stanzas`) in frontmatter. Do not insert editorial cross-reference notices into the poem's Urdu or Roman text.

Published recitation sources use permanent `recitationId` values. Never reuse or silently reassign an ID. Follow [source-ID maintenance](RECITATION_SETS.md#data-and-source-integrity) when adding, moving, renumbering, or correcting published sources.

### Urdu and Roman Urdu

- Preserve Urdu wording, meaningful harakat, spelling, verse divisions, stanza ordering, and commas.
- Remove stray spaces before commas, but preserve commas **within** verse lines. Match Urdu comma positions in Roman Urdu.
- Where line divisions or stanza order disagree, verify against the original and follow the edition confirmed by editorial review; do not assume either language is always authoritative.
- Retain Roman izafat and useful vowel cues; transliterate `ڑ` as `r` and **Urdu** `ے` as `e` (for example, `بولے` → `bole`, `والے` → `wale`). Punjabi words follow their own pronunciation; do not apply the Urdu ending rule indiscriminately.
- Write **Husain** and **Hasan**, not `Hussain` or `Hassan`, in Roman text. Capitalize the initial letter of every Roman-title word, including hyphenated components; retain existing lyric/poetry casing unless deliberately edited.
- Preserve stanza numbers **in both** Urdu and Roman text as separate marker lines. In ODG source layouts, keep stanza numbers in the middle numbering column. Separate Markdown stanzas with blank lines; the reader renders numbers as centred circles.
- Keep a confirmed sixth line in non-Basta six-verse poems even when that line repeats the title/refrain. Non-Basta six-verse stanzas normally use a 4+2 presentation; set `sixVerseLayout: "pairs"` in frontmatter for a reviewed 2+2+2 poem (alternating indentation and rules between the three couplets).
- Preserve intentional asterisks and other editorial symbols; do not remove them as presumed OCR noise.
- Do not silently replace author/source wording with stylistic corrections.

### Basta

Basta text and index data live under `src/data/basta/` (`pages/`, `roman/`, `index.json`, `settings.json`). Original scans live in R2.

- Preserve printed page numbers, alignment between scan/Urdu/Roman, and the linked book index.
- Preserve the explicit `---***---` kalam boundary markers **in both editions** and the title/byline prefaces. These markers anchor parallel reading.
- In Basta stanza transliteration, omit a duplicate closing refrain only where the reviewed source convention specifies it. Do not apply that de-duplication to standalone non-Basta six-verse poems.
- Refresh the index after relevant edits; index-sync commands do **not** rewrite reviewed page Markdown.
- Use `basta:breaks:rebuild` only after deliberately reviewing the impact on hand-corrected boundaries.
- Keep source image references root-relative (`/images/basta/...`). Do not replace them with R2 hostnames.

```bash
npm run basta:index:check      # Check index drift
npm run basta:index:sync       # Update index labels
npm run basta:breaks:rebuild   # Rebuild boundaries only after manual review
```

The page-by-page and streamed readers are generated from the same source material; streamed JSON is built, not edited by hand.

## Code contributions

Keep browser controllers in `src/client/`, shared domain utilities in `src/lib/`, route composition in `src/pages/`, and styles within the ownership described in [ARCHITECTURE.md](ARCHITECTURE.md#styling-and-shared-components). Avoid duplicate source models, localStorage handling, reader toolbars, or CSS layout overrides.

For substantive source/style/configuration files, add a brief `File role:` comment where it clarifies responsibility or an intentional boundary. Explain non-obvious decisions, not syntax. Remove obsolete work-in-progress notes; preserve explanations for necessary compatibility and specificity rules.

Do not commit generated output (`dist/`, `.astro/`), dependencies, scratch files, or R2 binaries. Use [ASSET_WORKFLOW.md](ASSET_WORKFLOW.md) for assets.

## Validation

Use Node 24 (minimum supported: 22.23.4). For every change run `npm run build` and `git diff --check`; the build already runs Node tests and permanent source-ID checks before Astro and Pagefind. Run `npm test` alone for quicker feedback.

After building, use the appropriate browser tier:

```bash
npm run test:smoke    # Critical Chromium routes and interactions
npm run test:browser  # All Chromium regression scenarios
```

Install Chromium once with `npx playwright install chromium`. Use the full suite for reader layout, theme, routing, export, or major workflow changes; smoke tests alone are not a substitute for those milestones. The full suite covers representative 320–390px portrait, short landscape, tablet, and desktop layouts, one-line verses, no-JavaScript access, Focus Mode, missing editions, scans, and Recitation Sets. Prefer one behaviour-focused test per distinct contract: extend an existing test for additional viewports or related edge cases rather than adding overlapping route or CSS snapshot checks. Browser tests assert behaviour and geometry, not saved screenshots; source-level tests check pure utilities or contracts that cannot be verified by browser interaction. R2 assets are not guaranteed in local Astro previews; publishing and D1 behavior need an appropriately bound Cloudflare deployment.

**GitHub Actions:** Every PR/main commit builds and runs Node tests, ID checks, and asset-route checks. Browser runs are intentionally selective: `[smoke-ci]` runs the reduced `@smoke` subset, and `[full-ci]` runs the complete Chromium suite plus the Basta boundary audit. Commits on `main` run the smoke suite and Basta boundary audit by default. Ordinary PR commits do not run browsers unless marked. CI checks redirect files without downloading R2 images.

For print/export changes, verify embedded Nastaliq fonts, bilingual stanza rows, and page breaks in a real browser.

Review the diff and successful checks before committing. Report corrections or cataloguing questions to **lyricsadmin@gmail.com**.
