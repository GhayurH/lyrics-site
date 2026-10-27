# Recitation Sets deployment and D1 binding

The public archive remains statically generated. Only /api/recitation-sets (creation), /api/recitation-sets/* (read/update), and /r/* (public redirects) invoke Cloudflare Pages Functions. `public/_routes.json` is copied to `dist/_routes.json` during the Astro build, so static pages and R2 asset redirects do not consume Functions invocations.

## One-time Cloudflare setup

1. Create a D1 database named kalam-recitation-sets (or another chosen name).
2. Apply migrations/0001_recitation_sets.sql to it from the D1 dashboard SQL console, or execute:

    npx wrangler d1 execute kalam-recitation-sets --remote --file=migrations/0001_recitation_sets.sql

3. In Cloudflare Workers & Pages > lyrics-site > Settings > Bindings, add a D1 database binding called RECITATION_DB. Select the database. Configure production and preview separately as needed, and redeploy.
4. Check that publishing creates a public /r/<id> link, that read-only visitors can view it, and that updating without its private edit token returns HTTP 403.

Official guide: https://developers.cloudflare.com/pages/functions/bindings/#d1-databases

Do not hand-write a Wrangler configuration that overrides your existing Pages project settings. Dashboard bindings work without committing database identifiers to the repository.

## Testing

- npm test runs the set validation and mocked D1 permission checks.
- npm run build compiles static Astro pages and per-poem source endpoints.
- npx playwright test --grep '@smoke' checks local draft creation and reading, verified multi-page Marsiyas, both scans, and preserved missing-source references.
- Astro preview does not emulate Cloudflare Pages Functions. To test backend functionality locally, run npx wrangler pages dev dist --d1 RECITATION_DB=<database-id>, with the SQL migration applied in the local D1 environment first.
- Without D1, the sharing endpoint explicitly returns HTTP 503; local drafts and their reader still work.

## Permissions and privacy

The database saves set metadata and canonical poem/stanza references, not poem transcriptions. Public read links have random IDs and no edit capability. Organizer edit tokens are random and their SHA-256 hashes are stored in D1. The private organizer link has an edit token in the URL fragment, removed from the visible URL once imported. The organizer's browser stores the token in its local draft. Anyone holding that private link can edit the set; there are no accounts or recovery. Deleting a draft does not delete a published set, and no public deletion API is exposed.

A set permits 1–40 kalams, up to 120 explicitly numbered stanzas in a customized Marsiya, and safe-length notes. Unverified Basta boundaries remain unavailable for direct recitation until source verification. Existing standalone lyric URLs remain unchanged. The original archive remains the authoritative text source.

Consider rate-limiting unauthenticated creation endpoints when public use increases.

## Identity compatibility and future content updates

Before publishing changes to source Markdown or the Basta index, run
`npm run recitation:ids:check`. The production build enforces this same check.
For newly published material, `npm run recitation:ids:sync` and commit the
reviewed updated `src/data/recitation/identity-lock.json` alongside the source.
A rename should preserve the original `recitationId`, not allocate another.
A removed source must be marked `retired: true`, preserving its old ID.
Changes to an existing stanza's opening verses require manually reviewing and
updating its pinned anchor, keeping the stanza ID unchanged. This prevents
another stanza from inheriting the wrong old reference.

D1 requires no schema migration when new kalams are added, sources are corrected
or existing sources are retired. Existing sets simply retain their references.
Source text is always looked up from the latest published archive; unavailable
references display warnings, and no hidden substitution occurs.
