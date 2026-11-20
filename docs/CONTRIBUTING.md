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


## Codex-assisted source and Roman review

This Round 2 tool covers only the standalone lyric files **added** since the merge base with main, and reviews them one file per Codex call. The queue is derived from the current branch (not from the historical tracker). `scripts/kalam-transliteration-rules.md` is a **self-contained, task-scoped Codex prompt bundle** derived from the canonical [Editorial standards](EDITORIAL.md), with complete orthographic rules, examples and evidence limitations; `scripts/kalam-codex-instructions.md` explains the bounded worker contract. Update that bundle whenever the editorial manual changes. Use it **after deduplication is finished**, so the target corpus has stabilized. The archived kalam-archive-imports supervisor is not to be restarted.

Inventory and prompt previews are read-only:

    npm run kalam:plan
    npm run kalam:plan -- --task source --json
    npm run kalam:plan -- --task roman
    npm run kalam:plan -- --task audit
    npm run kalam:prompt -- --path src/data/lyrics/FILE.md
    npm run kalam:validate -- --path src/data/lyrics/FILE.md --task roman
    npm run kalam:status -- --json

The local queue processes **filenames alphabetically across all three tasks** (missing Roman, Roman audit, and Roman-derived source-script reconstruction), so Codex can begin with early letters while later-letter dedup continues. Completed paths remain recorded in the private resume ledger. No English originals or genuinely Latin-original uncertain-language entries are assigned to Codex. Roman-only Urdu/Shahmukhi/related-language kalams are reconstructed directly from the Roman edition without requiring a second source; preserve Roman in romanLyrics. Each prompt includes only shared rules and the relevant task rules; the worker does not ask Codex to reread the entire editorial manual, inventory the repository or run broad tests on every poem. Rules are copied into the prompt with identical shared prefixes to permit prompt caching, though actual caching depends on the Codex provider/model.

Local `kalam:validate` and the worker's automatic post-edit check warn about forbidden Roman characters, stanza numeral scripts, reciter markers, missing editions, malformed metadata and verse-count discrepancies. Warnings are not proof of linguistic mistakes; *no automatic autocorrection or repeat Codex call* is made for these. Files with unresolved warnings or missing source evidence remain `needs_human`, never editorially approved.

For a continuous local run, install a systemd **user** unit. Installation does not start it. Start only once the dedup branch is settled:

    npm run kalam:service:install
    systemd-analyze --user verify ~/.config/systemd/user/kalam-codex-round2.service
    systemctl --user enable --now kalam-codex-round2.service

Alternatively, install and start together after dedup:

    npm run kalam:service:install -- --start

Follow progress and watch Codex logs locally:

    npm run kalam:status
    systemctl --user status kalam-codex-round2.service
    journalctl --user -u kalam-codex-round2.service -f
    systemctl --user stop kalam-codex-round2.service
    systemctl --user disable kalam-codex-round2.service

To run a single selected file manually, use npm run kalam:run -- --path src/data/lyrics/FILE.md --confirm-run. To revisit a previously attempted file, first run npm run kalam:requeue -- --path src/data/lyrics/FILE.md (stop the service first). Uninstall the local unit with npm run kalam:service:uninstall. When the unit has moved to another checkout location, reinstall it.

The service runs **one file per Codex invocation in a separate, private local Git workspace** under ~/.local/state/kalam-codex-round2/workspaces, with only that file and narrow AGENTS instructions present. Before any copyback, the worker checks that no other file was created, the original checkout did not change during the call, the original source body was preserved for Roman tasks, and the edited Markdown passes error-level local checks. It then atomically copies back **only** the selected file; failed or incomplete edits remain in before/after snapshots for review, not in the checkout. Thousands of previous uncommitted edits are preserved: no clean tree is required, and the worker never commits, stages, pushes or deploys.

A private resume ledger, durable before/after per-file Markdown snapshots, action-required log, isolated workspaces and Codex transcripts live in ~/.local/state/kalam-codex-round2 (or KALAM_CODEX_STATE_DIR) rather than any source tracker. Every Codex invocation with a usage event is counted, including quota-retried and unsuccessful invocations; only the final `turn.completed.usage` snapshot is counted per invocation (Codex totals are cumulative). `npm run kalam:status` reports total input, cached input, uncached input, output and per-task usage; `npm run kalam:status -- --json` also reports the five highest-usage files. These are token counts, not monetary cost or quota predictions. Statuses mean edited_locally, needs_human/no_change, skipped or blocked; none means human-approved. The service pauses automatically on Codex quota responses, honoring a reported local reset time plus grace or falling back to 30 minutes, and resumes from the same file. Transient transport failures use increasing backoff; unexpected file edits or unrecoverable failures **stop** the worker. Each Codex process has a configurable watchdog timeout (`KALAM_CODEX_FILE_TIMEOUT_SECONDS`, default 2700, range 60–14400), and timeout kills the entire subprocess group before backing off and resuming the isolated file. `Restart=on-failure` restarts an unexpected worker crash; exit 78 is reserved for permanent errors requiring intervention and prevents restart loops. Desktop alerts via `notify-send` are best-effort; durable failures are appended to `logs/ACTION-REQUIRED.log`. Stopping/restarting the unit preserves quota deadlines, progress and in-flight isolated edits. It exits normally when the finite list of added kalams is exhausted, retaining any items requiring human evidence.

`npm run kalam:status` and `-- --json` also show progress percentages, by-language and by-task completion, snapshots and an estimated remaining duration only after enough per-task samples exist; this is a rough computation, not a deadline. The worker checks that the active branch remains Round 2, but **does not freeze HEAD or stop on new commits**. It refreshes the eligible added-file list on each new commit while reading the latest local text just before each file. Concurrent changes to unrelated poems are ignored; if dedup edits, renames, or deletes the exact poem Codex is processing, the Codex proposal is saved as before/after snapshots, the live file is never overwritten, and that path is recorded as `concurrent_edit` for later requeue. It never stages, commits or pushes. To keep user services alive without an active login, configure systemd lingering separately via loginctl enable-linger for the user, if desired. The Codex CLI must be installed/authenticated on the machine running the service and its executable/Node PATH available in the installed unit.


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