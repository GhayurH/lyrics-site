# Source and deployment audits

These are maintenance tools, not an implementation diary. Run them from the repository root. Editorial rules are in [Contributing](../docs/CONTRIBUTING.md); human validation procedures are in [Quality assurance](../docs/QUALITY_ASSURANCE.md).

## Markdown source review

Use `npm run source:sync` after changing poetry Markdown and `npm run source:check` for read-only verification. The source reviewer below reports scan-linked editorial candidates; existing OCR uncertainties remain visible, and the regression gate rejects new findings. Pagefind and offline search data are build outputs.

```bash
npm run content:review                           # Lists all Markdown files with findings
npm run content:review -- --summary              # Findings counts only
npm run --silent content:review -- --markdown > review.md  # Scan-linked report
npm run --silent content:review -- --csv > review.csv      # Excel-friendly UTF-8 CSV
npm run --silent content:review -- --json > review.json    # Structured report
```

`audit/manual-md-review-tracker.csv` is the **one active manual editorial register** for unfinished source decisions. It records source comparisons, duplicate adjudication, Roman transliteration, Urdu completeness, stanza alignment and metadata review. Statuses such as `pending`, `partial_review` and `blocked` are unresolved, even when automated checks pass. Its source-specific notes must not be discarded or marked complete by a mechanical normalization. Complete reviews against original source files/scans and update the existing row; do not create parallel import trackers or chronological reports in Git. The original external identifiers and URLs belong with each imported poem's Markdown provenance comments. See [Quality assurance](../docs/QUALITY_ASSURANCE.md#editorial-acceptance-and-merging) for the release gate.

The single source reviewer covers all standalone lyrics and both Basta editions. It checks stanza labels, verse/fragment alignment, Unicode/script contamination, extended Latin transliteration, known editorial uncertainty phrases, frontmatter, missing editions, and indexed Basta source mapping. It replaces the older separate Basta catalog and Python OCR reports. **Findings are advisory and never change source text.** Inspect scans before correcting uncertain readings. Weekly CI uploads the scan-linked `content-review` artifact with a short retention period.

## Pages deployment cleanup

`audit/cleanup-pages.sh` deletes **every deployment except the active production deployment**, including older production and preview versions. No rollback versions are retained. It requires Wrangler OAuth, `jq`, and the local Wrangler installation; it aborts if active production changes during cleanup.

```bash
./audit/cleanup-pages.sh 5 # Optional maximum parallel workers
```

Run it only when losing historic preview and rollback deployments is acceptable.
