# Manual audits

Run from the repository root. These tools are not part of regular CI; source-editing rules are in [Contributing](../docs/CONTRIBUTING.md#basta).

## Basta OCR review

```bash
python3 audit/basta_error_report.py --output /tmp/basta-errors.csv
```

This read-only scan flags uncertain OCR, encoding issues, and Latin text in Urdu pages. Verify CSV findings against scans; it never edits poetry. For routine maintenance use `npm run basta:index:check` and `npm run basta:kalams:audit`.

Older **unverified** OCR review candidates (not confirmed current errors): `035 038 044 045 046 053 060 064 076 083 084 138 331 358 368 398 417`.

## Pages deployment cleanup

`audit/cleanup-pages.sh` **deletes all deployments except active production**, including past production versions and previews. There is no rollback preservation. It requires Wrangler OAuth, `jq`, and local `node_modules/.bin/wrangler`. It aborts if active production changes mid-run.

```bash
./audit/cleanup-pages.sh 5  # Optional maximum parallel deletion workers
```

Run only when losing all historical deployments is acceptable.
