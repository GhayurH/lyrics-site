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
    return s;
  }
  let repeated = 0;
  const updated = roman.map((line, index) => {
    if (!line.trim() || /^[۰-۹٠-٩0-9]+$/u.test(line.trim()) || line.trim() === "---***---") return line;
    let s = sourceAware(line, pairs.get(index));
    const x2 = s.match(/\(x2\)/giu);
    if (x2?.length === 1 && !/<\/?u>/u.test(s)) {
      const marked = /^(.*?\S)\s*\(x2\)(.*)$/iu.exec(s);
      if (marked && marked[1] && !/[<>]/u.test(marked[1])) {
        s = "<u>" + marked[1] + "</u>" + marked[2];
        repeated++;
      }
    } else if (x2?.length) findings.push("Unresolved (x2) marker at Roman line " + (index + 1));
    // YAML literal verses do not use Markdown hard-break whitespace.
    // A modified line must never introduce a git diff --check failure.
    return s.replace(/[ \t]+$/gu, "");
  });
  const rewrittenHead = [...head.slice(0, start + 1),
    ...updated.map((line, i) => original[i].startsWith("  ") ? "  " + line : line),
    ...head.slice(end)].join("\n")
    .replace(/^(alternateTitle|romanHaal): (["']?)(.*?)\2$/gmu,
      (whole, field, quote, value) => field + ": " + quote +
        value.replace(/\b(hussain|hassan|kyun)\b/giu, word =>
          cap(word, ({ hussain: "Husain", hassan: "Hasan", kyun: "kiun" })[word.toLowerCase()])) + quote);
  const result = "---\n" + rewrittenHead + "\n---\n" + body;
  return { text: result, changed: result !== content, findings, underlined: repeated,
    paired: pairs.size, totalRomanLines: romanSource.length };
}
