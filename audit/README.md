# Source and deployment audits

These are maintenance tools, not an implementation diary. Run them from the repository root. Editorial rules are in [Contributing](../docs/CONTRIBUTING.md); human validation procedures are in [Quality assurance](../docs/QUALITY_ASSURANCE.md).

## Basta source review

```bash
npm run basta:kalams:audit
npm run basta:kalams:review  # Markdown queue with direct scan links
python3 audit/basta_error_report.py --output /tmp/basta-errors.csv
```

The catalog audit distinguishes verified individual kalams from uncertain source boundaries and unassigned fragments. The Python scan reports possible OCR/encoding issues in Urdu pages. **Neither tool edits poetry.** Resolve candidates only after checking the original printed scans. CI uploads the scan-linked Basta editorial review queue as an artifact.

## Pages deployment cleanup

`audit/cleanup-pages.sh` deletes **every deployment except the active production deployment**, including older production and preview versions. No rollback versions are retained. It requires Wrangler OAuth, `jq`, and the local Wrangler installation; it aborts if active production changes during cleanup.

```bash
./audit/cleanup-pages.sh 5 # Optional maximum parallel workers
```

Run it only when losing historic preview and rollback deployments is acceptable.
