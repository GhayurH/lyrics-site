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

## Batch 6: pp. 141–150 — numbered marsiya structure

- Inspected the original scans **141–150** and corresponding Urdu and Roman files. Page **141** is a printed introductory note for the marāsī section and correctly has no Roman lyrics file.
- Checked numbering and poem transitions: **142** stanzas 1–5 → **143** 6–7, then a new poem 1–3 → **144** 4–8; **145** 1–6 → **146** 7–8, then new poem 1–3 → **147** 4–7; **148** 1–6 → **149** 7–8, then next poem 1–4; **150** begins a new marsiya 1–6. Boundaries are in the right order in both versions.
- **148:** corrected badly misread Urdu and Roman opening *title* to the printed `پہلی منزل جو مدینے سے ہوئی سرورؑ کو`, matching the first stanza.
- These pages have **not** received exhaustive word-by-word transcription correction. Verse wording, original diacritics, credits, and uncertain content still need a separate pass against scans.
- Next original-image structural batch: **151–160**. Retain the source stanza numbers and cross-page boundaries.

## Batch 7: numbered verses 151–160

- Checked visible numbering and cross-page continuity across **151–160** in both languages. The expected resets align: **151** 1–6 → **152** 7–8/new poem 1–3 → **153** 4–8; **154** 1–6 → **155** 7–8/new 1–3 → **156** 4–5/new 1–3 → **157** 4–6/new 1–3 → **158** 4–5/new 1–3 → **159** 4–5/new 1–3 → **160** 4/new 1–3.
- **158:** split Rizvi Charchavi and Jafar Husain Jafar's independent short couplets from the previous marsiya, preserving their own attribution, in both Urdu and Roman.
- **159:** added the missing Roman divider before Waqar Mohsin's independent poem; the Urdu division was already present.
- This is a numbered-stanza/poem-boundary check, **not** a completed lexical proofreading of 151–160. Small notes, harakat, and misread verse words need a separate image-verification pass.
- Next: **161–170**; also audit missing content flagged on **137–138** and finish page-image comparisons for introductory **001–084**.

## Page 137 — image-backed restoration

Compared `original/137.png`. The print has **three** works in right-to-left order: the Zainab salam by Maulana Murtaza Azamgarhi; the Ali Akbar work by Kashif Zaidi; and the Muslim ibn Aqil poem on the left. The previous OCR omitted the complete Zainab salam, repeated the Ali Akbar piece, and misplaced titles/credits. Reconstructed and aligned both languages directly from the scan. A few small-print details remain for subsequent lexical proofreading.

### Superseded 137 Urdu OCR (archived)

```text
کربلا کی شیر دل خاتون زینبؑ السلام
[شاعر کا نام جزوی طور پر غیر واضح]
---***---
ہر سمت جہاں میں ہے شہِ اکبرؑ کا
رتبہ ہے خلائق میں اعلیٰ علی اکبرؑ کا
شبیرؑ جُھلاتے تھے عباسؑ کے جھولے کو
عباسؑ جُھلاتے ہیں، جُھولا علی اکبرؑ کا
ہمشکلِ پیمبرؐ کے، نیزہ نہ لگا ظالم
ہے پھول سے بھی خوش تر، سینہ علی اکبرؑ کا
سرورؑ نے سیناں کھینچی جب سینۂ اکبرؑ سے
تو ساتھ کلیجہ بھی آیا علی اکبرؑ کا
فریاد تھی سرورؑ کی، امداد کرو بابا
اُٹھتا نہیں بیٹے سے لاشۂ علی اکبرؑ کا
پوچھا گیا شہؑ سے کیوں خَم ہے کمر مولاؑ
فرمایا اُٹھایا تھا لاشۂ علی اکبرؑ کا
(بشکریہ سلام خواں سید باقر حسین اعظمی)

کونین کی شہزادی دیتی ہے دُعا کاشفؔ
زینبؑ کو جو دیتا ہے پُرسہ علی اکبرؑ کا

ہر سمت جہاں میں ہے شہرۂ علی اکبرؑ کا
رتبہ ہے خلائق میں اعلیٰ علی اکبرؑ کا
شبیرؑ تھماتے تھے عباسؑ کے جھولے کو
عباسؑ جھلاتے ہیں جھولا علی اکبرؑ کا
شبیرؑ کے [لفظ غیر واضح]، نیزہ نہ لگا ظالم
ہے پھول سے بھی خوب تر سینہ علی اکبرؑ کا
سرور نے زباں کھینچی جب سینۂ اکبر سے
تو ساتھ کلیجہ بھی آیا علی اکبرؑ کا

فریاد تھی صغریٰ کی: امداد کرو بابا
اٹھتا نہیں سینے سے لاشہ علی اکبرؑ کا
پوچھا گیا جب شہؑ سے: کیوں غم ہے مگر مولا
فرمایا: اٹھایا تھا لاشہ علی اکبرؑ کا
کونین کی شہزادی دیتی ہے دعا کاشف
زینبؑ کو جو دیتا ہے پرسہ علی اکبرؑ کا
```

### Superseded 137 Roman OCR (archived)

```text
Karbala ki sher-dil khatun Zainab assalam
[Shair ka naam juzwi taur par ghair wazeh]
---***---
Har samt jahan mein hai Shah-e-Akbar ka
Rutba hai khalaeq mein aala Ali Akbar ka
Shabbir jhulate the Abbas ke jhule ko
Abbas jhulate hain, jhula Ali Akbar ka
Hamshakl-e-Payambar ke, neza na laga zalim
Hai phul se bhi khush-tar, sina Ali Akbar ka
Sarwar ne sinan khinchi jab sina-e-Akbar se
To sath kaleja bhi aaya Ali Akbar ka
Faryad thi Sarwar ki, imdad karo Baba
Uthta nahin bete se lasha Ali Akbar ka
Puchha gaya Shah se kyun kham hai kamar Maula
Farmaya uthaya tha lasha Ali Akbar ka
(Bashukriya salamkhwan Syed Baqir Husain Azmi)

Kaunain ki shahzadi deti hai dua Kashif
Zainab ko jo deta hai pursa Ali Akbar ka

Har samt jahan mein hai shohra-e-Ali Akbar ka
Rutba hai khalaeq mein aala Ali Akbar ka
Shabbir thamate the Abbas ke jhule ko
Abbas jhulate hain jhula Ali Akbar ka
Shabbir ke [lafz ghair wazeh], neza na laga zalim
Hai phul se bhi khub-tar sina Ali Akbar ka
Sarwar ne zaban khinchi jab sina-e-Akbar se
To sath kaleja bhi aaya Ali Akbar ka

Faryad thi Sughra ki: imdad karo Baba
Uthta nahin sine se lasha Ali Akbar ka
Puchha gaya jab Shah se: kyun gham hai magar Maula
Farmaya: uthaya tha lasha Ali Akbar ka
Kaunain ki shahzadi deti hai dua Kashif
Zainab ko jo deta hai pursa Ali Akbar ka
```

## Batch 8: pages 161–170 — printed stanza order and independent short poems

- Compared all **161–170** original scans with the Urdu and Roman markdown. Numbered sequences align across page boundaries: 161 (4–5/new 1–3), 162 (4–5/new 1–3), 163 (4–6/new 1–3), 164 (4–8), 165 (1–6), 166 (7–10), 167 (1–6), 168 (7–8/new 1–3), 169 (4–5/new 1–3), and 170 (4–6/new 1–3). No numeric stanza reorder was warranted.
- **161:** recovered the printed independent Professor Iqbal Azim couplet between the two marāsī, in Urdu and Roman. Source's tiny supplementary attribution remains to be checked in a lexical pass.
- **164:** separated Akhtar Hashmi's independent verse after stanza 8 and corrected the poet's corrupted name in both scripts.
- **168:** separated Saqib Muzaffarpuri's short work from the numbered marṡiya in both scripts.
- **169:** separated the independent Ijaz Rahmani and Nasir Turabi couplets from the preceding poem and one another, in both scripts.
- **162–163, 165–167, 170:** printed structural reading order inspected without additional safe changes. The words still need a full manual proofread. Resume structural checks at **171–180**.

## Batch 9: pages 171–180 — verse-order and poem-boundary check

- Checked the original scans **171–180** against the paired Urdu/Roman files for numbered-stanza order, cross-page continuations, and standalone works. Numbering is correctly sequenced: 171 ends a poem at 6 and starts another 1–3; 172 finishes its stanza 4 and opens a new 1–3; 173 follows with 4 and new 1–3; 174 finishes 4–8; 175 starts 1–5, 176 finishes 6–9; 177 begins a new 1–5; 178 begins a new 1–5; 179 1–6; 180 1–5.
- **172:** split independent excerpts by Shahab Kazmi, Sami Taqvi, and Shaukat Raza Shaukat from the preceding numbered poem in both scripts; the original scan shows separate headings. Tiny-print credit still needs lexical collation.
- **174:** separated the Nafs Fatehpuri couplet from the ending numbered poem in both scripts.
- **176:** separated Javed Manzar's independent quatrain and the Syed Arif Imam piece from the preceding marṡiya, in both scripts.
- **177:** separated the closing short excerpts sourced from two manqabats from the marṡiya in both languages. Their OCR wording is poor and needs transcription from print.
- **171, 173, 175, 178–180:** compared stanza sequence and sections without a safe ordering edit. These pages have NOT received word-by-word correction.
- Continue with **181–190**. Remaining major open issues: incomplete 138 bain, earlier unmatched OCR, and full lexical review.

## Batch 10: pages 181–190 — numbered narrative continuity

- Compared printed scans **181–190** with Urdu and Roman structure. Numbered sections preserve the printed sequence, including the transition to new poems on pages **184–188**. This does not certify their word-by-word accuracy.
- **183:** replaced an inherited title from the preceding page with the printed opening `مشک بھر کر سُوئے خیمہ جو علمدار چلے`, in both Urdu and Roman.
- **189:** separated the independently credited couplets of Syed Hashim Raza, Dr Karbalai, and Shohrat Bilgrami in both languages, instead of keeping them together as one item.
- **181–182, 184–188, 190:** printed order inspected; no other confident structural change in this batch. Several lines in the OCR and the Roman script still require lexical proofing (especially 190).
- Next: **191–200**. The introductory **001–084** and thorough transcription/harakat review of checked pages are still pending.
