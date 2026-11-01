# Recitation Sets

Recitation Sets let organizers arrange standalone lyrics and **verified** Basta kalams at `/recite/`. The reader at `/recite/read/` supports sequential and continuous programmes, Urdu/Roman editions, source scans and Focus Mode.

## Building a programme

Each position can use its own reciter and notes; the same kalam may appear more than once. Numbered verified Marsiyas allow stanza selection, repetition, reordering and borrowing from other Marsiyas, with source attribution preserved. Missing or retired sources remain visible as labelled warnings, never silently replaced.

Organizers may save local templates or start from guided genre-based examples. **Start with sample kalams** selects illustrative verified sources that must be reviewed before publishing; it is not a recommended or canonical majlis order. Templates create a fresh draft with new entry UIDs; they never copy a private edit token or live pointer.

Drafts and templates remain in browser storage. [Saved & recent](https://kalamarchive.com/saved/) can export/import them in a versioned JSON backup; a backup may include **private organizer edit links** and must be stored securely.

## Printing and offline use

- **Save offline HTML** creates a self-contained programme with ordered text, notes, reciters, attribution and embedded Nastaliq fonts. Missing source verses are not substituted.
- **Print / Save as PDF** uses the browser's print dialog. Layout aims to keep stanza rows and headings together; there is no server PDF generator.
- Offline programme exports omit original scans and live navigation. This differs from **Saved & recent**, where visitors can optionally cache individual reading pages, R2 source scans and the Pagefind search index for offline browsing.

Keep the printed source scans reachable as normal web links when online. The standalone HTML export does not require the archive or D1 after it has been saved.

## Publishing and authorization

Publishing creates a D1-backed set of *source references and organizer metadata*, not a new copy of the poems. It returns two different links:

- **Public read-only:** `/r/{id}` (can be copied or shown as a QR code).
- **Private organizer:** `/recite/?set={id}#edit={token}` (can edit, renew or permanently delete the published set).

Anyone possessing the private link can edit it. There are no user accounts and no token recovery. D1 stores the SHA-256 **hash** of the edit token rather than plaintext. Never put the edit URL in a public QR code, an offline cache or a publicly shared backup.

`POST /api/recitation-sets` publishes; `GET/PUT/PATCH/DELETE /api/recitation-sets/{id}` handles reading and authorized changes. The redirect `/r/{id}` is read-only. Without a configured D1 binding, publication fails explicitly (503) while local drafts remain usable.

### Concurrent edits and live navigation

Published edits require the current server revision via `If-Match`. A competing organizer tab gets **409 Conflict** rather than overwriting another change; an update without the revision gets **428 Precondition Required**. Preserve unsent edits in a local draft before reloading.

An organizer with the private capability can enable Live Navigation. Previous/Next/Stop update an **entry UID**, so repeated kalams are distinct. Live `PATCH` uses the same revision checks and database compare-and-swap. Unpublished local edits must be published before live navigation resumes.

Readers must explicitly enable **Follow organizer live** (off by default). It polls the public endpoint about every ten seconds while visible; manual navigation stops following. Live following requires a network connection.

## Permanent source identity

Source Markdown and scans are authoritative. The published catalogs `/data/recitation-lyric-catalog.json` and `/data/basta-kalams.json` provide stable source links; their individual JSON endpoints provide canonical poem/stanza text. Ambiguous Basta boundaries are reported for editorial review and are not published as verified individual kalams.

`src/data/recitation/identity-lock.json` reserves permanent lyric, Basta and numbered-stanza IDs. Stanza fingerprints use two normalized opening verses, not mutable printed numbers. Renaming a source or editing its opening verses must **not** change its published identity.

```bash
npm run recitation:ids:check
npm run recitation:ids:sync   # Only after reviewed source edits
npm run basta:kalams:audit
npm run basta:kalams:review
```

The sync command may refresh a single unambiguous existing stanza anchor when all other anchors still match. Multiple edits, insertions, removals or renumbering require manual comparison with the source. Mark removed IDs `retired: true` rather than recycling them. Builds validate the lockfile without modifying it.

## Retention and rate limits

| Environment | Expiry after publication/authorized edit | Permanent option |
| --- | --- | --- |
| Production | 24 calendar months | Yes |
| Preview | 30 days | No |

Reading a published set does not renew expiry. Expired records return **410** until cleanup, then **404**. Authorized deletion revokes access immediately. Creation is limited to **10 sets per hour per IP** (**429** with `Retry-After`); authorized updates do not consume this creation quota. Throttle keys are hashed, and `RECITATION_RATE_LIMIT_SECRET` can protect their derivation.

For D1 bindings, migrations, cleanup Worker, monitoring and deployment verification, see [Recitation Sets operations](RECITATION_OPERATIONS.md).
