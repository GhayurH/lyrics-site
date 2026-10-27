# Recitation Sets — retention, deletion, cleanup, and capacity

This is an operational requirement for PR #15. The source archive and original
Markdown are never removed by Recitation Set retention.

## Retention policy

- **Production**: 24 calendar months from publication or the last organizer
  edit, whichever is later. A valid authorized PUT resets the expiry to 24
  months from that edit, even if its text is unchanged. Ordinary reads do not
  extend retention.
- **Permanent preservation**: an explicit checkbox in the organizer editor.
  Only someone with a valid private edit token can change a published set's
  preservation setting. A permanent production set has no expiry until its
  organizer disables preservation or deletes it.
- **Preview/test**: 30 days after publication or the last edit, regardless of
  the preservation checkbox, to stop test records accumulating.
- **Deletion**: an organizer with the private edit token can irrevocably
  delete a published set. Deleting a local browser draft is different and does
  *not* delete the D1 record.
- After expiry, API reads and edits return HTTP 410 until background cleanup
  deletes the row; afterwards they return 404. Original source poetry remains
  available. Expired records cannot be revived through an old token.

## 1. Apply the new D1 migration

Apply migrations in numerical order: 0001 first, then **0002**. Existing
published sets and private edit tokens survive migration 0002.

In D1 Console, open each database and execute the complete contents of
`migrations/0002_recitation_retention.sql`, **once per database**.

Or from the repository checkout:

```bash
npx wrangler d1 execute kalam-recitation-sets-preview --remote --file=migrations/0002_recitation_retention.sql
npx wrangler d1 execute kalam-recitation-sets --remote --file=migrations/0002_recitation_retention.sql
```

IMPORTANT: Since the migration backfills existing records with the production
24-month expiry, execute this additional query on the **preview database only**
after 0002, to establish the preview 30-day policy for existing rows:

```sql
UPDATE recitation_sets
SET permanent = 0,
    expires_at = strftime('%Y-%m-%dT%H:%M:%fZ', updated_at, '+30 days');
```

Do not execute the preview-only query against production. New preview records
already use 30 days without this adjustment.

Check that `recitation_sets`, `recitation_creation_limits`, and
`recitation_maintenance_metrics` exist, and that `recitation_sets` has
`permanent` and `expires_at` columns.

## 2. Set the preview runtime environment variable

In **Workers & Pages → lyrics-site → Settings → Variables and Secrets**,
configure for the **Preview** environment:

```text
RECITATION_RETENTION_MODE = preview
```

For **Production**, leave this unset (the default is production), or set
`RECITATION_RETENTION_MODE = production` for explicitness.

Because production also has a `*.pages.dev` hostname, the server deliberately
does not infer the environment from a URL. Bindings and variables are specific
to the selected Pages environment. Redeploy after changing them.

Optional, recommended for both environments: add an encrypted runtime secret
named `RECITATION_RATE_LIMIT_SECRET` with a random high-entropy value, not
committed to Git. Keep its value stable for consistent hourly buckets.

## 3. Deploy the standalone scheduled cleanup Worker

The Worker source is `workers/recitation-cleanup.js`, with its dedicated,
version-controlled configuration in `workers/wrangler.cleanup.jsonc`. It is
**not** part of the Pages site and cannot be scheduled via Pages Functions.

Create a separate Cloudflare Worker named `kalam-recitation-cleanup`,
deploy the source from this file as an ES module, and in its
**Settings → Bindings** add these two D1 bindings:

| Worker binding | D1 database |
| --- | --- |
| `PRODUCTION_RECITATION_DB` | `kalam-recitation-sets` |
| `PREVIEW_RECITATION_DB` | `kalam-recitation-sets-preview` |

Under the Worker's **Settings → Triggers → Cron Triggers**, add:

```text
0 3 * * *
```

Cloudflare Cron expressions use UTC; this runs daily at 03:00 UTC. Confirm
that the Worker is deployed with both D1 bindings before enabling the trigger.

It removes at most 2,000 expired sets and 5,000 spent rate-limit buckets from
each database per execution, in bounded batches. It never deletes a permanent
production set. The operation is repeatable and logs failures rather than
silently skipping them. If `sets_expired_pending` grows persistently, increase
the batch allowance or trigger frequency after reviewing D1 usage.

**Do not** create a Worker route or publish an administrative HTTP endpoint.
The Worker's `fetch()` handler always returns HTTP 404.

For subsequent Worker updates, deploy from the repository root with:

```bash
npx wrangler deploy --config workers/wrangler.cleanup.jsonc
```

The D1 database UUIDs in this file identify resources and are not access
credentials. Never commit Wrangler auth tokens or private edit links.

The Pages site's **separate** configuration was exported from the live
Cloudflare dashboard and committed as root `wrangler.toml`. Its top-level D1
binding and `RECITATION_RETENTION_MODE=preview` are for preview; the
`[env.production]` overrides point to the production D1 database and use
`RECITATION_RETENTION_MODE=production`. Both database IDs were checked
against `wrangler d1 list`; the Pages build output remains `dist`.

Treat this file as the Pages source of truth during subsequent deployments.
Changes to the Pages dashboard bindings should also update `wrangler.toml`.
Do not replace it with the separate Worker configuration.

Cloudflare Cron documentation:
https://developers.cloudflare.com/workers/configuration/cron-triggers/

## 4. Rate limiting

Creating shared sets is capped at **10 published sets per hour per
Cloudflare-provided visitor IP**. Further POST requests return HTTP 429 with
a `Retry-After` header. Read operations and private-token edits are unaffected.

The rate-limit table stores only per-hour SHA-256 digest buckets; the IP is
not stored in clear text. The optional `RECITATION_RATE_LIMIT_SECRET` protects
the digest against offline guessing. Buckets expire hourly and are purged by
the scheduled Worker. This protects against straightforward accidental abuse
but does not stop distributed botnets. Add a Cloudflare WAF rate-limit rule
covering **POST /api/recitation-sets** for layered protection if available.

## 5. Monitor storage, volumes and cleanup

The scheduled Worker logs `recitation_retention` JSON including the number
deleted, remaining rows, permanently preserved rows, outstanding expiries
and estimated bytes of programme JSON. Inspect Workers Logs and Cron Events.

The daily snapshot is also stored in `recitation_maintenance_metrics` and
automatically trimmed to the latest 90 days. To view it in either D1 Console:

```sql
SELECT day, sets_total, sets_permanent, sets_expired_pending,
       document_bytes_estimate, deleted_sets
FROM recitation_maintenance_metrics
ORDER BY day DESC LIMIT 30;
```

For an immediate count between scheduled runs:

```sql
SELECT count(*) AS total,
       sum(CASE WHEN permanent=1 THEN 1 ELSE 0 END) AS permanent,
       sum(CASE WHEN permanent=0 AND expires_at <= strftime('%Y-%m-%dT%H:%M:%fZ','now')
                THEN 1 ELSE 0 END) AS expired_pending
FROM recitation_sets;
```

The `document_bytes_estimate` measure excludes SQLite indexes, metadata, and
journal overhead. Consult Cloudflare's D1 dashboard for real allocated size.

## 6. Verification before merging

1. Rebuild and deploy a new PR #15 preview after 0002 and the preview variable.
2. Publish a preview programme with the permanent checkbox selected: API
   must return `permanent: false` and an expiry ~30 days away.
3. Open/edit with the organizer token: the expiry should renew.
4. Delete it using **Delete published set permanently**: the original public
   URL should then return 404 and the D1 row should be gone.
5. On production after merge, publish one ordinary set (24-month expiry) and
   one expressly preserved permanent set (no expiry), then delete test rows.
6. Confirm the scheduled Worker's Cron Events show a successful run and its
   monitoring table receives a daily record.
7. Confirm unrelated Pages URLs do not invoke Functions; `_routes.json`
   still restricts Functions to the Recitation Sets endpoints.

Do not hand-write a Wrangler config at the root of the Pages repository; doing
so could override its existing dashboard deployment settings.
