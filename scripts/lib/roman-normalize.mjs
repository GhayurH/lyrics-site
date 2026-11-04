// Conservative, source-backed Roman Urdu spelling cleanup; never writes Urdu or identities.
// Every Roman verse is compared to the existing Urdu line before vowel/nasal edits.
export function normalizeRomanMarkdown(content, path = "") {
  const findings = [];
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/u.exec(content);
  if (!match) return { text: content, changed: false, findings: ["Missing YAML frontmatter"] };
  const head = match[1].split("\n");
  // English-language appendices reproduce the same printed prose in both
  // fields. They are not Urdu transliteration and must remain byte-identical.
  if (/^contentKind:\s*english-appendix\s*$/mu.test(match[1]))
    return { text: content, changed: false, findings };
  const body = content.slice(match[0].length);
  const start = head.findIndex(x => /^romanLyrics:\s*\|-\s*$/u.test(x));
  if (start < 0) {
    if (/[/\\]lyrics[/\\]/u.test(path)) findings.push("Standalone lyric has no Roman edition");
    return { text: content, changed: false, findings };
  }
  let end = start + 1;
  while (end < head.length && (!head[end].trim() || head[end].startsWith("  "))) end++;
  const original = head.slice(start + 1, end);
  const roman = original.map(x => x.startsWith("  ") ? x.slice(2) : x);
  const romanSource = roman.map((line, index) => ({ line, index }))
    .filter(x => x.line.trim() && x.line.trim() !== "---***---");
  const urduSource = body.split("\n").filter(x => x.trim() && x.trim() !== "---***---");
  const pairs = new Map();
  if (romanSource.length === urduSource.length) {
    for (let i = 0; i < romanSource.length; i++)
      pairs.set(romanSource[i].index, urduSource[i]);
  } else {
    findings.push("Roman/Urdu physical line count differs: " + romanSource.length + "/" + urduSource.length);
    // A mismatching source cannot safely anchor word-level automatic edits.
  }
  const cap = (original, replacement) =>
    original === original.toUpperCase() ? replacement.toUpperCase()
      : original[0] === original[0].toUpperCase()
        ? replacement[0].toUpperCase() + replacement.slice(1) : replacement;
  const plain = s => s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/gu, "")
    .replace(/[يى]/gu, "ی");

  /** Assign nasal n only to matching Urdu words ending in noon ghunna.
   * Roman/Urdu token counts often differ at izafat and compounds, so positional
   * indexing alone must never turn an ordinary ن into nasal ṅ. */
  function reconcileNasals(line, urdu) {
    const consonants = {
      "ب":"b","پ":"p","ت":"t","ٹ":"t","ث":"s","ج":"j","چ":"ch",
      "ح":"h","خ":"kh","د":"d","ڈ":"d","ذ":"z","ر":"r","ڑ":"r",
      "ز":"z","ژ":"zh","س":"s","ش":"sh","ص":"s","ض":"z",
      "ط":"t","ظ":"z","غ":"gh","ف":"f","ق":"q","ک":"k","ك":"k",
      "گ":"g","ل":"l","م":"m","ن":"n","ں":"n","ہ":"h",
      "ھ":"h","ۃ":"h","ة":"h",
    };
    const uWords = urdu.match(/[\p{Script=Arabic}\p{M}\u200C]+/gu) || [];
    const skeletonUrdu = word => [...plain(word)].map(ch => consonants[ch] || "").join("");
    const skeletonRoman = word => word.toLowerCase().replaceAll("ṅ", "n")
      .replace(/[^a-z]/gu, "").replace(/[aeiouy]/gu, "");
    const latin = [...line.matchAll(/[A-Za-zṅṄ]+(?:-[A-Za-zṅṄ]+)*/gu)]
      .filter(m => {
        // Explicit <u>...</u> emphasis is not part of the transcribed words.
        const prefix = line.slice(0, m.index);
        return prefix.lastIndexOf("<") <= prefix.lastIndexOf(">");
      });
    const edits = [];
    latin.forEach((m, j) => {
      const raw = m[0], plainWord = raw.replace(/ṅ/gu, "n").replace(/Ṅ/gu, "N");
      if (!/n$/iu.test(plainWord) && !/[ṅṄ]/u.test(raw)) return;
      const key = skeletonRoman(plainWord);
      let closest = -1, distance = Infinity;
      if (key.length >= 2) uWords.forEach((uWord, i) => {
        if (skeletonUrdu(uWord) !== key) return;
        const gap = Math.abs((j + .5) / latin.length - (i + .5) / uWords.length);
        if (gap < distance) { closest = i; distance = gap; }
      });
      const sourceNasal = closest >= 0 && plain(uWords[closest]).endsWith("ں");
      const replacement = sourceNasal
        ? plainWord.replace(/n$/iu, ch => ch === "N" ? "Ṅ" : "ṅ")
        : plainWord;
      if (replacement !== raw) edits.push({ start: m.index, end: m.index + raw.length, value: replacement });
    });
    for (const e of edits.reverse())
      line = line.slice(0, e.start) + e.value + line.slice(e.end);
    return line;
  }


  /** A standalone Roman E/e/Ay/Aye/Ey represents the Urdu vocative 'اے'
   * only when the SAME source line contains that complete Urdu word. Roman
   * 'e' is also used for izafat, so it must never be rewritten globally.
   * Ambiguous mixed cases are reported rather than guessed. */
  function normalizeVocative(line, source, label) {
    if (!source) return line;
    const u = plain(source);
    const urduCount = [...u.matchAll(/(?<!\p{L})اے(?!\p{L})/gu)].length;
    if (!urduCount) return line;
    const matches = [...line.matchAll(/(?<![\p{L}\p{M}-])(?:Ae|Aye|Ay|Ey|E)(?![\p{L}\p{M}-])/giu)];
    const existing = matches.filter(m => /^ae$/iu.test(m[0]));
    const variants = matches.filter(m => !/^ae$/iu.test(m[0]));
    if (!variants.length || existing.length >= urduCount) return line;
    if (matches.length > urduCount) {
      // If canonical Ae is already present, any extra E may be izafat.
      // Otherwise a line may contain both izafat and an uncorrected vocative.
      findings.push("Ambiguous vocative/izafat in " + label + ": " + line);
      return line;
    }
    if (matches.length !== urduCount) {
      findings.push("Unaligned vocative in " + label + ": " + line);
      return line;
    }
    let edited = line;
    for (const m of variants.reverse()) {
      const old = m[0], replacement = old.length > 1 && old === old.toUpperCase()
        ? "AE" : old[0] === old[0].toUpperCase() ? "Ae" : "ae";
      edited = edited.slice(0, m.index) + replacement + edited.slice(m.index + old.length);
    }
    return edited;
  }

  function sourceAware(line, urdu) {
    let s = line.replace(/\b(hussain|hassan|kyun)\b/giu, word =>
      cap(word, ({ hussain: "Husain", hassan: "Hasan", kyun: "kiun" })[word.toLowerCase()]));
    // House-style separators are unambiguous even where the Urdu edition
    // has an omitted verse; never alter the source's words or line structure.
    s = s.replace(/([A-Za-z]+)-o-([A-Za-z]+)/giu, "$1 o $2")
      .replace(/\bbe-([A-Za-z]+)/giu, "be$1")
      .replace(/\bbar[ -]+bar\b/giu, word => cap(word, "baar baar"))
      .replace(/\b([A-Za-zṅ]+)-\1\b/giu, "$1 $1");
    if (!urdu) return s;
    const u = plain(urdu);
    s = normalizeVocative(s, u, path + " Roman/Urdu line");
    // Long u/i never use oo/ee in Roman Urdu. A corresponding Urdu source
    // line must contain the respective vowel before touching a token.
    if (u.includes("و")) s = s.replace(/oo/giu, word => cap(word, "u"));
    if (u.includes("ی")) s = s.replace(/ee/giu, word => cap(word, "i"));
    if (/\sو\s/u.test(u))
      s = s.replace(/([A-Za-z]+)-o-([A-Za-z]+)/gu, "$1 o $2");
    if (/بے/u.test(u))
      s = s.replace(/\bbe-([A-Za-z]+)/giu, "be$1");
    if (/بار\s+بار/u.test(u))
      s = s.replace(/\bbar[ -]+bar\b/giu, word => cap(word, "baar baar"));
    // Only align word by word if punctuation/compounds have not changed token counts.
    const urduWords = u.match(/[\p{Script=Arabic}\p{M}\u200C]+/gu) || [];
    const romanWords = [...s.matchAll(/[A-Za-zṅṄ]+(?:-[A-Za-z]+)*/gu)];
    if (urduWords.length === romanWords.length) {
      const edits = [];
      for (let j = 0; j < urduWords.length; j++) {
        const sourceWord = urduWords[j], m = romanWords[j], orig = m[0];
        let dest = orig;
        if (sourceWord.endsWith("ں"))
          dest = dest.replace(/n$/iu, char => char === "N" ? "Ṅ" : "ṅ");
        if (sourceWord.includes("و"))
          dest = dest.replace(/oo/giu, word => cap(word, "u"));
        if (sourceWord.includes("ی"))
          dest = dest.replace(/ee/giu, word => cap(word, "i"));
        if (sourceWord.endsWith("ے"))
          dest = dest.replace(/ay$/iu, word => cap(word, "e"));
        if (dest !== orig) edits.push({ start: m.index, end: m.index + orig.length, dest });
      }
      for (const e of edits.reverse()) s = s.slice(0, e.start) + e.dest + s.slice(e.end);
    }
    // These one-to-one words have unambiguous nasal spellings even when izafat
    // causes different token counts across the two physical lines.
    for (const [urduToken, latin, corrected] of [
      ["ہیں", /\bhain\b/giu, "haiṅ"],
      ["نہیں", /\bnahin\b/giu, "nahiṅ"],
      ["کیوں", /\bkiun\b/giu, "kiuṅ"],
      ["ہوں", /\b(?:hoon|hun)\b/giu, "huṅ"],
      ["ہاں", /\bhaan\b/giu, "haaṅ"],
    ]) if (u.includes(urduToken)) s = s.replace(latin, word => cap(word, corrected));
    return reconcileNasals(s, u);
  }
  let removedRepetitions = 0;
  const updated = roman.map((line, index) => {
    if (!line.trim() || /^[۰-۹٠-٩0-9]+$/u.test(line.trim()) || line.trim() === "---***---") return line;
    let s = sourceAware(line, pairs.get(index));
    // An old (x2) is a recitation instruction, not verse text.
    // At a verse end remove it; between phrases replace it with a comma.
    s = s.replace(/[ \t]*\(x2\)[ \t]*/giu, (marker, offset, fullLine) => {
      removedRepetitions++;
      const before = fullLine.slice(0, offset).trimEnd();
      const after = fullLine.slice(offset + marker.length).trimStart();
      if (!before || !after) return "";
      return /[,،;:.!?]$/u.test(before) ? " " : ", ";
    });
    // YAML literal verses do not use Markdown hard-break whitespace.
    // A modified line must never introduce a git diff --check failure.
    return s.replace(/[ \t]+$/gu, "");
  });
  const rewrittenHead = [...head.slice(0, start + 1),
    ...updated.map((line, i) => original[i].startsWith("  ") ? "  " + line : line),
    ...head.slice(end)].join("\n")
    .replace(/^(alternateTitle|romanHaal): (["']?)(.*?)\2$/gmu,
      (_whole, field, quote, value) => field + ": " + quote +
        value.replace(/\b(hussain|hassan|kyun)\b/giu, word =>
          cap(word, ({ hussain: "Husain", hassan: "Hasan", kyun: "kiun" })[word.toLowerCase()])) + quote);
  // Titles have a direct Urdu title available, unlike unrelated metadata.
  // Never rewrite aliases globally: their historical spellings support search.
  const urduTitle = /^title:\s*(?:"([^"]*)"|'([^']*)'|(.+))$/mu.exec(match[1]);
  const printedTitle = urduTitle?.[1] ?? urduTitle?.[2] ?? urduTitle?.[3] ?? "";
  const safeHead = rewrittenHead.replace(/^(alternateTitle:\s*)(["'])(.*?)\2$/gmu,
    (_whole, key, quote, title) =>
      key + quote + normalizeVocative(title, printedTitle, path + " alternateTitle") + quote);
  const result = "---\n" + safeHead + "\n---\n" + body;
  return { text: result, changed: result !== content, findings, removedRepetitions,
    paired: pairs.size, totalRomanLines: romanSource.length };
}
