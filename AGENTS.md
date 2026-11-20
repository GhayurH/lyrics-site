# Repository contract

Read [Editorial standards](docs/EDITORIAL.md) before touching a kalam, except for the bounded single-file Codex worker, whose injected task rules fully cover its transliteration work; consult the full manual there only when a genuine ambiguity needs it. Read [Architecture](docs/ARCHITECTURE.md) before changing behavior, [Contributing](docs/CONTRIBUTING.md) for the workflow, [Quality assurance](docs/QUALITY_ASSURANCE.md) for acceptance and [Operations](docs/OPERATIONS.md) for Cloudflare infrastructure.

## Editorial invariants

- **Source is authoritative.** Preserve verified Urdu/other original-language text, Roman alignment, printed Basta identities, literal `---***---` boundaries and permanent recitation/stanza IDs. Never resolve a source ambiguity using OCR or matching line counts alone.
- **Deduplicate by the actual poem, not a title or source post.** Preserve the most complete verified reading; incorporate genuinely unique stanzas and metadata. Do not invent text or collapse meaningful variants.
- **Canonical publication text is clean.** Keep editorially useful metadata and source references that affect display/identity; do not leave import-system provenance comments, raw scrape hashes or temporary review notes in published lyric files.
- **Numbering and languages are meaningful.** Urdu uses Eastern Arabic-Indic digits (`۱`, `۲`), Roman stanzas use `1`, `2`. `romanLyrics` is a transcription, not an original language. Names and transliterations follow [Editorial standards](docs/EDITORIAL.md).
- **Human review is separate from successful checks.** Review states and unresolved decisions are not silently converted to “reviewed.” During Round 2 work, keep the branch WIP tracker separate from the final historical round register; finalize it only at release.

## Engineering invariants

- **One owner per behavior.** Source parsing and identity in `src/lib/`; markup in Astro; browser state in `src/client/`; style ownership in domain CSS. Do not fork the same parsing/reading logic into separate routes.
- **Same editions, same rules.** Standalone, Basta page, individual-kalam, continuous and recitation readers share source stanza interpretation and reader controls. Keep useful static HTML without JavaScript; verses should remain individually fitted, not induce page-wide horizontal scrolling.
- **Security by default.** Organizer edit capabilities are private. Never index, log, publicly cache or export them as public QR links. Scans live in R2; local drafts stay local until published.
- **Docs describe the published contract.** Avoid chronological implementation narratives, obsolete migration instructions and duplicated standards. Explain tradeoffs and failure behavior in comments instead of narrating code.

## Validation policy

For source edits: `npm run source:sync`, inspect all changes, `git diff --check`, then publication validation. For code changes: `npm run check`, `npm run build`, and the relevant browser suite. The build already runs Node and source-integrity tests. Do not run the full pipeline on every unfinished Round 2 editorial batch; reserve it for final review. A temporary `[skip ci]` marker suppresses GitHub Actions on WIP commits, not release verification.