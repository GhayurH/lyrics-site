# Historical TajPoints and NoHayOnline source drafts

Source collection: [GhayurH/kalam-archive-imports — PR #3](https://github.com/GhayurH/kalam-archive-imports/pull/3), particularly `reports/manual-review-1502/`. This branch is based on `feat/import-overlap-reconciliation-2026-11-05`.

## What was staged

- **103 TajPoints Roman-only** Markdown drafts, including incomplete short source fragments.
- **6 NoHayOnline** drafts: 3 bilingual Roman + Urdu (`f23c2ad611b293044c5c`, `081845286d63e4be5e95`, `1a787a7d7e3008025ff6`) and 3 Roman-only (`ace8af6841521d8a554e`, `29645ec7897c905ec83f`, `090b49ee30424f596fef`).
- **109 new files total**, all `published: false`. Each has original source ID, URL, SHA256 and a source-title comment; see [the source-to-file staging tracker](historical-tajpoints-nohayonline-staging.csv).

These are faithful **source-derived drafts, not manually proofread final editions**. Source line breaks are retained; uncertain stanza segmentation and transliteration were *not* automatically invented or declared reviewed. Roman-only files carry `noUrdu`. The nine TajPoints records with fewer than five extracted lines are retained as clearly warned short fragments requiring verification.

## Excluded original records

| Source ID | Reason | Website reference |
| --- | --- | --- |
| `nohayonline:e1f435fbf6aacc9b96c9` | User confirmed duplicate | `alwida-alwida-alwida-ay-hussain.md` |
| `nohayonline:f9a1909d4b7f66481997` | User confirmed duplicate; target not yet linked | Existing Marsiya, verify canonical target before further consolidation |
| `nohayonline:6a6dbfa5b13110ddf127` | Duplicate with no extra substantive stanza (21 groups matched) | `kabhi-kabhi-main-ye-sochta-hun.md` |
| `tajpoints:8d499841ad78e982aa3b` | Duplicate with no extra source stanza (57 verses matched) | `aao-baba-ko-rukhsat-karo.md` |
| `tajpoints:32ea392a8195c4055d7b` | Already integrated from an alternate source | `ab-raat-ho-chuki.md` |
| `tajpoints:9ddbb94dcacdd2d88827` | Terms & Conditions page, not a poem | None |

These six resolutions are recorded in the import repository's `review/historical-dispositions.csv`; preserved HTML/JSON was not deleted.

## Needed manual consolidation

- The TajPoints source `7c0ac3f77a854cef0b86` has **additional verses** beyond the existing bilingual `mili-rihaai-to-abid-ye-kaam-kar-ke-chale.md`. Its complete Roman reading is temporarily staged separately as `mili-rehai-tu-abid-ye-kam-kar-ke-chaley-extended.md`. **Do not publish both**: align and merge only verified new stanzas, and supply matching Urdu where supported before completing that merge.
- `phir-chahe-sakina-ko-wo-jitna-bhi-sata-le.md` and `sakina-utho-meri-jaan-utho.md` contain Urdu from NoHayOnline. There are related Roman-only TajPoints imports on `chore/remaining-5294-kalams-2026-11-14`; reconcile their source IDs and choose a single bilingual edition when those branches are integrated.
- For `nohayonline:1a787a7d7e3008025ff6`, the corrupt literal `r>` was removed from the Urdu text, leaving an opening Roman line without a corresponding Urdu line; verify the intended opening stanza.
- For `nohayonline:f23c2ad611b293044c5c` and `081845286d63e4be5e95`, an extraneous `<` line was removed from Urdu. For the three NoHayOnline Roman-only sources, the apparent Urdu HTML was a copy of the Roman track and was intentionally not carried over.

**Do not merge these drafts directly into published `main` without the usual manual stanza, transliteration, metadata, duplicate and Urdu-completeness reviews.** The import repo's staging register is informational: none of the 109 drafts is recorded as editorially resolved or automatically acknowledged.
