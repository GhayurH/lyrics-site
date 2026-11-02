# Contributing

Preserve source wording and numbering. Do not silently modernize Urdu devotional poetry or infer uncertain source boundaries. [Architecture](ARCHITECTURE.md) defines code ownership; [Assets](ASSET_WORKFLOW.md) defines binary storage.

## Poetry and metadata

Standalone poetry lives in `src/data/lyrics/` and follows `src/content.config.ts`. `kalamType` is required. Keep poet, reciter, `haal`/`romanHaal`, occasion, language and tags in separate metadata fields. For Basta cross-references use `bastaPage` and `bastaNote: "original-selection" | "additional-stanzas"`; never add provenance lines inside verses.

- Preserve reviewed Urdu wording, harakat, commas, asterisks, meaningful blanks, verse order and refrain/sixth lines. An intentional Urdu/Roman chorus-count difference may use `stanzaLineExceptions: [1, 2]`; stale declarations fail CI.
- Write the two-syllable title as **بی‌بی** (U+200C zero-width **non-joiner**) throughout Urdu; Roman is **Bibi/bibi** with no separator. The unified `source:sync` / `source:check` commands handle this automatically. Only this exact non-joiner is exempt from the Unicode-control audit.
- Roman Urdu follows **Husain**, **Hasan**, `ڑ` → `r`, `ے` → `e` (except Punjabi pronunciation). Preserve punctuation, vowels and izafat; capitalize Roman titles but do not gratuitously recase verses.
- Keep separately printed stanza numbers as standalone lines in both editions; the Basta ODG middle column supplies the printed numbering. Separate poem stanzas with blank lines.
- Default six-verse layout is 4+2. Use `sixVerseLayout: "pairs"` only for reviewed 2+2+2 text. Do not apply Basta-specific duplicate-refrain cleanup to standalone lyrics.
- Keep `romanLyrics: |-` YAML indentation intact; do not change the title when splitting body lines.

## Basta

Basta index, source pages, Roman transcriptions and settings are in `src/data/basta/`. Preserve printed page numbers, title/byline prefaces and **matching** `---***---` Urdu/Roman boundaries. Never hand-edit generated streaming output. Audit results are review candidates, not permission to reconstruct OCR by guesswork.

### After changing any source Markdown

Run `npm run source:sync` after editing Basta or standalone poetry. It normalizes known spelling conventions, synchronizes index **title labels**, verifies fragment assignments, safely refreshes existing recitation stanza fingerprints, and runs the full read-only source audit. Inspect the diff before committing. Use `npm run source:check` to validate without writing anything; every production build and PR uses the same check.

If an explicitly reviewed fragment's **first line** changes, synchronization stops rather than silently reapproving it. After checking the printed scan and fragment boundaries, run `npm run source:sync -- --approve-fragments=138,421` (replace page numbers with those reported). The command updates only the approved opening fingerprints after checking that each fragment still has its original supplementary/continuation assignment. If fragments are inserted/reordered, review the `page:part` keys and mappings manually first. Newly printed-indexed poems or changes affecting multiple published IDs cannot be automatically approved.

Astro reads the current Markdown whenever it builds. `npm run build` then regenerates the rendered pages, the Pagefind search index and the offline-search manifest; no search index needs to be edited or committed separately.

For a reviewed subordinate heading or repeated major refrain, prefix the corresponding Urdu **and** Roman lines with `[[subtitle]] ` or `[[refrain]] `, respectively. Both markers are removed from rendered text. Ordinary verses remain unmarked.

```bash
npm run source:sync       # Normal after editing any poetry Markdown
npm run source:check      # Read-only CI/build verification
npm run content:review       # Every source needing editorial review (Basta and standalone)
npm run content:review -- --markdown > review.md # Scan-linked review report
npm run content:review -- --json                 # Machine-readable findings
npm run --silent content:review -- --csv > review.csv # UTF-8 spreadsheet queue
npm run content:review -- --strict               # Nonzero exit if review queue is not empty
npm run content:review -- --summary --regression # CI gate: no structural or new editorial findings
npm run basta:index:sync    # Lower-level title-only command (normally use source:sync)
# Source separators and stanza numbers require manual review against scans.
# The index sync command changes title labels only, never source Markdown.
```

The scan's contents need not all have printed-index entries. Small interspersed poems, quotations and bylines intentionally remain part of the source pages without getting standalone IDs. Record reviewed exceptions in `src/data/basta/fragment-roles.json`: each `page:fragment` key must have `role: "supplement"`, an exact first-line `opening`, and a short `reason`. The audit validates that the fragment is still genuinely unindexed and the opening still matches, so separator or index changes invalidate stale exceptions. Never classify the whole page, suppress Urdu/Roman checks, or fabricate an index entry just to silence a warning. `contentKind: editorial-note | english-appendix` and `romanExpected: false` are available for non-poetry source pages.

The review command checks script mixing, extended Latin letters, stray Unicode controls, stanza and verse alignment, metadata, missing editions, and uncertain Basta index/source mapping. Its findings are advisory; inspect original scans and intended refrains before editing. **Do not** gate builds on a currently nonempty editorial queue.

Stable `recitationId` values and numbered-stanza anchors are permanent. Review [Recitation Set identity rules](RECITATION_SETS.md#permanent-source-identity) before renaming, moving or renumbering a poem.

## Code and tests

Use Node.js **24** (minimum **22.23.4**) and `npm ci`. Reuse shared parsers, components and design tokens; avoid adding route-specific patches for cross-reader behavior. Write comments that explain non-obvious invariants, not progress notes.

```bash
npm test               # Node models, editorial/content contracts, tokens
npm run check          # Strict Astro/TypeScript diagnostics
npm run build          # Tests, stable IDs, Astro, Pagefind and offline manifest
npm run test:smoke      # Critical Chromium journeys (@smoke)
npm run test:browser    # Functional Chromium regression, excluding measurements
npm run perf:assets     # Built file sizes (after build)
npm run perf:browser    # Opt-in FCP/LCP, layout shift and resource transfer report (@perf)
git diff --check
```

Install Chromium with `npx playwright install chromium`. Browser tests need a production build first; `astro preview` does not reproduce Cloudflare Pages Functions or R2 redirects.

### Choosing test coverage

- **Unit (`tests/*.test.mjs`):** parser, source identity, storage-independent logic, editorial boundaries and static build contracts. Extend the owning file; do not create a one-test file for a closely related function.
- **Smoke (`@smoke`):** a small set of representative no-JavaScript reading, responsive navigation, Focus, search, favourites, theme, and Recitation Set creation journeys. Each should protect a distinct critical workflow.
- **Full browser:** distinct user journeys not represented by smoke: error states, cross-page navigation, backup/restore, editor flows, and publishing. Avoid CSS pixel assertions and repeated device/theme permutations after the shared layout owns them.
- **Performance (`@perf`):** non-gating Chromium measurements run separately with `npm run perf:browser` rather than making functional CI depend on noisy timing values.

Do not copy a scenario merely to run it in smoke: mark its existing browser test. Test observable behavior and state, not fixed dimensions, individual historical fixes or arbitrary source-page screenshots. Keep a representative check when a dynamic layout algorithm can actually regress; reserve broader device/theme exploration for manual QA. CI retains screenshots/traces for failures.

**CI:** Every PR/main push runs the production build (including Node tests and stable IDs) plus Chromium smoke. Astro diagnostics run for changed `.astro`, `.ts`, `.tsx`, `.js` or `.jsx` sources, or on scheduled/manual full runs. Full Chromium runs each Sunday and via **Actions → Reader validation → Run workflow** or an explicit `[full-ci]` commit marker. Use `[check-ci]` to force Astro diagnostics on other changes. The full run also generates the complete Basta-and-standalone content review queue; inspect CI for the final commit, not an earlier commit.

Never commit `dist/`, `.astro/`, `node_modules/`, temporary test output or R2 binaries. Source edits must keep permanent IDs stable; use `npm run source:sync` for safe in-place identity updates and explicitly review anything it refuses.

## Manual review

Follow [Quality assurance](QUALITY_ASSURANCE.md) for real viewport, zoom, font, accessibility and deployment checks. Full CI does not certify a screen reader or physical device. Confirm PDF export page breaks and Nastaliq rendering with an actual browser; verify published programme editing against deployed D1 bindings.

Questions and corrections: **lyricsadmin@gmail.com**.
