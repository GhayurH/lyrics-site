# Original-language codes (round2)

`language` is the original kalam's language; `lang` is its BCP 47 language tag.
`romanLyrics` is a transcription, not a new original language. Never use `language: Roman Urdu` or `lang: ur-Latn`.

| Original source | language | lang |
| --- | --- | --- |
| Urdu | Urdu | `ur` |
| Punjabi (Shahmukhi) | Panjabi | `pa-Arab` |
| Saraiki (Arabic script) | Saraiki | `skr-Arab` |
| Balti (Arabic script) | Balti | `bft-Arab` |

Other originals retain `ar` (Arabic), `fa` (Persian), or `en` (English). Unqualified `pa` and `bft` remain temporarily permitted for genuine Latin-script originals pending review. Do not assign `*-Arab` to an LTR original.

## Completed round2 migration

The one-time language-code and explicit-original-language migrations have been applied. Their write-enabled GitHub Actions workflows, migration scripts, and migration-only tests were removed after the runs; they are not part of normal CI. Subsequent language changes need manual source review, not bulk reclassification.

Pagefind stays a **single index** with `force_language: en`; original-language HTML attributes do not split search.

## Remaining original-language review

A Latin-script-only Punjabi import is `language: Panjabi`, `lang: pa`, `direction: ltr` until an Arabic-script original is prepared. The equivalent provisional Saraiki tag is `skr`. With a reviewed Shahmukhi/Perso-Arabic original, use `pa-Arab` or `skr-Arab` respectively. Never use `ur-Latn` or identify an original as "Roman Urdu".

Cross-language titles or ambiguous source labels (e.g. "Saraiki/Punjabi") require manual adjudication. Linguistic clues in verse text alone must not trigger reassignment: poetry may switch languages or contain borrowed lines. The optional read-only `node scripts/audit-round2-language-codes.mjs` reports candidates for editorial follow-up; it does **not** change language metadata or source text.