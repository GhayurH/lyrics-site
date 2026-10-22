# Basta OCR order review

Source: `basta-clean.zip` in the user's Library, containing `original/NNN.png` page scans. These image assets are **not** committed to Git.

Scope: Compare both `src/data/basta/pages/NNN.md` (Urdu) and `src/data/basta/roman/NNN.md` (Roman) against the *printed* page. Reading order for two-column scans is the **right column top to bottom, then left column top to bottom**. Compare stanza boundaries, line order *within* stanzas, titles, author attributions, and credits. Preserve the author's wording, harakat, comma placement, and Urdu line breaks; Roman must mirror those breaks. Do not infer corrections to unreadable glyphs.

## Committed corrections

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
