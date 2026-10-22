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

## Batch 3 — printed order checked (pages 111–120)

- **111–120 (10 pages, Urdu and Roman):** original images reviewed for reading order and poem boundaries; targeted paired edits below. This was an order and attribution pass, **not a word-by-word transcription clearance**.
- **111:** relocated the credit to the first salam before the divider, in both scripts.
- **115:** restored the printed title of Jamil Lakhnavi's work, separated Professor Farhat Manzar Jafari's independent couplet, and corrected the next poem's title.
- **116:** separated the final independent `تیرے بچوں...` poem from the preceding piece; its poet attribution and continuation text need closer transcription review.
- **117:** separated Saba Akbarabadi's closing couplet from the preceding long poem.
- **118–119:** restored the respective printed opening titles in both scripts.
- **120:** replaced an unrelated inherited heading and author with the printed opening `کربلا کی منزلت ثابت ہے ہر عنوان سے` and Najm Amrohvi.
- Some source page footnotes and small-print acknowledgements are still awaiting full collation. Proceed with **121–130**; **001–084** remains in scope.

### Unplaced block previously in printed p. 123 (Urdu)

The prior p. 123 Markdown included the following passage, but **it is not on scan 123**. Retained verbatim for later relocation rather than silently discarding it.

```text
[صفحہ کے بالائی حصے کا تسلسل]

ڈھل گیا ہنگامہ، کھلی پھر بھی رہی اصغرؑ کی آنکھ
[ایک مصرع جزوی طور پر غیر واضح]
شاہؑ دل پر تیرِ بدخوں کس طرح کھاتا ترس
دل تھا آہن کا، جگر فولاد کا، پتھر کی آنکھ
اے شمر، تصویرِ مظلومی کہاں تک دیکھئے
شہؑ نے وقتِ دفن آخر بند کی اصغرؑ کی آنکھ
(بشکریہ شاعر اہل بیت سید ذیشان حیدر ذیشان)
```

### Unplaced block previously in printed p. 123 (Roman)

The prior p. 123 Markdown included the following passage, but **it is not on scan 123**. Retained verbatim for later relocation rather than silently discarding it.

```text
[Safha ke balai hisse ka tasalsul]

Dhal gaya hangama, khuli phir bhi rahi Asghar ki ankh
[Ek misra juzwi taur par ghair wazeh]
Shah dil par tir-e-badkhun kis tarah khata taras
Dil tha ahan ka, jigar faulad ka, patthar ki ankh
Ay Shimr, taswir-e-mazlumi kahan tak dekhiye
Shah ne waqt-e-dafn aakhir band ki Asghar ki ankh
(Bashukriya shair-e-Ahl-e-Bait Syed Zeeshan Haider Zeeshan)
```

## Batch 4: pages 121–130 — printed order

- Examined original scans **121–130** against both texts. Structural/order review only; not complete word-by-word certification.
- **121:** correct `صفائی` in the opening title.
- **123:** restore right-column-first poem order (`ہو سلام` → `ملتفت` → `حُرؑ کی ایسی`); recover the latter heading and Bahar Lakhnavi attribution. Preserve unrelated old Asghar-eye OCR block above for source tracing, not as published text.
- **125:** correct the opening poem title; separate the short credited couplet from the preceding composition.
- **126:** correct the title to `سلام اُس پر جو لختِ دلِ شیرِ خدا بھی ہے`.
- **127:** restore the printed second poem title and poet attribution, rather than incorrectly repeating the earlier author's credit.
- **128:** separate page-127 continuation from the following poem, and move the Yawar Azmi title in front of his poem.
- **130:** correct the second poem title.
- **122, 124, 129:** scanned for layout; unresolved OCR wording and notes remain. Page **123** also retains transcription uncertainties in the verse bodies; source must be collated further.
- Next: **131–140**. Also pending: preliminary pages **001–084**, complete word-by-word review, and verification of unplaced fragments.

## Batch 5: pages 131–140 — scan ordering

- Compared original scans of **131–140** to the two Markdown streams for printed poem order and author boundaries. This is structural collation, **not word-by-word clearance**.
- **131:** placed Allama Irfan Haider Abidi's title and byline with the correct poem; separated the Sajjād quatrain at bottom left, in both scripts.
- **132:** restored Umar Lakhnavi and Wahid Ahsan Baqi attributions from the printed scan in both scripts.
- **133:** moved the Qamar Bahari title and byline out of the preceding work, matching Roman structure.
- **136:** moved the second poem's title and byline before its divider in Roman, aligning the two languages.
- **138:** corrected the corrupt Roman opening title and separated the printed `بین` section from the poem above it.
- **140:** separated Allama Talib Jauhari's couplet from the preceding quatrain in both scripts.
- **137 requires further work:** the printed opening `کربلا کی شیر دل خاتون زینب السلام` has no body in the OCR Markdown; another section duplicates the Ali Akbar piece. Needs careful scan transcription and deduplication, not an automatic order change. **138 `بین` also needs full manual recovery.**
- **134–135, 139:** ordering inspected; no safe structural changes identified in this batch. The source still contains transcription mistakes.
- Continue with **141–150** and recover flagged incomplete pages. Introductory **001–084** and full lexical review remain pending.
