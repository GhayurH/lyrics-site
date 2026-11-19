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

## Explicit original-language reconciliation

Run `node scripts/round2-explicit-language-fix.mjs --check` for a read-only audit, or use `--write` for the approved one-time migration in `.github/workflows/round2-language-audit.yml`. The script reclassifies only sources explicitly labelled Punjabi/Panjabi, Saraiki/Siraiki, or Balti in their original filename, title, alias, or archived source URL. It updates **only** `language` and `lang`; text, poet, reciter, tags, IDs and Roman editions are untouched.

A Latin-script-only Punjabi import is `language: Panjabi`, `lang: pa`, `direction: ltr` until an Arabic-script original is prepared. The equivalent provisional Saraiki tag is `skr`. With a reviewed Shahmukhi/Perso-Arabic original, use `pa-Arab` or `skr-Arab` respectively. Never use `ur-Latn` or identify an original as "Roman Urdu".

Cross-language titles or ambiguous source labels (e.g. "Saraiki/Punjabi") are excluded for manual round2 adjudication. Linguistic clues in verse text alone must not trigger automatic reassignment: poetry may switch languages or contain borrowed lines. The separate `scripts/audit-round2-language-codes.mjs` logs broader candidate counts for editorial follow-up; these are **not** automatic classifications. One-time workflow execution should not be repeated as part of regular builds.