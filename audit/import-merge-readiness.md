# Import merge readiness

## Scope and authority

Only standalone lyric content, the recitation identity registry (only existing `main` IDs are permanent before this feature merges) and audit data are intended to be imported. The feature branch already contains current `main` (`cd3f875`) as an ancestor. The two documentation files changed earlier on the feature branch were restored to their `main` contents. Compatibility changes to the content schema, script-aware reader descriptions, and language validation are necessary for the new poems; otherwise `main` code remains authoritative.

## Cohort register

The single `audit/lyric-md-rounds.csv` records all original and imported source paths. Do not split or replace this register for round two: append the chore-branch files using `round_2`, preserving rows for merged or rejected candidates.

- Original `main` lyric Markdown: **129** (preserve existing IDs and editorial authority).
- Round-one imported candidates: **3,309**.
- Round-one active files: **3,305**; one duplicate was consolidated, three additional duplicates deleted, and a surviving poem renamed.
- Total active standalone lyric Markdown files: **3,434**.
- Former `ana-ibne-makkah.md`: status `consolidated` in the CSV, merged into the survivor now named `ana-ibn-e-makka-o-mina.md`. The better complete notebook Urdu/Roman text (14 substantive stanzas) was retained. Its distinct NoHayOnline source ID, URL, poet, reciter, alternate title and source-specific chant are documented in the survivor. The redundant segmented copy had 25 Roman versus 21 Urdu segments.

The original `audit/manual-md-review-tracker.csv` also records these three deletions and the rename, preserving both pre- and post-rename review history; `audit/lyric-md-rounds.csv` marks the three deleted paths `removed_duplicate`, the previously consolidated source `consolidated`, the old filename `renamed`, and the new filename `present`.

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

The **129 identities inherited from `main` are permanent**. The identities assigned to this branch's unmerged imports are **provisional until merge/deployment**: deletion or rename before merge removes the old provisional ID outright, rather than registering a retirement. On 2026-11-15, commit [`405785b`](https://github.com/GhayurH/lyrics-site/commit/405785b276a11e2e1b2cc879f721b137a922f962) purged five stale provisional records: `ana-ibne-makkah` (previously incorrectly retired), `abid-ko-dawa-aur`, `abid-na-kabhi-ranj`, `ay-ahle-aza`, and `bayaan-karta-hun-darbar-e-shaam-ka-manzar`. The renamed survivor `ana-ibn-e-makka-o-mina.md` received its **new** explicit `recitationId: ana-ibn-e-makka-o-mina`. The lock now has **3,434 active lyric IDs**, exactly matching the current Markdown corpus. No `main` IDs or Basta identities were changed. The recitation identity script's `--check` passed; it validates the *current* lock, not the pre-merge immutability policy, so future import removals or renames must also update the lock before merging.

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
