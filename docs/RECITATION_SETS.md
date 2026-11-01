# Recitation Sets

Programme behavior, source IDs, sharing, and retention. [Operations](RECITATION_OPERATIONS.md) documents D1/deployment.

At `/recite/`, visitors arrange standalone kalams and verified Basta poems; `/recite/read/` supports sequential/continuous reading, Urdu/Roman, scans, and Focus Mode. Programmes can repeat kalams, assign per-position reciters/notes, and record an occasion/description. Verified numbered Marsiyas support selecting, reordering, repeating, and borrowing stanzas; borrowed stanzas retain attribution.

## Reciter tools, offline exports, and printing

Programme descriptions are shared notes; each occurrence has its own reciter and notes (field lengths: 100/400/1000 characters as enforced by the set model).

- **Save offline HTML** and **Print / Save as PDF** first resolve all ordered sources, including borrowed/custom Marsiya stanzas. Text, reciters, notes, attribution, and regular/bold Noto Nastaliq Urdu WOFF2 fonts are embedded; missing verses are never substituted.
- Print uses paired bilingual stanza rows, prevents stanza/page splits where possible, and keeps headings/notes with their opening stanzas. Both 4+2 and reviewed 2+2+2 verse layouts are supported.
- Scans are omitted because cross-origin R2 assets cannot be guaranteed offline. There is no server PDF service: use the browser print dialog's **Save as PDF** option. Offline HTML contains no live navigation or remote dependencies.

### Optional organizer-guided live navigation

A published programme's organizer can enable Live Navigation using the **private edit capability**. Previous/Next/Stop update the selected **entry UID** via authenticated `PATCH /api/recitation-sets/{id}`, so duplicate kalams remain distinct. An edited programme must be republished before live control resumes.

Readers can opt into **Follow organizer live** (off by default): it checks the public GET endpoint about every 10 seconds while visible, and follows only changed entry pointers. Manual navigation disables following; Stop leaves a reader in place. It requires internet access.

PATCH uses the edit bearer token, rejects unknown/retired entry UIDs, and uses D1 compare-and-swap to prevent overwriting concurrent edits. A conflicting update requires refreshing the builder; successful authorized updates renew expiry. No extra Pages route or D1 migration is needed.

## Data and source integrity

Source Markdown and scans are authoritative. Sets store references and organizer metadata, **not copies of poetry**.

- `/data/recitation-lyric-catalog.json` and `/data/recitation-lyrics/{id}.json` expose published standalone sources.
- `/data/basta-kalams.json` and `/data/basta-kalams/{id}.json` expose indexed verified Basta poems, pages, and stanzas; `Mazameen` is excluded.
- Ambiguous Basta boundaries remain under review, not silently mapped to independent poems.

`src/data/recitation/identity-lock.json` reserves permanent lyric, Basta, and numbered-stanza IDs. Stanza fingerprints use the first two normalized source verses, independent of printed numbering. **Never reassign IDs.**

```bash
npm run recitation:ids:check
npm run recitation:ids:sync  # Add new sources or refresh a single unambiguous stanza edit
npm run basta:kalams:audit
```

Commit reviewed lockfile changes with source edits. Preserve `recitationId` on renamed lyric files or renumbered Basta entries. After editing an existing stanza's opening lines, run `npm run recitation:ids:sync`. It can refresh **one** anchor automatically when the stanza count, printed position, and every other anchor still match; it preserves the permanent stanza ID and prints the affected Basta page. Multiple edits, insertions, removals, reordering, or renumbering require manual review. Explicitly retire removed IDs using `retired: true`; don't recycle them. Builds validate the registry **without modifying it**.

Missing/retired poem or stanza references retain their position and saved label with a warning, never a replacement. Organizers are warned before publishing unresolved sets.

## Drafts, sharing, and authorization

Drafts are browser-local (up to 30 per device); deleting a draft does not delete a published set. Publishing in D1 yields:

- A public read-only `/r/{id}` URL while the set is available.
- A **private** `/recite/?set={id}#edit={token}` organizer URL for updating/deleting it.

Anyone with the private link can edit; there are no accounts or token recovery. D1 stores a SHA-256 **digest**, not the plaintext token. Keep the edit link private. **Delete published set permanently** requires that token.

Pages Functions handle `POST /api/recitation-sets`, `GET/PUT/PATCH/DELETE /api/recitation-sets/{id}`, and `GET /r/{id}`. `public/_routes.json` limits dynamic invocation; absent D1 bindings return 503, while local drafting remains usable.

## Retention and abuse prevention

| Environment | Automatic expiry | Permanent option |
| --- | --- | --- |
| Production | 24 calendar months since publication/last authorized edit | Yes, no automatic expiry while selected |
| Preview | 30 days since publication/last edit | No |

Reading does not renew expiry. Expired records return **410** until cleanup, then **404**. Private-token deletion revokes the set immediately; source poetry and scans remain.

Creation is limited to **10 sets/hour/IP** (HTTP **429** with `Retry-After`); reading/authorized editing is not rate-limited by this quota. D1 stores hashed throttle keys; the optional `RECITATION_RATE_LIMIT_SECRET` protects their derivation. WAF protection can supplement this.

Scheduled cleanup, metrics, schema creation, and deployment checks: [Operations](RECITATION_OPERATIONS.md).

## Templates, offline reading, and publishing conflicts

Programme templates are saved locally, never published. A template creates a fresh draft with fresh entry UIDs and does not copy an edit token or live navigation state. Organizers can display a QR code for the **public** link by explicitly selecting Show public QR; this contacts an external QR image provider and never sends private organizer links.

Published edits require the revision returned by the server. Simultaneous organizer tabs get a 409 conflict instead of silently overwriting the previous update. Duplicate a local draft before refreshing if it contains unsent changes. Live-step updates also use document compare-and-swap.

Saved & recent provides a versioned JSON backup/import, including local templates and private organizer edit links, and an optional offline cache for saved pages. Backups must be kept private. Original R2 scans and live published programmes still need a connection.
