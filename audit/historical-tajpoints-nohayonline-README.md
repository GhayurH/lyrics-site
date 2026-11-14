# Historical TajPoints, NoHayOnline, and NohaWriteups source reconciliation

This is an **unpublished source review branch** targeting `feat/import-overlap-reconciliation-2026-11-05`; it is not permission to publish or merge unfinished lyric editions. Historical original captures, metadata, URLs, and checksums remain in [`GhayurH/kalam-archive-imports`](https://github.com/GhayurH/kalam-archive-imports), under `snapshots/`. Do not purge the source archive.

## Sole NohaWriteups status tracker

- **`audit/nohawriteups-review-status.csv`**: the **only** NohaWriteups status tracker. It has exactly one row for each of the **1,387** source IDs supplied in the latest upload, including source provenance, retained canonical filename (if assigned), status and review notes.
- **`audit/nohawriteups-review-decisions-input.csv`**: a preserved exact copy of the latest user classifications, **not** a status tracker.
- **`audit/nohawriteups-review-decisions-1-prepared.json`**: frozen initial 125-source materialization handoff, **not** a status tracker. `scripts/materialize_nohawriteups_batch.py` now only validates the original records against the one cumulative tracker and may not generate a new tracker.
- **`audit/historical-tajpoints-nohayonline-staging.csv`**: separate TajPoints/NoHayOnline initial source-identity manifest, not a NohaWriteups review tracker.
- **`audit/manual-md-review-tracker.csv`**: existing repository-wide lyric editorial review log for the broader 3,310-file integration, not a parallel NohaWriteups disposition tracker.

### Current NohaWriteups dispositions

| Status | Source IDs | Interpretation |
| --- | ---: | --- |
| `unreviewed` | 937 | No user decision; never infer permission to import or delete |
| `pending_manual_dedup` | 268 | User has classified the language/lyrics, but source-to-canonical reconciliation remains |
| `no_lyrics` | 59 | User-approved exclusions; no lyric Markdown; archive snapshots retained |
| `duplicate_source` | 9 | Identical earlier source readings linked to retained edition |
| `consolidated_existing` | 20 | Fully or substantially matched to a pre-existing Markdown, retained and linked |
| `unpublished_source_draft` | 78 | New poem file staged from an explicitly approved lyric source; editorial work pending |
| `consolidated_new_draft` | 16 | Eight duplicate pairs merged into eight newly staged canonical files |
| **Total** | **1,387** | **No open explicitly flagged duplicate pairs** |

The 78 individual drafts and the eight merged-pair files constitute **86 newly staged NohaWriteups lyric files**, all `published: false`. These are **source staging**, not the completed manual Urdu, Roman transliteration, stanza identity, metadata, and audio/print verification passes.

## Source-specific adjudication rules and exceptions

Keep *one canonical Markdown per distinct composition*. Do not merge by similar titles alone. Compare real verses, including stanza continuations and scripts. Keep every unique stanza, and record any unresolved conflicting readings without overwriting a previously reviewed Urdu or Roman line. Add source IDs, original URLs, and raw source hashes on the canonical file. Repeated refrains and explicitly duplicated x2 markers should not turn into extra stanza text. Do not confuse the English translation field with Roman transliteration. Panjabi Urdu-script verse is not a Roman Urdu translation; retain it even where the present site schema lacks a separate Panjabi edition.

**Eight explicitly flagged pair consolidations:**
- `Ay Musalman Kash Socha Hota`: two alternative sources, full six-stanza version kept, including two extra closing stanzas
- `Ay Shaam Ke Logon Mein Binte Ali Hoon`: two matching eight-stanza Roman sources consolidated
- `Bay Dard Musalamaan To Khushiyan`: the bilingual source and shorter Roman-only reading combined without discarding Urdu
- `Abh Bhi Aati Hai Sakina Ki Sadain Logon`: two six-stanza Roman source readings consolidated
- `Aajao Chaand Mere Teri Pyaas Mein`: fuller six-stanza source kept rather than the four-stanza abridgment
- `Akhiyan Fazal Diyan Takdiyan Reh Gaiyan`: two Roman Panjabi sources consolidated
- `Baba Jan Shimr Ne Jab`: same multi-section poem in two captures; original Farsi interlude retained once
- `Bhare Darbar Mein Roti Rahi Khari Zehra`: bilingual source has an Urdu-only Murtaza-and-rope stanza absent from the shared Roman version; **all eight** retained in one bilingual draft

**Recovered broken or mislabeled extraction:**
- `deeva-baleya-na-phul-paaey-eh.md`: six restored Roman Panjabi stanzas
- `dukhte-hain-mere-kaan.md`: source English translation removed from mistaken Roman track, genuine Roman transliteration supplied
- `ajeeb-qaidi-hain-sare-quran-parhte-hain.md`: Urdu and Panjabi original-script versions kept in a single unpublished draft pending separate Panjabi-edition representation

**Existing editions linked rather than duplicated:** `andhere-dasht-may.md`, `abbas-ay-shere-nayastan-e-haider.md`, `ay-bekafan-hussain.md`, `ajeeb-hai-dastane.md`, `darya-behta-raha.md` `bibi-madina-aagaya.md` and `ay-maut-teher-ja.md`. The last still has a **source-specific stanza-5 variant** needing independent verification; its original canonical text was not replaced. Similarly titled but *different* lyrics are preserved separately as `aye-baade-saba-jake-ye-ammu.md`, `binte-zahra-ka-khula-sar-hai-khuda-khair-kare.md`, `ay-mere-baba-jan-darbar-e-sham.md`, and `dil-mein-karbala-hai.md`.

## Original TajPoints and NoHayOnline pass

The initial source-identity manifest contains **109 TajPoints/NoHayOnline records**. Two additional historical captures were linked directly into pre-existing bilingual canonical poems; **107** individual lyric drafts were newly staged (101 TajPoints Roman only, three NoHayOnline bilingual, three Roman only). The initial NohaWriteups 125-source batch added 71 draft poems; total source staging continues in this branch.

- `ghazi-tere-baad.md`: canonical bilingual Urdu/Roman restored; TajPoints `a267e031f3ec6d147510` linked without creating another lyric
- `mili-rihaai-to-abid-ye-kaam-kar-ke-chale.md`: five additional stanzas merged into the *original* bilingual poem, now nine total. Its incoming corrupted source line **still requires independent verification**
- `masjide-kufa-hai.md`: extra source `nohawriteups:165979e899de5445d1f4` independently recovered and linked to existing five-stanza bilingual edition
- `aawaaz-do-baba-mujhe-aawaaz-do-baba.md`: nine-stanza Roman original re-extracted from archived HTML, with disputed source word pending proof
- `logo-main-zainab-haan-meri-yasrab-wich-toqeer.md`: two NohaWriteups Urdu-script Panjabi source duplicates consolidated with the original TajPoints Roman, audio alignment still pending
- `nohayonline:1a787a7d7e3008025ff6`: missing Urdu opening line suspected; remains editorial follow-up

## Remaining manual work

**268 individually classified NohaWriteups sources** still need full comparisons against every relevant existing lyric edition, and **937 blank CSV records** have no classification yet. After deduplication, remaining valid poems need source-grounded stanza alignment, transliteration according to `docs/` conventions, Urdu completeness, metadata and original-source verification. No `published: false` draft has been automatically declared complete.

Do not claim successful `npm run source:sync`, `npm run check`, or `npm run build` until the branch has actually been checked. The source archive in the import repository must remain untouched.
