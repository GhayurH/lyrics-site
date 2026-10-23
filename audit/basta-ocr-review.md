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

## Retrospective refrain correction R7 — scans 234, 239, 252, 255

Enlarged scans confirm deliberate closing repetitions on **234** (`جبکہ پابندِ سلاسل...`), **239** (`دیارِ کوفہ...`), **252** (`عابدؑ کو جب یزید...` before acknowledgment), and **255** (`قید خانے میں تلاطم...` before acknowledgment). Restored all in both language editions; the poems' credits and the previous stanza-order repairs remain intact.

## Retrospective refrain correction R8 — p219 across-column, pp. 257–258

The page **219** scan shows the repeated first line **twice**, once after stanza 8 (end of right-hand column) and again after stanza 10 (before memorial names). Both occurrences are now present in each script. Also restored printed closing repetitions after **257** stanza 7 (`قید خانے میں سکینہ ...`) before the separate Agha Shorish Kashmiri verse, and after **258** stanza 6 (`سرِ حسین جو زندان...`) before the next poem. These cannot be omitted as editorial 'deduplication'.

## Batch 23A — 311–320 and corrective comparison with p306

- Original scans **311–320** checked in right-column-first order. Page 311, 312, 314 have printed first-line repetitions already in both files; preserve. The running first-line refrains at the ends of works continuing onto 315–320 also remain in place. No deletion of original print repetitions.
- **306 source correction:** The prior batch had INCORRECTLY added stanza 3 to the left-side poem on p306. The original scan prints that stanza only on the right-hand column of **307**; removed the p306 duplicate from Urdu and Roman. Page 307 retains stanza 3. This corrects a previous source-collation regression.
- **313:** separated printed Barq Zaidi couplet, corrected its second line `سیارگانِ چرخ کے بھی خاندان میں`, and restored otherwise missing independently credited **Mir Razi Mir** couplet; created matching Roman transliteration. Fixed `tifl-e tifl` Roman duplication.
- **315:** restored missing second line of stanza 7 `رات بھر اشک رہے دیدۂ تر سے جاری`; replaced an entire unclear-verse placeholder with printed `تین کشتوں کو مقتل پہ تڑپتے دیکھا`. Both Urdu and Roman match the scan. Retained the printed `قید ہو کر جو چلے شہرِ مدینہ سے تقیؑ` closing repetition before the next poem.
- **320:** corrected obviously garbled Roman OCR phrases in the final stanza of its second poem, while preserving its printed stanza structure.
- **311–312, 314, 316–319:** print/numbering checked; unresolved individual word readings remain for full lexical audit. This is structural plus targeted source disambiguation, not exhaustive word-level clearance.

## Batch 23B — original prints 321–330

- Inspected printed images **321–330** in right-to-left column sequence; the numbered continuations and page-to-page verse groups are in the expected order, and printed opening-line repetitions are deliberately retained. **321** continues the preceding poem (3–8); **322–325** start new numbered works; **326** ends p325 (7–8) and begins an independent poem (1–3), **327** completes that poem (4–8); **328–330** start the multi-stanza-free `نوحہ جات` collection with distinct pieces already separated at 329 and 330.
- **322:** inserted the source-printed repeated opening line `جب کربلا سے لٹ کے وطن کو حرم پھرے` and attribution **Amir Cholsi** *after stanza 3*, exactly at the right-column footer, before stanza 4 in the left column, Urdu and Roman. The rest of the printed poem follows and is preserved. This printed repeat is not a final-page duplicate to delete.
- **323:** restored printed author **Zuhur Charchavi** after the repeated first line in both scripts.
- **326:** moved the previous poem's printed closing refrain `جانِ نبیؐ و خاصۂ داور ہے فاطمہؑ` from incorrectly preceding the new heading to the actual end of the previous numbered poem, before the divider; both scripts updated.
- **324–325, 327–330:** existing group/numbering structure checked against scans and no high-confidence movement was warranted. Some lexically corrupted passages (especially the small type in 329–330) remain for full transcription checking.
- Audit has now covered the consecutive structural range **085–330 (246 pages)**, but does not imply full word-level clearance. Next review: 331–340; still pending retrospective source-printed closing lines on earlier 085–209 and full lexical disambiguation.

## Batch 24A — pp. 331–340 scan comparison, first source disambiguations

- Inspected original scans **331–340** in the printed right-column-then-left-column reading order. Both text streams retain poem-continuation boundaries across 334–335 and 335–336, and the poem change on 338. These pages are **not** lexically cleared as a whole.
- **331:** corrected the opening poem's OCR-corrupted heading (`چھانے` rather than `جہاں`) and recovered the missing words after `اصغر` from the enlarged printed line. Kept the printed independent Ahmad Nadeem Qasmi and Zakir Husain Zaidi sections separate; the lower quotation and more body verses still need lexical collation.
- **333:** restored several first and later stanza readings from magnified print, corrected the third stanza as it continues from the bottom of the right column to the top of the left, and removed the OCR's spurious duplicated two lines. All **five printed refrain pairs remain** after their respective stanzas; Urdu and Roman are aligned.
- Remaining pages in the scanned 331–340 group require targeted lexical correction, especially p. 332's verse lines, the source Arabic and short-print poems on 334, and the visibly corrupted verses 335–340. Do not mark these as word-by-word verified.

## Batch 24B — p. 339–340 source order corrections

- **339:** corrected two misread printed words (`جل چکا` and `سہہ چکی`) in Urdu; aligned Roman with the revised Urdu reading. The repeated `میرے غریب الوداع` lines remain intact.
- **340:** rebuilt the right-hand `میرے بابا` poem into its printed successive verse groups and retained **all eight printed `میرے بابا میرے بابا` refrains**. Recovered print-visible missing lines and the reply/dialogue in the concluding verses, reflecting them in Roman. The source contains small or problematic readings in verse 3 and the following stanza, so further lexical collation is needed; the retained earlier OCR there is not certified.
- **340 left:** corrected the printed `کن تمناؤں کا تھا ابنِ حسنؑ کا سہرا` title/opening (no inserted `اے`) and byline **Maulana Rahi Jafari Abadi**. The later body still needs word-by-word collation.

## Batch 25 — pp. 341–350 initial print-order comparison

- Inspected original prints **341–350** against the Urdu page files and corresponding Roman stream. Pages 342–345 are a consecutive two-column tale, and p. 347 follows the independent poem at the end of p. 346 before beginning a new poem; retain original right-column-first sequences. This is an initial order/layout comparison **only**, not full lexical clearance.
- **341:** inserted a proper poem divider before the independently printed Qamar Zaidi verse; removed the corrupt repeated `Shah-e` in Roman.
- **342–345:** removed unprinted `[بائیں کالم]` / `[Bayen kalam]` OCR scaffolding from the middle of the published poems; retained the verse sequence. Removed a spurious editorial completion label from 344 and standardized the printed ornamental separator. Corrected the Roman double `Sham-e` in 342's title.
- **346:** corrected obvious Roman `lungi` artifacts that had been substituted for the Urdu future-tense verbs in the printed refrain/title and subsequent lines. The rest of the transcription on 346–347, including its difficult long salam, needs manual source-word checking.
- **349:** removed unprinted continuation labels in both scripts, while **keeping the actual repeated refrain at the top of the left column**. Corrected a Roman duplicated phrase in its later verse.
- **348, 350:** original layouts inspected; no safe additional stanza-order edits made in this batch. Both contain unverified verse-level transcription errors.
- Small-font acknowledgment names and source-word uncertainty still require full comparison against enlarged prints on these pages. Next order batch: **351–360**. Retrospective closing-line audits, introductory pp. **001–084**, and complete lexical proofreading remain outstanding.

## Batch 26A — originals 351, 354, 356, 357

- Reviewed the printed right-then-left-column reading order for 351–360. **351:** removed the unprinted column cue from both streams and the doubled Roman `Sham-e` reading.
- **354:** placed the two independently attributed couplet/qat'a sections by Sagar Lakhnavi and Syed Sibt Hasan Anjum behind their printed poem separators in both versions; removed layout cue and two demonstrable Roman artifacts.
- **356:** corrected the serious OCR inversion: the right-column poem `محرم آگیا امت کے شہزادے نہیں آئے` now precedes its three-line conclusion at top of the left column. Preserved its repeated printed concluding line, then the separate Bhitai quotation/credits, Abid Raza Shakib couplet, and Fatiha request in actual scan sequence. Marked uncertain names unresolved.
- **357:** reconstituted the complete `بانو کا یہ ارمان تھا آباد مکاں ہوگا` text from the left-column print, correcting missing/misassigned lines and removing a spurious poem break inside the final verse; matched Roman line for line. First poem's following Fatiha request remains separate. Its individual verses still require final lexical check.
- This is a **print-order and targeted transcription** pass, not a blanket word-by-word clearance.

## Batch 26B — original-image transcription pp. 358 and 360

- **358:** used enlarged original print to repair the opening poem's damaged verse readings (Rubab, Asghar, Abbas, and the cool wind from the river). Corrected the second poem's printed `بہتر گزر گئے` and removed an extraneous `کیا`, pairing every Urdu correction with Roman. Kept the two independent pieces and source memorial/Fatiha notes.
- **360:** corrected the first work's printed `نبی کی آل` and two Roman misreads; inserted the original distinct couplet section for Syed Ghulam Syedain Rizvi after the earlier poem/acknowledgment, and normalized printed section breaks before the Sabira Kazmi and Syed Ali Ansar works (rather than double/unprinted separators). Fixed the clearly printed `کیوں آہ و زاری` in both versions.
- **352–353, 355, 359:** scans checked for poem boundaries and left/right progression; no broad automatic re-transcription. Small-print names and many other OCR passages on pp. 351–360 remain unresolved and must not be claimed as word-by-word certified.
- Next scan-order section: **361–370**. Preserve repeated refrains verbatim.

## Batch 26C — targeted source disambiguations 352, 353, 355

- **352:** restored the printed `صبر کر` repetition in the first lyric, corrected `ساعتِ شامِ غریباں`, and removed multiple nonsensical `lungi` / `aayen hue` Roman OCR substitutions where the Urdu/source makes the verb clear. The many remaining misread words have not been marked clear.
- **353:** filled the Roman ending `Kar de zalim ka jald se safaya` from the Urdu and visible scan, replacing the visibly incomplete OCR tail.
- **355:** the source explicitly prints poet **Shor**, not `Shorur`, and its earlier line says `گوہر نہ چھین بہرِ خدا`. Corrected both scripts. Also fixed the separate section title to **`سُر کڈارو کا منظوم اردو ترجمہ`** (the Sindhi Sur Kedaro) rather than corrupted `سر کٹداروں کا مظلوم...`.
- Page scans **351–360** have now had a first structural comparison, with some source-backed lexical fixes. This is not exhaustive transcription clearance.

## Batch 27A — originals 361–363

- Compared original scans **361–363**, reading right column first. **361:** recovered four full formerly uncertain four-line stanzas of the `شہید ابرار نے ترک وطن کر دیا` poem directly from print in both scripts. Kept all six printed refrains in their actual locations. The left column is a distinct `مختصر زیارات` section. Its Arabic is present in Urdu Markdown but the Roman contains substantially corrupted transliteration that requires a separate careful Arabic transliteration pass.
- **362:** preserved the opening hamd's continuation at upper left; added printed poem boundaries before Iqbal's Persian quatrain and Syed Hashim Raza Hashim's separate couplet in both versions.
- **363:** recovered the previously omitted two lines in the Abu Talib manqabat and corrected `جاں اپنی چلی جائے، بچ جائے محمد کی` as printed. Also corrected the `پیٹ پہ باندھا` reading in the preceding Syed Sibt Jafar naat. Other small print/glyph uncertainties remain for full lexical collation.

## Batch 27B — source structural recovery p. 367

- **367:** the previous Urdu/Roman Markdown was NOT a transcription of its printed page; it mixed the printed `لا فتیٰ علی` qasida and Persian rubai with chunks of the `علی آگئے` poem on p. 368. Replaced both page 367 files with the actual three distinct works in scan order: Pir Badi Shah Warsi's `لا فتیٰ علی`, his Persian rubai, and Maulana Kausar Niazi's `دم بہ دم علی علی`. Preserved all four printed terminal `دم بہ دم علی علی` phrase occurrences and the printed ending. Roman rebuilt alongside Urdu.
- Two unreadable parts in the smaller Persian stanza and a difficult first line on p. 367 remain explicitly flagged rather than reconstructed by guesswork. Page **368** must be independently corrected against its own complete print rather than accepting the earlier OCR spillover.

## Batch 27C — continuation boundaries 364, 366, 368–370

- **364:** retained the p363 Abu Talib continuation and separated Yadullah Haider's independent couplet in both versions. Corrected the first word `کیا خوب` from print.
- **366:** separated the independent Sibt Jafar and Syed Tahir Nasir Ali couplets from `ہوا یا نہ ہوا`; fixed Roman `Aal-e Aal-e-Aba` duplication. Body still awaits lexical recheck.
- **368:** corrected the page title `علی اکبر` to the printed `علی آگئے`, and repaired obvious Roman missing `آگئے`. The rest of 368 remains badly OCR-damaged and is not cleared.
- **369:** restored the separate second-poem title's printed `زندگی نہیں آئی` while leaving the opening stanza's `زندگی نہیں آتی` untouched.
- **370:** corrected two Roman duplications and separated Barq Zaidi's independent closing couplet from the continuation of p369.
- Structural scans reviewed through **370**, but full word-by-word image collation, particularly 368 and small acknowledgments, is still outstanding. Next structural range **371–380**.

## Batch 27D — targeted restored text pp. 365, 368

- **365:** original print shows the missing opening-naat line `لکھی ہے نعتِ نبی میں نے اس قرینے سے`, the `اک سفینے میں` / `سو رحمتوں` couplet, and the two verses following. Recovered them and corrected `نبی کی آل سے الفت`; paired Roman edits. Also corrected the next poem's printed `شاہِ یثرب`. Some of the small-font second naat still needs detailed verification.
- **368:** original is the single `علی آگئے` composition by Syed Sibt Jafar. Recovered the opening right-column sequence of couplets and the initial left-column lines, replacing major OCR scrambling imported from nearby texts. Marked the few unreadable source spans explicitly rather than fabricating them; the later Ashura section still requires fuller transcription.

## Batch 28A — original scans 371–375 (paired print-backed fixes)

- Inspected original scans **371–375**, preserving right-column-first order and all repeated printed lines. The first poem on **371** ends at the top left, then a different `قائمِ آلِ محمد` piece continues on **372**; not the same poem. **372:** correctly separated the independent Syed Hashim Raza Hashim quatrain before the Persian Shams Tabrizi poem and Shadan's separate short work. Recovered printed `لائق تحسیں`, `فرزدق`, `راحتی صاحب کے سوا`, and `داد ہنر` readings in both versions.
- **373:** corrected `دخل` and `حسن اور حسین دونوں ہیں نبی کے پسر`, among other clear print errors; separated the Hakim Arif Akbarabadi **(حنفی)** couplet as its own work.
- **374:** removed the unprinted left-column label and corrected the first verse's `تحریر و تقریر` wording in both languages.
- **375:** source dedication is to Imam **alHasan**, not Imam alHusain; fixed the attribution in both scripts. The `شاعری بھی مری اُن سے منسوب ہے` poem ends on 375 right, and the independently headed `نماز عشق پڑھتا ہوں` starts on the left; its continuation runs across 376–377.
- Several small-font/uncertain lexical passages (especially 374–375) await a dedicated line-by-line scan check; this is not lexical clearance.

## Batch 28B — print ordering and disambiguation 376–380

- Inspected source images **376–380**. The `نمازِ عشق پڑھتا ہوں` poem from p375 continues across both columns of **376** and the top right of **377**. The independently headed `زیست جس کی باندی ہے` poem begins later on 377, continues on the right of **378**, and ends before the heading in its left column. Repaired that heading and a visibly misread `ایلیا` on 377, paired with Roman.
- **378:** moved the `شفا تجھے اور کون دے گا؟` heading and byline to *after* the actual printed preceding-poem separator, retained the deliberate varied ending words `جِلا`, `جزا`, `صلہ` and the other refrain variants. The print specifically says `بیٹے` twice in the Khuda-and-Husain stanza, *not* `پیسے`. Corrected both scripts.
- **379:** checked continuation of the same `شفا...` work, with printed return lines retained. No wholesale word replacement where print is ambiguous.
- **380:** right column concludes that work, followed by a different poem titled **`آلِ نبی کے نوحِ ثانی`**, not `نوحہ خوانی`. Recovered a missing printed line about Abu Talib's illuminated home and corrected `صحت و حریتِ فکر` and `بلندی جھک کے`, all in paired Urdu/Roman changes.
- Structural comparison now reaches **380**. Detailed lexical verification still pending, particularly 374–377 and the later lines of 379–380. Retain all source-printed repetitions. Next structural batch: **381–390**.

## Batch 28C — enlarged print checks 377–378

- Compared enlarged original columns, not the cross-script OCR agreement alone. **377**: repaired `نانی` (not `نائی`), `صدقہ کون و مکاں`, `جس کے در پہ آئیں ملک`, `باگ ہے نبوت کی`, and the next `کلمہ جس کا پڑھتی ہے` stanza; updated Roman alongside Urdu.
- **378:** the first line of the page continuation says `دی اماں سرِ مقتل`, not `دے اماں`. Kept its position after the p377 sequence and before the separately titled next work.
- The remaining obscured words in this group have **not** been guessed from rhyme or grammar; those remain for dedicated lexical verification.

## Batch 29A — original scans 381–382

- **381:** confirmed that `امام ہر دوسرا تھے محمد باقر` is a single work continuing right column into upper left. The separately credited Sarfaraz Abad quatrain at the bottom of the left column is now separated by a divider in both versions. Individual uncertain verses remain for the lexical pass.
- **382:** prior Urdu/Roman files were largely synthetic OCR placeholders rather than the printed page. Reconstructed the complete Imam Jafar Sadiq composition in **right-column-first order**, preserving its repeated `امام جعفر صادق کا ...` radif in each couplet. Both later independently credited short pieces — **Safdar Husain Dogar** and **Rehan Azmi** — have been restored from their printed lines, with proper poem boundaries and Roman transliteration. One genuinely uncertain line in the main poem remains explicitly flagged for later enlarged inspection. No lines were invented to fill unreadable print.

## Batch 29B — original scans 383–385

- **383:** checked printed right-column-to-left-column continuation for Imam Musa alKazim. Removed unprinted column labels and placed a poem divider before the independent **Waqar Ambalvi** couplet in both scripts. Recovered the printed reference to the oppressive ruler imprisoning the Imam. Other uncertain verses remain for dedicated lexical review.
- **384:** previous paired Markdown severely misread almost every stanza. Rebuilt the entire continuous Sibt Jafar Imam alRida poem from its **printed right column then left column**, retaining each occurrence of the `مرے مولا کا` refrain and matching the Roman line order. It is a full structural transcription pass, not a claim that every printed glyph is lexically certain.
- **385:** corrected the printed title `زمانہ لائے تو آقا علی نقی جیسا`. Reunited the closing line `نہیں ہے دوسرا قبّہ علی نقی جیسا` with its printed preceding line rather than treating it as an independent poem. Aligned the Roman. The two other poem bodies still contain suspect OCR wording.

## Batch 29C — 390 source-internal poem correction

- **390:** the original scan contains **one** Sibt Jafar poem throughout, `انتظار اس کا سرِ عرشِ علی ہوتا ہے` (`ذکر شہنشاہ وفا`). The existing Urdu/Roman OCR had accidentally inserted an entirely unrelated long `میرے مولا` supplication in its left column. Replaced both pages with the print-ordered right/left sequence of the single Abbas poem, retaining each printed radif `ہوتا ہے`. Restored the bottom acknowledgment and organizer credit. Two source spans remain explicitly uncertain for later lexical clearance; do not silently restore unrelated OCR text to p390.

## Batch 29D — structural source order, 386–389

- **386–388:** `حال غم سنائیں گے جب امام آئیں گے` starts at left of p386 and continues through p387 to the top-right of p388; corrected the heading. **387:** removed a duplicate `یہ ہمارے مکر و ریا` stanza unprinted in the original; rejoined the `دعویٰ محبت` stanza split by the two-column boundary and removed a spurious uncertainty placeholder. Its `العجل` stanza continues to p388.
- **388:** properly isolated Zahid Fatehpuri's independent couplet between the previous poem and the next `ظہور کا وقت آگیا ہے` poem on the left.
- **389:** the right column completes the latter poem; its left column independently prints Sarfaraz Abad's `ہر شاخ عقیدت کو ثمر دیتے ہیں عباس`. Recovered all eight printed couplets into Urdu and Roman, retaining the `دیتے ہیں عباس` radif. Source wording and some minuscule script in the previous piece remain for lexical collation.
- Original image structural comparison now reaches **390**. Next structural batch **391–400**. A full word-by-word lexical audit, especially 385–389, remains outstanding.

## Batch 29E — enlarged recheck p. 389

- Rechecked large print for the Sarfaraz Abad stanza: corrected the two source readings to `مٹ سکتے نہیں حرف وہ قرآنِ وفا کے` and `ہر چیز مہیا بیٹھے گھر دیتے ہیں عباس`, updating Roman simultaneously. These override OCR-influenced readings from Batch 29D.

## Batch 30A — pp. 391, 393, 395, 399–400

- Checked original images and matched Urdu/Roman corrections rather than inferring from Roman alone. **391:** corrected source-legible wording in the Zainab and Shadan Dehlavi Ali Akbar compositions while preserving the line-final repetitions. **393:** moved `حقیقت` and its Sibt Jafar byline to the proper side of the printed divider after the independent Zaid Shahid work. **395:** resolved several word-level Masuma-e-Qum errors visible in the print. **399:** reinstated the printed separator before Shadan Dehlavi's standalone quatrain, and recovered `کل اماموں کی ہیں ماں` in the Fatima bint Asad poem. **400:** repaired the Umm alBanin title in both scripts and the repeated `اللہ اللہ` heading in the Fizza work.
- This is a scan-supported targeted pass, not word-by-word clearance. Next inspect the remaining corrections and continuity in 392, 394, 396–398, and all of 400's verses.

## Batch 30B — p. 392, 394, 400 paired recheck

- Compared originals **391–400** for major poem-boundary and stanza-order defects. On **392** the Zaid Shahid poem reads continuously right column then left: corrected `خراج خون... کا علم`, `غضب کے مرد خدا`, `ہوش موسیٰ`, `لقب یہ یکتا`, plus the Roman doubled `Aal-e`. Page **394** continues `حقیقت` from p393 across both columns; removed one OCR-created mid-couplet break, without altering its actual text. On **400**, repaired a visibly repeated Roman `aala` in the Fizza piece. **396–398** maintain the continuous supplication through p397 right followed by a distinct, long `آئیے اپنے مولا سے باتیں کریں` poem over pp397 left–399 right, including the printed repeat of the first line within its later stanzas.
- Other verse-level OCR errors across these pages remain flagged for subsequent lexical review. Do not claim a full lexical clearance for 391–400.

## Batch 30C — final enlarged-image spot checks

- **391:** source enlargement resolves `ارباب کساء`, `عباس کبھی شبیر بنے`, and `چاہے تو بدل دے پل بھر میں` in the Zainab verses. Paired Urdu/Roman edits committed, leaving truly uncertain lines for close lexical collation.
- **393:** the initial `حقیقت` stanza visibly says `میدان مباہلہ ہو یا کساء، خلوت ہو یا جلوت پانچوں کی`, restoring the earlier missing printed portion in both scripts.
- **400:** restored the printed `عالی ہمت بیٹوں کی ماں` and `اس دم کربلا` rather than the OCR's incorrect readings. Distinct Umm alBanin and Fizza compositions remain separate.
- The original scans **391–400** have been inspected for print order and targeted source ambiguities. This does not clear every OCR phrase; future passes should continue independently verifying each stanza against source, especially 394, 396–398, and 400.

## Batch 31A — original scans 401–403

- Compared original images of 401–403 in printed right-then-left reading order. The Quran poem begins on 401 and continues to the right column of 403; preserved the invocatory opening and all repeated Quran line openings. Source-backed corrections include the flowers/stars line on 401; the dry/wet, huffaz, ajaib, and purpose lines on 402; and Rasul-e-Arabi on 403.
- The separate Nahj-ul-Balagha work starts at the left column of 403 and continues on 404 right. Corrected its title and two Roman OCR artifacts (especially spurious lungi). Full lexical checking of this poem remains pending.

## Batch 31B — original scans 404–406

- **404:** Nahj-ul-Balagha poem continues from 403 through the right column, followed by separately credited Hakim Kazim Zaidi and Zair Amrohvi verses. Recovered printed `باغ جناں`, separated their credits with an editorial poem divider, and corrected Mohsin Naqvi (Shahid), not Mohsin Taqvi, on the independent left-column prayer; corrected the Zainab captivity line.
- **405:** right column finishes the Mohsin Naqvi prayer and includes a distinct traditional folk nauha with difficult dialect spellings not yet lexically cleared. Left column begins Shadan Dehlavi on Dhul-Ashira; corrected opening to `نوید بعثت خیر الوری`, prophet's akhlaq line, and `محبت ہے نبی سے` in Urdu/Roman.
- **406:** separate Shadan Dehlavi poems on Shi'b Abi Talib and the night of Mi'raj, in respective right/left columns. Resolved repeated `Ahl-e`, `Khuda-e`, source `ساری دنیا ہے مخالف`, `سرور کونین یوں آئے`, and `لوح و قلم`. Printed opening lines and poem boundary retained.

## Batch 31C — print-order comparison 407–408

- Page 407 has independent Shadan Dehlavi compositions on Shab-e-Hijrat (right column) and Khaybar (left column). Restored source `چین کی نیند`, `نہ سلجھا عقدہ دشوار`, and removed repeated Roman `shab-e Shab-e-Hijrat` artifacts without altering printed verses.
- Page 408 continues Khaybar at upper right, then begins the independently credited Ghadir composition on the left. Restored the explicit printed gate-lifting line `اکھاڑ پھینکا فقط دو انگلیوں سے باب خیبر کو`, `انہیں ہونا تھا ثابت`, and the Ghadir `مسرتوں کا سمندر` line. Retained actual two-work boundary; remaining difficult source words are not marked lexically cleared.

## Batch 31D — targeted scan disambiguation 409–410

- **409:** two independent Shadan Dehlavi poems, Mubahala in the printed right column and Fadak in the left. Recovered `عکس یقین`, `دکھ کی دوا`, `نجرانیوں`, `بجائے جنگ`, closing `محاذ دعا`, and the Fadak `اک دشمن دین` line. Updated Roman alongside Urdu.
- **410:** right column continues the Fadak poem; corrected `قربیٰ` in both scripts. The left-column Sibt Jafar Dam Maula piece is separate; its further transcription is tracked separately.

## Batch 31E — page 410 independent left-column poem

- Replaced the garbled p410 left-column Sibt Jafar `ہر قدم تھا ورد زباں دم ہمہ دم دم مولا` poem in both Urdu and Roman. The printed opening is retained as heading and its repeated first verse, followed by the source-order eight couplets. The p410 right-column Fadak continuation is untouched.
- This is a structural/source-reading pass, not blanket lexical clearance. Follow-up detailed OCR ambiguities remain on other 401–410 passages (especially 403 Nahj, 405 folk dialect, 407–409). Next structural batch: 411–420.

## Batch 32A — pp. 411–414, printed scan comparison

- **411:** distinguished the top-right continuation of the Imam Rida poem from the separately headed Sibt Jafar `شہید ہو گئے کچھ اور تیرے لال حسین` work that reads right-column and then left-column. Corrected source-visible words and aligned Roman; further small-print ambiguities in this poem remain.
- **412:** the sole `میں نہیں مانتا` composition by Gauhar Jarchavi includes many refrain occurrences at the end of its printed stanzas; kept every repeated `اس عزادار کو میں نہیں مانتا`. Repaired a conspicuously scrambled stanza opening `کوہ غم سے جو اپنا رخ پھیر لے`; remaining verses need fuller dialect and lexical collation.
- **413–414:** one continuous Payam Azmi poem on motherhood: p413 right and left, finishing p414 right. Fixed `خون دل ... نس نس میں`, `ذروں کو گوہر`, `بخدا`, and the closing tabut / Shabbir lament. The independent Eid-e-Zahra piece begins on p414 left and continues on p415; retain this original section boundary.
- This pass is source-structure plus selected source disambiguation, not word-by-word lexical signoff.

## Batch 32B — 415–418 print comparison

- Original **415** continues its single poem through only the first couplet on 416 right; recovered `بضعۃ منی` and `غصب کی اک پائی` in both scripts without removing stanza-end `کس نے کہا ہے` repetitions.
- **416** is otherwise occupied by the distinct `سوزخوانی` poem, independently credited Hilal Naqvi verse, and left-column `کوئی ایسا بھی ہوتا ہے`; corrected three meaningful readings and preserved all refrains.
- **417** starts the Sibt Jafar `چھوڑ دے` poem on the right; the separate Dilawar Nigar `شرعاً حرام` text begins left and continues at top of 418. Corrected `اغیار سے دوستی چھوڑ دے`; the unusually complex Dilawar long poem still needs full verse-by-verse collation rather than OCR prose.
- **418** next contains the independent `شہیدوں اور شہیدوں کے وارثوں کو سلام` across both columns. Updated source wording and Roman acknowledgment; avoid claiming full lexical clearance.

## Batch 32C — 419–420 and p411 correction

- **419:** first independent poem `اے میری بہن بے پردہ نہ پھر` reads right column into upper left, then `اے میرے برادر ایمانی` begins at the left-column divider and carries over to **420 right**. Preserved all printed refrain repetitions and source-directed text for its intended readers, fixing `میں شرم سے گڑ جاتا ہوں`, `نصیحت`, `علم و عمل تیری دولت`, and `ہر عالم و ذاکر` across Urdu/Roman.
- **420:** the `اے میرے برادر ایمانی` poem concludes in the right column; an independent `یہ زندگی ہے تجھ سے اے جنت البقیعہ` begins in left column. Corrected `تعمیر کر نہ پائے`, `یہیں پر`, and `ہے آل کا خزینہ` without altering repeated printed `اے جنت البقیعہ` endings.
- **411:** reverted an inadvertently duplicated OCR-correction line after enlarged scan comparison; explicitly flagged the uncertain opening words of the printed line instead of manufacturing a second `اور بیبیاں بازار میں ہیں ننگے سر` line. Further lexical check necessary.
- This batch is structurally reviewed through **420**, not exhaustively word-by-word proofread; especially incomplete **412**, **417** long poem, and source-specific uncertainty on **411** remain outstanding. Next structural block **421–430**.

## Batch 32D — enlarged 419–420 recheck

- Rechecked the actual printed lines and the exact paired Markdown: source says `میں شرم سے گڑ جاتا ہوں`, `سبط جعفر نے نصیحت`, `ہر عالم و ذاکر`, `محب اور حامی`, and `ہے آل کا خزینہ`. Corrected all five in both scripts. Page boundary and original poem end-refrains retained.

## Batch 32E — p. 412 original-stanza reconstruction

- Rebuilt **both** p412 files against enlarged right/left scan, using its printed **13 two-line stanzas**, with **14 occurrences** of `اس عزادار کو میں نہیں مانتا` (the first two lines both carry it). Corrected source OCR that had broken and shuffled sentences inside stanzas, restoring `کوہ غم سے جو اپنا رخ پھیر لے`, `جیب بھر کر ... ہائے کرب و بلا`, and the closing `ماتم کی مجلس بھی اک مشغلہ ہوگئی`.
- Four difficult small-print source portions remain explicitly `[غیر واضح]` / `[ghair wazeh]`; do not assume complete lexical clearance. No source-printed refrain occurrence removed.

## Batch 32F — 417–418 vertical OCR prose recovery

- Enlarged **417** original revealed that the independently credited Dilawar Nigar `شرعاً حرام` is line-by-line verse printed in narrow paired columns, not a continuous prose essay. Restored its visible couplets in order and matched each Roman verse to the Urdu; marked small-type uncertain half-lines instead of inventing them. The preceding Sibt Jafar `چھوڑ دے` poem on the right remains separate.
- Enlarged **418** shows two finishing couplets of `شرعاً حرام` before its printed separator; restored `سوزخوان کا ساز دل ہے`, `کون کہتا ہے کہ ایسی سوزخوانی ہے حرام`, and the closing `ذکر حسین` couplet. Its following Sibt Jafar martyrs' poem retains its independent heading and column order.
- Lexical recheck is still required for the bracketed portions of 417 and some other source phrases; neither this nor the previous structural batch constitutes exhaustive word-level clearance.

## Batch 33 — pp. 421–430

- **421:** the Jannat-ul-Baqia poem continues from 420, right column then left. Restored `دل کی مرادیں`, `خائف بھی`, `تعمیر جب تو ہوگی`, and `مکہ مدینہ اقصیٰ`; separated independently printed qit'a and corrected the printed author credit. Retained repeated refrain; some print text remains uncertain.

- **422–424:** wedding sehra by Shadan Dehlavi spans p422 and p423 right, separate Sibt Jafar Zaidi sehra starts p423 left and ends p424 right. Restored its printed boundary and corrected Roman title/terms. Another credited qit'a by Dr Syed Yawar Abbas follows, then independent `رخصتی` (Shadan) begins on p424 left and continues onto p425. Restored separator before the title, not between title and poet credit.
- **425:** the `رخصتی` poem concludes on upper left; separate qit'a by Hakim Arif Akbarabadi follows a printed divider. Added matching separators to both Markdown versions.

- **426–427:** source's `منظوم ترجمہ دعائے فرج` begins on 426, ending upper right of 427; corrected first stanza wording and kept the invocatory lines. Independently printed `شان اسلاف کی دنیا کو دکھا دو اٹھ کر` begins on 427 right, by **علامہ حسن اعظم گڑھی مرحوم** (name recovered from scan). Restored `چلو دھار پہ تلواروں کی` and `مر مٹو خاک بنو` with paired transliteration.
- **428:** the Hasan Azamgarhi poem continues at upper right and ends before the printed divider. A separate Sibt Jafar poem `عقل و شعور ہیں رب کی نعمت، حق نعمت ادا کرو / حق مودت ادا کرو` follows, covering the remainder of 428 and continuing to 430. Inserted divider at the REAL poem boundary and deleted a Roman-only divider that had split `مرد بنو میدان میں آؤ` from its preceding stanza. Repeated refrains remain intact.

- **429–430:** single Sibt Jafar `حقِ مودّت ادا کرو` poem continues from 428 through both columns on 429 and concludes at upper right of 430. Repaired exact duplicated Roman wording in the Khandaq/Khaybar stanza and printed `گرچہ تبرّا بھی ہے عبادت`, `دہلوی صاحب` in paired text. Thereafter the original prints a **separate Hazrat Mojiz Jaunpuri four-line piece**. Added its missing separator. Then a further printed divider introduces independent `ایک خالق، ایک قرآن، ایک امت، ایک رسول / درسِ اتحاد` by **Allama Hasan Azamgarhi Marhum**, which starts at 430 left. Corrected misplaced separator formerly between printed title and attribution; preserved title's repetition as first line of the poem.
- Source-original structural coverage now reaches **430**, but **not** exhaustive lexical clearance. Specific unresolved word-level scans remain on 421 first line, 424–425, 426 original prayer, 427–428, and 429–430. Build not run. Next structural block **431–440**.

## Batch 33B — enlarged source ambiguities (421, 425)

- **421:** recovered the complete printed historical comparison `کعبے سے جو عداوت اصحابِ فیل کو تھی` and final `تجھ پر ہو یوں بھی رحمت` directly from enlarged originals; updated paired Roman text, leaving only unreadable first line marked.
- **425:** enlarged right column confirmed that the OCR **omitted two complete printed lines** in the Rukhsati poem: `علی کو مل گیا ہے ہمسفر راہ عبادت میں / شریک زندگی کے ساتھ ہی لطف عبادت ہے`. Restored both in print order and Roman, plus legible `برگزیدہ خاص` and `میسر ہو اسے دولت`. The independent Hakim Arif quatrain remains separately credited.

- **Final p428 check:** removed an accidentally duplicated Urdu separator created while aligning the one printed ornament; Roman already has exactly one at that location. This fixes structure without altering the poem.

## Batch 34A — original images 431–434

- **431:** continuation of `درس اتحاد` from p430 ends in right-column top. Printed ornament PRECEDES `نوجوانوں سے خطاب` with its byline (the older Markdown incorrectly put the heading before the ornament). It continues across the left top; the independent `اے حسین ابن علی کے ماننے والو اٹھو` starts after another ornament in left bottom and carries through p432. Corrected visible `روز و شب ... چن چن`, `صفحہ تاریخ ماضی چھاننے والو`, and `سرگذشت کربلا` paired readings.
- **432:** continues preceding work across right then left, ending there; corrected `تا بہ کے ساکت`, `اعضا دوا درکار`, and a source-visible education line. No independent new poem begins here.
- **433–434:** independent Azamgarhi poems `سلامت رہو غازیو` (433 right) and `ذوالجناح` (433 left, concluding 434 right upper two lines). Corrected `بزرگان رفتہ`, `فتوحات شاہد`, and recovered the badly mangled `پڑھیں نانا کا کلمہ اور نواسے پر ستم ڈھائیں`. **434 Roman** had lost the first continuation line and placed the separator before rather than after the Zuljanah ending; fixed. The separate Persian Khomeini poem begins after the original right-column ornament and continues through the page's left column and p435 top-right. Full Persian collation still outstanding.

## Batch 34B — originals 435–437

- **435:** the Khomeini poem ends at the top-right, followed by a separate Rahi Jahangirabadi `اے پاک وطن پائندہ باد` across the right and upper-left columns. An independently credited Safdar Ali Zaidi mother poem begins at bottom-left and continues through **436** and upper-right **437**; preserved these actual printed divides and intentionally repeated patriotic refrain. Corrected legible `کیوں کر نہ کہوں`, mother-themed `اللہ رے کتنی ماؤں`, and the `دودھ میں ماں نے حب علی گھول کر` verse in both scripts.
- **436:** long continuation of the mother poem. Corrected its `حسین و حسن ... گلبدن` reading and one clear Roman line. The MANY heavily mangled OCR lines of this page are not cleared; retain source uncertainty for a future dedicated detailed transcription. No unsupported generic text replacements across this long poem.
- **437:** mother poem ends in right column and independent `اصحاب تھے کیا بوذر و سلمان و غیرہ` starts after a divider on right and continues into left, ending at top-right **438**. Corrected divider which previously split printed heading from poet credit. The satire's precise vocabulary still needs lexical review.

## Batch 34C — scans 438–440

- **438:** the satirical `بوذر و سلمان و غیرہ` concludes at the top of the right column, after which an ornament PRECEDES the title and byline of a different `حاجیو مبارک ہو` poem. The previous Urdu/Roman Markdown incorrectly put the heading before the ornament; corrected. Another independently headed `راتیں تھیں کیا سہانی` starts in the left column, and continues through upper right of **439**. Preserved all printed `راتیں تھیں کیا سہانی، کتنے تھے دن سنہرے` refrains and corrected its opening and `حمد و نعت و مدحت اشکوں سے` line.
- **439:** independently credited `دعا` by Engineer Sajid Raza Haideri begins in the left column after the printed ornament, continues across both columns of **440** right, and finishes there. Corrected obvious OCR misread in its opening `بند ٹوٹے ہیں رنج و آفت کے`; many other couplets remain in need of a meticulous lexical reconstruction.
- **440:** the left column independently begins `میرے مالک` by Syed Sibt Jafar Zaidi; preserved its heading and the prayer's transition. Recovered print-visible `وارد کیا ہے آفت کو`, `بند در تو کرے تو کھولے کون`, `مجھے راضی برضا`, and `دے کے ایقان ہمیں صاحب عرفان کیا` with corresponding Roman text.
- Structural source order reviewed **431–440**. Significant word-by-word ambiguities remain, particularly Persian page 434–435, the long motherhood piece 436, and prayer 439–440. Build not run. Next structural range **441–450**.

## Batch 35A — scan comparison, original 441

- **441 right:** directly reconstructed all eight opening-prayer couplets from the print; retained the same verse count, corrected `اعزہ و رفقا`, `فردوس`, and the repeated address to Allah, without changing poem order. The prayer concludes after its actual `سبط جعفر کی ... دعا` line.
- **441 left:** separate Sibt Jafar poem for Janab Sakina begins after the printed ornament. Corrected the explicit `لبوں پہ تبسم تو آنکھوں میں آنسو` line and the `ممنون` phrase. The existing OCR is still badly corrupted in other lines; these have *not* been claimed as word-by-word verified. Retained all printed `جناب سکینہ` endings and the actual final line of the poem.

## Batch 35B — original 442–443

- **442 and upper-right 443:** single Rahi Jahangirabadi satirical poem `شاعری`, with original right-column-first reading order and continuation to 443. Corrected numerous clear print/OCR mismatches (`یہ مفت میں شہرت`, `مفت میں شہرت`, `اوزان`, `موجود ردیف`, and selected wording in the final verse). Paired Roman retained line-to-line alignment. A few metrical technical terms require a further lexical check; not every OCR phrase is cleared.
- **443 left:** source independently introduces `سلام / محترم مضغم زیدی`, not the previous OCR name. Preserved its printed individual two-line stanzas and divider. A full lexical collation of the Salam is still needed.

## Batch 35C — original 444–445

- **444–450** are the continuous long `وسیلۂ حیات (ماں، باپ)` poem; preserve source order (right column then left) and *every* printed `ہے ماں` ending. **444:** recovered print's `جب تھک کے سو جاتی ہے ماں`, `اوڑھتی ہے حسرتوں کا خود تو بوسیدہ کفن`, and `یتیموں کو` instead of OCR gibberish. **445:** corrected `اپنا دکھ اولاد کو`, reconstructed a whole couplet previously OCR-garbled about old age and solitude, and recovered `کھا کے ٹھوکر` and `نوکروں کی گودیوں`. Both scripts updated together. Other lines require another careful visual collation; no new poem dividers inserted.

## Batch 35D — enlarged scan comparison, 446–447

- Corrected printed `بچہ بوجھ لگتا ہے`, `پرائے گھر بیاہ کر بیٹیاں`, `ڈگریاں دلوائیں جن کو اپنے ارمان بیچ کر`, and `بیویوں کی جھڑکیاں` on 446; `زہر بچوں کو`, `چتا کی بھینٹ چڑھ جاتی ہے ماں`, `پیار کہتے ہیں کسے اور مامتا کیا چیز ہے`, and `رِسنے لگتا ہے پرانے زخم سے تازہ لہو` on 447. Roman versions updated in the same commit. Preserved every original recurring `ہے ماں` ending and uninterrupted poem continuity. Remaining small-font lexical ambiguities are not cleared.

## Batch 35E — original 448–450, continuity and source readings

- **448–450:** continuous second half of the same motherhood poem, without any printed new heading or poem dividers. Corrected source readings `در پہ آہٹ ہو ہوا سے`, `مرتے دم بچے نہ آ پائیں`, `بھیس بیٹی کا بدل کر`, `شور ہوتا ہے مبارک باد کا`, `بیٹی کی سہیلی`, and `اچھی سے اچھی بہو` on 448. On 449 recovered `پھیر لیتے ہیں نظر`, `بڑوں کے حضور`, and `پوتے سے شکستہ دل`, plus a repeated-word OCR error. On 450 corrected `دوڑ کر بے اختیار`, and `پھینک کر بچے کو تیروں میں`. Retained all printed `ہے ماں` radif endings and updated Roman in tandem. Other source-specific uncertainties remain; no site build run.
- Structural scan pass now covers through 450. Next block 451–460 (if those pages are part of the 447+ Urdu / 441+ Roman index); full lexical collation of 444–450 still necessary.

## Batch 36A — scans 451–452

- The long motherhood poem continues without a new work on 451–453. Examined enlarged right and left columns. **451:** corrected the coffin-cloth line `توڑ کر بند کفن`, `مادریت`, `چومتی ہے لب`, `دل پہ پتھر رکھ لیتی ہے`, the time-of-Asr line, and `تھام کر اپنا کلیجہ`. **452:** corrected `دوڑتے ہیں لاش پر گھوڑے`, `آبرو دشمنوں سے`, `فلسفی حیران`, and the printed theological teaching line `ایک ہے اللہ یہ بچے کو بتاتی ہے ماں` omitted by OCR. Paired Roman aligned, and no printed `ماں` ending removed. Difficult lines remain for individual lexical verification.

## Batch 36B — source transitions 453–454

- **453:** final page of the long motherhood poem, with printed right column and shorter left-column conclusion. Restored a complete `کھا کے گولی مر گیا بیٹا ... قیمت ... چیک` couplet, `حلق میں اٹکا نوالہ`, and original Karbala verses `سہرے کی جگہ`, `لاش اکبر پر جوانی پڑھ رہی ہے مرثیہ`, `سجدۂ شکر`. Kept all `ہے ماں` endings.
- **454:** a *separate* long `دن ڈھلے جب کر کے مزدوری رضا آتا ہے باپ` poem begins with its printed title and repeated first verse; no separator is printed inside the poem. Corrected `خانقاہ`, `گھر کے پالوں`, `کر کے کوئی بھی بہانہ`, `جکڑ لیتی ہے زنجیر معاش`, `مسکرانے`, and `گھن کی طرح` in paired Urdu and Roman; other difficult lines still require lexical review.

## Batch 36C — fatherhood poem 455–456

- Kept all printed two-line stanzas and repeated `ہے باپ` endings. Original scans resolve `ہاتھ خالی جیب خالی`, `خم کئے گردن`, `پہلے دیتا ہے تسلی`, `پہروں اشک`, `باندھ کر سہرا جو بیٹا`, and the `چھین لیتے ہیں سکوں` line on 455. For 456 recovered `انگلی جسے چلنا سکھایا`, the wedding `بیاہ کا ارمان`, `پسینہ پونچھ کر`, and the lower-left `ماں کے نفس پر منحصر` passage. Both scripts aligned; no artificial poem break.

## Batch 36D — print corrections 457–458

- **457:** corrected `گھن کی طرح`, `کھول کر پڑھ لینا`, and verses referring to Imam Ali and Abu Talib. The original has one entire printed `جس کے چہرے میں محمد کو نظر آتا ہے باپ` line omitted in both OCR editions, which has been restored. `کر کے بیٹے کے حوالے نصرت دیں کا علم` follows it, then the printed arms-kissing line. Both scripts preserve the source sequence.
- **458:** corrected `جب کبھی اپنے جواں بیٹے کو دفناتا ہے باپ`, `زندگی بھر جن کی خاطر`, `چھین لیتی ہے اجل`, the wedding-date line, and `دیکھ کر ماہ عزا ماں توڑتی ہے چوڑیاں`. Corrected the final `زین العبا` reference. Original remains one continuous fatherhood poem with recurring `ہے باپ` endings.

## Batch 36E — continuous fatherhood poem 459–460

- Both original columns were compared with the paired text. **459:** corrected the printed `منتظر نوشاہ`, `پا برہنہ`, `ایک ششماہے کو تیروں میں`, `پانی کی دو بوند`, and `جلتی ریت` lines, retaining the source-printed reiteration later on page 460. **460:** repaired `مرثیہ`, `اُمِّ ابیہا`, `سر ادھر مانگے چھری`, the Roman doubled Sham in `شام غریباں`, and restored the Fadak verses `مانگنے آئی ہے`, `اٹھتے تھے سب تعظیم کو`, and `زرد چہرہ خشک لب ... چھین گیا وہ باغ`. No artificial work divider inserted. Remaining ambiguous or corrupted lines need second-pass direct-source collation.
- Structural scan review now covers pages **085–460 (376 pages)**. Need determine if the poem continues onto 461 before any closing or section boundary. The site build was not run.

## Batch 37A — page 461 (end of fatherhood poem; start of martyrdom poem)

- Inspected print right and left columns. The six closing couplets of the continuous `ہے باپ` poem occupy page 461 right; restored print-backed wording in Urdu and Roman (including `ہونے ہی والی`, `شام غریباں`, and the final `یہ عزاداری کا صدقہ`). The printed ornament separates this from **Sibt Jafar's** `جانے والے نہیں آئیں گے`, which occupies all of p461 left and continues on p462 right. Rebuilt eight source-order stanzas, correcting `خاصان و مردان خدا` and `جاتی ہے یہ دنیا ہم کو آپ کی نسبت سے مولا`. Preserved the title and complete return lines, not treating them as OCR duplicates.
- This is a source-backed structural and wording correction; other tiny readings can be revisited in lexical clearance.

## Batch 37B — scan comparison 462

- **462 right:** closes `جانے والے نہیں آئیں گے` (continued from 461 left) with six more printed couplets, followed by a separate printed ornament and title `پاکستان کی بنیادوں میں` by Sibt Jafar. Fixed `ہٹا سکتا ہی نہیں ہے`, explicitly printed `جتنی جہادی تنظیمیں ہیں`, and the broken Roman end-refrain. Corrected opening `تن من دھن` of the national poem, including Roman. Original print order right column then left maintained.
- **462 left:** continues the national poem as three-line stanzas. Restored `ہمیشہ ہم سے کدورت اور جلن` and retained the partially unreadable line marked without inventing a word. No unprinted divider added between columns.

## Batch 37C — source scans 463–469

- 463 right: the national poem from 462 concludes here, with corrected source references to Masiha, rejoining the pieces of the homeland, Jabr-o-sitam, and the printed publication credit and numbers. Five three-line printed stanzas retain their order. 463 left: independent poem Amman consists of nine printed couplets, retained with all nine printed Amman refrains, and credits Syed Asad Ali Zaidi at bottom. Paired Roman files aligned.
- 464–469: six original scans are photo galleries and promotional pages rather than lyric pages. Urdu metadata already correctly uses imageOnly: true; no separate Roman content exists or is appropriate. Leave their image-only metadata and images unchanged. This photograph-only section continues to page 470 (certificate/credits); page 471 has printed English explanatory prose, as documented below. Remaining task is lexical verification of previously flagged poems, not additional structural pages.

## Batch 37D — final two scans, 470–471, and end-of-source correction

- Inspected the source ZIP itself. It contains original scan numbers 001–471, except missing 028; the maximum printed scan is 471, **not 469**. Page 470 is a copyright-registration certificate and publication/promotional information; the existing Urdu MD with imageOnly: true correctly displays its scan and no Roman file is appropriate. Leave it unchanged.
- Page 471 is English prose: "Sallent Features / Some facts about Soazkhwani", followed by a short profile of Prof. S. Sibt-i-Jaafar Zaidi. The Roman file already preserves the source prose; normalized the Urdu-index copy to the same Latin comma and numeral characters, eliminating accidental Arabic commas and Eastern digits injected by OCR. Retained the source's original spelling/grammar and biographical claims without silently fact-checking or rewriting the authored text.
- Final archival scope: 461–463 are the last Urdu verse pages. 464–470 are image-only pages. 471 is English prose present in both page indexes. The source ends at 471. Structural pass **085–471 (387 numbered positions)** is now complete, subject to earlier page-level lexical review and a separate check for source page 028. A site build remains outstanding.

## Batch 38A — frontmatter / table of contents, pages 003–027

- Scanned every original 003–025; 003–006 and 008–009 are extant transcriptions of introductory verses, authorization, Abu Talib's will, supplications, and Hadith alKisa. Corrected a serious page-004 OCR substitution: the print says `اب علمائے مومنین کے بے حد اصرار`, not `اب علامہ اقبال ٹاؤن کے بعد ہر امام بارگاہ پر`. Page 005 restored `حضرت نبی اکرم` and printed Arabic `الْأَسَدِ`.
- Page 007 is a printed two-column Urdu devotional composition previously absent from the index. Added a source-linked `imageOnly` entry so its complete scan is visible and no invented OCR text is presented. **Outstanding:** manually transcribe both columns and prepare Roman version, then remove `imageOnly`.
- Pages 010–025 are printed table-of-contents pages and had no page records; restored 16 `imageOnly` entries, preserving the source tables rather than inventing poem transcriptions or losing the page navigation. They do not require Roman poem copies.
- Page 027 includes four original Raghib Moradabadi quatrains (right column before left). Corrected repeated `سبط جعفر`, `کمر بستہ`, and `گلدستہ` against source. Page 028 **does not exist** in the provided original ZIP; do not invent one. Page 026 already had a transcription and is queued for lexical recheck.
- Source image-backed structural coverage is now contiguous for **003–027**; page 028 is a source gap. This initial metadata/legibility pass does **not** constitute complete lexical clearance of the Urdu prose or Hadith text, particularly 004–009.

## Batch 38B — early technical prose, biography, and testimonials (029–084)

- Examined original scan contact sheets for **029–084** and audited all 56 existing numbered Urdu MD pages for their headings, continuation shape, and source roles. Pages **029–036** contain the publisher's account of the publication and the institution; **037–054** explain Soazkhwani, performance, poetry, training, and practical arrangements; **055–063** discuss musical/vocal arts and institutional statements; **064–066** contain a short biography; **067–084** consist of endorsements/testimonials, some incorporating verse.
- These are prose-dominant pages, not conventional numbered-stanza lyrics. Their existing 56 page records are in place with originalImage references; they should not gain fabricated Roman lyric transcriptions or indiscriminate poem separators. The existing texts do, however, contain numerous visible errors and flagged source ambiguities: a detailed word-by-word print collation is still required, especially **026**, **030–036**, **038–39**, **052–54**, **065–66**, and **067–84**. This classification pass is not a claim of lexical clearance.
- **039:** in the cited Mahdi Zafar Aziz quatrain, corrected nonsensical OCR `ہر ذکرِ شہ تو خدا دور پاک کر پہلے` to the source's `ہو ذکرِ شہ تو فضا کو پاک کر پہلے`. Preserved the following three couplet lines.
- **074:** in Mirza Muhammad Ashfaq Shorish Lakhnavi's tribute, restored the printed reference to `عترت کے فضائل` instead of `عزت کے فضائل`, `مجلسِ صدا` rather than `بزمِ صدا`, and the named pair `عقیل و اختر` in the accompanying line. The two separate credited pieces on this scan remain distinct.
- Earlier pages **003–027** and **029–084** now all have a corresponding Markdown page or imageOnly record. **028** remains absent from the source archive. No site build or comprehensive detailed lexicon review has yet been run.

## Batch 39A — lexical page check 029–032

- Opened the printed source pages 029–032 at double resolution and checked the two-column source in right-column-then-left order. **029:** changed OCR `بکھرا موجود` to printed `ہمیشہ موجود`, `جرائد` to `مجامع`, repaired `عملی مظاہرے`, `سیکھنے سکھانے`, and minor wording/spacing around the founding of the training institution. **030:** rechecked the PTV/recording chronology and restored `انہی کی کوششوں سے جاری ہوا تھا`, the label `شاہد ریکارڈنگ کمپنی`, and `رنگارنگ البم`; **031:** corrected `بیرون ملک مقیم` instead of the non-word phrase `پھر یوں ملک مقیم`. 
- The print is dense prose. Unchanged words, especially proper names and exact company labels on 030 and many clauses on 032, are **not** considered fully verified. Preserve source's trans-page continuation; no poem dividers or Roman pseudo-transcriptions should be added.

## Batch 39B — scan inspection 033–038

- Compared enlarged printed two-column pages 033–038 to existing Urdu prose. Corrected **033** references to `شب ہائے شہادت`, `جتنی مجالس کراچی میں ہوتی ہیں`, the founding secretary's `سینئر رکن`, and `کسی بانی مجلس` rather than OCR substitutions. **034:** recovered the printed `مجالس کی ضروریات` and the passage explaining why schoolchildren are not trained: education is their principal responsibility, while the institution aims to prepare educated adult volunteers. **035:** corrected the two remaining institutional goals and printed completion tense; **036:** recovered printed `گر قبول افتد`.
- **037–038:** recovered `مقامی اور بین الاقوامی`, `بوجوہ فن سوزخوانی پر توجہ نہ دی گئی`, `منتشر و غیر منضبط اصولوں`, `عزاخانوں`, and the technical reference to `انتہائی نیچے اور انتہائی اونچے سر`. Kept page 038's section headed `راگ راگنیوں اور سروں کا استعمال` intact; no made-up stanza division or Roman copy.
- This is targeted source-confirmed lexical cleanup, not complete word-by-word clearance of the dense prose. Additional damaged phrases remain (especially names and performance terminology on 034–036 and 038).

## Batch 39C — p. 032 source wording spot-check

- Enlarged the printed middle-right paragraph about the editor's intentional changes to earlier poets' wording; repaired the missing grammatical link `فنی زبان کے جو الفاظ` and the clear concluding `بہتری ہی واقع ہوئی ہے`. The passage distinguishing changes in different manuscripts from the editor's own adaptations is otherwise preserved. Do not silently modernize the editor's explanations or recast them as corrections to the original poets' text.

## Batch 40A — source-image lexical pass 040–041

- Compared the enlarged printed right and left columns of 040–041. **040:** corrected the description of an ustad's knowledge of established bastas, his ability to compose original bandishes, and the contrast of hamdiya/munajati compositions; recovered the printed heading `سوزخوانی کی بندشیں اور اجزاء (شعبے)` and fixed clear voice-performance terms.
- **041:** retained the technical rubric for recitation of rubai/qita, soz, salam, and marsiya; corrected the distinct `سوزخوانی کے اجزاء (شعبے)` heading and some prose terminology. The opening of the page continues the preceding discussion; no artificial page boundary has been inserted.
- A scan-backed targeted lexical pass only: substantial prose passages, particularly page 040's religious-law exposition and some page 041 technical terms, still require full word-level scrutiny.

## Batch 40B — printed collation 042–044

- 042: restored `ہمارا یہ مناجاتی کلام` at the `بین` example and corrected clearly misread guidance on the reciter. Original salām/bain/marsiya headings retained.
- 043: corrected `مناظرانہ انداز`, `رثا اور پرسوز`, the `بستے / بستہ` term, `بیاض کی بجائے بستہ`, and the distinction concerning `زنانہ سوزخوانی`, from enlarged scan.
- 044: corrected `موجد و معمار` and printed historical reference to the publication at `شہر عالم پریس حیدرآباد دکن` in `۱۳۱۳ھ`. Names and longer historical accounts still require lexical validation.

## Batch 40C — scan collation 045–048

- **045:** corrected printed `محمد قلی قطب شاہ` and `عام گائیکی اور سوزخوانی` in the history, and `میر علی صاحب` in the teacher lineage. Large lists of named artists still need full scrutiny before treating them as accurate.
- **046:** source distinguishes the action of confirming soazkhwans in advance from listing them in notices; corrected `وعدہ لیں` and `ذاکرین و سوزخوانوں` in the guidance for organizers. No speculative changes to the long biographical name list.
- **047:** restored `چونکہ اردو زبان` syntax, `ایک اچھے سوزخواں`, the technical lower/higher notes `کومل اور تِیور`, and the direct performance-style description `سنگینی اور متانت`.
- **048:** corrected `گرد و غبار`, restored the need to hold one's breath (`سانس روکنے`) while rehearsing, and the printed English borrowing `اسٹیمنا` in the discussion of breath control. Kept the illustrative quoted lines and original prose order.
- All are directly legible spot corrections, not an exhaustive lexical certification; obscured or dense details remain outstanding.

## Batch 40D — enlarged p039 wording check

- Revisited the source's left-column definition `معیاری و مستند سوزخوانی اور مکمل سوزخواں / استاد`. Recovered that it describes the appropriateness of the **performance**, not a soazkhwan's person: `جو سوزخوانی موقع، محل اور شخصیت کی مناسبت سے ہو`; restored `دل و دماغ کو متاثر کرے`, `روح میں تازگی و بالیدگی`, `ہر کس و ناکس`, and the closing criterion about the prescribed rules and preparation. Corrected `ہر شاگرد کیلئے اس کا استاد اور پارٹی کا سربراہ` from the same scan. Other obscured technical details on p039 still need checking.

## Batch 41A — printed-source checks, 049–051

- Inspected right-column-then-left enlarged scans. Corrected **049** the available printed collections `بازار میں دستیاب مجامع`, the need to check recital words with the poet or a knowledgeable person, and the sentence about the reciter arriving early as `وہ ذاکر اول ہوتا ہے`. Kept the extended explanation concerning dignified conduct and respecting accompanying reciters.
- **050:** corrected the distinction between a gathering's `خصوصیت` and its chosen topic, and recovered the printed mention of the martyrdom recitation for `شہزادۂ اکبر`. Kept instructions for adjusting length when a scheduled speaker is delayed.
- **051:** corrected `غیر حاضر و غائب سامعین پر بھی نظر رکھنا` and the printed recommendation to keep a watch nearby during recitation; technical descriptions involving vowel annotation remain flagged for detailed review.
- These are verified targeted corrections, not exhaustive lexical clearance of prose, and no unrelated Roman lyrics are created.

## Batch 41B — source scans 052–053

- **052:** recovered printed phonation instructions for rounded `آ` vowels, practicing without a pause or speed change, and watching a trained teacher's technique; preserved the remedy bullets as **historical source transcription**, not contemporary medical guidance. Several tiny remedy words remain uncertain and need checking before publication clearance.
- **053:** corrected the printed heading `معاش و مجالس کے ہدیہ اور نذرانہ کا مسئلہ` and the wording about honouring voluntary reciters; did not rewrite the author's views or add editorial judgment. Dense details of monetary examples remain uncleared.
- All changes retain original right-column-before-left reading order and do not introduce Roman pseudo-transcriptions for non-lyrical prose.

## Batch 41C — source prose, 054–056

- **054:** distinguished the printed `بشرطِ صحت و فرصت` from OCR's invented `شہر صحت و فہرست`; corrected the heading for the national charitable institutions' local office, location (`جعفر طیار سوسائٹی ملیر کراچی`) and survey number, and restored the verb `عطیہ کیا ہے`. The bottom-left short poem remains partly illegible; neither its wording nor its author was fabricated.
- **055:** corrected the important author's first-person reference `راقم الحروف` (formerly `رائج انحراف` and other gibberish), the printed `حلت و حرمت`, and the heading `موسیقی و غنا ہے کیا؟`. Retained the author's original discussion and devotional voice, not inserting qualifications or endorsing the legal arguments.
- **056:** source identifies `مغرب کی مروجہ اقسام`, quotes `المکاسب` and defines ghina as `صوت المغنّي مع الترجيع`; fixed these significant OCR artifacts and a later author's `راقم الحروف کی ناقص تحقیق`. The transmitted Arabic quote, verse citations and theological discussion need further line-by-line verification; no unrelated passages have been silently modernized.

## Batch 41D — original 057–058, authorial distinction and source wording

- **057:** enlarged print clarifies the author's description of himself as a researcher of `منقولات و معقولات کے جویا و شیدا` and explicitly says there is no corresponding distinct terminology `عربی میں` for the contemporary categories discussed. Corrected clear syntactic errors without recasting the theological/legal argument or presenting it as an independently verified ruling.
- **058:** corrected its opening sentence on ancient religious songs remaining in use `کسی قدر تحریف و ترمیم کے باوجود`; restored `قیمتی اوقات`, `مکروہ و منکرات`, and `اسلامی صوتی فنونِ لطیفہ`. The later historical claims about sound and health are preserved as author's remarks, **not** presented as medical recommendations. The final prose continues onto 059.
- Targeted printed-source comparison complete on 049–058. Full lexical reinspection remains needed on the small-type sections, particularly page 051 performance notation, page 052 traditional throat remedies, page 054 source-poem, and pages 055–058 religious jurisprudential discussion. No site build has been run. Next batch: 059–068.

## Batch 41E — corrected source rereading on p053

- Enlarged the remuneration paragraph again and corrected two provisional transcription errors introduced earlier in this batch: the phrase about deciding honoraria in advance now follows the author's stated objection to preconditions, and `تحائف یا دوسرے طریقوں سے` correctly restores the recommendation to recognize volunteers who decline cash. These are faithful source-text corrections; the author's position is not paraphrased into an external recommendation.

## Batch 41F — p054 bottom-left short poem

- Enlarged the printed short two-column-format poem on the lower left of **054**. Rebuilt its **eight source-order couplets** from the right-hand half of each printed line followed by the left-hand half; restored every printed `مت کجو` ending, previously misread as `مت پوچھ`, and the clear `محتاج غیر ... پروردگار` appeal. The heading and a difficult word in couplet 4 remain explicitly uncertain. The surrounding organization/contact prose and printed poem credit are unchanged. No Latin transliteration generated for the prose page.

## Batch 42A — original scans 059–060

- Inspected enlarged 059–060 print (right column then left). Corrected **059** the cited translator/author to `مولانا سید فرمان علی`, clarified the source's cited interpretive phrasing, and recovered important `لَهْوَ الْحَدِيثِ` discussion readings, notably `لونڈیاں`, `شد و مد`, and the author's distinction about the purpose of criticism. The exact title of the commentary remains unclear; do not invent it.
- **060:** recovered source `لحن داؤدی اور حمد و مزامیر` and clarified authorial discussion of cautious scholars, explicitly preserving its original religious argument as the author's views, not an independent jurisprudential finding. Continue to leave unclear quotation details for a second visual check.

## Batch 42B — print collation 061–063

- **061:** corrected the page opening's `مذمت`, the author's warning that inaccurate devotional poetry may amount to `نادانستگی میں توہین معصومین`, and the named `ماتمی انجمنوں کی فیڈریشن`. Restored his description of devotional reciters' conduct in public and private life.
- **062:** corrected the actual document heading `ادارۂ ترویجِ سوزخوانی کا اعلامیہ`, local-neighborhood coverage, and a paragraph on the **left** column incorrectly replaced by an OCR-generated editorial placeholder. The printed source continues directly into the requirement to be a sincere, competent, nonprofessional volunteer. The author's speculative reflection on Abbas and Sakina remains in his own cautious voice.
- **063:** preserves the personal account's conclusion and the separate `اقوال معصومین` and contact notice; recovered the legible reference `روز خروج`. Addresses and phone numbers are historical information as printed, not freshly checked contact details. Short aphorisms and a few densely printed sentences still require a careful second lexical pass.

## Batch 42C — original biographies 064–065 and print-order correction

- **064:** restored the printed father's name `مولانا سید احمد میاں زیدی راہی جہانگیر آبادی مرحوم`, `عملی وکالت`, and the 1983–1988 publication period. Retained the person's other named teachers, family, and schooling as source content, leaving any unclear proper names for further close reading.
- **065:** the prior transcription began with the **left column**, then restarted at `الیکٹرونک میڈیا` from the **right column**, reversing substantial source sections. Restored print order: final continuation of `تصانیف` on upper right, `الیکٹرونک میڈیا`, `پیشہ ورانہ اور شعبہ جاتی وابستگی`, then the continuing left-column associations, `غیر ملکی دورے`, `شعر و سخن میں تلمذ`, and `سوزخوانی میں تلمذ`. Recovered the upper-right missing publication/editing sentence. The source remains a biographical historical record; dates and names are not independently verified.
