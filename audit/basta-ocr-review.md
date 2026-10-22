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

## Batch 11 — scans 191–200

- **191–200:** checked the original right-to-left column images against Urdu and Roman stanza numbering, poem boundaries, and independent headings. Printed numbered sequence remains aligned, including 191 (1–6) → 192 (7/new 1–3), 193 (4–5/new 1–3), 194 (4–5/new 1–3), 195 (4–5/new 1–3), 196 (4–6/new 1–3) → 197 (4–7), 198 (new 1–6) → 199 (7–8/new 1–3) → 200 (4–6/new 1–3).
- **191:** replaced an inherited title from page 190 with the printed opening (`ریتی پَر برچھی کھائے پڑا تھا جو نورِ عین`). Both scripts updated.
- **193:** transcribed Ijaz Rahmani's four printed lines from the scan instead of an unclear placeholder; paired Roman text and credit added.
- **194:** attached Raja Mahmudabad's name and biographical parenthetical to the following poem, rather than an empty standalone block.
- **195:** recovered the standalone Majid Raza Abidi quatrain under its own byline, with Roman transliteration; attached the printed Syed Ghulam Abbas acknowledgement to the preceding poem and retained the divider before the next marsiya. **Review the newly recovered wording carefully during lexical proofreading**, especially the small-print quatrain.
- **192, 196–200:** scan order and numbering checked without other certain ordering edits. Small-print institutional notices, harakat, and lexical errors remain outstanding. This is *structural collation*, not full word-by-word clearance.
- Next original-scan structural batch: **201–210**. Full source-based lexical clearance and pages **001–084** remain pending.

## Batch 12: pages 201–210 — printed order verified

- Compared the original page images **201–210** in printed right-column-before-left sequence against both sets of Markdown files. Numbering/continuation aligns: **201** ends 4/new 1–3 → **202** 4–8; **203** 1–6 → **204** 7–10; **205**, **206**, **207** each begin new numbered poems; **207** 1–6 → **208** 7/new 1–3 → **209** 4–8; **210** starts a new numbered poem 1–6. The independent guldasta and Raza Allahabadi pieces on **201, 208** are separated correctly.
- **205:** separated the independently credited Azmat Bilgrami quatrain from the preceding marṡiya, in both scripts, while retaining its printed words.
- **207:** fixed the Urdu inherited/corrupted heading to the printed `جب ماریہ کے دشت میں وارد ہُوا زعفر` and harmonized the Roman spelling of `زعفر` as `Za'far` throughout this page. Exact lexical text and small-print nuances remain for subsequent proofreading.
- **202–204, 206, 208–210:** order checked, no other certain sectioning repairs. Full word-by-word transcription, diacritics, and editorial judgment still outstanding. Next structural batch: **211–220**.

## Batch 13: original scans 211–220 — running labels and author credits

- Compared original scans **211–220** with both Urdu and Roman files, reading right column before left. Numbered stanzas were already in sequence: 211 (1–4), 212 (1–6) → 213 (7–9/new 1–3) → 214 (4–8), 215 (1–6), 216 (1–6) → 217 (7–10), 218 (1–6) → 219 (7–10), 220 (new 1–6). No stanza reorder necessary.
- **210** (cross-page cleanup), **211**, **212**, **214**: removed recurring printed page-end title labels in both scripts, preserving genuine **Mirza Dabir** attribution by moving it beside the p.210 title.
- **213:** removed an inherited title from the previous poem above its second, new work; retained the correct break.
- **215:** attached printed poet **Mir Anees** to the poem title, rather than leaving the credit below a repeated footer.
- **216–217:** attached **Ata Akbarabadi** at the start of his work on 216 and removed duplicated running label at the bottom of 217.
- **219:** separated the printed supplication for the deceased and the entire memorial name list from the preceding poem, preserving all names. Corrected the distorted final Roman name to `Syed Shabih-ul-Hasan Naqvi`.
- **218 and 220:** no confident structural correction identified. Stanza **219:10** bears a printed X indicating potential omission in an abridged recitation; retained in full as source.
- This is structural/attribution collation **only**. Lexical transcription and harakat remain outstanding on these pages. Continue next with **221–230**. Front matter **001–084** and complete word-by-word comparison remain in scope.

## Batch 14 — pages 221–230 (printed stanza and independent works)

- Original printed page scans **221–230** compared against Urdu and Roman MD, right column first. Numbered sequence verified: 221 (4–5/new 1–3) → 222 (4–7); 223 (1–6) → 224 (7–9/new 1–3) → 225 (4–6/new 1–3) → 226 (4–9) → 227 (10/new 1–3) → 228 (4–6/new 1–3) → 229 (4–5/new 1–3) → 230 (4–9). Not a full lexical/harakat clearance.
- **222:** separated two independent printed couplets by Professor Karrar Husain and Rafiq Rizvi in both scripts.
- **225:** moved the Roman divider *below* the two-line ending of the preceding poem's stanza 6, matching Urdu and print. No verses were deleted.
- **229:** separated the independent Habib Jalib and Shahid Taqvi Allahabadi poems in both scripts; corrected the latter poet's name from `Shah`; fixed a corrupt Unicode/OCR control byte in Urdu stanza 3 against print.
- **230:** removed a spurious poem divider between stanzas 5 and 6 of the SAME printed narrative in both scripts; preserved complete 4–9 sequence.
- **221, 223–224, 226–228:** scanned for stanza order and poem grouping, with no additional confident ordering change. Both standalone couplets on 229 were present and retained, not missing from page 230.
- **Open:** substantial lexical OCR issues in verse bodies and small-print remain. Continue scan-based structure at **231–240**, then return for complete word-by-word review and introductory **001–084**.

## Batch 15 — pages 231–240 (printed structural audit)

- Viewed the original printed scans for **231–240** in right-column-first reading order, then compared both Urdu and Roman MD. Numbered sequences remain intact: 231 (1–6) → 232 (7–10), 233 (new 1–5 plus Ashur Kazmi), 234 (new 1–4), 235 (new 1–5 plus Fahim Akhtar), 236 (new 1–5), 237 (new 1–6), 238 (new 1–6) → 239 (7–10), 240 (new 1–6). No stanza rearrangement necessary.
- **234:** moved Amir Rizvi Cholsi's printed attribution next to the title and removed a duplicated trailing title and author, in both scripts.
- **235:** corrected Urdu title `عزتِ اطہار` to printed `عترتِ اطہار`; Roman title already read `Itrat-e-Athar`.
- **237:** corrected printed heading `مغموم و فگار` (was wrongly `نگار`), and added the tiny printed attribution `امیر چولسی` / `Amir Cholsi` to both scripts. The exact romanization of the attribution warrants a subsequent full text check.
- **238–239:** moved the printed `نسیم امروہوی` / `Nasim Amrohvi` credit from the bottom of scan 239 to the heading of the poem beginning on 238; both languages updated.
- **233, 236, 239–240:** scan order confirmed; no additional confident structural change. **Untranscribed memorial notices** are visible below the short verse on scanned 235 and in the lower portion of scanned 236; retain as an explicit follow-up rather than inventing names or leaving them silently cleared. Full verse-by-verse transcription and diacritics remain outstanding on all pages.
- Next order batch: **241–250**, with preliminary **001–084** and comprehensive lexical audit still open.

## Batch 16 — original scans 241–250

- Checked original scans **241–250**, paired against both Urdu and Roman MD. Numbered progression is structurally correct: **241** concludes a prior poem (7), includes Abrar Abid's independent verse and starts a new work (1–3) → **242** (4–9) → **243** (10–11, then independent Naim Meeruthi poem, then new 1–3) → **244** (4–9) → **245** (10/new 1–3) → **246** (4–6/new 1–3) → **247** (4–9) → **248** (new 1–5) → **249** (new 1–3, then new 1–3) → **250** (4/new 1–3). No verified wholesale verse reordering required. This remains a *structure/attribution pass*, not word-by-word transcription verification.
- **244:** removed stray `§` OCR/control artifact in the penultimate stanza, giving `اسیر` from the scanned source.
- **250:** the printed `التماسِ فاتحہ برائے سوزخواں امامی صاحب` is a dedication for the preceding poem, not the heading of the next marsiya. Corrected the mangled Urdu `العباس فاتحہ` / Roman `Al-Abbas Fatiha`, attached the dedication to the correct preceding stanza, and retained the divider before `سر اپنا پیٹ کے فضہ سے ہند نے پوچھا`.
- **241–243, 245–249:** confirmed boundaries and printed sequence without further high-confidence structural edits; included the separate Abrar Abid and Naim Meeruthi items already correctly represented. Word accuracy, unusual OCR readings, and transliteration consistency still require full manual proofreading.
- Continue scan-backed structural review with **251–260**; return to missing notices and full lexical review before claiming the whole collection complete. Introductory **001–084** remain on the master review plan.

## Batch 17 — pages 251–260 (printed sectioning)

- Inspected originals **251–260** against Urdu and Roman pages. Numbered continuity verified: 251 (4–6/new 1–3) → 252 (4–6/new 1–3) → 253 (new 1–6) → 254 (7–8/new 1–3) → 255 (4–8) → 256 (new 1–6) → 257 (7, independent Agha Shorish Kashmiri quatrain, new 1–3) → 258 (4–6/new 1–3) → 259 (4–6/new 1–3) → 260 (4–6/new 1–3). No confident verse rearrangements needed.
- **253:** fixed a previous-page inherited title. Printed heading is `پہنچی جو قید خانے میں ہند نیکوسیر`, not `بھیا ہم ایک رسی میں بارہ اسیر ہیں`. Urdu and Roman updated.
- **256:** fixed another inherited heading, restoring printed `قید خانے میں سکینہؑ کو جو لائی تقدیر` in both scripts.
- **257:** inserted missing poem boundary before Agha Shorish Kashmiri's quatrain, which was already transcribed but merged with the preceding stanza 7. Restored the printed Shadan Dehlavi credit with the following `سرِ حسینؑ...` marṡiya in both scripts.
- **258:** removed the redundant trailing preceding-poem title/credit from the Urdu and Roman new-section heading, retaining the new `سکینہؑ شام کے زندان...` poem as a distinct work. That poem's own final print credit requires lexical collation from the following page.
- **251–252, 254–255, 259–260:** no additional safe section reorder after scan comparison. Numerous corrupted OCR readings and partial placeholders remain for full word-by-word review. Next structural range **261–270**.

## Batch 18A — scan comparison 261–265

- Checked the original two-column scans 261–265 against both scripts, preserving numbered stanza order: p261 (4–8), p262 starts separate 1–6, p263 (new 1–3 followed by new 1–3), p264 (4–5/new 1–3), p265 (4–6/new 1–3).
- **261:** recovered five clearly readable lines of missing stanza 6 from the print, preserving an explicit *one-line uncertainty* rather than a placeholder for the entire stanza. Removed duplicated preceding poem running title and kept the source acknowledgment, both languages.
- **263:** placed printed Nasim attribution with the first poem's heading rather than as an orphan trailing repeated title; removed unsupported '(72)' insertion from the next heading in both languages.
- **265:** removed the previous poem's repeated running title and repaired two obvious Unicode replacement errors (`صبر`, `للہ`) in Urdu. Large amounts of remaining OCR wording still require lexical proofreading.
- **264:** substantial small-print author notice remains partially transcribed, and multiple lines across 262–264 are uncertain; neither counted as full lexical clearance.

## Batch 18B — pages 266–267

- **266–267:** continued the original scan comparison. Restored printed poet **Shadan Lakhnavi** next to the beginning of `جب چھوٹ کے قیدِ شام سے سجادؑ گھر چلے` on page 266; removed its duplicated running-title / author label from page 267 in both scripts.
- **267:** added the entire first line of stanza 4 to the Roman file from Urdu and print (`Mil jati us jari ko agar jang ki raza`), correcting its 3-line OCR truncation. Fixed visibly mixed Latin/Arabic text `کنبہِ Rasulول` to `کنبۂ رسولؐ` in the heading of the next marṡiya.
- **267:** separated the independent **Suhail Shah** couplet from the preceding numbered poem and separated the *Fātiḥa/memorial dedication* from poetry, retaining all text and both scripts. The memorial's printed names still need an exhaustive transcription pass; existing placeholder flagged rather than invented.
- Next finish 268–270, then begin 271–280. These pages are structurally collated but **not** word-by-word certified.

## Batch 18C — scans 268–270 and completed 261–270 range

- Original scans **268–270** reviewed, concluding consecutive **261–270 structural coverage**. **268** continues 267 stanza 4–9; **269** new 1–5 plus two independently printed couplets; **270** new 1–4. Transcribed both scripts where source was clear.
- **269:** restored all six lines of stanza 5 from the print (previously scattered incorrectly under later poet attributions), replaced mixed-script `Imamام`, added printed **Nasim Amrohvi** credit to the poem, and separated printed verses by **Tajammul Lakhnavi** and **Samar Hoshangabadi** as their own poems in both languages. The Samar first line's opening is not reliably legible and remains explicitly flagged; the second line is retained.
- **270:** moved printed author **Nasim Amrohvi** beside the poem heading, removing duplicate trailing title/credit in Urdu and Roman.
- The 261–270 passes are **structural and selective OCR recovery**, NOT exhaustive word-by-word proofreading. Review ambiguities on pp. 261, 263–264, 267 memorial, and 269–270 during transcription clearance.
- Next scan-backed structural range: **271–280**. Remaining: 001–084 and full lexical review across previously checked ranges.

## Batch 19A — printed pages 271–279

- Inspected original scans **271–279** against both files and verified numbered continuity. **271–273** each start standalone numbered works, **274** finishes 273 (7–8) and starts a new salam (1–3), **275** continues that salam (4–8), and **276–279** start separate poems.
- **274:** corrected `ابنِ سعود` to printed `ابنِ سعد` and removed a repeated footer label belonging to p273 before the new salam. Fixed mixed-script Arabic words in Urdu.
- **275:** removed the previous salam's redundant running footer title, both versions.
- **276:** attached printed **Mir Wajih** author credit to the heading, removed duplicate running footer, retained acknowledgment.
- **277:** corrected printed heading `ہاں دوستو کمی نہ ہو اب شور و شین میں`, moved **Nasim Amrohvi** attribution to heading, removed repeated footer, cleaned mixed-script OCR.
- **278:** attached **Shadan Dehlavi** to its heading, removed footer repetition, corrected `عمر چار سال` in Urdu and Roman and mixed-script `رسول`.
- **279:** restored printed `آیا بہت قریب نبیؐ کا دمِ وصال` (OCR used unrelated `بہشتِ قرب`) and moved **Nasim Amrohvi** credit to heading. **280**'s grossly incorrect Roman text is handled in separate restoration commit.
- This is an original-scan structural pass with selective unambiguous corrections; not full lexical clearance.

## Batch 19B — page 280 full wrong-poem Roman replacement

- Original printed **280.png** shows the Prophet's final illness: stanza 1 begins `بیمار جب کہ احمدِ مختارؐ ہو گئے` and stanzas **2–6** continue that narrative. Its Roman `280.md` had **stanzas 2–6 from an unrelated Imam Ali / Ibn Muljim martyrdom narrative**, despite the same stanza numbering. This is a major original-OCR cross-work displacement, not a cosmetic change.
- Preserved Roman stanza 1 (which matched), **fully replaced Roman stanzas 2–6** with a manual transliteration paired line-by-line to the Urdu scan-based markdown (including two already present source uncertainties); corrected mixed-script `رسول` and the Prophet's honorific in Urdu stanza 1. The Roman stanza 2–6 is no longer contaminated by the unrelated source.
- **Original displaced text archived verbatim below** for locating and relocating to its correct original page. Do not discard it, and do not silently treat it as text actually printed on page 280.

### Wrong Roman material formerly in p.280

```text
2
Ghar mein Khuda ke qatl hua rozadar, haye
Haye Imam, haye Zulfiqar, haye
Ay razdar-e-Haq, Shah-e-taat-guzar, haye
Maulid Haram mein hai to Najaf mein mazar, haye

Ye bandagi nisar-e-Janab-e-Amir ke
Nikle to ghar se Khuda-e-Qadir ke

3
Laya tha zahr mein jo jafa puchha ke tegh
Maula gire zamin pe masjid mein kha ke tegh
Ghul par gaya ke sar pe lagi Murtaza ke tegh
Khai Khuda ke sher ne ghar mein Khuda ke tegh

Gehra hai zakhm, farq-e-Imam-e-Hijaz par
Sar se tapak raha hai lahu jaye-namaz par

4
Sher-e-Khuda jo hathon se thame the apna sar
Khun donon kuhniyon se tapakta tha khak par
Bhaga jo Ibn-e-Muljim-e-bad-khu-o-bad-guhar
Pichha use Ali ke muhibbon ne daur kar

Laye jo hath bandh ke Maula ke samne
Qatil ye muskura ke nazar ki Imam ne

5
Farmaya main ne kaun si thi teri buri khata
Padash-e-nekiyon ki jahan mein yahi hai kya
Kya main bura tha ay bani-e-jafa
Roya wo sar jhuka ke to Maula ne ye kaha

Is dard mein bhi sab ke maraz ki dua hun main
Bandho na is hath ko ke Mushkil-kusha hun main

6
Laye pisar jo ghar mein to ghash the Imam-e-Pak
Karte the aah aah ba-awaz-e-dardnak
Chehra lahu mein tar tha, bhawon tak jabin-e-pak
Zahra ki betiyon ne urai saron pe khak

Dekha jo sar ka zakhm jigar thartharane laga
Abbas Namdar ki man ko ghash aa gaya

Khun donon kuhniyon se tapakta tha khak par
```

- Structurally audited **271–280**, completing consecutive **85–280 (196 pages)**, though none of these pages is declared comprehensively word-by-word proofread. Next batch: **281–290**, with all previous transcription flags and introductory **001–084** still in scope.

## Batch 20A — pp. 281–283: major scan-backed order fix

- Checked scans **281–283** and paired MD. **281** printed RIGHT column has stanza **4** completing the work from **280**, then two distinct short credited works (Iqbal Kazmi, Ijaz Aslam), followed by acknowledgments and memorial notice; its LEFT column begins an entirely new poem stanza **1–3** (`اے اُمتیو روؤ ...`). The OCR had erroneously titled the new poem with a line of stanza 4, placed stanza 4 after its numbered stanzas 1–3, and merged all short works and notes. Restored printed right-to-left order in both scripts; repaired independent couplets and the stanza-3 final couplet from the scan.
- **282** continues the poem begun on 281 with printed stanzas **4–6**; OCR called them **5–7**, now renumbered both scripts. New second poem starts on left of 282 at stanza 1. Corrected its heading and placed **Nasim Amrohvi** attribution with its beginning, rather than at p283 end.
- **283** runs stanzas 4–8 of the poem begun on 282; removed redundant footer title and author in both scripts.
- **281** stanza-4 and certain small-print lines remain for full lexical collation: printed-source ordering is corrected, not all words fully proofread.

## Batch 20B — original scans 284–290

- Reviewed original images **284–290**. Preserved the more recent user-manually-corrected Urdu and Roman **284–285** without changes. **287** stanza sequence already correct.
- **286:** Removed inherited title from Urdu, preserved Mir Anees attribution with the preceding poem, and separated Syed Tahawwur Ali Jafari Amrohvi's independent quatrain from the next new numbered poem in both scripts.
- **288:** Removed duplicate running title at page end, in both languages.
- **289:** Separated independent Asir Faizabadi and final unattributed couplets from numbered marṡiya, both languages; repaired mixed-script `امامؑ`.
- **290:** Removed redundant trailing OCR line duplicated from stanza 4 after stanza 6, both languages, and repaired mixed-script `امامِ`.
- **Source of displaced Roman text from page 280 located:** the unrelated Roman Imam Ali / Ibn Muljim verses archived in the Batch 19B audit are actually this printed **page 290** poem; page 290 already contains them. Do not accidentally reinsert duplicates.
- Original-scan structural coverage now reaches **085–290 (206 pages)**. All wording and diacritics have NOT been exhaustively checked. Continue **291–300**, then 001–084 and remaining lexical proofing.

## Batch 21A: pages 291–295, scan-backed sectional structure

- Inspected printed **291–295**; stanza numbers follow **291** (1–6) → **292** (7, standalone excerpts, new 1–3) → **293** (4–5, separate Imam Shafi'i and Khwaja Nizamuddin excerpts, new 1–3) → **294** (4–6, new 1–3) → **295** (4–8). No major numbered-stanza reordering warranted.
- **291–292:** attached printed **Nasim Amrohvi** to opening of p291 poem, removed duplicated trailing running label on p292, and marked two standalone quotes on p292 (second by Professor Mirza Muhammad Ishtiaq Shauq Lakhnavi) as independent works. Retained their printed acknowledgments.
- **293:** removed preceding poem's carried title, split the independently printed Imam Shafi'i and Khwaja Nizamuddin excerpts into separate sections and retained their *incomplete OCR placeholders* pending exact transcription, and placed **Nasim Amrohvi** next to the poem starting lower on this page.
- **294:** removed the carried-over title/credit for the preceding page's poem ahead of the new `شربتِ تلخ...` work.
- **295:** removed its duplicated footer title; no verse content removed.
- Word-by-word verification and Arabic quotations on 293 remain outstanding.

## Batch 21B — original scans 296–300

- Scanned **296–300** against paired Urdu/Roman files. Numbered sections: **296** standalone 1–5, **297** standalone 1–6 → **298** 7–9 and new 1–3 → **299** 4 and new 1–3 → **300** 4–5 and new 1–3. Sequence correct as numbered; small standalone passages needed separation.
- **296:** separated Qaisar Barahvi's independent 4-line piece from the preceding numbered marṡiya and its acknowledgment, both scripts.
- **297:** removed repeated running footer title on both versions.
- **298–299:** removed the previous poem's running footer from 298, moved printed **Nasim Lakhnavi** attribution from repeated footer in 299 to the beginning of `کفن پہنا کے جو شبر...` on 298, in Urdu and Roman.
- **299–300:** attached printed **Nasim Amrohvi** to beginning of `ہاں دوستو یہ وقت...` on 299, removed duplicate following-page label on 300, split independently credited **Shahid Jafar** couplet and printed *Fātiḥa memorial* into their own sections without deleting text in either script.
- **300** begins a second, separately numbered work `دشمن معاویہ...`; its division was already correct. Partial memorial names, printed alternate verse omissions, and lexical OCR issues remain for the later full proofreading pass.
- Structural review completed **085–300 (216 consecutive pages)**. Next order batch **301–310**, then preliminary **001–084** and unresolved lexical/source issues. This log does NOT assert word-by-word completion.

## User-required printed closing-refrain preservation and scan audit, pp. 301–310

The opening-line repetitions printed after a poem's last stanza are **intentional printed text**, not OCR garbage. Preserve them in their source location, including when the poem continues from a preceding page or has another new poem afterward. Earlier removal of these lines was incorrect; audit and restore previous batches separately.

- Examined scans **301–310** alongside paired Urdu/Roman Markdown. Printed stanza numbering is intact on 301–305 and 308–310; **306–307** feature a repeated source stanza, which should remain because it appears twice on the physical scans.
- **301, 302, 304, 309:** restored printed repetitions of the opening line at the ends of the respective poems in *both* scripts, not headers for the next poem.
- **304:** separated the independent Zahid Taqvi couplet and memorial note, and corrected its second line to the scan's `آواز پہنچ جاتی ہے جنابِ علیؑ تک`, matching Roman. Memorial names await closer inspection, not guessed.
- **306:** Roman OCR omitted stanza 3 of the second poem; restored all its lines as printed (even though the page intentionally prints the same stanza elsewhere). Never deduplicate text merely because verses repeat in the source.
- **307:** restored the printed last-line repetition and Nasim Amrohvi credit, the separate four-line piece by Alamdar Husain Aslam, and the printed Fatiha memorial names in both scripts. The first line of Alamdar's poem may need further micro-collation; the rest is readable.
- **310:** corrected a repeated `Bibi` word in the Roman stanza, matching the scan.
- **303 and 305:** source order checked; the print matches the extant stanza sequence. **308:** verified all five stanzas. This is not exhaustive lexical certification.
- Next: retroactive restoration of all previously removed source-printed closing refrains in older batches, while maintaining author credits and user-manual pages 284/285.

## Retrospective refrain correction R1 — original scans 261–270

The user's correction supersedes earlier cleanup: **printed repetitions of a poem's first line at its conclusion must remain**. Verified scans and restored source-printed closing repetitions in BOTH languages: **261** `سر جو شبیر...` before acknowledgement; **263** `حسینؑ بے کس ...` before next printed poem; **265** `شام سے جب...` after the last stanza and before next poem; **267** `جب چھوٹ کے قید شام...` before the independent Suhail Shah piece; **270** `وطن میں جب حرم...` at the poem's end. These were wrongly removed in prior scan-order passes.

The previously partially reconstructed **261 stanza 6** still contains doubtful word choices; do not mark lexical clearance before enlarged-scan recheck. Print-authoritative repetitions are NOT stray OCR labels, even when also used for site headings.

## Retrospective refrain correction R2 — original scans 274–279

Reviewed enlarged prints and restored genuine end-of-poem printed repetitions in both scripts on **274** (closing of Mukhtar work), **275** (closing of `حسین، سبطِ رسول...`), **276** (`وا حسرتا...` before acknowledgment), **277** (`ہاں دوستو کمی...`), **278** (`ماں کا جو سایہ...`), and **279** (`آیا بہت قریب نبی...`). Refrains retain *corrected source wording*, not corrupt earlier OCR headings. The user requires these deliberate print repetitions to remain at the **end**, even where the heading appears at the start as well.

## Retrospective refrain correction R3 — original scans 281–290

Verified and restored source-printed concluding refrain lines in both scripts: **281** `یا ختمِ رُسلؐ آپ پہ تسلیمِ خدا ہو` after continued poem stanza 4, before the independent Iqbal Kazmi work; **283** printed closing line of the Nasim poem, with corrected source title; **286** `جب خلق سے وقتِ سفرِ فاطمہؑ آیا` after its fifth stanza before Mir Anees credit and the independent quatrain; **288** `دنیا سے آج رحلت بنتِ رسولؐ ہے`; **290** `انیسویں (۱۹) سے آپ کا ماتم ہے یا علیؑ`. The **290** OCR's *unprinted stray repeat* of `خون دونوں کہنیوں سے...` remains excluded: scan prints the poem's first line, not that interior verse, at the end.

Preserve **284–285** user's manual corrections. Other print verses remain subject to full lexical check.

## Retrospective refrain correction R4A — pages 292–295

Restored the scan-printed repeated first lines at the **ends** of poems on **292**, **293**, **294**, and **295** in both language editions. Prior automatic removal was a regression. All printed short-poem breaks and earlier order corrections remain intact.

## Retrospective refrain correction R4B — pages 297–300

Restored genuine printed first-line repetitions at the end of poems on **297**, **298**, **299**, and **300**, in both scripts. The repeat on 298 is positioned before the printed acknowledgment; 299 and 300 close their earlier poem before the next separate work. These source-authentic lines were wrongly stripped during earlier structural cleanup.

## Source ambiguity correction — enlarged scan reads 261, 301, 302

Source magnifications were used rather than accepting OCR guesses or retaining placeholders: **261 stanza 6** begins `خالی یہاں غسل جو دینے لگیں بچی کو رباب`; removed the first-line uncertainty marker, and added paired Roman transcription. **301 stanza 8** has `بیٹے پہ صدقے ہونے کو نکلی لحد سے ماں` followed by `پہنچے نجف سے حیدرِ کرار نوحہ خواں`; corrected the misread third line and filled the previously missing fourth line in both scripts. **302 stanza 1** line three is `یہ دشمنوں پہ مطلبِ شبیرؑ کھل گیا`, and the previously unclear fourth is `لعیں قریبِ مرقدِ سلطانِ انبیا`; corrected both paired scripts. These are *actual print-backed lexical repairs* rather than merely changing page structure.

## Retrospective refrain correction R5 — scans 210–213

Enlarged originals show closing repeats deliberately printed at **210** (`جب ہوئی ظہر تلک ...`), **211** (`اقربا کٹ گئے...`), **212** (`جب خاتمہ بخیر ...`), and **213** (same work's closing repetition before the new poem). Restored all four in both scripts *at the print location*, reversing earlier removal as alleged running-title OCR noise. Source repeats may appear on multiple consecutive pages when printed: preserve each occurrence rather than deduplicate.

## Retrospective refrain correction R6 — scans 214, 215, 217, 219

Restored scan-printed closing repeats on **214** (`جس دم نگیں...`), **215** (`پیاسا ہے کئی دن...`), **217** (`لوٹا گیا جو آلِ محمد...`), and **219** (`غارتِ خیمۂ سرور...` before Fatiha names), Urdu and Roman. Print shows the ending labels as deliberate repeated opening lines; they are **not** expendable OCR junk. The full printed memorial-name list on 219 remains preserved. At p219 the printed line appears twice, associated with its continuation across columns; preserve both in subsequent lexical audit.
