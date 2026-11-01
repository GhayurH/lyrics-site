# Source and deployment audits

These are maintenance tools, not an implementation diary. Run them from the repository root. Editorial rules are in [Contributing](../docs/CONTRIBUTING.md); human validation procedures are in [Quality assurance](../docs/QUALITY_ASSURANCE.md).

## Markdown source review

```bash
npm run content:review                           # Lists all Markdown files with findings
npm run content:review -- --summary              # Findings counts only
npm run --silent content:review -- --markdown > review.md  # Scan-linked report
npm run --silent content:review -- --csv > review.csv      # Excel-friendly UTF-8 CSV
npm run --silent content:review -- --json > review.json    # Structured report
```

The single source reviewer covers all standalone lyrics and both Basta editions. It checks stanza labels, verse/fragment alignment, Unicode/script contamination, extended Latin transliteration, known editorial uncertainty phrases, frontmatter, missing editions, and indexed Basta source mapping. It replaces the older separate Basta catalog and Python OCR reports. **Findings are advisory and never change source text.** Inspect scans before correcting uncertain readings. Weekly CI uploads the scan-linked `content-review` artifact.

## Pages deployment cleanup

`audit/cleanup-pages.sh` deletes **every deployment except the active production deployment**, including older production and preview versions. No rollback versions are retained. It requires Wrangler OAuth, `jq`, and the local Wrangler installation; it aborts if active production changes during cleanup.

```bash
./audit/cleanup-pages.sh 5 # Optional maximum parallel workers
```

Run it only when losing historic preview and rollback deployments is acceptable.
