# Recitation Sets

This guide owns programme behavior, source integrity, sharing, and retention policy. Deployment and database maintenance live in [Recitation Sets operations](RECITATION_OPERATIONS.md).

Recitation Sets lets visitors assemble programmes of standalone kalams and
verified Basta poems at `/recite/`. The reader at `/recite/read/` supports
continuous or one-at-a-time presentation, Urdu, Roman Urdu, original scans,
and Focus mode. Each programme may include repeated kalams, an occasion,
reciter names, and notes. For structurally verified numbered Marsiyas,
organizers can reorder, omit, repeat, or borrow numbered stanzas from other
verified Marsiyas. Borrowed text retains its original source attribution.

## Reciter tools, offline exports, and printing

The reciter and programme-note fields in the builder are per-position: repeated
kalams can have different assigned reciters and notes. The **Description**
field stores programme-wide instructions. They are visible in the reader and
included in exports. These fields follow the existing 100-/400-/1000-character
limits and remain part of the shared set document.

### Offline copy and printing

The programme reader includes **Save offline HTML** and **Print / Save as
PDF**. Both first resolve the complete ordered programme, including pages
and custom/borrowed Marsiya stanzas that would otherwise load lazily. The
offline download is a standalone HTML file that can be opened without
internet access or a Cloudflare account. Its text, source-attribution labels, assignments, and notes are embedded in
the file; regular and bold Noto Nastaliq Urdu WOFF2 fonts are embedded too,
and missing verses are never silently substituted.

Portable documents use paired bilingual stanza rows for print, keeping each
stanza together and grouping kalam headings and notes with the opening stanza.
The standalone lyric reader and programme reader apply the same six-verse
presentation, including an explicitly selected 2+2+2 couplet layout.
Printing waits for the embedded fonts to load. The exported HTML has no live
navigation or remote dependencies.

Scans are intentionally omitted from portable exports: original images live in
R2, may not be accessible cross-origin, and cannot be guaranteed offline.
Exported documents explicitly state this limitation. Source scans remain
available in the online reader. **Print / Save as PDF** opens a standalone
print-ready view and uses the browser's Print dialog; select **Save as PDF**
as the printer to produce a PDF. There is no server-side PDF service.

### Optional organizer-guided live navigation

Published programmes with a valid *private edit capability* show
**Live programme navigation** in the builder. Start, previous, next, and stop
update the active programme-entry UID with an authenticated PATCH request to
`/api/recitation-sets/{id}`. Repeated appearances of the same poem remain
independent because their entry UIDs differ. An edited/reordered programme
must be published first before live navigation resumes.

A visitor to the shared reader can opt into **Follow organizer live**.
Following defaults **off**. It polls the existing public GET endpoint
approximately every 10 seconds while the tab is visible, and navigates only
if the organizer's pointer changes. Previous/next/manual selection turns
following off; the organizer cannot forcibly seize a reader's navigation.
Stopping leaves each reader at its current kalam. Live navigation requires
internet access; saved offline HTML deliberately contains no polling code.

PATCH requires the same bearer token as editing/deleting a programme and
rejects invalid or retired entry UIDs. D1 updates use a compare-and-swap on
the JSON document, preventing concurrent live writes from overwriting recent
edits. This requires **no D1 schema migration** or additional Pages route;
the existing wildcard Function route handles PATCH. Authorized live updates
renew the same retention period as other authorized edits. The organizer
must refresh the builder after a conflicting change and retry.

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
`GET/PUT/PATCH/DELETE /api/recitation-sets/{id}`, and `GET /r/{id}`.
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

## Deployment and maintenance

Cloudflare Pages bindings, D1 database creation, scheduled cleanup, metrics, and deployment verification are documented in [Recitation Sets operations](RECITATION_OPERATIONS.md). Do not reinitialize existing production or preview databases; future schema changes require reviewed incremental migrations.
