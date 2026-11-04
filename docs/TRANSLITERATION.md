# Roman Urdu transliteration — canonical house style

## Purpose and authority
Roman provides a readable pronunciation aid for the **reviewed Urdu wording**, not an English translation or a substitute source. Apply this policy to **all** `src/data/lyrics/*.md` and the existing Roman editions in `src/data/basta/pages/*.md`. Never overwrite Urdu to match Roman or infer uncertain readings without inspecting the Urdu and original scan.

An intentionally untranscribed **whole Basta page** remains untranscribed. This exception does **not** allow incomplete Roman editions: where `romanLyrics` exists, it must contain **all** Urdu verses, stanzas, titles/refrains and their order. Standalone lyrics should have full Roman editions.

## Alphabet and vocalic conventions
- Only ASCII Latin letters **except** precomposed dotted n: `ṅ` (`Ṅ` uppercase), which represents Urdu **ں** / nasalized vowel. Plain `n` is **ن**, not nasalization. Do not use any other macrons, accents, combining diacritics, or romanized Arabic characters.
- Long vowels: **aa**, **u**, **i** (not `oo`, `ee`). Preserve established readable forms for short vowels, diphthongs and inflected endings.
- Urdu **ے → e** in Urdu contexts: `bole`, `wale`, `mere`; actual Punjabi pronunciation is a separately reviewed exception.
- Urdu **ڑ → r**. Aspirates and distinct consonants use `bh`, `ph`, `th`, `dh`, `kh`, `gh`, `jh`, `chh` where appropriate; preserve `q` for ق, `k` for ک, `z` for ز/ذ/ض/ظ, `s` for س/ث/ص.
- Represent **ع** and **ء** as **a** in words where they are pronounced; apply this phonetic convention using the Urdu reading, rather than mechanically inserting an extra `a` in every word. Do not write scholarly apostrophe/ayn characters.
- Distinguish **main** (I), **mein** (in), **kya** (what), **kiya** (did) by meaning, and preserve separately pronounced word forms.
- **Kiun** (written **Kiuṅ** with Urdu nasal ں), never `kyun`. Canonical **Husain**, **Hasan**, **Bibi**. **Zehra** and **Zahra** are both legitimate when supported by the pronunciation of the *specific poem*; never globally replace one with the other.
- The standalone Urdu vocative **اے** is **Ae** (or lowercase **ae** inside a lowercase verse); never standalone **E**, **Ay**, **Aye** or **Ey** for that word. Isolated Roman **e** can also indicate izafat and must be matched to the Urdu before replacement.
- Roman typography: poem titles use Title Case; verses use sentence-initial capitals and proper-name capitals, not title case on every word. Keep source line breaks, verse sequence, stanza numbering and meaningful punctuation.

## Compounds and repetition
- Izafat: `Gham-e-Husain`; retain it when the Urdu text has izafat.
- Persian conjunction و: separate word **o**, e.g. `Shab o Roz` (not `Shab-o-Roz`).
- Negative prefix: **no hyphen**, e.g. `bewafa`.
- Repeated expressions: **spaces**, e.g. `baar baar` (not `baar-baar`).
- Other compounds are judged by source morphology; do not globally strip hyphens from izafat.
- The source meaning and poem-specific reading take priority over a broad search/replace.

## Reciter repetitions and underlining
Where Roman sources previously used `(x2)` to signal a repeated span, **remove that marker** and wrap the repeated words in `<u>...</u>`, e.g. `<u>Wo marte the</u> Sakina ko`. This is an explicit display annotation; only this exact underline tag pair is parsed by readers, safely as text and `<u>` DOM elements (never arbitrary HTML). Do not invent an additional verse or alter Urdu to represent performance-only repetition. If a marker's scope is unclear, flag it for editorial review rather than underlining a guessed span.

## Review workflow
1. Align each Roman stanza and verse to the corresponding Urdu source; resolve missing, extra and out-of-order lines before spellings.
2. Normalize **only** unambiguous spellings. Review context-sensitive vowels, nasal placement, `Zehra/Zahra`, ع/ء and compound boundaries line-by-line.
3. Check all views: static pages, streamed Basta, individual kalam, Recitation Sets and exports. Ensure HTML source markup is not shown to readers.
4. Run `npm run source:sync`, `npm run content:review` and `npm run build`. Compare diffs and verify stable recitation/stanza IDs.
5. Search aliases remain tolerant of old spellings; they must never silently rewrite canonical content.

**Do not** programmatically manufacture missing lyrics from OCR guesses, or silence deliberate uncertainty with matching counts.
