# Maintenance and editorial audits

These are **manual utilities**, not part of the website build or normal CI. Run them from the repository root. Editorial conventions are in [Contributing](../docs/CONTRIBUTING.md#basta); use the `basta:index:check` and `basta:kalams:audit` npm scripts for routine Basta maintenance.

## Basta transcription checks

```bash
python3 audit/basta_error_report.py --output /tmp/basta-errors.csv
```

This non-destructive scan checks Urdu and Roman page Markdown for uncertainty markers, encoding problems, and suspicious Latin text in Urdu bodies. Review its CSV findings against printed scans before changing any poetry; it does not automatically correct sources.

### Historical OCR review candidates

The list below is preserved from the earlier OCR marker audit. **Review status is not recorded**; being listed does not prove a current error. More asterisks meant higher priority in the original note.

```text
035 038 044 045 046 053 060 064 076 083 084 138
331* 358 368*** 398** 417*
```

## Cloudflare Pages deployment cleanup

`audit/cleanup-pages.sh` is a **destructive manual utility**, not a validation command. It uses Wrangler OAuth credentials, requires `jq` and local `node_modules/.bin/wrangler`, and deletes **every deployment except the currently active production deployment**, oldest first. This includes previous production deployments and previews. The script aborts if the active production deployment changes, but **does not preserve older deployments for rollback**.

Only run when old preview deployments **and previous production deployments** can safely be discarded:

```bash
./audit/cleanup-pages.sh 5
```

The optional number is the maximum parallel deletion workers.
