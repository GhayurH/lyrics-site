# Historical manual-source reconciliation (working branch)

This branch targets `feat/import-overlap-reconciliation-2026-11-05`, not published `main`. Review-only and unapproved source drafts remain `published: false`. Sources and their original compressed HTML/JSON belong to [`GhayurH/kalam-archive-imports` PR #3](https://github.com/GhayurH/kalam-archive-imports/pull/3); do not purge the original captures.

## Decisions and source-to-file mappings

| Historical source batch | Outcome | Records |
| --- | --- | ---: |
| TajPoints | Roman-only source drafts | 103 |
| NoHayOnline | Bilingual drafts | 3 |
| NoHayOnline | Roman-only drafts (false Roman-in-Urdu tracks removed) | 3 |
| TajPoints/NoHayOnline | Existing duplicates/non-poetry excluded | 6 |
| NohaWriteups, CSV `review-decisions-1.csv` | New, unpublished source drafts | 70 |
| NohaWriteups | Additional source readings mapped to existing Markdown | 12 |
| NohaWriteups | Repeated source captures mapped to a single retained Markdown | 9 |
| NohaWriteups | User excluded “no lyrics” sources | 32 |
| NohaWriteups | Broken historical extraction, requires further recovery | 2 |

The **109 source drafts initially created** from TajPoints/NoHayOnline included a **second extension file** for `Mili Rihaai To Abid`. That file was removed; its additional stanzas were merged into the original file. There are now **108 original new draft files**, plus **70 new NohaWriteups drafts** (**178 newly added lyric MD files** in this PR), alongside changes to previously existing editions.

- `audit/historical-tajpoints-nohayonline-staging.csv`: initial 109 source identities, with the extension source now linked to its original filename
- `audit/nohawriteups-review-decisions-1-status.csv`: all 125 decisions, source checksums, and retained file paths
- `audit/nohawriteups-review-decisions-1-prepared.json`: immutable review handoff used to create 70 unpublished MDs
- The import repository's `review/historical-dispositions.csv` and `review/historical-md-staging.csv`: processed exclusions vs still-pending editorial records

## Consolidated additions

- **`src/data/lyrics/mili-rihaai-to-abid-ye-kaam-kar-ke-chale.md`:** Five new three-line stanzas from `tajpoints:7c0ac3f77a854cef0b86` are now included in the **same original bilingual file**, with Roman and Urdu stanza labels **1–9**. The redundant `mili-rehai-tu-abid-ye-kam-kar-ke-chaley-extended.md` no longer exists. The source's garbled line ending “Yehi Husain Alh Aslam Kar Ke Chale” and its provisional Urdu require independent editorial verification before final approval.
- **`src/data/lyrics/logo-main-zainab-haan-meri-yasrab-wich-toqeer.md`:** Both repeated NohaWriteups Panjabi-in-Urdu-script sources (`3ac54d3a10213d8713e6` and `ba12d1e166cc26867e93`) are consolidated with the original TajPoints Roman text. No second poem file; final audio alignment is still pending.
- The already represented **`Tum Bin Raaton Se`**, **`Aa Ali Asghar`**, **`Aa Dekh Mere Ghazi`**, **`Aa Sunawaaṅ Shaan Teno`**, **`Aabad Hui Karbobala`**, **`Aao Baba Ko Rukhsat Karo`**, **`Abbas Teri Behno`**, **`Abbas Ka Jab Zikre`**, and **`Aati Hai Gardoon Se`** retain one canonical poem each, with newly linked NohaWriteups source IDs, URLs and hashes.

## Previous TajPoints/NoHayOnline exclusions

- `nohayonline:e1f435fbf6aacc9b96c9`: duplicate of existing `alwida-alwida-alwida-ay-hussain.md`
- `nohayonline:f9a1909d4b7f66481997`: user-confirmed duplicate Marsiya; canonical filename not yet established
- `nohayonline:6a6dbfa5b13110ddf127`: 21 numbered stanza groups already covered by `kabhi-kabhi-main-ye-sochta-hun.md`
- `tajpoints:8d499841ad78e982aa3b`: no new source stanza beyond `aao-baba-ko-rukhsat-karo.md`
- `tajpoints:32ea392a8195c4055d7b`: already represented as bilingual `ab-raat-ho-chuki.md`
- `tajpoints:9ddbb94dcacdd2d88827`: Terms & Conditions, not a poem

## Editorial follow-up before publishing

Every newly staged source draft retains raw source identity and provenance, but the source text alone is **not** proof of finished stanza boundaries, complete Urdu/Roman alignment or canonical transliteration. In particular, nine TajPoints drafts have fewer than five source lines, and the 70 NohaWriteups records include source-level refrain repetitions or unusual spacing needing manual passes.

Three NoHayOnline bilingual sources had literal stray `<` or `r>` debris removed; `nohayonline:1a787a7d7e3008025ff6` may have a missing Urdu opening line and needs review. TajPoints and NoHayOnline alternative editions in `chore/remaining-5294-kalams-2026-11-14` must still be checked before final integration.

**Do not merge as completed lyrics yet.** Nothing in this source staging means automatically accepted, reviewed or published. The historic queue continues to show unadjudicated works until the normal manual reviews and evidence-backed dispositions are complete.
