# Recitation Set operations

For product behavior, identity and private link security see [Recitation Sets](RECITATION_SETS.md). This document covers **infrastructure**, not editorial sources or the main-site build.

## Ownership and environments

| File / binding | Role |
| --- | --- |
| `wrangler.toml` | Pages configuration and separate production/preview D1 bindings |
| `schema/recitation.sql` | **Fresh database bootstrap only**, not a repeatable migration |
| `functions/api/recitation-sets/` | Capability-protected published programme API |
| `functions/_lib/recitation*.js` | Validation, rate limits and retention contracts |
| `workers/wrangler.cleanup.jsonc` | Independently deployed scheduled cleanup Worker |

Production binds `RECITATION_DB` to `kalam-recitation-sets` with `RECITATION_RETENTION_MODE=production`. Preview uses `kalam-recitation-sets-preview` and `preview`. Do not reuse preview data as production fixtures. `RECITATION_RATE_LIMIT_SECRET` may protect IP limiter derivation; treat it as a secret.

## Bootstrap and migrations

Only for a **new, empty** D1 database:

```bash
npx wrangler d1 execute NEW_DATABASE_NAME --remote --file=schema/recitation.sql
```

**Never replay** this schema against existing production/preview databases. Prepare reviewed incremental migrations for future schema changes, with rollback/recovery plans. Source Markdown changes do not require database migrations.

## Scheduled retention cleanup

Deploy the independent Worker from the project root:

```bash
npx wrangler deploy --config workers/wrangler.cleanup.jsonc
```

It runs daily at **03:00 UTC** (`0 3 * * *`), with `PRODUCTION_RECITATION_DB` and `PREVIEW_RECITATION_DB` bindings. Expired ordinary sets and stale rate-limit rows are deleted in bounded batches; permanent production sets are preserved. There is no public administrative endpoint. Metrics are retained for 90 days in `recitation_maintenance_metrics`.

Example read-only operational query:

```sql
SELECT day, sets_total, sets_permanent, sets_expired_pending,
       document_bytes_estimate, deleted_sets
FROM recitation_maintenance_metrics
ORDER BY day DESC LIMIT 30;
```

Document byte counts are estimates and exclude SQLite/index overhead.

## Deployment verification

1. Verify the intended Pages environment bindings and Worker configuration before deploy.
2. Confirm `dist/_routes.json` includes the API and public redirect, and `dist/_redirects` handles preview scan routing.
3. On a disposable preview set, verify create, read, capability edit, concurrent-edit rejection, deletion and preview expiry policy.
4. Check scheduled Worker logs and recent metrics for failed deletions or unusual growth.
5. Confirm public caches and search contain no edit tokens or published private responses.

Local `astro preview` does not emulate Pages Functions, D1 or Cloudflare redirects; inspect the target deployment for those features. Build/test commands are owned by [Quality assurance](QUALITY_ASSURANCE.md).
