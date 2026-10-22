# Basta OCR order review

Source: `basta-clean.zip` in the user's Library, containing `original/NNN.png` page scans. These image assets are **not** committed to Git.

Scope: Compare both `src/data/basta/pages/NNN.md` (Urdu) and `src/data/basta/roman/NNN.md` (Roman) against the *printed* page. Reading order for two-column scans is the **right column top to bottom, then left column top to bottom**. Compare stanza boundaries, line order *within* stanzas, titles, author attributions, and credits. Preserve the author's wording, harakat, comma placement, and Urdu line breaks; Roman must mirror those breaks. Do not infer corrections to unreadable glyphs.

## Committed corrections

- **284**, both: merged the user's two manual Urdu page-284 corrections from `main`, then reconciled the Roman text line by line to that Urdu (including the missing fourth misra, the stanza-3 line, title ending, and will's imperatives). Verified against original scanned page 284; the user-edited Urdu remains authoritative.

- **098**, both: repaired OCR mixing between stanzas 3–6, restored missing printed lines, made six independent six-line stanzas, kept credits with their respective stanzas, removed a duplicate divider.
- **107**, both: corrected the corrupted opening verse/title using the scan and moved the second poem divider in front of the title and poet.
- **108**, both: removed the mislocated couplet from the opening poem, split the separate manqabat and left-column poem, restored the latter's poet (Mirza Dabir), and isolated the two concluding standalone couplets with dividers.
- **110**, both: restored the missing poem divider before the final Professor Mirza Qamar Abbas Wafa Kanpuri couplet.

## Source comparison / pending

- Source images inspected for pages **096–100**, **107–108**, and **110–111**; not every word on these pages has been fully proofread.
- Pages **085–095**, **101–106**, and **109** have been sampled in Markdown, but still need full image-to-text verification.
- **Remaining Basta pages have not undergone a complete original-image collation.** In particular, automatically matching Urdu and Roman Markdown is *not* independent verification: both may contain the same OCR ordering mistake.
- Continue in page-number order. Mark reviewed pages here only after checking every poem's printed top-to-bottom and right-to-left order. Keep paired Urdu/Roman edits in the same commit.
- The earlier `audit/basta-error-report.csv` addresses mostly encoding/text issues; it does not certify stanza or verse order.

## Validation

Use `npm run build`, `git diff --check`, and `git status --short` in a local checkout before merging. Automated site build has **not** yet been run in this review environment; the remote GitHub branch contains text-only changes.

## Batch 1 — printed order checked (pages 085–095)

- **085–095 (11 pages, Urdu and Roman):** inspected original scans, confirmed right-column-before-left ordering and stanza/couplet grouping. This is an **order-and-layout pass**, not a full lexical proofreading clearance.
- **088:** removed an OCR-inserted `ہم` / `hum` from the final quatrain in both files; repaired a broken Urdu diacritic/encoding sequence.
- **094:** restored printed attribution to Maulana Zuhur-ul-Hasan Dars, separated the first three individually printed rubaiyat instead of treating them as one poem, and removed a spurious Roman line break.
- **089:** stanza order checked, but the heavily garbled Ustad Qamar Jalalvi quatrain requires separate transcription verification; do not treat it as cleared word by word.
- Remaining page scans, including **001–084** (front matter and indexes), are included in the overall review scope. Continue with pages **096 onward** for the lyric sequence, then collate all earlier preliminary pages.

## Batch 2 — printed order checked (pages 096–110)

- **096–110 (15 pages, Urdu and Roman):** checked original scans for column order, distinct poems, and stanza grouping. Pages **098, 107, 108, 110** already received substantial paired changes; the other pages showed no additional confident poem-order changes. This is **not** a claim of word-by-word clearance.
- **107:** corrected the *title* to the separate printed phrase `معنوی جذبہ عیاں ماہِ عزا ہوتا ہے` (Roman matched), distinct from the opening line `انجمن جب کہ...`. This fixes an error introduced during the earlier structural edit.
- **109:** corrected the title's `نحیف` / `nahif` against the scan, in both languages.
- **098:** the printed wording of the third line in the `جب نہ اعداء...` stanza is not fully resolved; check before marking as lexically final.
- **110:** final printed note below the professor's couplet is still to be collated.

Next contiguous lyric section: **111–120**. Preliminary pages **001–084** remain in scope. Track structural collation separately from lexical proofreading.
