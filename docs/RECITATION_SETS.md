# Recitation Sets

Recitation Sets lets visitors assemble programmes of standalone kalams and
verified Basta poems at `/recite/`. The reader at `/recite/read/` supports
continuous or one-at-a-time presentation, Urdu, Roman Urdu, original scans,
and Focus mode. Each programme may include repeated kalams, an occasion,
reciter names, and notes. For structurally verified numbered Marsiyas,
organizers can reorder, omit, repeat, or borrow numbered stanzas from other
verified Marsiyas. Borrowed text retains its original source attribution.

## Data and source integrity

The archive's Markdown and scanned pages remain the authoritative sources.
Programmes contain IDs, stanza references, and organizer metadata, **not**
copies of their source poetry or scan files.

- `/data/basta-kalams.json` lists indexed kalams, source pages, availability,
  and verified stanza counts. `/data/basta-kalams/{id}.json` supplies each
  verified poem and its source pages.
- `/data/recitation-lyric-catalog.json` and
  `/data/recitation-lyrics/{id}.json` expose published standalone kalams.
- Original Markdown and published archive URLs are not rewritten to generate
  a programme. The `Mazameen` section is not part of the poetry catalog.
- Ambiguous Basta page boundaries are marked for review and cannot be
  selected as independent verified poems. The Basta audit reports these
  boundaries without guessing their text.

The tracked `src/data/recitation/identity-lock.json` reserves permanent IDs
for standalone lyrics, indexed Basta kalams, and verified numbered stanzas.
Stanza identity uses a normalized fingerprint of its opening two source
verses, independent of the number printed in the book. Source corrections
are reflected when the website is redeployed, provided the identity remains
valid.

Use these maintenance commands before publishing archive changes:

```bash
npm run recitation:ids:check
npm run recitation:ids:sync    # Only when adding new published IDs/stanzas
npm run basta:kalams:audit    # Inspect uncertain Basta boundaries
```

Review changes to the lockfile and commit them with the corresponding archive
source updates. For a renamed standalone Markdown file, keep its published
`recitationId` in frontmatter; for a renumbered/reclassified Basta index
entry, retain `recitationId` on that entry. When the opening verses of a
known stanza are substantially corrected, **review** the source and update
its pinned anchor without changing the published stanza ID. Explicitly
retire removed IDs by adding `retired: true` to their registry entries,
never reassigning them to new text. The build checks this registry.

If a set contains a missing source or stanza, its position, reference, and
saved label are retained. The reader warns the visitor rather than silently
substituting different poetry. The organizer is warned before publishing a
set with unresolved references.

## Drafts, sharing, and authorization

Drafts live in the organizer's browser storage (up to 30 drafts on that
device) and can be duplicated or removed without contacting the server.
Publishing stores a programme in D1 and issues:

- A public, read-only `/r/{id}` URL. Anyone holding it may read the
  programme while it remains published and unexpired.
- A private organizer `/recite/?set={id}#edit={token}` URL. Possession of
  this token permits updating or deleting the published programme. There
  are no user accounts, individual editor roles, or token recovery.

The D1 record stores the SHA-256 token digest, not its plaintext token.
The organizer's browser retains its copy of the token locally. Do not
share edit links publicly. Deleting a local draft does **not** delete
the published record; the separate **Delete published set permanently**
action requires the private token.

Cloudflare Pages Functions implement `POST /api/recitation-sets`,
`GET/PUT/DELETE /api/recitation-sets/{id}`, and `GET /r/{id}`.
`public/_routes.json` limits Pages Functions invocations to these
endpoints, keeping other website routes and R2-backed assets static.
Requests without a D1 binding return 503; local drafts still work.

## Retention and abuse prevention

| Environment | Automatic expiry | Permanent preservation |
| --- | --- | --- |
| Production | 24 calendar months from publication or last authorized edit | Optional checkbox; no automatic expiry while selected |
| Preview | 30 days from publication or last edit | Not supported; preview sets always expire |

Authorized updates renew expiry. Reading a programme does not renew it.
Expired records return HTTP 410 until removed by cleanup, then 404.
Private-token deletion revokes a published set immediately. Original
poetry and scans are unaffected.

New shared sets are limited to **10 creations per hour per visitor IP**.
The hourly throttle stores only hashed keys in D1 and returns HTTP 429
with `Retry-After` when exceeded; reads and authorized edits are not
subject to this creation limit. An optional encrypted Pages secret named
`RECITATION_RATE_LIMIT_SECRET` protects hashes against offline guessing.
A Cloudflare WAF rule can provide additional defense against distributed
abuse.

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

```bash
npm ci
npm run build                         # Runs Node tests and ID validation
npx playwright install chromium
npx playwright test --grep '@smoke'    # CI-equivalent browser suite
```

Astro's local preview does not emulate Cloudflare Pages Functions or R2
redirects. Verify public publishing/editing/deletion through a bound Pages
deployment. The browser tests exercise local drafts and mock remote
publishing; Node tests cover validation, token permissions, expiry,
throttling, and cleanup. The regular CI workflow checks generated
`_routes.json` and `_redirects` rather than fetching R2 assets.

A verification audit of ambiguous printed Basta fragments remains part
of routine source preservation; these fragments are not silently
represented as verified independent poems.
