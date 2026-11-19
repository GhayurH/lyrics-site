# Editorial audit and maintenance tools

The audit directory holds **reports and review records**, not the canonical poetry. Source rules are in [Editorial standards](../docs/EDITORIAL.md); review and release acceptance are in [Quality assurance](../docs/QUALITY_ASSURANCE.md).

## Read-only content review

```bash
npm run content:review
npm run content:review -- --summary
npm run --silent content:review -- --markdown > review.md
npm run --silent content:review -- --csv > review.csv
npm run --silent content:review -- --json > review.json
node scripts/audit-round2-language-codes.mjs
```

These scan standalone and Basta source, checking metadata, Unicode/script issues, stanza alignment, Roman editions, unexpected Basta fragments and reviewed source mapping. Reports are **advisory** and do not change poems. The build runs a separate **read-only regression gate**; an accepted historical baseline is not automatic editorial approval. Inspect printed scans and actual source material before changing disputed readings or identities.

## Which record owns what?

| Record | Scope | Publication rule |
| --- | --- | --- |
| `audit/lyric-md-rounds.csv` | Permanent, finalized source round/disposition history (`original`, `round_1`, `round_2` as applicable) | **Keep identical to `main` during Round 2 WIP**; incorporate final reviewed Round 2 decisions only during release preparation. Do not turn this into a live work log. |
| `audit/round2-dedup-wip.csv` | Temporary adjudication and progress during Round 2, including duplicate decisions and review status | Working document **only**. Reconcile final outcomes into the permanent register at release; remove the temporary review artifact once it is no longer needed. |
| `audit/manual-md-review-tracker.csv` | Open manual source/editing questions for the active review cohort | Keep unresolved decisions honestly marked; do not pretend that a green test, automated repair or spot check closes them. Keep this separate from finalized history. |

Do **not** duplicate an import's scraper provenance in the canonical Markdown. During WIP, keep evidence in the review workflow where needed; before publication remove source-post IDs/URLs, raw file hashes and snapshot comments from poem files while retaining **editorial** data, display metadata and fixed source identities.

Pending, partial or blocked work must be reviewed against the relevant source or explicitly flagged as unresolved. Do not mark a file `reviewed` merely because a batch normalizer ran.

## Source synchronization

```bash
npm run whitespace:fix     # Changed text files: strip trailing ASCII whitespace and all EOF newlines
npm run source:sync        # Controlled source normalizers/derived metadata; writes changes
npm run source:check       # Read-only; also part of build
```

Review the diff from `source:sync` before committing. Roman spelling changes can be previewed with `npm run roman:review`. Source identity approvals are never automatic; see [Contributing](../docs/CONTRIBUTING.md#explicit-basta-approvals).

## Pages deployment cleanup

`audit/cleanup-pages.sh` deletes **all deployments except the currently active production deployment**, including older production/preview versions. This removes historical rollback deployments and is intentionally destructive; it requires Wrangler OAuth, `jq`, and local Wrangler. It aborts if active production changes mid-run.

```bash
./audit/cleanup-pages.sh 5    # Optional parallel worker count
```

Run only when loss of preview and rollback deployments is acceptable. Cloudflare/R2 and recitation operations are documented in [Operations](../docs/OPERATIONS.md).