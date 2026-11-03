# Recitation Sets

A Recitation Set is an ordered **programme of references** to published standalone lyrics and verified Basta kalams. The editor (`/recite/`) saves drafts locally; the reader (`/recite/read/`) supports readable Urdu/Roman editions, scans, Focus Mode and optional live navigation.

## Draft contract

A programme has a title, optional occasion/description, and up to **40** ordered entries. Each entry has a unique UID so repeating the same kalam remains distinct; it may include an assigned reciter, notes and an optional verified Marsiya stanza sequence. A verified numbered Marsiya may reorder, repeat or borrow stanzas from another verified Marsiya. Attribution and source-page references remain attached; unavailable sources show warnings rather than guessed replacements.

Templates live only in local browser storage. Starting a template creates independent entry UIDs and excludes live state, permanent-retention status and organizer capabilities. Guided samples select only ready catalog entries and require organizer review before publishing.

`/saved/` supports JSON backup/restore. A backup may contain **private edit capabilities**; handle it as a secret, not a harmless public reading list.

## Published access

Publishing is explicit. D1 stores references plus organizer metadata, never a duplicate copy of the source poems. The server returns:

| Link | Permission |
| --- | --- |
| `/r/{id}` | Public, read-only; suitable for QR sharing |
| `/recite/?set={id}#edit={token}` | Private organizer capability: edit, live navigation, renewal, deletion |

There is no account or token recovery. Anyone possessing the private link controls the set; only a **hash** of the edit capability is stored server-side. Never expose edit tokens in search, a public QR code, logs or offline caches.

`POST /api/recitation-sets` creates a set. `GET/PUT/PATCH/DELETE /api/recitation-sets/{id}` read or perform capability-protected updates. Edits and live updates require the current `If-Match` revision; simultaneous changes return 409 instead of silently overwriting a newer version. Missing D1 bindings fail explicitly while local drafts remain usable.

## Live following and offline output

Only the organizer can advance/stop live position; navigation tracks **entry UIDs**, not just kalam IDs. Local changes must be published before resuming live updates. Readers explicitly opt into following and can leave to navigate independently; network access is required for live updates.

Offline HTML exports include ordered text, notes, reciters, source attribution and embedded eligible fonts; they omit scans and live features. Browser Print/Save as PDF is a separate print workflow, not a server-side PDF service. Offline browsing of archive pages/scans/search is handled separately in Saved & Recent.

## Permanent source identity

`src/data/recitation/identity-lock.json` reserves lyric, Basta and numbered-stanza IDs. These IDs **must not** change after title edits, filename changes, punctuation fixes or source-page movement. Stanza anchors use reviewed opening fingerprints, not current stanza numbers. Retired IDs are not recycled; ambiguous multi-stanza edits require source review.

After changing source Markdown, run `npm run source:sync`, verify the diff and run `npm run build`. `source:check` validates identities read-only on every build. See [Contributing](CONTRIBUTING.md#source-synchronization-and-approvals).

## Retention and limits

| Environment | Retention from publication or authorized edit | Permanent |
| --- | --- | --- |
| Production | 24 calendar months | Organizer may choose permanent |
| Preview | 30 days | Not available |

Reading does not renew expiration. Expired rows return 410 until cleanup, then 404; deletion revokes access. Creation is limited to **10 sets/hour/IP**, with 429 + `Retry-After` when exceeded. Authorized updates are not charged against this creation quota. See [Operations](RECITATION_OPERATIONS.md) for schema, Worker and binding details.
