# Editorial standards

This is the **single authority** for kalam source language, formatting, metadata, deduplication and Roman transcription. Engineering commands live in [Contributing](CONTRIBUTING.md); sign-off lives in [Quality assurance](QUALITY_ASSURANCE.md). Automated normalization is a safeguard, **not** editorial judgment.

## 1. Source model

| Source | Content | Identity |
| --- | --- | --- |
| `src/data/lyrics/*.md` | One standalone poem per file; original-language Markdown body and optional `romanLyrics: |-` block | Permanent `recitationId` when assigned; stable URLs/aliases are reviewed |
| `src/data/basta/pages/NNN.md` | One printed page, its source scan path, Urdu body and optional `romanLyrics: |-` | Printed page number; verified poem/stanza IDs separate from the page |
| `src/data/basta/index.json` | Printed index mapping | Preserve original book index identity |
| `src/data/basta/fragment-roles.json` | Human-approved continuation and unindexed-fragment roles | Exact printed page and fragment |
| `src/data/recitation/identity-lock.json` | Published source and stanza identity lock | Never recycle retired IDs |

The schema is `src/content.config.ts`. Keep one actual poem per standalone file; do not publish a second copy solely because another website, reciter or title variant supplied it. A Basta printed page is not an alternate standalone poem to erase.

## 2. Duplicate adjudication

Compare each candidate against **all** standalone lyrics, the Basta index/verified kalams, and source material, not just slug or title. Different spellings, first lines, languages, reciters and site-specific names may refer to the same poem. Conversely, similar opening lines are not sufficient evidence of duplication.

1. Identify the actual text and verse sequence using source HTML, scans and (where useful) recitation. Distinguish variants from different poems.
2. Prefer the more complete, accurate existing canonical record. Integrate *unique verified* stanzas, openings, takhallus and meaningful metadata into the survivor. Do not append verbatim repeated verses/refrains simply to preserve each import.
3. Retain a genuinely distinct work or substantive variant as a separate record when warranted. Check titles and aliases so the canonical name reflects the poem, **not necessarily its opening verse**.
4. Remove duplicate candidate files and redundant import-side material. Preserve editorial notes necessary for future corrections, but **do not publish** source-post IDs, scrape URLs, HTML paths, hashes or a history of merged sources inside the poem.
5. Review any published URL or permanent recitation/stanza identity affected by consolidation; a content merge does **not** authorize ID reuse or silent link breakage.

The human review process and release trackers are defined in [Quality assurance](QUALITY_ASSURANCE.md) and [Audit tools](../audit/README.md). A green build cannot decide a duplicate for you.

## 3. Titles, metadata and languages

Use a meaningful original-language `title`, and `alternateTitle` for the corresponding Roman presentation when available. A clean, descriptive filename omits scraper prefixes, poet/reciter/date suffixes and generic “lyrics” wording. Retain established public slugs and aliases where changing them would break links without a reviewed migration.

- Required standalone fields include `title`, `language`, `lang`, `direction` and `kalamType`. `kalamType` and `reciter` may each be one value or an array of **independent** values; do not combine two reciters into a fictional joint name.
- Set `poet` to the complete verified name. Keep takhallus occurring *inside a verse* as poetry, not as a source-processing marker. `haal`, `romanHaal`, `occasion`, `year` and relevant `aliases` describe the work only when supported.
- Use `tags: []` or a YAML string array such as `tags: ["noUrdu"]`. Use a single applicable missing-edition tag, not multiple contradictory language tags. Do not present a missing transcription as complete.
- The original `language` and `lang` describe the source **text**, not `romanLyrics`. Never use `language: Roman Urdu` or `lang: ur-Latn`.

| Original-language source | `language` | `lang` | `direction` |
| --- | --- | --- | --- |
| Urdu | `Urdu` | `ur` | `rtl` |
| Punjabi in Shahmukhi | `Panjabi` | `pa-Arab` | `rtl` |
| Saraiki in Arabic script | `Saraiki` | `skr-Arab` | `rtl` |
| Balti in Arabic script | `Balti` | `bft-Arab` | `rtl` |
| Arabic | `Arabic` | `ar` | `rtl` |
| Persian | `Persian` | `fa` | `rtl` |
| English | `English` | `en` | `ltr` |

A verified original Latin-script Punjabi, Saraiki or Balti entry may provisionally use `pa`, `skr` or `bft` with `direction: ltr`; it must **not** masquerade as Roman Urdu. Reclassify to `*-Arab` only after a source-language Arabic-script original exists. Language mixing and “Punjabi/Saraiki” labels need human review; keywords alone do not prove a language. `node scripts/audit-round2-language-codes.mjs` is **read-only** candidate reporting, not a conversion tool.

## 4. Stanzas and source layout

- Preserve every actual verse on its own physical source line, with exact reading order. Do not break one verse into two to make the page fit. Layout, justification and line-fitting are reader responsibilities.
- Separate the opening/preamble from stanza 1. Remove standalone source headings `Saani` (opening continuation) and `Antra` (stanza label); use their context to locate the real stanza boundaries.
- Number actual standalone stanzas on their own line: **Urdu `۱`, `۲`, `۳`** (U+06F1 etc.), and Roman **`1`, `2`, `3`**. Do not substitute Arabic-Indic `١` or corrupted digit characters for Urdu numerals. Do not insert a blank line immediately after the number. Keep blank lines between stanza blocks.
- Retain meaningful punctuation inside a line, including commas. Remove ornamental periods at verse ends. Avoid duplicate title refrains and mechanically repeated end-of-stanza text unless the words genuinely belong to a distinct verse.
- Do not copy credits, “Lyrics in Urdu” labels, source URLs, reciter directions or source processing labels into a verse. Keep the poet/takhallus where it is *actually* in the poem.
- Optional `stanzaPattern` describes the **observed** form: integer 1–12, `"4+2"` or `"2+2+2"`. Six verses normally render as 4+2; the last couplet receives the framed treatment. Two-verse couplets use the reversed second-line indent. Do not use the obsolete `sixVerseLayout` field.
- On Basta pages, `stanzaPattern` applies to all fragments; `stanzaPatterns` overrides individual 1-based `---***---` fragments. Preserve the separator exactly, printed page IDs and continued stanzas across pages. Only human-verified source evidence can approve fragment roles.
- Only declare `stanzaLineExceptions` for a verified deliberate difference in Urdu/Roman stanza counts. Reviewed `[[subtitle]] ` and `[[refrain]] ` markers convey presentation roles where supported; never infer them from arbitrary lines.

## 5. Roman transcription (canonical orthography)

Roman is a pronunciation aid to the **verified original-language reading**, not an English translation or an independent original. Wherever a Roman edition exists, it must align in order, stanza boundaries, verse count and content with the original unless an explicit verified exception applies. An entirely untranscribed Basta page can have no Roman block; a partially transcribed block is not acceptable.

- Latin spelling is ASCII **except** `ṅ`/`Ṅ` for Urdu nasal **ں**. Plain `n` is ن. Never introduce macrons, combining accent marks, scholarly `ʿ`, typographic apostrophe-as-ayn or unrelated accented Latin.
- Long vowels use **aa, u, i** (not `oo`, `ee`). Urdu ے normally uses **e** (`bole`, `wale`, `mere`); distinct Punjabi pronunciation requires direct review.
- Distinguish `jawaaṅ` (جواں) from `jawaan` (جوان). Urdu ڑ becomes `r`; use phonetic aspirates `bh, ph, th, dh, kh, gh, jh, chh` where appropriate. Preserve `q` for ق, `k` for ک, `z` for ز/ذ/ض/ظ, `s` for س/ث/ص.
- Pronounced ع and ء use `a` when needed for the actual reading; do not automatically insert an extra `a` everywhere. This also applies to quoted Arabic/invocations. Ordinary quotation marks for *speech* remain valid.
- Preserve `main` (I), `mein` (in), `kya` (what), `kiya` (did) by meaning. Use **Kiun/Kiuṅ**, never `kyun`; **Husain**, **Hasan**, **Bibi**. **Zehra** and **Zahra** are both allowed according to the specific poem.
- The standalone vocative اے is **Ae** (or `ae` in context), not `E`, `Ay`, `Aye` or `Ey`. An `e` indicating izafat is **not** automatically a mistaken vocative.
- Use `Gham-e-Husain` for izafat where present, but **`Shab o Roz`** for the separate Persian conjunction و. Write **`bewafa`** (no negative-prefix hyphen) and **`baar baar`** (no repeated-word hyphen). Preserve justified izafat hyphens.
- Remove `(x2)` reciter markers. If the marker separates phrases **within the verse**, replace it with comma and space; if it ends a verse, remove it and its preceding space. Do not delete the real words.
- Titles use Title Case; verse text uses initial and proper-name capitals, not title case on every word. Keep ordinary punctuation, corresponding stanza numerals and verse order.

Urdu **بی‌بی** alone uses the approved U+200C non-joiner; plural/inflected **بیبیاں** and **بیبیوں** must have **no** ZWNJ. The `source:sync` normalizer enforces that distinction and removes other ZWNJs from covered poetry. Roman `Bibi` contains no joiner.

## 6. Editorial review order

1. Check duplicates before editing an imported candidate; compare the established standalone corpus and Basta mappings.
2. Verify original text, completeness and stanza breaks from evidence. Resolve the opening, “Saani/Antra”, refrain, poet/takhallus and 2-/6-verse grouping.
3. Align Roman stanza-by-stanza, then review contextual transliteration, punctuation, title, `lang`, tags and metadata.
4. Confirm permanent IDs, old links and source-page mappings; leave any unresolved reading explicitly unapproved.
5. Run the safe workflow in [Contributing](CONTRIBUTING.md). Inspect changes **manually**: a normalizer cannot create a missing language edition or adjudicate a poem.

Canonical lyric content at publication should contain **editorial content only**. Round-specific scraping records are for the temporary review workflow, not permanent poem text.