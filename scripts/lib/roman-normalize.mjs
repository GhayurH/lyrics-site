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

  /** Only the Urdu word can determine ں versus ن, ے versus ey/ay,
   * or ڑ versus d. Align by consonantal spelling (including izafat joins),
   * not token position: Urdu and Roman frequently split compounds differently.
   * Unmatched words are left unchanged for editorial review. */
  function reconcileSourceWords(line, urdu) {
    const consonants = {
      "ب":"b","پ":"p","ت":"t","ٹ":"t","ث":"s","ج":"j","چ":"ch",
      "ح":"h","خ":"kh","د":"d","ڈ":"d","ذ":"z","ر":"r","ڑ":"r",
      "ز":"z","ژ":"zh","س":"s","ش":"sh","ص":"s","ض":"z",
      "ط":"t","ظ":"z","غ":"gh","ف":"f","ق":"q","ک":"k","ك":"k",
      "گ":"g","ل":"l","م":"m","ن":"n","ں":"n","ہ":"h",
      "ھ":"h","ۃ":"h","ة":"h","و":"w","ؤ":"w","ی":"y",
      "ے":"y","ئ":"y",
    };
    const vowelMarks = /[\u064B-\u065F\u0670\u06D6-\u06ED]/gu;
    const romanSkeleton = word => word.toLowerCase().replaceAll("ṅ", "n")
      .replaceAll("Ṅ", "n").replace(/[^a-z]/gu, "").replace(/[aeiou]/gu, "");
    // و and ی can be either glides or vowels; compare both skeletons.
    // Prefer spellings that retain more consonantal evidence.
    const urduSkeletons = word => {
      const options = [{ value: "", omissions: 0 }];
      for (const ch of [...plain(word).replace(vowelMarks, "")]) {
        const value = consonants[ch] || "";
        for (const option of options) option.value += value;
        if (/[ویےؤئ]/u.test(ch) && value && options.length < 16) {
          const added = options.slice(0, 8).map(option => ({
            value: option.value.slice(0, -value.length),
            omissions: option.omissions + 1,
          })).filter(option => option.omissions <= 2);
          options.push(...added);
        }
      }
      return options;
    };
    const distance = (a, b) => {
      if (Math.abs(a.length - b.length) > 2) return 3;
      const rows = Array.from({ length: b.length + 1 }, (_, j) => j);
      for (let i = 1; i <= a.length; i++) {
        let diagonal = rows[0]; rows[0] = i;
        for (let j = 1; j <= b.length; j++) {
          const old = rows[j];
          rows[j] = Math.min(rows[j] + 1, rows[j - 1] + 1,
            diagonal + Number(a[i - 1] !== b[j - 1]));
          diagonal = old;
        }
      }
      return rows[b.length];
    };
    const sources = [...urdu.matchAll(/[\p{Script=Arabic}\p{M}\u200C]+/gu)]
      .map(m => ({
        text: plain(m[0]).replace(vowelMarks, ""),
        skeletons: urduSkeletons(m[0]),
        position: (m.index + m[0].length / 2) / Math.max(urdu.length, 1),
      }));
    const latin = [...line.matchAll(/[A-Za-zṅṄ]+/gu)];
    const edits = [];
    for (const m of latin) {
      const word = m[0];
      const hasN = /[nṅ]$/iu.test(word);
      const hasOldYe = /(?:ay|ey)$/iu.test(word);
      const hasD = /d/iu.test(word) && !/r/iu.test(word);
      const hasLong = /oo|ee/iu.test(word);
      if (!hasN && !hasOldYe && !hasD && !hasLong &&
          !/^(?:he|hey|hae|hay|haey)$/iu.test(word)) continue;
      const stem = romanSkeleton(word);
      const pos = (m.index + word.length / 2) / Math.max(line.length, 1);
      const ranked = sources.flatMap(source => {
        if (!source.skeletons.length || !stem) return [];
        const options = [{ candidate: word, retroflex: false }];
        // Only replace a d which actually corresponds to Urdu ڑ. Initial
        // d in دوڑ / daur represents د and must never become r.
        if (hasD && source.text.includes("ڑ"))
          for (const d of word.matchAll(/d/giu))
            options.push({ candidate: word.slice(0, d.index) +
              (d[0] === "D" ? "R" : "r") + word.slice(d.index + 1), retroflex: true });
        let best = null;
        for (const option of options) {
          const candidateStem = romanSkeleton(option.candidate);
          for (const variant of source.skeletons) {
            const d = distance(candidateStem, variant.value);
            const sameEdges = candidateStem[0] === variant.value[0] &&
              candidateStem.at(-1) === variant.value.at(-1);
            const near = Math.abs(pos - source.position);
            if (d > 1 || (d && !sameEdges) || (d && near > .30)) continue;
            const score = d * 10 + variant.omissions * .04 + near;
            if (!best || score < best.score)
              best = { ...option, source, score, d };
          }
        }
        return best ? [best] : [];
      }).sort((a,b) => a.score - b.score);
      const hit = ranked[0];
      if (!hit || ranked[1] && ranked[1].score - hit.score < .01 &&
          (ranked[1].source.text.endsWith("ں") !== hit.source.text.endsWith("ں") ||
           ranked[1].source.text.endsWith("ن") !== hit.source.text.endsWith("ن"))) continue;
      // Never replace unverified roman text just because nearby Urdu contains ں.
      let dest = hit.candidate;
      if (hit.source.text.includes("و") || hit.source.text.includes("ؤ"))
        dest = dest.replace(/oo/giu, vowel => cap(vowel, "u"));
      if (hit.source.text.includes("ی"))
        dest = dest.replace(/ee/giu, vowel => cap(vowel, "i"));
      if (hit.source.text.endsWith("ں"))
        dest = dest.replace(/n$/iu, ch => ch === "N" ? "Ṅ" : "ṅ");
      else if (hit.source.text.endsWith("ن"))
        dest = dest.replace(/[ṅṄ]$/u, ch => ch === "Ṅ" ? "N" : "n");
      if (hit.source.text.endsWith("ے")) {
        // ے is e, except established verbal forms with an audible y glide.
        if (hit.source.text === "آئے" && /^Aaey$/iu.test(dest))
          dest = cap(dest, "Aaye");
        else if (hit.source.text === "گئے" && /^Gaey$/iu.test(dest))
          dest = cap(dest, "Gaye");
        else if (hit.source.text !== "ہے")
          dest = dest.replace(/(?:ay|ey)$/iu, ch => cap(ch, "e"));
      }
      if (hit.source.text === "ہے" && /^(?:he|hey|hae|hay|haey)$/iu.test(dest))
        dest = cap(dest, "hai");
      if (dest !== word) edits.push({ start: m.index, end: m.index + word.length, text: dest });
    }
    for (const edit of edits.reverse())
      line = line.slice(0, edit.start) + edit.text + line.slice(edit.end);
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

  /** Join only source-marked izafat. A bare Roman e may be a word or
   * an unmarked editorial reading, so the printed Urdu kasra is the proof. */
  function normalizeIzafat(line, urdu) {
    const marked = [...urdu.matchAll(/ِ/gu)].length;
    if (!marked) return line;
    const joined = [...line.matchAll(/(?<![A-Za-zṅṄ])([A-Za-zṅṄ]+)\s+[eE]\s+([A-Za-zṅṄ]+)(?![A-Za-zṅṄ])/gu)];
    if (!joined.length || joined.length > marked) return line;
    return line.replace(/(?<![A-Za-zṅṄ])([A-Za-zṅṄ]+)\s+[eE]\s+([A-Za-zṅṄ]+)(?![A-Za-zṅṄ])/gu,
      (_whole, head, tail) => head + "-e-" + tail);
  }

  /** Frequent inflected/compound words whose Roman spelling cannot be
   * aligned by consonants alone. Each correction requires the precise Urdu
   * source form in the same physical verse (not a corpus-wide word swap). */
  function normalizeSourceBoundInflections(line, urdu) {
    const mappings = [
      [/بچّ?وں/u, /\bbachchon\b/giu, "bachchoṅ"],
      [/بچیوں/u, /\bbachchiyon\b/giu, "bachchiyoṅ"],
      [/ویراں/u, /\bviran\b/giu, "viraaṅ"],
      [/آنکھوں/u, /\baakhon\b/giu, "aankhoṅ"],
      [/اکھیاں/u, /\bankhiyan\b/giu, "ankhiyaṅ"],
      [/ایویں|اِیوَیں/u, /\binwain\b/giu, "inwaiṅ"],
      [/کیوں\s*کر/u, /\bkiunkar\b/giu, "kiuṅkar"],
      [/کر\s*دیں/u, /\bdein\b/giu, "deiṅ"],
      [/رولوں/u, /\blun\b/giu, "luṅ"],
      [/خواں/u, /\bkhwan\b/giu, "khwaṅ"],
      // Urdu/Persian words: remove scholarly ayn/hamza separators while
      // preserving the pronounced vowel represented in ordinary Roman Urdu.
      [/قطعات/u, /\bqita['’]aat\b/giu, "qitaat"],
      [/قطعہ/u, /\bqit['’]a\b/giu, "qita"],
      [/زعفر/u, /\bza['’]far\b/giu, "zafar"],
      [/معذور/u, /\bma['’]zur\b/giu, "maazur"],
      [/شفاعت/u, /\bshafa['’]at\b/giu, "shafaat"],
      [/تعجیل/u, /\bta['’]jil\b/giu, "taajil"],
      [/اعدا/u, /\ba['’]da\b/giu, "aada"],
      [/لُ?ٹتا/u, /\blut['’]taa\b/giu, "lutta"],
      [/جھکتی/u, /\bjhuk['’]ti\b/giu, "jhukti"],
      [/اٹھتا/u, /\buth['’]ta\b/giu, "uthta"],
      [/پیٹتی/u, /\bpit['’]ti\b/giu, "pitti"],
      [/سائلوں/u, /\bsa['’]ilon\b/giu, "sailoṅ"],
      [/شیعیان/u, /\bshia['’]an\b/giu, "shiaan"],
      [/طعنہ/u, /\bta['’]na\b/giu, "taana"],
      [/طعن/u, /\bta['’]n\b/giu, "taan"],
      [/نزع/u, /\bnaz['’]\b/giu, "naza"],
    ];
    let result = line;
    for (const [printed, variant, canonical] of mappings)
      if (printed.test(urdu))
        result = result.replace(variant, word => cap(word, canonical));
    // A few older Roman editions spelled nasal n as an apostrophe + n.
    if (urdu.includes("ں"))
      result = result.replace(/['’]n\b/giu, "ṅ");
    return result;
  }

  function sourceAware(line, urdu) {
    let s = line.replace(/\b(hussain|hassan|kyun)\b/giu, word =>
      cap(word, ({ hussain: "Husain", hassan: "Hasan", kyun: "kiun" })[word.toLowerCase()]));
    // House-style separators are unambiguous even where the Urdu edition
    // has an omitted verse; never alter the source's words or line structure.
    s = s.replace(/kyun/giu, word => cap(word, "kiun"))
      .replace(/-E-/gu, "-e-");
    s = s.replace(/([A-Za-z]+)-o-([A-Za-z]+)/giu, "$1 o $2")
      .replace(/\bbe-([A-Za-z]+)/giu, "be$1")
      .replace(/\bbar[ -]+bar\b/giu, word => cap(word, "baar baar"))
      .replace(/\b([A-Za-zṅ]+)-\1\b/giu, "$1 $1");
    if (!urdu) return s;
    const u = plain(urdu);
    s = normalizeVocative(s, u, path + " Roman/Urdu line");
    s = normalizeSourceBoundInflections(s, urdu);
    s = normalizeIzafat(s, urdu);
    if (/\sو\s/u.test(urdu))
      s = s.replace(/(?<=\s)O(?=\s)/gu, "o");
    if (/بے\s+\S/u.test(urdu))
      s = s.replace(/\b[Bb]e\s+([A-Za-z]+)/gu, (_whole, component) =>
        _whole[0] === "B" ? "Be" + component.toLowerCase() : "be" + component.toLowerCase());
    // Long u/i never use oo/ee in Roman Urdu. A corresponding Urdu source
    // line must contain the respective vowel before touching a token.
    // Long vowels must be anchored to the corresponding Urdu word; a
    // different word's vowel on the same line is not reliable evidence.
    if (/\sو\s/u.test(u))
      s = s.replace(/([A-Za-z]+)-o-([A-Za-z]+)/gu, "$1 o $2");
    if (/بے/u.test(u))
      s = s.replace(/\bbe-([A-Za-z]+)/giu, "be$1");
    if (/بار\s+بار/u.test(u))
      s = s.replace(/\bbar[ -]+bar\b/giu, word => cap(word, "baar baar"));
    // These one-to-one words have unambiguous nasal spellings even when izafat
    // causes different token counts across the two physical lines.
    for (const [urduToken, latin, corrected] of [
      ["ہیں", /\bhain\b/giu, "haiṅ"],
      ["نہیں", /\bnahin\b/giu, "nahiṅ"],
      ["کیوں", /\bkiun\b/giu, "kiuṅ"],
      ["ہوں", /\b(?:hoon|hun)\b/giu, "huṅ"],
      ["ہاں", /\bhaan\b/giu, "haaṅ"],
    ]) if (u.includes(urduToken)) s = s.replace(latin, word => cap(word, corrected));
    return reconcileSourceWords(s, u);
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
          cap(word, ({ hussain: "Husain", hassan: "Hasan", kyun: "kiun" })[word.toLowerCase()]))
          .replace(/kyun/giu, word => cap(word, "kiun"))
          .replace(/-E-/gu, "-e-") + quote);
  // Titles have a direct Urdu title available, unlike unrelated metadata.
  // Never rewrite aliases globally: their historical spellings support search.
  const urduTitle = /^title:\s*(?:"([^"]*)"|'([^']*)'|(.+))$/mu.exec(match[1]);
  const printedTitle = urduTitle?.[1] ?? urduTitle?.[2] ?? urduTitle?.[3] ?? "";
  const safeHead = rewrittenHead.replace(/^(alternateTitle:\s*)(["'])(.*?)\2$/gmu,
    (_whole, key, quote, title) => {
      let changed = normalizeVocative(title, printedTitle, path + " alternateTitle");
      changed = normalizeIzafat(changed, printedTitle);
      changed = reconcileSourceWords(changed, printedTitle);
      changed = normalizeSourceBoundInflections(changed, printedTitle);
      if (/\sو\s/u.test(printedTitle))
        changed = changed.replace(/(?<=\s)O(?=\s)/gu, "o");
      return key + quote + changed + quote;
    });
  // Source-backed headings also drive reader captions and accessibility
  // text. Keep legacy aliases untouched for search/backward-compatible URLs.
  const printedHaalLine = /^haal:\s*(?:"([^"]*)"|'([^']*)'|(.+))$/mu.exec(match[1]);
  const printedHaal = printedHaalLine?.[1] ?? printedHaalLine?.[2] ??
    printedHaalLine?.[3] ?? "";
  const withHaal = safeHead.replace(/^(romanHaal:\s*)(["'])(.*?)\2$/gmu,
    (_whole, key, quote, value) => {
      let changed = normalizeVocative(value, printedHaal, path + " romanHaal");
      changed = normalizeIzafat(changed, printedHaal);
      changed = reconcileSourceWords(changed, printedHaal);
      return key + quote + normalizeSourceBoundInflections(changed, printedHaal) + quote;
    });
  const romanHeading = /^alternateTitle:\s*(?:"([^"]*)"|'([^']*)')$/mu.exec(withHaal);
  const canonicalHeading = romanHeading?.[1] ?? romanHeading?.[2] ?? "";
  const accessibleHead = canonicalHeading
    ? withHaal.replace(/^(coverAlt:\s*)(["'])Cover image for .*\2$/gmu,
      (_whole, key, quote) => key + quote + "Cover image for " + canonicalHeading + quote)
    : withHaal;
  const result = "---\n" + accessibleHead + "\n---\n" + body;
  return { text: result, changed: result !== content, findings, removedRepetitions,
    paired: pairs.size, totalRomanLines: romanSource.length };
}
