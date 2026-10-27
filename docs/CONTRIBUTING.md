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
- Where line divisions disagree, follow the Urdu source unless a reviewed editorial decision requires otherwise.
- Retain Roman izafat and useful vowel cues; transliterate `ڑ` as `r` and `والے` as `wale`.
- Preserve stanza numbers **in both** Urdu and Roman text. In ODG source layouts, keep stanza numbers in the middle numbering column.
- If an independently printed refrain also appears as the last line of a stanza, omit the duplicate stanza-ending copy.
- Do not silently replace author/source wording with stylistic corrections.

### Basta

Basta text and index data live under `src/data/basta/` (`pages/`, `roman/`, `index.json`, `settings.json`). Original scans live in R2.

- Preserve printed page numbers, alignment between scan/Urdu/Roman, and the linked book index.
- Preserve the explicit `---***---` kalam boundary markers **in both editions** and the title/byline prefaces. These markers anchor parallel reading.
- Refresh the index after relevant edits; index-sync commands do **not** rewrite reviewed page Markdown.
- Use `basta:breaks:rebuild` only after deliberately reviewing the impact on hand-corrected boundaries.
- Keep source image references root-relative (`/images/basta/...`). Do not replace them with R2 hostnames.

```bash
npm run basta:index:check   # Check index drift
npm run basta:index:sync    # Update index labels only
npm run basta:sync:check    # Alternative index-only check
npm run basta:sync          # Alternative index-only sync
npm run basta:breaks:rebuild  # Reconstruct boundaries: manual review required
```

The page-by-page and streamed readers are generated from the same source material; streamed JSON is built, not edited by hand.

## Code contributions

Keep browser controllers in `src/client/`, shared domain utilities in `src/lib/`, route composition in `src/pages/`, and styles within the ownership described in [ARCHITECTURE.md](ARCHITECTURE.md#styling-and-shared-components). Avoid duplicate source models, localStorage handling, reader toolbars, or CSS layout overrides.

For substantive source/style/configuration files, add a brief `File role:` comment where it clarifies responsibility or an intentional boundary. Explain non-obvious decisions, not syntax. Remove obsolete work-in-progress notes; preserve explanations for necessary compatibility and specificity rules.

Do not commit generated output (`dist/`, `.astro/`), dependencies, scratch files, or R2 binaries. Use [ASSET_WORKFLOW.md](ASSET_WORKFLOW.md) for assets.

## Validation

For routine work:

```bash
npm ci
npm test
npm run build
git diff --check
git status --short
```

`npm run build` runs Node tests and `recitation:ids:check` in `prebuild`, then builds Astro and Pagefind. Running `npm test` separately is useful for quick feedback but is not necessary immediately before the full build.

For reader, search, or responsive changes:

```bash
npx playwright install chromium
npx playwright test --grep '@smoke'
npx playwright test  # Full local Chromium suite at milestones
```

Check portrait widths around 320–390px, short landscape screens, tablets, and desktop layouts. Cover standalone lyrics, paired and Roman-unavailable Basta pages, continuous deep links/index navigation, Focus Mode exit, missing scans, accessible image zoom, Recitation Sets, and a no-JavaScript reading path. Poetry verses must remain one line, without wrapping or horizontal text scrolling. Print/export changes must preserve embedded Nastaliq fonts, bilingual stanza rows, and sensible page breaks; verify PDF output in a real browser.

GitHub Actions builds and runs Node tests on pushes and pull requests. It runs the Chromium `@smoke` suite and Basta boundary audit on pushes to `main` or commits marked `[full-ci]`. Ordinary PR updates skip those longer checks. CI validates generated Cloudflare redirect/routing files rather than downloading R2 assets. Local Astro preview does not run Pages Functions or apply Pages `_redirects`; test those behaviors on a bound Cloudflare deployment.

Review the diff and successful checks before committing. Report corrections or cataloguing questions to **lyricsadmin@gmail.com**.
