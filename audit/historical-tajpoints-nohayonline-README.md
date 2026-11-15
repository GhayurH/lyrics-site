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
| `unreviewed` | 0 | Every source now has a user classification |
| `pending_manual_dedup` | 1053 | User has classified the language/lyrics, but source-to-canonical reconciliation remains |
| `no_lyrics` | 136 | User-approved exclusions; no lyric Markdown; archive snapshots retained |
| `duplicate_source` | 9 | Identical earlier source readings linked to retained edition |
| `consolidated_other_branch` | 26 | Canonical kalam retained on `chore/remaining-5294-kalams-2026-11-14` with source IDs and hashes added there |
| `consolidated_existing` | 53 | Fully or substantially matched to a pre-existing Markdown, retained and linked |
| `unpublished_source_draft` | 78 | New poem file staged from an explicitly approved lyric source; editorial work pending |
| `consolidated_new_draft` | 31 | Fifteen duplicate groups consolidated into fifteen unpublished canonical files |
| `excluded_user` | 1 | User requested exclusion without identifying duplicate or no-lyric reason; no lyric draft created |
| **Total** | **1,387** | **1,053 classified sources still require verse-level manual deduplication** |

The 78 individual drafts and fifteen duplicate-group canonical files constitute **93 newly staged NohaWriteups lyric files**, all `published: false`. These are **source staging**, not the completed manual Urdu, Roman transliteration, stanza identity, metadata, and audio/print verification passes.

## Source-specific adjudication rules and exceptions

Keep *one canonical Markdown per distinct composition*. Do not merge by similar titles alone. Compare real verses, including stanza continuations and scripts. Keep every unique stanza, and record any unresolved conflicting readings without overwriting a previously reviewed Urdu or Roman line. Add source IDs, original URLs, and raw source hashes on the canonical file. Repeated refrains and explicitly duplicated x2 markers should not turn into extra stanza text. Do not confuse the English translation field with Roman transliteration. Panjabi Urdu-script verse is not a Roman Urdu translation; retain it even where the present site schema lacks a separate Panjabi edition.

**Ten original or newly discovered duplicate pair consolidations:**
- `Ay Musalman Kash Socha Hota`: two alternative sources, full six-stanza version kept, including two extra closing stanzas
- `Ay Shaam Ke Logon Mein Binte Ali Hoon`: two matching eight-stanza Roman sources consolidated
- `Bay Dard Musalamaan To Khushiyan`: the bilingual source and shorter Roman-only reading combined without discarding Urdu
- `Abh Bhi Aati Hai Sakina Ki Sadain Logon`: two six-stanza Roman source readings consolidated
- `Aajao Chaand Mere Teri Pyaas Mein`: fuller six-stanza source kept rather than the four-stanza abridgment
- `Akhiyan Fazal Diyan Takdiyan Reh Gaiyan`: two Roman Panjabi sources consolidated
- `Baba Jan Shimr Ne Jab`: same multi-section poem in two captures; original Farsi interlude retained once
- `Bhare Darbar Mein Roti Rahi Khari Zehra`: bilingual source has an Urdu-only Murtaza-and-rope stanza absent from the shared Roman version; **all eight** retained in one bilingual draft
- `Akbar Hun Tay Aja Vatana Tay`: both source captures have the same five Panjabi Roman stanzas; one unpublished draft retains both IDs
- `Akbar Veeran Nanay De Rozay Jakay`: both NohaWriteups source captures contain the same five Panjabi stanzas; one unpublished Roman draft retains both IDs

**Recovered broken or mislabeled extraction:**
- `deeva-baleya-na-phul-paaey-eh.md`: six restored Roman Panjabi stanzas
- `dukhte-hain-mere-kaan.md`: source English translation removed from mistaken Roman track, genuine Roman transliteration supplied
- `ajeeb-qaidi-hain-sare-quran-parhte-hain.md`: Urdu and Panjabi original-script versions kept in a single unpublished draft pending separate Panjabi-edition representation

**Existing editions linked rather than duplicated:** `andhere-dasht-may.md`, `abbas-ay-shere-nayastan-e-haider.md`, `ay-bekafan-hussain.md`, `ajeeb-hai-dastane.md`, `darya-behta-raha.md` `bibi-madina-aagaya.md` `ay-maut-teher-ja.md`, `dekhe-to-koi.md`, `ay-mere-hussain.md`, `amma-fizza-bata-de.md`, and `acha-kiya-baba.md`. The last still has a **source-specific stanza-5 variant** needing independent verification; its original canonical text was not replaced. Similarly titled but *different* lyrics are preserved separately as `aye-baade-saba-jake-ye-ammu.md`, `binte-zahra-ka-khula-sar-hai-khuda-khair-kare.md`, `ay-mere-baba-jan-darbar-e-sham.md`, and `dil-mein-karbala-hai.md`.

## Original TajPoints and NoHayOnline pass

The initial source-identity manifest contains **109 TajPoints/NoHayOnline records**. Two additional historical captures were linked directly into pre-existing bilingual canonical poems; **107** individual lyric drafts were newly staged (101 TajPoints Roman only, three NoHayOnline bilingual, three Roman only). The initial NohaWriteups 125-source batch added 71 draft poems; total source staging continues in this branch.

- `ghazi-tere-baad.md`: canonical bilingual Urdu/Roman restored; TajPoints `a267e031f3ec6d147510` linked without creating another lyric
- `mili-rihaai-to-abid-ye-kaam-kar-ke-chale.md`: five additional stanzas merged into the *original* bilingual poem, now nine total. Its incoming corrupted source line **still requires independent verification**
- `masjide-kufa-hai.md`: extra source `nohawriteups:165979e899de5445d1f4` independently recovered and linked to existing five-stanza bilingual edition
- `aawaaz-do-baba-mujhe-aawaaz-do-baba.md`: nine-stanza Roman original re-extracted from archived HTML, with disputed source word pending proof
- `logo-main-zainab-haan-meri-yasrab-wich-toqeer.md`: two NohaWriteups Urdu-script Panjabi source duplicates consolidated with the original TajPoints Roman, audio alignment still pending
- `nohayonline:1a787a7d7e3008025ff6`: missing Urdu opening line suspected; remains editorial follow-up

## Remaining manual work

**1,053 individually classified NohaWriteups sources** still need full comparisons against every relevant existing lyric edition, and **0 blank CSV records** have no classification yet. After deduplication, remaining valid poems need source-grounded stanza alignment, transliteration according to `docs/` conventions, Urdu completeness, metadata and original-source verification. No `published: false` draft has been automatically declared complete.

Do not claim successful `npm run source:sync`, `npm run check`, or `npm run build` until the branch has actually been checked. The source archive in the import repository must remain untouched.


## Cross-branch manual deduplication (November 14, 2026)

Inspected repo branches: `main` (129 lyrics), `feat/import-overlap-reconciliation-2026-11-05` (3,438 lyrics), `chore/remaining-5294-kalams-2026-11-14` (5,423 lyrics), and this historical branch (3,631 lyrics at start). The historical branch already contains all main lyric filenames and all but one import-overlap lyric filename; the remaining-kalams branch contributes 5,294 filenames absent here. These inventories are candidate searches **only**; equivalent verses, not titles or slugs alone, establish a match.

Nineteen source records were matched directly with material retained in the `chore/remaining-5294-kalams-2026-11-14` branch, all with provenance added **to the other branch's own canonical MD** and a `consolidated_other_branch` row here:
- `Agai Bint-e-Ali Be Rida Haath Bandhay` -> `aa-gayi-bint-e-ali-be-rida-hath-bandhay-bhare-bazaroon-mein-very-sad-l-tajpoint-20f23185f8ca1078dd31.md`
- `Aye Rozadaro Khaak Uraao` -> `aye-rozadaro-khaak-uraao-mesum-abbas-tajpoints-6c846f699349cf24ed81.md`
- `Aey Neher-e-Alqama` -> `aey-neher-e-alqama-nadeem-sarwar-tajpoints-87f883611bc7b3d7b764.md`
- `Askari Mola` -> `askari-mola-tajpoints-53084daa8c02d6c14c81.md`
- `Bazar Disday Rahay` -> `bazar-disday-ray-sham-neray-aoundi-rayi-lyrics-2016-tajpoints-be9e6360572c59323337.md`
- `Chacha Mai Aapki Turbat` -> `chacha-main-aap-ki-turbat-banane-aaya-hoon-mir-hasan-lyrics-2017-tajpoints-2865a6344cfc74f55d4e.md`
- `Awaz To De Akbar` -> `aawaz-tu-de-akbar-tajpoints-099c795a67412fd66f65.md`
- `Baghdad De Qaidi Nu` -> `baghdad-de-qaidi-nu-jadon-ujriyaan-dhiyaan-ne-lyrics-2005-tajpoints-8bcdec537d5305f1262d.md`
- `Ali Walon Ko Ali Mubarak` -> `ali-walon-ko-ali-mubarak-syed-raza-abbas-zaidi-lyrics-2024-tajpoints-f2749797c2810830973a.md` — its original Roman is retained and newly recovered Urdu is merged **in the same MD**; final Urdu source-word and Roman stanza-alignment review remain.

Eleven other source readings were newly linked with already complete bilingual poems **on this historical branch**, including `bano-ka-naunehal.md`, `ay-sheh-ke-alamdar.md`, `akbare-kadiyal-jawan.md`, `behan-mai-saath-saath.md`, `akbar-ne-kaha-rokar.md`, `ay-madina-ghazab.md`, `ay-azadare-hussaini-ye.md`, and `akbar-teri-laash.md`. The five-stanza `Akbar Hun Tay Aja Vatana Tay` appears as two additional source IDs but one draft.

**Avoid false merges:** `Ay Mere Bhai Raza` differs from the similarly titled complete poem in this branch; `Aey Waey Nehr-e-Alqama` is *not* `Darya Behta Raha`; `Abhi Khanjar Na Chala` differs from the `Shimr Khanjar Na Chala` chore version; `Baba Teri Zahra Nu Ik Payshi Maar` is a different poem from `Teri Zahra Nu Tere Musalmana Maar Mukaya Aye`. Those individual records have source-supported notes but are still pending a full alternate-title search.

**Outstanding:** 1,053 classified source IDs require full manual source-to-branch deduplication; 0 lack a user disposition. Existing remaining-branch imports often have incorrectly packed stanza groups; linking a source does **not** certify editorial completeness. No second NohaWriteups status tracker was generated. Builds/CI have not been run on unfinished source staging.


### Additional cross-branch pass (source-backed verification)

Further verified canonical consolidations into the historical bilingual MDs: `bhaiya-ghareeb-zainab.md`, `aaram-kahan.md`, `asghar-ka-janaza.md`, `bas-raaj-karegi.md`, `chal-sakina-chale.md`, `alam-sajao-kisi.md`, `amma-achi-meri.md`, `amma-baar-baar.md`, and `bekas-pardesi.md`. The `bekas-pardesi.md` canonical contains an additional Sakina stanza absent from the shorter NohaWriteups source, and remains the fullest version.

Further NohaWriteups sources linked directly to chore/remaining-5294-kalams-2026-11-14 canons: `baba-main-hussain-da-ki-haal-sunawaan-lyrics-2018-tajpoints-56b192b4582ed388e7e7.md`, `ali-ki-beti-safar-tera-aaj-se-hai-shorow-tajpoints-5d1d861dbecd5b9a5fab.md`, `betay-ky-qatilon-sy-mir-hasan-mir-tajpoints-a83907b5bfa3773b9b76.md`, and `aye-zamin-e-ghareeban-lajpaal-raza-maula-lyrics-2018-tajpoints-6cdfeb1743b043927e49.md`. Source-side alternate lines of `Ali Ki Beti Safar Tera` are recorded separately in frontmatter rather than overruling the retained TajPoints edition.

`nohawriteups:6fca5b544d7d264154b3` was confirmed as a third capture of `deeva-baleya-na-phul-paaey-eh.md`; all six Panjabi stanzas are already retained, with differing source order. Two previously unpaired Akbar Veeran source IDs were newly consolidated into a single unpublished `akbar-veeran-nanay-de-rozay-jakay.md` file. They are included in the 20 `consolidated_new_draft` source rows.

**Current cumulative statuses:** 0 `unreviewed`, 1,053 `pending_manual_dedup`, 136 `no_lyrics`, 1 `excluded_user`, 9 `duplicate_source`, 53 `consolidated_existing`, 26 `consolidated_other_branch`, 78 `unpublished_source_draft`, 31 `consolidated_new_draft` = **1,387**. Every source now has a user-supplied disposition; deduplication and original-source recovery are not yet complete. Source reconciliation is not equivalent to completed stanza/transliteration/Urdu editorial review. No CI or build was run on these WIP branches.


## November 15 review-decisions(2).csv integration

The latest complete 1,387-row source decision upload adds **575 new classifications**, without overwriting previous manual reconciliations: **46** further records explicitly marked `no lyrics, delete`, **1** unqualified `delete` held separately as `excluded_user`, and **528** additional records initially requiring complete source-to-canonical verification (including the two explicitly labelled `Duplicate - delete`). **362** rows remain blank. Existing canonical links and unpublished drafts remain untouched. Original source snapshots are never deleted.

The upload includes newly identified duplicate-candidate pairs and original/live HTML recovery requests, including missing Roman stanzas, mislabeled English translation, and Urdu/Panjabi/Saraiki/Balochi combinations. These are recorded in the **sole** `nohawriteups-review-status.csv` with explicit partner source IDs where supplied. A source's user classification is **not** proof of cross-branch equivalence, lyric completeness, or editorial sign-off. Pending sources require verse-level comparison against `main`, `feat/import-overlap-reconciliation-2026-11-05`, and `chore/remaining-5294-kalams-2026-11-14` before a new canonical Markdown, a consolidation, or deletion of any duplicate draft. The CSV `nohawriteups-review-decisions-input.csv` retains the supplied decision data for provenance, and is **not** a second status tracker.


### Verified duplicate pairs against published sources and other branches

- `nohawriteups:4d1ef15bf9632e52eecc` and `nohawriteups:ba3f5e9e5f480b3532a3` -> existing full seven-stanza bilingual `goonji-bawaqt-e-asr.md`. The second is abridged to five stanzas; divergent Akbar-couplet words are documented without rewriting the existing Urdu/Roman edition. The similarly titled TajPoints file in `chore/remaining-5294-kalams-2026-11-14` contains the same composition with packed stanzas, not a separate kalam.
- `nohawriteups:42705960ec7ff34ffd1f` and `nohawriteups:740ea918d52b4c9c7986` -> existing eleven-stanza bilingual `hussain-ruk-jao.md`, after rejecting the source sites' promotional lines and repeated interjections.
- `nohawriteups:b62210e4cb0bc55e91e0` and `nohawriteups:83a44bf3fac3a3257e63` -> `chore/remaining-5294-kalams-2026-11-14/src/data/lyrics/haider-ka-musalmaan-ne-jo-khon-bahaya-hai-tajpoints-c6b0a3885e4bbee6af8d.md`. Both captured sites have five matching couplets; the TajPoints source additionally retains a sixth. Its own branch now has both NohaWriteups provenance links. No duplicate Markdown staged here.

All six linked source IDs have canonical path, original URL, archived SHA, and source-specific variant notes in the single status tracker. **744** classified sources remain for full manual dedup. No text of existing canonical lyrics was changed for these six sources.


## November 15: completed decision classifications from review-decisions(3).csv

All **1,387 source IDs** now have user classifications; latest upload supplied **362** new classifications while preserving the earlier **1,025**. Of the 362, **31** explicitly have no lyrics; **331** are lyric sources or unverified duplicate candidates requiring manual cross-branch dedup. User's newly highlighted three-source group and duplicate pairs are retained as explicit review notes; one source has an extraction that appears to belong to the wrong composition rather than its reported metadata. **No extracted text was treated as authoritative in such cases.**

The sole cumulative status tracker remains `audit/nohawriteups-review-status.csv`; `audit/nohawriteups-review-decisions-input.csv` is an immutable copy of the latest input, not an alternative tracker. Existing linked original sources, canonical files, reviewed wording, and archive snapshots are preserved. All **1,053** unpaired classified lyric sources require further individual, real-verse comparisons before staging or consolidation. This count is a task count, not a claim that 1,053 duplicate kalams exist.


### Verified new source-to-source consolidation (November 15, 2026)

- `raitaan-ch-dul-gaye-qasim-di-mehndi.md`: 3 original NohaWriteups captures of the same seven-stanza Roman Panjabi noha; all distinct verses preserved, alternative stanza-six ending documented.
- `ranj-na-ho-mera-bhira.md`: two Roman Panjabi captures; the fuller five-stanza version includes the Asghar/Rubab stanza omitted by the shorter four-stanza reading.
- `zahra-tere-ghulshan-may.md`: two Roman noha captures of the same four-stanza composition; variants documented.

These seven source records are `consolidated_new_draft`, leaving **1,056** classified sources for manual dedup. All three canonical Markdown drafts are `published: false`, have source IDs, URLs and archived hashes, and require further transliteration/Urdu/editorial review; no assertion of publication readiness.


### Further verified manual deduplication (November 15)

- `kalmago-ye-to-bata.md` linked to two NohaWriteups six-stanza sources; original seven-stanza Urdu/Roman version remains canonical.
- `uncha-rahe-apna-alam.md` linked to two NohaWriteups Roman readings of the ten-stanza bilingual poem.
- `chore/remaining-5294-kalams-2026-11-14` has four source links on its own full TajPoints canons for `okha-ho-gaya-akbar-layi-sughra-nu...` and `paya-kamar-jhuka-abid...`; original TajPoints content kept, including additional stanza material.
- `paikan-baras-rahay-hai-taboot-pay-hassan-kai.md` newly staged from two matching six-stanza Roman originals. Text is especially corrupted and marked for manual language reconstruction before publication.
- `so-rahe-hain-sab-mere-waali-o-dilbar-rait-par.md` newly staged from both six-stanza Roman sources, with the source's four-line preamble retained separately and its poet/reciter metadata recovered.

All newly created drafts remain `published: false`, with user-supplied classification, full original provenance and explicit editorial caveats. The single status tracker now has **1,053** pending source records. Builds/CI have not been run on unfinished staging branches.


### Three additional reviewed source records

- `nohawriteups:cbe6973716de43964dc0`: six-stanza Roman source linked to existing eight-stanza bilingual published `maula-haq-imam.md`, preserving the fuller canonical.
- `nohawriteups:b6379574a360f56459ef`: two complete source stanzas linked to bilingual `ye-kaunsi-mastoor-hai.md`.
- `nohawriteups:7fc25480ca4e9ff2dc93`: original page is mislabeled `Shagan Manawan`; actual captured Urdu lyrics are the seven-stanza `Mera Akbar Maar Diya`. The real text, NOT the page-title or poet metadata, was merged with existing TajPoints Roman on the `chore/remaining-5294-kalams-2026-11-14` branch in the same canonical file.

`nohawriteups:f1262a2bddc11a668f9f` remains pending because its source contains a photograph of lyrics, not machine-readable verse; identical title alone is insufficient evidence to delete the source without verifying the scan. **1,053** remain pending manual deduplication; no build or CI was run.
