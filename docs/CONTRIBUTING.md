# Contributing to Kalam Archive

Preserve source wording and structure; don't silently modernize devotional poetry. [Architecture](ARCHITECTURE.md) owns code boundaries, [Assets](ASSET_WORKFLOW.md) owns R2, and [Recitation Sets](RECITATION_SETS.md) owns stable IDs and programme rules.

## Content rules

### Metadata and cross-references

Standalone sources live in `src/data/lyrics/`; `src/content.config.ts` defines their schema. Supply `kalamType` explicitly; keep poet, reciter, `haal`/`romanHaal`, occasion, language, and tags as separate fields. For a Basta cross-reference, use `bastaPage` and `bastaNote: "original-selection" | "additional-stanzas"`, not a line inside the poem.

Published `recitationId` values are permanent. Follow the [ID rules](RECITATION_SETS.md#data-and-source-integrity) before renaming, moving, or renumbering sources.

### Urdu and Roman Urdu

- Preserve reviewed wording, harakat, spelling, commas, stanza order, line breaks, and meaningful asterisks. Verify disputed Urdu/Roman order against the source; neither language is automatically authoritative.
- Keep punctuation positions aligned between editions; remove stray spaces *before* commas.
- Roman Urdu: preserve izafat/vowels; `ڑ` → `r`, Urdu `ے` → `e` (`بولے` → `bole`, `والے` → `wale`). Punjabi pronunciation may differ. Use **Husain** and **Hasan**, not double-s variants. Capitalize Roman title words (including hyphenated parts); don't recase verse text unnecessarily.
- Keep stanza numerals as separate lines in *both* editions (ODG numbers come from the middle column); separate Markdown stanzas with blank lines. Stanza markers render as centered circles.
- Preserve confirmed sixth/refrain verses. Default six-verse styling is 4+2; use `sixVerseLayout: "pairs"` only for reviewed 2+2+2 stanzas. **Do not** apply Basta-specific duplicate-refrain removal to standalone lyrics. Keep `romanLyrics: |-` lines indented inside YAML frontmatter; do not alter the title when splitting body verses.

### Basta

Pages, transliterations, index, and settings are in `src/data/basta/`. Preserve printed page numbers, scan/text alignment, title/byline prefaces, and matching `---***---` kalam boundaries in Urdu **and** Roman. Keep `/images/basta/...` paths root-relative. Generated streaming data must not be hand-edited.

```bash
npm run basta:index:check      # Detect index drift
npm run basta:index:sync       # Refresh index labels
npm run basta:kalams:audit     # Report uncertain page boundaries
npm run basta:breaks:rebuild   # Only after reviewing hand-corrected boundaries
```

## Code contributions

Browser controllers belong in `src/client/`; shared models/parsers in `src/lib/`; route composition in `src/pages/`; common CSS/token ownership in [Architecture](ARCHITECTURE.md#styling-and-shared-components). Reuse shared reader controls, parsers, and rendering helpers. Keep user-facing copy focused on what visitors can do, not implementation details. Explain non-obvious decisions in comments; remove obsolete work notes.

Never commit `dist/`, `.astro/`, dependencies, scratch files, or R2 binaries.

## Validation

Use Node **24** (minimum 22.23.4). Every change: `npm run build`, `git diff --check`, and review the diff. The build runs Node tests, permanent-ID checks, Astro, and Pagefind.

```bash
npm test                # Quick Node tests
npm run test:smoke      # Critical Chromium reading/search/save/recitation journeys
npm run test:browser    # Full Chromium suite (UI, themes, export, edge cases)
```

Install Chromium once with `npx playwright install chromium`. Use the **full** suite for reader layout, theme, routing, export, and major workflow changes. Keep one test per distinct behavior; extend tests rather than copying variants. `@smoke` is reserved for critical journeys and defaults; appearance permutations, fine geometry, optional features, and negative cases belong in full-only tests. Prefer behavior/geometry assertions over screenshots.

**GitHub Actions:** All PR/main commits build and check IDs/assets. Add `[smoke-ci]` to the last commit message for the smoke browser suite; `[full-ci]` runs the complete Chromium suite and Basta boundary audit. `main` runs smoke and the audit automatically. Ordinary PR commits skip browsers unless marked.

Local Astro preview does not emulate Pages Functions/R2 redirects; test publication with the intended Cloudflare D1 bindings. Print/export changes require a real browser check for Nastaliq fonts and page breaks.

Questions and corrections: **lyricsadmin@gmail.com**.
