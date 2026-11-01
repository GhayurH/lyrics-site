# Contributing

Preserve source wording and numbering. Do not silently modernize Urdu devotional poetry or infer uncertain source boundaries. [Architecture](ARCHITECTURE.md) defines code ownership; [Assets](ASSET_WORKFLOW.md) defines binary storage.

## Poetry and metadata

Standalone poetry lives in `src/data/lyrics/` and follows `src/content.config.ts`. `kalamType` is required. Keep poet, reciter, `haal`/`romanHaal`, occasion, language and tags in separate metadata fields. For Basta cross-references use `bastaPage` and `bastaNote: "original-selection" | "additional-stanzas"`; never add provenance lines inside verses.

- Preserve reviewed Urdu wording, harakat, commas, asterisks, meaningful blanks, verse order and refrain/sixth lines.
- Roman Urdu follows **Husain**, **Hasan**, `ڑ` → `r`, `ے` → `e` (except Punjabi pronunciation). Preserve punctuation, vowels and izafat; capitalize Roman titles but do not gratuitously recase verses.
- Keep separately printed stanza numbers as standalone lines in both editions; the Basta ODG middle column supplies the printed numbering. Separate poem stanzas with blank lines.
- Default six-verse layout is 4+2. Use `sixVerseLayout: "pairs"` only for reviewed 2+2+2 text. Do not apply Basta-specific duplicate-refrain cleanup to standalone lyrics.
- Keep `romanLyrics: |-` YAML indentation intact; do not change the title when splitting body lines.

## Basta

Basta index, source pages, Roman transcriptions and settings are in `src/data/basta/`. Preserve printed page numbers, title/byline prefaces and **matching** `---***---` Urdu/Roman boundaries. Never hand-edit generated streaming output. Audit results are review candidates, not permission to reconstruct OCR by guesswork.

```bash
npm run basta:index:check
npm run basta:kalams:audit
npm run basta:kalams:review  # Scan-linked review queue
npm run basta:index:sync    # Only for reviewed index corrections
npm run basta:breaks:rebuild # Only for reviewed source boundaries
```

Stable `recitationId` values and numbered-stanza anchors are permanent. Review [Recitation Set identity rules](RECITATION_SETS.md#data-and-source-integrity) before renaming, moving or renumbering a poem.

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
- **Full browser:** additional edition/viewport/theme permutations, edge cases, error handling, publishing, offline support, font loading, and regression geometry. These must stay in full even when not smoke.
- **Performance (`@perf`):** non-gating Chromium measurements run separately with `npm run perf:browser` rather than making functional CI depend on noisy timing values.

Do not copy a scenario merely to run it in smoke: mark its existing browser test. Prefer behavior and geometry assertions to screenshot goldens. CI retains screenshots/traces for failures.

**CI:** Every PR/main change runs tests, typechecking and build checks. Changes to readers, shared code or browser tests run full Chromium; content-only PRs need an explicit `[smoke-ci]` or `[full-ci]` commit marker to add browser coverage. Main runs at least smoke; the scheduled Sunday check runs full. Inspect the successful run for the **final** commit, not an earlier commit.

Never commit `dist/`, `.astro/`, `node_modules/`, temporary test output or R2 binaries. Source edits should keep permanent IDs stable and regenerate identity locks only through reviewed `npm run recitation:ids:sync` changes.

## Manual review

Follow [Quality assurance](QUALITY_ASSURANCE.md) for real viewport, zoom, font, accessibility and deployment checks. Full CI does not certify a screen reader or physical device. Confirm PDF export page breaks and Nastaliq rendering with an actual browser; verify published programme editing against deployed D1 bindings.

Questions and corrections: **lyricsadmin@gmail.com**.
