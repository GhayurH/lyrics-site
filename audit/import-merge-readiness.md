# Import merge readiness

## Scope and authority

Only standalone lyric content, the recitation identity registry (only existing `main` IDs are permanent before this feature merges) and audit data are intended to be imported. The feature branch already contains current `main` (`cd3f875`) as an ancestor. The two documentation files changed earlier on the feature branch were restored to their `main` contents. Compatibility changes to the content schema, script-aware reader descriptions, and language validation are necessary for the new poems; otherwise `main` code remains authoritative.

## Cohort register

The single `audit/lyric-md-rounds.csv` records all original and imported source paths. Do not split or replace this register for round two: append the chore-branch files using `round_2`, preserving rows for merged or rejected candidates.

- Original `main` lyric Markdown cohort: **129**; **128 active** and one removed original whose published ID stays retired.
- Round-one imported candidates: **3,309**.
- Round-one active files: **3,295**; one consolidated duplicate, thirteen other round-one files deleted across manual passes, and one surviving poem renamed.
- Total active standalone lyric Markdown files: **3,423**.
- Former `ana-ibne-makkah.md`: status `consolidated` in the CSV, merged into the survivor now named `ana-ibn-e-makka-o-mina.md`. The better complete notebook Urdu/Roman text (14 substantive stanzas) was retained. Its distinct NoHayOnline source ID, URL, poet, reciter, alternate title and source-specific chant are documented in the survivor. The redundant segmented copy had 25 Roman versus 21 Urdu segments.

The original `audit/manual-md-review-tracker.csv` records all thirteen round-one deletions, the retired original, and the rename, preserving prior review history; `audit/lyric-md-rounds.csv` marks the three deleted paths `removed_duplicate`, the previously consolidated source `consolidated`, the old filename `renamed`, and the new filename `present`.

## Latest deletion and Basta review (2026-11-15)

- Ten newly deleted round-one lyrics had their **unmerged provisional IDs purged**, including the custom ID `muhammad-e-baqir-sibt-e-jafar`.
- `zahoor-ka-waqt-aa-gaya-hai.md` was an existing `main` lyric: its published ID is **retired rather than purged** after removing the standalone file in favor of Basta 388-389.
- The user edited Basta pages **363, 380, 381, 388, 389, 391**. An independent catalog comparison found ten affected Basta kalams, all with **zero individually locked stanzas**, so no stanza IDs or Basta kalam IDs need changing. All Basta identity-lock records remain identical to `main`. The Basta index titles are synchronized to the edited Urdu/Roman pages, including the individually verified Muhammad-e-Baqir title on page 381; index section numbers and printed page assignments are unchanged.
- Both existing CSV trackers retain all removed paths as historical review records and preserve provenance, prior review notes, and the distinction between original and round-one source files.

## Language-specific editions (2026-11-15)

- Manually added four stanza-aligned Roman Balti blocks in `abbas-alamdar-balti.md`; original Balti untouched. Source pronunciations still require a native-speaker verification (partial review).
- Manually wrote the complete **Shahmukhi Panjabi** edition of `uth-nana-mere-dard-wandaa-main-veer-kuha-k-ai-han.md` (opening couplet and five numbered triplets). The previous Roman text is preserved unchanged under `romanLyrics` and the script editions align line by line. Language remains Panjabi/pa, direction is now rtl, and the obsolete noUrdu tag was removed. Uncertain phonetic source words remain partial_review pending speaker/audio verification.
- Confirmed `heart-of-hussain.md`, `karbala-karbala-english.md`, and `the-one-and-only-hussain.md` were already correctly marked English/en/ltr. No Roman Urdu edition is expected: English is now exempt from Roman Urdu source lint and normalization, without weakening generic text checks or adding noRoman tags.
- The Roman Urdu normalizer now also leaves Balti and Panjabi native editions untouched. Readers distinguish English native originals and bilingual Shahmukhi/Roman Panjabi and Balti without mislabelling English as Roman Urdu. Targeted tests use these five actual files.
- The older unrelated full-corpus source-check blockers remain open.

## Ana Ali Yabnul manual source reconciliation (2026-11-15)

- Removed the unused `toolbar` locator in `tests/browser/recitation.spec.mjs` so Astro/TypeScript no longer reports its ts(6133) hint.
- `ana-ali-yabnul.md` previously had **57 Roman versus 46 Urdu physical verse lines**. The Roman stream included six repeated lines already present in the matching stanzas, and a separate repeat of the Arabic opening chant that enclosed three source-only Arabic rajaz lines. Preserved the three *unique* lines and manually transcribed their Arabic-script counterparts instead of discarding unique material.
- Both editions now have **49 verse lines**, with equivalent preamble/intro blocks of four and seven lines and **nine identically numbered stanzas** (4, 4, 4, 6, 4, 4, 4, 4, 4 lines). All preexisting 46 Urdu verse lines and all non-duplicate Roman lines are retained. Source differences were compared to the NoHayOnline poem and the supplemental 2013 Roman source; the three restored Arabic lines require a further recitation or native-language spelling check, so transliteration and Urdu completeness remain `partial_review` rather than claiming verified wording.
- Updated the existing manual tracker without creating a new status register; added a source-aware structural regression test while keeping the unchanged original recitation identity.

## Full Roman Urdu normalization review (2026-11-15)

- Applied the source-aware Roman normalizer to the entire current corpus: **2,977 files with proposed edits** out of 3,877 scanned. Only Roman verses and explicitly Roman-related heading metadata were eligible; Urdu source text, stanza structure, identity locks and unrelated metadata were unchanged.
- Updated the sole house transliteration standard to **جواں → jawaaṅ**, not `jawaṅ`; preserved the difference between nasalized **جواں** and ordinary **جوان**. Added regression tests for source-backed Roman verse spellings and matching Roman titles.
- This is a **proposed mechanical editorial batch, pending human acceptance**; no entries in `audit/manual-md-review-tracker.csv` were marked manually reviewed by automation. Inspect or revert individual changes before final branch merge.
- Post-run validation reports **zero remaining deterministic Roman normalization changes**, without implying that source-specific pronunciation, incomplete editions or pre-existing editorial regression findings have been resolved.

## Metadata and stanza preparation

- All 3,309 initial round-one additions were changed to `published: true`; one has since been consolidated. Original publication flags were preserved.
- Removed 3,306 obsolete `noImage` tags. No standalone image `cover` or `coverAlt` metadata remained in the preparatory scan.
- Corrected 81 pre-existing standalone stanza number markers, then numbered 362 stanza blocks across 58 previously unnumbered poems in both scripts. Introductory material and repeated choruses were reviewed separately from numbered stanzas.
- `language` represents the poem's actual language; `lang` is its machine-readable BCP 47/ISO code. Roman transliteration is a reading edition, not an independent language filter choice. Roman-only Urdu uses `language: Urdu`, `lang: ur`, `direction: ltr`.
- `abbas-alamdar-balti.md` declares `language: Balti`, `lang: bft`. Thirteen Panjabi items now declare `language: Panjabi`, `lang: pa`; language-only `Punjabi`/`Panjabi` tags were removed as redundant.
- Consolidated `Salaam` into `Salam` (10 entries); normalized 266 poet credits and 47 reciter credits in the second preparation pass, plus 97 additional reciter occurrences of `Mir Hassan Mir` to `Mir Hasan Mir`. The earlier first pass included the Rehan Azmi variants. Unverified fuzzy similarities must not be merged automatically.
- Twelve reused temporary notebook `source_id` comments were converted to non-unique provenance notes, retaining actual external source IDs and URLs.
- `audit/metadata-review.csv` contains no remaining *confirmed exact-equivalence spelling clusters* after these normalizations; this is not a claim that every similar-looking personal name represents the same person.

## Recitation and routing

The **129 identities inherited from `main` are permanent**. The identities assigned to this branch's unmerged imports are **provisional until merge/deployment**: deletion or rename before merge removes the old provisional ID outright, rather than registering a retirement. On 2026-11-15, commit [`405785b`](https://github.com/GhayurH/lyrics-site/commit/405785b276a11e2e1b2cc879f721b137a922f962) purged five stale provisional records: `ana-ibne-makkah` (previously incorrectly retired), `abid-ko-dawa-aur`, `abid-na-kabhi-ranj`, `ay-ahle-aza`, and `bayaan-karta-hun-darbar-e-shaam-ka-manzar`. The renamed survivor `ana-ibn-e-makka-o-mina.md` received its **new** explicit `recitationId: ana-ibn-e-makka-o-mina`. The lock now contains **3,423 active lyric IDs** plus **one retired published ID from `main`**. No surviving original `main` IDs or Basta identities were changed. The recitation identity script's `--check` passed; it validates the *current* lock, not the pre-merge immutability policy, so future import removals or renames must also update the lock before merging.

The two duplicate *search alias* pairs were checked against actual Urdu text and source credits and are **different poems**, not duplicate routes: `hussain-o-minni` versus `hussaino-minni`, and `shaam-e-ghariban` versus `shaame-ghariban`. Their filename-based URLs and separate recitation IDs are distinct. No literal source URL duplicate was identified in the initial provenance scan.

## Merge gate — NOT READY

Validation on 2026-11-15 is **blocked**. The `[check-ci] [full-ci]` run [43724585532](https://github.com/GhayurH/lyrics-site/actions/runs/43724585532) passed the Astro/TypeScript schema check and **164/164 unit tests**. Its production build stopped at source validation on one malformed Bibi ZWNJ sequence, which was then fixed in `zehra-hasan-hussain-ki-parwardigar-hai.md`.

The independent source-stage run [43724776310](https://github.com/GhayurH/lyrics-site/actions/runs/43724776310) after that correction found:

- **PASS**: canonical Bibi/ZWNJ spellings (0 files); Basta-index source labels; permanent Recitation Set identity lock.
- **BLOCKING**: Roman normalization would change **2,962 files** out of 3,891 scanned. These are source-aligned orthographic proposals and **were not automatically applied** because transliteration is under manual editorial review. Audit approved changes before modifying those verses.
- **BLOCKING**: editorial regression gate shows **103 new or structural findings**; overall content review reports **132 findings in 54 files**. Categories: invisible/control characters (42), Roman honorific/name spellings (37), unverified imported text (29), Latin characters in Urdu titles (12) and verse lines (8), unexpected script (2), a missing Roman edition (1), and invalid Roman formatting (1). Some intentional Urdu ZWNJs require review rather than blanket deletion.
- **PASS (independent diagnostics):** a production Astro build and Pagefind generation succeeded, followed by **73/73 Playwright browser tests** in [43725061261](https://github.com/GhayurH/lyrics-site/actions/runs/43725061261). This diagnostic deliberately bypassed the failing source:check prebuild stage to assess rendering; it does **not** make the official merge check green.

The latest identity-only reconciliation separately passed Astro/TypeScript checks, the permanent-ID validator, and **164/164 unit tests**. This does not resolve the earlier Roman normalization and editorial regression blockers.

**Do not merge yet.** Manually reconcile the Roman normalization proposals and investigate the editorial warnings; rerun the full green PR validation afterwards. Keep `main`'s Basta content and permanent IDs unchanged.
