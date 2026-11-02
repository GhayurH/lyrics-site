# Recitation Sets operations

Infrastructure and maintenance for [Recitation Sets](RECITATION_SETS.md). [Validation](CONTRIBUTING.md#code-and-tests) owns build/CI commands.

## Cloudflare configuration

| Config | Purpose |
| --- | --- |
| Root `wrangler.toml` | `lyrics-site` Pages, `dist`, production/preview D1 bindings |
| `workers/wrangler.cleanup.jsonc` | Independently deployed `kalam-recitation-cleanup` Worker |

| Pages environment | `RECITATION_DB` | `RECITATION_RETENTION_MODE` |
| --- | --- | --- |
| Production | `kalam-recitation-sets` | `production` |
| Preview | `kalam-recitation-sets-preview` | `preview` |

Deploy the independent Worker from the repository root:

```bash
npx wrangler deploy --config workers/wrangler.cleanup.jsonc
```

Its Cron schedule is `0 3 * * *` (03:00 UTC daily), with `PRODUCTION_RECITATION_DB` and `PREVIEW_RECITATION_DB` bindings. The HTTP handler returns 404; no public admin endpoint exists. Cleanup deletes expired sets and rate-limit records in bounded batches, excluding permanent production sets. Metrics have 90-day retention in `recitation_maintenance_metrics`; inspect Workers Observability for failures.

```sql
SELECT day, sets_total, sets_permanent, sets_expired_pending,
       document_bytes_estimate, deleted_sets
FROM recitation_maintenance_metrics
ORDER BY day DESC LIMIT 30;
```

Document bytes are estimates, excluding SQLite/index overhead.

## Schema and verification

`schema/recitation.sql` creates a **new empty** database:

```bash
npx wrangler d1 execute NEW_DATABASE_NAME --remote --file=schema/recitation.sql
```

**Never replay this schema against existing production or preview D1 databases.** Use reviewed incremental migrations instead; source-poetry changes do not need schema migrations.

Local Astro preview lacks Pages Functions and R2 redirects. Validate live publication/edit/delete on a deployment with the correct bindings. CI checks generated `_routes.json` and `_redirects` without downloading R2 assets.
