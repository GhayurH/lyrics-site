# Recitation Sets — source model and programme editor

The source catalog defines individually addressable Basta kalams and numbered
stanzas without modifying original Markdown. The Recite interface uses these
identities to build ordered sets for reciters and anjumans.

## IDs and provenance

- A poem gets a stable ID from its original printed Basta index section and
  index number, e.g. basta-marsiye-001. The display name is always the original
  index name, not a newly guessed title.
- A numbered stanza gets an ID scoped to its poem, e.g.
  basta-marsiye-001 / stanza-003.
- The Urdu text is authoritative. Roman is exposed for a stanza only when
  the corresponding source contains matching numeral boundaries.
- A poem may span multiple printed pages. Source pages are retained per
  kalam and per stanza. Source prose, closing verses, and credit lines
  remain unchanged.
- Only isolated printed numerals are treated as stanza boundaries. Blank lines
  or arbitrary visual breaks do not create artificial stanza IDs.
- Poems without printed numbers can be selected as whole kalams; they are not
  automatically broken into rearrangeable stanzas.

## Static data API

- /data/basta-kalams.json — names, IDs, source pages, availability and number
  of verified stanza units. This metadata index is intentionally small.
- /data/basta-kalams/{id}.json — source text and numbered stanza units, emitted
  only for poems whose mapping passed automatic structural checks.

Both are built from existing Astro collections. No duplicated transcription
and no per-request server process are required.

## Source reconciliation

The printed index, page boundaries, and ---***--- markers are distinct things.
An index entry can span several pages, and some pages contain unindexed
fragments. We intentionally avoid mapping an ambiguous fragment to a poem.

Run:

    npm run basta:kalams:audit

For a full machine-readable review list:

    npm run basta:kalams:audit -- --json

For strict verification of *every* source boundary:

    npm run basta:kalams:audit -- --strict

The audit reports poems requiring review, unmatched fragments, and source
Roman/Urdu segmentation mismatches. It does **not** silently repair OCR or
alter index entries. Manually resolve ambiguous fragments against original
scans before considering them verified. Page 140 has an explicitly documented
mapping because the source contains additional unindexed excerpts; the
independent unindexed excerpt remains in the audit.

The index contains separate articles that are not poetry; the recitation
catalog excludes the Mazameen section. Source review is a distinct phase
from implementing the reciter interface.

## Arrangement model

A future recitation set stores an ordered list of poem references. A
Marsiya selection can optionally provide an ordered stanzaSequence consisting
of { kalamId, stanzaId } pairs. These pairs may point to verified stanzas
from *other* Marsiyas. The sequence may repeat stanzas; neither the origin
nor the text is changed. A rendered borrowed stanza includes its original
poem ID and name for proper attribution.

Example:

    {
      "kalamId": "basta-marsiye-001",
      "stanzaSequence": [
        {"kalamId": "basta-marsiye-001", "stanzaId": "stanza-003"},
        {"kalamId": "basta-marsiye-002", "stanzaId": "stanza-001"},
        {"kalamId": "basta-marsiye-001", "stanzaId": "stanza-001"}
      ]
    }

Arrangements will be stored separately from canonical content. Editing,
sharing, live programme navigation and account/database integration are
**not** part of this preparatory change.

## Recitation interface

- /recite/ is a searchable set builder for published standalone lyrics and automatically verified Basta kalams. Unverified entries remain disabled pending the separate source scan review.
- Drafts and editable, duplicated local sets are browser-local. Individual occurrences of a kalam are allowed and retain separate reciter notes.
- Verified numbered Marsiya stanzas can be removed, reordered, repeated, or borrowed from other verified Marsiyas; each borrowing retains source provenance.
- /recite/read/ offers continuous or one-at-a-time reading, Urdu/Roman/scan selections, Focus mode, verse fitting, and proportional scrolling per kalam. Participants scroll independently.
- Published programmes have permanent read-only /r/{id} links. Private organizer links supply the edit token through a URL fragment. Publishing/editing uses Cloudflare Pages Functions and D1.

See [deployment instructions](RECITATION_DEPLOYMENT.md) for the D1 migration/bindings, previews, and token-security model. Source verification is an independent workstream.
