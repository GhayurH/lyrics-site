# Recitation Sets

Recitation Sets are programmes assembled from **references** to published standalone lyrics and human-verified Basta kalams. They do not duplicate or re-edit the archive's source poetry. This guide is the product and privacy contract; [Operations](OPERATIONS.md) owns Cloudflare/D1 deployment, and [Editorial standards](EDITORIAL.md) owns poems.

## Drafts and entry semantics

The editor at `/recite/` creates a locally saved programme with a title, optional occasion/description, and up to **40 ordered entries**. Each entry has an independent UID—even when the same kalam appears twice—and may include a selected reciter, notes and a verified Marsiya stanza sequence. A numbered, verified Marsiya may reorder, repeat or borrow verified stanzas from another eligible Marsiya without losing attribution or original source-page links.

Drafts and templates live in browser storage. Opening a template makes new independent entry UIDs, without inheriting another organiser's permissions, live state or permanent-publication settings. Guided samples still require human review of selected sources. Missing, changed or unverified source references show warnings, not invented replacements.

Saved-library JSON backup/restore can include **private organizer edit capabilities**. Treat an exported backup as confidential.

## Publishing and access

Publishing is explicit; drafts never sync automatically. D1 holds ordered source references and organizer metadata, not copies of source verses.

| URL | Access |
| --- | --- |
| `/r/{id}` | Public, read-only; safe to share as a QR code |
| `/recite/?set={id}#edit={token}` | Private organizer capability to edit, renew, navigate live or delete |

There are no user accounts and **no lost-token recovery**. Anyone with the private link controls the set; the server stores a hash of the edit token, not the token itself. Never put private capabilities in Pagefind, a public export/QR, logs, analytics, service-worker caches or public links.

The API creates a set with `POST /api/recitation-sets`; `GET/PUT/PATCH/DELETE /api/recitation-sets/{id}` handles reading and capability-checked mutations. `If-Match` revision checks prevent concurrent editors from overwriting each other (conflicts return 409). Missing D1 bindings fail explicitly; local editing remains available.

## Reading, live mode and export

The reader at `/recite/read/` supports the available source-language/Roman editions, images where appropriate, Focus mode and ordinary programme navigation. Only the organizer controls live position; it follows the specific **entry UID**, not merely the repeated kalam's source ID. Readers must opt in to follow; they can leave live mode at any time. Live updates require a network connection and an up-to-date published programme.

A portable offline HTML export contains ordered text, notes, reciters, source attribution and eligible embedded fonts. It intentionally omits scans and live synchronization. Browser Print/Save as PDF is the printing path, not a server-side PDF service. The separate Saved/offline features can download public archive text/scans/search.

## Permanent source identity

`src/data/recitation/identity-lock.json` reserves reviewed standalone, Basta kalam and stanza references. `recitationId` is the programme-facing lyric identity and must not change because a Markdown filename, `title` or display punctuation changes. Reviewed stanza anchors are not simply regenerated from current verse order. Removed published IDs are retired and **never reused**.

The original standalone cohort's permanent identities remain protected. During reviewed import consolidation, imported IDs may be explicitly removed/retired as appropriate, but a normal source synchronization cannot silently reassign established public references or rewrite verified Basta IDs. Source changes with multiple stanza edits/retirements require explicit human-reviewed approval, as described in [Contributing](CONTRIBUTING.md#explicit-basta-approvals).

## Retention, rate limits and recovery

| Environment | Ordinary retention | Permanent |
| --- | --- | --- |
| Production | 24 calendar months from publication or authorized edit | Organizer may select |
| Preview | 30 days | Not available |

Reading does not renew expiration. Expired sets return 410 until cleanup removes them, then 404; deletion revokes access. Creation is limited to **10 sets per hour per IP** with HTTP 429/`Retry-After` when exceeded. Authorized edits do not spend this creation quota.

The scheduled Worker removes expired ordinary sets and stale rate-limit rows; production permanent sets survive cleanup. See [Operations](OPERATIONS.md#recitation-infrastructure) for the deployment and read-only monitoring procedure.