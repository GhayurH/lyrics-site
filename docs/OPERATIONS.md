# Operations: hosting, assets, search and Recitation Sets

This is the **deployment and infrastructure** reference. Editorial rules live in [Editorial standards](EDITORIAL.md), source/code workflows in [Contributing](CONTRIBUTING.md), and product permissions in [Recitation Sets](RECITATION_SETS.md). Confirm the deployment's exact commit and environment before acting; local `astro preview` is not Cloudflare Pages.

## Deployment topology

- **Cloudflare Pages** serves the built Astro static HTML and appropriate Pages Functions.
- **R2** bucket `kalam-archive-assets` stores large original scans and PDFs, outside Git.
- **D1** stores only published Recitation Set metadata/references (production and preview are separate).
- **Scheduled cleanup Worker** expires old sets and cleans operational rows.
- **Pagefind** is generated from rendered public HTML. Its single search index covers multiple original-language scripts and Roman transcriptions; the fixed `force_language: en` in `pagefind.yml` is intentional for the unified index, not a claim that originals are English.

The canonical site is `https://kalamarchive.com`. Keep domain redirect behavior and `robots.txt`/canonical/sitemap targets aligned when changing aliases or retiring an old Pages hostname.

## R2 source images and PDFs

Source Markdown stores stable root-relative paths (`/images/...`, `/files/...`), **not** provider-specific R2 URLs.

| Environment | Asset delivery |
| --- | --- |
| Production | Cloudflare Cloud Connector maps `/images/*` and `/files/*` to `kalam-archive-assets` |
| Pages preview | `public/_redirects` forwards these paths to `https://r2-assets.kalamarchive.com` |
| Local `astro preview` | Does **not** emulate Cloudflare redirects or Cloud Connector |

Masters remain outside Git. For local editing, link your asset tree only when the destination does not already exist:

```bash
ln -s ~/KalamArchiveAssets/images public/images
ln -s ~/KalamArchiveAssets/files public/files
```

Upload only reviewed changed assets and check the remote:

```bash
rclone copy ~/KalamArchiveAssets/images r2:kalam-archive-assets/images --checksum
rclone copy ~/KalamArchiveAssets/files  r2:kalam-archive-assets/files  --checksum
rclone check ~/KalamArchiveAssets/images r2:kalam-archive-assets/images --one-way
rclone check ~/KalamArchiveAssets/files  r2:kalam-archive-assets/files  --one-way
```

`copy` does not remove unrelated objects; do not routinely `sync` away other assets. Confirm preview/production URLs and `dist/_redirects`; stale replaced images may need cache investigation. Optional self-hosted fonts must retain their applicable license notices. The service worker downloads large scans **on request**, never as mandatory application cache.

## Sitemap and indexing

The Astro sitemap integration generates `dist/sitemap-index.xml` and child `sitemap-N.xml` files. Every published static route—standalone lyric, printed Basta page, verified individual Basta poem and relevant browse/category page—must appear in the sitemap inventory. Unpublished or unverified routes must not be fabricated to reach a target count.

`npm run build` runs `scripts/verify-sitemap.mjs` after HTML generation and **before** Pagefind. The verifier checks all children for duplicates, malformed/off-site URLs, fragments/query strings, missing HTML pages and extra/stale routes, including checks against published source Markdown.

```bash
npm run sitemap:verify             # Check already-built local dist/
npm run sitemap:verify:live        # Compare live sitemap with this exact build's dist/
```

For `sitemap:verify:live`, use a local `dist/` built from the **same deployed commit**. A mismatch from another revision is not evidence of missing published routes.

Standalone and verified Basta kalam pages index their actual visible verses (`data-pagefind-body`) rather than hidden duplicate copies. Printed Basta pages index only unclaimed fragments so that the same verified poem is not shown twice in local search. Search aliases and keyboard/orthography normalization are **search-only**, never edits to the published poem. Base-layout descriptions and Open Graph metadata describe the source and available Roman titles.

Submit **only** `https://kalamarchive.com/sitemap-index.xml` in Google Search Console. Past “discovered URL” counts are not counts of today's generated site, nor do they guarantee Google indexing. Review URL inspection and exclusions separately. Keep `public/robots.txt` aligned with this sitemap.

### Cloudflare and crawlers

A 403/`cf-mitigated: challenge` for GitHub Actions, Curl or a script may be a generic bot challenge; it is **not proof** of Googlebot or Bingbot blockage. Diagnose the exact request in Cloudflare Security Events and test verified crawler access before changing WAF rules. Where appropriate, make narrowly scoped exceptions for verified search crawlers and sitemap paths rather than disabling bot protection site-wide.

Do not confuse local Pagefind search, Google's sitemap state and Bing's crawler results. They are separate publication and external discovery checks.

## Recitation infrastructure

| Configuration | Role |
| --- | --- |
| `wrangler.toml` | Pages and distinct preview/production D1 bindings |
| `schema/recitation.sql` | Bootstrap schema for **new empty** databases only |
| `functions/api/recitation-sets/` | Published set API |
| `functions/_lib/recitation*.js` | Capability verification, limits and retention |
| `workers/wrangler.cleanup.jsonc` | Independently deployed scheduled cleanup Worker |

The Pages binding is `RECITATION_DB`. Production uses D1 `kalam-recitation-sets` and `RECITATION_RETENTION_MODE=production`; preview uses `kalam-recitation-sets-preview` and `preview`. Never use production data as test fixtures. `RECITATION_RATE_LIMIT_SECRET`, if configured, is a real secret.

For a **new, empty** D1 database only:

```bash
npx wrangler d1 execute NEW_DATABASE_NAME --remote --file=schema/recitation.sql
```

**Never** replay the bootstrap schema on an existing production or preview database. Future updates require reviewed incremental migrations and a recovery plan; ordinary lyric changes never need D1 schema changes.

Deploy the independent scheduled cleanup Worker:

```bash
npx wrangler deploy --config workers/wrangler.cleanup.jsonc
```

It runs daily at **03:00 UTC** (`0 3 * * *`), with `PRODUCTION_RECITATION_DB` and `PREVIEW_RECITATION_DB` bindings. It deletes expired ordinary sets and stale rate-limit rows in bounded batches while preserving permanent production sets. It retains daily metrics for 90 days in `recitation_maintenance_metrics`. There is **no public admin API**.

Read-only monitoring example:

```sql
SELECT day, sets_total, sets_permanent, sets_expired_pending,
       document_bytes_estimate, deleted_sets
FROM recitation_maintenance_metrics
ORDER BY day DESC LIMIT 30;
```

Document byte totals are estimates, not SQLite/index overhead-inclusive storage accounting.

## Deployment verification

1. Verify target branch/commit, Pages environment bindings, canonical domain, production/preview asset route and Worker config.
2. Build from that commit; check `dist/_routes.json` for the public `/r/*` and recitation API routes and `dist/_redirects` for preview image/PDF forwarding.
3. Test on **Pages preview**: source image/PDF redirects, slow/blocked scans, source-only fallback, public Recitation Set read link, private capability CRUD and revision conflicts, preview expiry and explicit server-error handling.
4. Confirm scheduled cleanup logs/metrics and that private edit capabilities/API responses never reach a public cache or index. Verify separate preview/production databases.
5. On deployment, compare the live sitemap to the exact built commit; inspect crawler responses, search metadata and external indexing separately. Check production bindings without unnecessary live-record mutation.

For browser acceptance and the final publishing gate see [Quality assurance](QUALITY_ASSURANCE.md).

## Deployment cleanup

The optional `audit/cleanup-pages.sh` removes **all** deployments except active production (including rollback history); it is intentionally destructive and aborts if production changes during the operation. See [Audit tools](../audit/README.md#pages-deployment-cleanup). Do not run it as a routine validation command.