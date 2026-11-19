# Contributing

This guide is the **workflow**, not a second editorial style manual. Read [Editorial standards](EDITORIAL.md) for source decisions, [Architecture](ARCHITECTURE.md) for module boundaries, [Quality assurance](QUALITY_ASSURANCE.md) for release criteria, and [Operations](OPERATIONS.md) before changing Cloudflare resources.

## Repository setup

Node.js 24 is recommended (minimum 22.23.4). Use the locked dependencies.

```bash
npm ci
npm run dev
```

The main sources are `src/data/lyrics/*.md` (standalone works), `src/data/basta/pages/*.md` (printed pages), `src/data/basta/index.json`, the reviewed fragment role map and permanent identity lock. `src/content.config.ts` owns the content schema.

## Editing and consolidating poetry

1. Compare the candidate against existing standalone poems and the Basta index before creating/renaming a file. Check original source wording, duplicate variants, language, stanza boundaries, poet and meaningful metadata according to [Editorial standards](EDITORIAL.md).
2. Keep each original-language body in the Markdown body; use an indented `romanLyrics: |-` frontmatter literal for any Roman edition. Preserve printed Basta page/fragment boundaries and existing `recitationId` and stanza anchors. Do not create standalone “scan cover” metadata: scans belong to Basta.
3. Preserve actual poetic content and editorial metadata; discard redundant import-post provenance and source-specific scrape artifacts from the **publication result**. During ongoing Round 2 adjudication, track undecided work in `audit/round2-dedup-wip.csv`, not `audit/lyric-md-rounds.csv`. The WIP sheet is not proof that a source is reviewed.
4. Keep independent reciter/type values independent, retain valid aliases and public identities, and inspect every changed source against the originals.

Do **not** use bulk scripted stanza alignment or OCR-generated transcription as a substitute for line-by-line editorial review. Correctness is not established by identical line counts.


## Codex-assisted original-language and Roman review

After Round 2 deduplication is finished, the new bounded CLI can inspect ONLY standalone lyrics added on this branch relative to the merge base with main. It is currently prepared but not running. The imported worker under kalam-archive-imports/backups/kalam-review-2026-11-16 is archival and must not be restarted.

The default command and all plan/prompt commands are read-only; they never create a tracker or call Codex:

    npm run kalam:plan
    npm run kalam:plan -- --task source --json
    npm run kalam:plan -- --task roman
    npm run kalam:plan -- --task audit
    npm run kalam:prompt -- --path src/data/lyrics/FILE.md

Only when manual processing is authorized after dedup, opt in to ONE poem:

    npm run kalam:run -- --path src/data/lyrics/FILE.md --confirm-run

The run command checks the active Round 2 branch, a clean worktree, newly added-file scope, and local Codex installation/authentication. It uses non-interactive Codex exec with workspace-write and ephemeral sessions, without deprecated full-auto flags. It never creates a tracking CSV, schedules batches, commits or pushes. Unexpected file changes and whitespace errors are reported, not silently discarded.

The three tasks are source-language reconstruction from Roman-only material, Roman creation for originals without a transcription, and an audit of existing transliterations. Uncertain or genuine Latin-script originals are excluded from speculative reconstruction. Follow the canonical Editorial standards and the narrow prompt at scripts/kalam-codex-instructions.md. A human must verify every result; a matching verse count alone is insufficient. The scanner is covered by the Node test suite and can also be tested directly with python3 -m unittest discover -s tests -p test_kalam_codex.py.

## Mechanical cleanup and synchronization

For files changed against `main` (including local edits), `npm run whitespace:fix` removes CRLF, trailing ASCII spaces and **all** terminal newlines, including the final newline. It preserves internal blank lines, YAML literal indentation and Unicode poetry. Use `npm run whitespace:check` for the corresponding read-only report. Use `--all` with `scripts/tidy-whitespace.mjs` only when deliberately touching all tracked text sources.

```bash
npm run whitespace:fix
npm run source:sync
git diff --check
git diff                  # Inspect text, metadata, derived labels, fragment roles and IDs
```

`source:sync` runs the Bibi-only ZWNJ policy, Roman normalizer, Basta index title sync, reviewed-fragment validation, safe recitation identity reconciliation and the final source regression scan. It can modify more than your edited poem; **review every diff** and revert unintended changes. `npm run source:check` performs corresponding read-only validations and is run automatically before a production build.

`npm run roman:review` shows proposed Roman normalization **without writing**; `npm run content:review -- --summary` gives an advisory content summary. The source-wide reviewer does not silently approve ambiguous OCR, unclear cross-page Basta mappings or imported source data. Neither `source:sync` nor a green build proves human review.

### Explicit Basta approvals

Only after checking the printed scans, approve changed fragment openings by exact page:

```bash
npm run source:sync -- --approve-fragments=138,421
```

For several genuinely revised/removed **numbered** Basta stanzas, provide explicit stable IDs to the reviewed synchronization:

```bash
npm run source:sync -- \
  --reviewed-multiple-edits=basta-marsiye-120/stanza-002,basta-marsiye-120/stanza-003 \
  --reviewed-retirements=basta-marsiye-120/stanza-005
```

These are examples, **not approvals to copy**. Confirm every ID against `identity-lock.json` and the printed source. An existing identity is never recycled; multi-stanza changes must preserve all unaffected identities. Check any Recitation Sets that refer to changed/retired items. `source:check` accepts no write/approval flags.

## Engineering workflow

- Parsing, stanza semantics, search normalization and source identity live in `src/lib/`. Astro owns initial/static markup, `src/client/` owns interactive state/controllers, and domain stylesheets own layout. Do not copy a parser or layout rule into another reader.
- Keep poems useful without JavaScript. Avoid page-wide overflow and preserve keyboard, focus, touch and high-zoom behavior. Handle unavailable scans, failed D1 calls and offline failure without suppressing accessible text.
- Test observable behavior and permanent identity invariants; keep test fixtures small. Do not commit temporary screenshots or create overlapping smoke/full suites.
- Document **implemented** contracts and operational procedures, not every intermediate PR or one-time migration. Keep citations to the one canonical rule document rather than duplicating policy.

## Validation and commits

```bash
npm run check           # Astro + TypeScript diagnostics
npm run build           # Unit tests and source checks, Astro, sitemap, Pagefind, offline data
npm run test:smoke      # Essential Chromium journeys
npm run test:browser    # All non-performance Chromium journeys, including smoke
npm run perf:assets     # Optional compiled asset report
npm run perf:browser    # Optional performance browser journeys
git diff --check
```

Install Chromium when needed with `npx playwright install chromium`. A build already calls `npm test` and `source:check` via `prebuild`; don't repeat the same validation in CI unless debugging.

For **ongoing manual Round 2 batches**, use `[skip ci]` on work-in-progress commits rather than repeatedly running full CI. This is strictly a workflow optimization, **not release acceptance**. At the final publication head run the full [release gate](QUALITY_ASSURANCE.md#editorial-release-checklist) and ensure an unskipped CI run. Ordinary PR CI runs one build and smoke; scheduled/manual/`[full-ci]` selects full functional Chromium; `[check-ci]` requests Astro diagnostics even when the changed-file filter would not.

A PR should specify ownership changes, editorial/source files affected, IDs and links impacted, checks run, unresolved decisions and externally visible behavior. Never merge an unreviewed source corpus because source checks happen to pass.