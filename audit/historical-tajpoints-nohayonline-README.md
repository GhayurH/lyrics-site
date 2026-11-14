# Historical manual-source reconciliation (working branch)

This branch targets `feat/import-overlap-reconciliation-2026-11-05`, not published `main`. Review-only and unapproved source drafts remain `published: false`. Sources and their original compressed HTML/JSON belong to [`GhayurH/kalam-archive-imports` PR #3](https://github.com/GhayurH/kalam-archive-imports/pull/3); do not purge the original captures.

## Decisions and source-to-file mappings

| Historical source batch | Outcome | Records |
| --- | --- | ---: |
| TajPoints | Roman-only newly added drafts | 101 |
| NoHayOnline | Bilingual drafts | 3 |
| NoHayOnline | Roman-only drafts (false Roman-in-Urdu tracks removed) | 3 |
| TajPoints | Sources consolidated into existing bilingual editions | 2 |
| TajPoints/NoHayOnline | Existing duplicates/non-poetry excluded | 6 |
| NohaWriteups, CSV `review-decisions-1.csv` | New, unpublished source drafts | 71 |
| NohaWriteups | Additional source readings mapped to existing Markdown | 13 |
| NohaWriteups | Repeated source captures mapped to a single retained Markdown | 9 |
| NohaWriteups | User excluded “no lyrics” sources | 32 |
| NohaWriteups | Broken historical extraction, successfully recovered | 2 |

The **109 TajPoints/NoHayOnline source-to-file staging records** included two sources already represented by canonical bilingual Markdown: the redundant `Mili Rihaai` extension file was removed and its new stanzas were merged; the accidental replacement of the existing `Ghazi Tere Baad` edition was reversed and its TajPoints source linked instead. There are now **107 newly added TajPoints/NoHayOnline lyric files** (101 + 6) and **71 new NohaWriteups drafts**: **178 newly added lyric MD files** in this PR, plus in-place updates to reviewed existing editions.

- `audit/historical-tajpoints-nohayonline-staging.csv`: initial 109 source identities, with the extension source now linked to its original filename
- `audit/nohawriteups-review-decisions-1-status.csv`: all 125 decisions, source checksums, and retained file paths
- `audit/nohawriteups-review-decisions-1-prepared.json`: original one-time review handoff used to create 70 unpublished MDs; the 71st was created after independent raw-HTML recovery
- The import repository's `review/historical-dispositions.csv` and `review/historical-md-staging.csv`: processed exclusions vs still-pending editorial records

## Consolidated additions

- **`src/data/lyrics/ghazi-tere-baad.md`:** The full vetted Urdu/Roman five-stanza edition was restored after its accidental replacement by a TajPoints Roman draft. The TajPoints source `a267e031f3ec6d147510` contains no extra substantive stanza; its original ID, URL and checksum are now recorded on the canonical file without creating a second file.
- **`src/data/lyrics/mili-rihaai-to-abid-ye-kaam-kar-ke-chale.md`:** Five new three-line stanzas from `tajpoints:7c0ac3f77a854cef0b86` are now included in the **same original bilingual file**, with Roman and Urdu stanza labels **1–9**. The redundant `mili-rehai-tu-abid-ye-kam-kar-ke-chaley-extended.md` no longer exists. The source's garbled line ending “Yehi Husain Alh Aslam Kar Ke Chale” and its provisional Urdu require independent editorial verification before final approval.
- **`src/data/lyrics/masjide-kufa-hai.md`:** The recovered full Urdu verses from `nohawriteups:165979e899de5445d1f4` correspond to the canonical five-stanza bilingual edition. Their source checksum and URL are attached to the original Markdown; no duplicate created.
- **`src/data/lyrics/aawaaz-do-baba-mujhe-aawaaz-do-baba.md`:** The previously truncated Roman fragment `nohawriteups:4458c1687bfc8ea1e3b1` was re-extracted from its immutable gzip source and added as one nine-stanza unpublished draft. The source's “mamloos” phrase remains flagged as uncertain.
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

## Additional NohaWriteups decisions (2026-11-14)

The new cumulative CSV contains 359 decisions, of which all 125 were already covered by `nohawriteups-review-decisions-1-status.csv`. The original uploaded cumulative decisions are preserved as `audit/nohawriteups-review-decisions-2-input.csv`; the 234 newly encountered source IDs appear in `audit/nohawriteups-review-decisions-2-status.csv` with pointers to their archived source metadata in `GhayurH/kalam-archive-imports`.

Of the 234, 20 are excluded as no-lyrics sources; 214 have valid lyric content and seven user-identified duplicate pairs. The `Ay Musalman Kash Socha Hota` pair (`6837975942943b9d74ad` and `71fc831cabef614a2267`) is preserved in one unpublished Roman draft containing the two closing stanzas missing from the four-stanza source. Other new lyric sources are **not yet materialized**, and the other six duplicate pairs require manual comparison, not automatic deletion. The Urdu+Panjabi partially extracted entry still requires recovery. Source captures remain untouched; valid identification is not completion of editorial review.

Further manual consolidation: both `Ay Shaam Ke Logon Mein Binte Ali Hoon` sources share all eight substantive three-line stanzas; one unpublished Roman draft retains both source IDs. `Bay Dard Musalamaan To Khushiyan` has a seven-stanza bilingual source alongside its Roman-only duplicate; one unpublished bilingual draft retains both, with source Urdu spelling awaiting review. The two pairs' four status entries are marked `consolidated_new_draft`.
