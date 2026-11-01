# Recitation Sets operations

This guide covers Cloudflare deployment, D1 database setup, scheduled cleanup, and verification for Recitation Sets. Programme behavior, source IDs, authorization, and retention policy belong in [Recitation Sets](RECITATION_SETS.md). General build and CI commands belong in [Contributing](CONTRIBUTING.md#validation).

## Cloudflare resources and configuration

The repository contains two independent deployment configurations:

| File | Deployment |
| --- | --- |
| Root `wrangler.toml` | `lyrics-site` Cloudflare Pages; Astro output `dist`, production/preview bindings |
| `workers/wrangler.cleanup.jsonc` | `kalam-recitation-cleanup` scheduled Worker and its two D1 bindings |

Pages environment variables and bindings are:

| Environment | `RECITATION_DB` database | `RECITATION_RETENTION_MODE` |
| --- | --- | --- |
| Production | `kalam-recitation-sets` | `production` |
| Preview | `kalam-recitation-sets-preview` | `preview` |

Pages is built and deployed using the root configuration. The cleanup
Worker is deployed independently from the repository root:

```bash
npx wrangler deploy --config workers/wrangler.cleanup.jsonc
```

Its Cron Trigger is `0 3 * * *` (03:00 UTC every day). Its bindings
`PRODUCTION_RECITATION_DB` and `PREVIEW_RECITATION_DB` point to the
respective D1 databases. Its HTTP handler returns 404; no public
administration route exists.

The Worker deletes expired sets and rate-limit buckets in bounded daily
batches and records counts and estimated document bytes in
`recitation_maintenance_metrics` (90-day history). Permanent production
sets are excluded from scheduled expiry. Inspect scheduled runs and
errors in Workers Observability. Inspect daily D1 statistics with:

```sql
SELECT day, sets_total, sets_permanent, sets_expired_pending,
       document_bytes_estimate, deleted_sets
FROM recitation_maintenance_metrics
ORDER BY day DESC LIMIT 30;
```

Estimated document bytes exclude D1's indexes and SQLite overhead;
Cloudflare D1 reports actual allocated database size.

### Creating a new database

The **current complete schema**, for a new empty database, is
`schema/recitation.sql`:

```bash
npx wrangler d1 execute NEW_DATABASE_NAME --remote --file=schema/recitation.sql
```

The existing production and preview D1 databases already have this schema.
**Do not reinitialize either existing database.** For subsequent schema
changes, write and review an incremental migration against existing data
instead of replaying the new-database schema. Archive source additions and
corrections do not require D1 schema changes.

## Development and checks

Run the project's [standard build and Chromium checks](CONTRIBUTING.md#validation). The Node suite covers programme validation, edit-token permissions, expiry, throttling, and cleanup; browser tests cover local drafts and mocked remote publication.

Local Astro preview does not emulate Pages Functions or R2 redirects. Verify actual publishing, editing, and deletion on a deployment with the intended D1 binding. GitHub Actions checks built `_routes.json` and `_redirects` without contacting R2.

Uncertain printed Basta fragments remain excluded from verified source selection until reviewed; use `npm run basta:kalams:audit` to inspect them.
