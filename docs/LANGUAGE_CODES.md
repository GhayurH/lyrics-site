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

## One-time migration

The `round2-language-codes-once.yml` workflow triggers **only when its own file is first pushed** to `round2-kalams-2026-11-14`. It runs `scripts/one-time-language-codes.mjs`, commits only changed `lang` metadata, and does not run again on its own data commit. The script is idempotent, does not rewrite poem text or Roman editions, and skips ambiguous/Latin-only sources and misclassified Roman Urdu for the editorial round2 pass.

```bash
node --test tests/language-codes-migration.test.mjs
node scripts/one-time-language-codes.mjs --check
# One-time approved write:
node scripts/one-time-language-codes.mjs --write
```

Pagefind stays a **single index** with `force_language: en`; original-language HTML attributes do not split search.
