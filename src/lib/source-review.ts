// Source-level, non-destructive review checks shared by Basta and standalone lyric audits.
// Findings identify review candidates, not permission to alter uncertain printed wording.
import { parseStanzaNumber } from "./stanza-numbers.ts";

export interface ReviewFinding {
  path: string;
  line: number;
  code: string;
  detail: string;
}
export interface MarkdownSource {
  path: string;
  kind: "lyrics" | "basta-urdu" | "basta-roman";
  text: string;
}
export interface ReviewedMarkdown {
  path: string;
  kind: MarkdownSource["kind"];
  page?: number;
  imageOnly?: boolean;
  body: string;
  bodyLine: number;
  roman?: string;
  romanLine?: number;
  fields: Record<string, string>;
  issues: ReviewFinding[];
}

function record(issues: ReviewFinding[], path: string, line: number, code: string, detail: string): void {
  issues.push({ path, line, code, detail });
}

function numberValue(raw: string): number | null {
  const parsed = parseStanzaNumber(raw);
  if (!parsed) return null;
  const decimal = [...parsed].map((digit) => {
    const n = digit.codePointAt(0)!;
    if (n >= 0x06f0 && n <= 0x06f9) return String(n - 0x06f0);
    if (n >= 0x0660 && n <= 0x0669) return String(n - 0x0660);
    return digit;
  }).join("");
  return Number(decimal);
}

const arabic = /\p{Script=Arabic}/u;
const latin = /\p{Script=Latin}/u;
const unusualLatin = /[^\x00-\x7f]/u;
const romanDigits = /[٠-٩۰-۹]/u;
const commonPlaceholders = /(?:\b(?:TODO|TBD|FIXME|OCR|PLACEHOLDER)\b|\?{2,})/iu;
const urduUncertainty = /(?:جزوی\s*طور\s*پر\s*غیر\s*واضح|غیر\s*واضح|واضح\s*نہیں|مبہم|نامعلوم|نامکمل|ناقابل[ِ\s-]*(?:قرأت|قراءت|قرأت|خواندگی)|پڑھ(?:ا|ی|ے)?\s*نہیں\s*(?:جا\s*)?سک(?:ا|ی|ے)?)/iu;
const romanUncertainty = /(?:juzwi\s+taur\s+par\s+ghair[-\s]?wazeh|ghair[-\s]?wazeh|wazeh\s+nah(?:i|ee)n|na[-\s]?qabil[-\s]?e[-\s]?(?:qiraat|parhna|khwandagi)|\b(?:unclear|illegible|unknown|incomplete|unreadable)\b|\bnot\s+clear\b|\bcannot\s+read\b)/iu;
const invisible = /[\u200B\u200C\u200D\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/u;

function checkLines(path: string, text: string, firstLine: number, script: "urdu" | "roman", issues: ReviewFinding[]): void {
  text.split("\n").forEach((line, index) => {
    const sourceLine = firstLine + index;
    if (!line.trim()) return;
    if (/\uFFFD/u.test(line)) record(issues, path, sourceLine, "replacement-character", "Unicode replacement character (�)");
    if (/\t/u.test(line)) record(issues, path, sourceLine, "tab", "Tab inside source text");
    if (invisible.test(line)) record(issues, path, sourceLine, "invisible-character", "Invisible/bidirectional control character; confirm intentional use");
    if (commonPlaceholders.test(line) ||
        (script === "urdu" ? urduUncertainty : romanUncertainty).test(line))
      record(issues, path, sourceLine, "unverified-text", "Editorial/OCR uncertainty or placeholder present");
    if (/(?:ï¿½|Ã.|Â.|â€|Ø.|Ù.|�)/u.test(line))
      record(issues, path, sourceLine, "encoding", "Possible misdecoded text");
    const otherScript = [...line].some(ch => /\p{L}/u.test(ch) && !latin.test(ch) && !arabic.test(ch));
    if (otherScript)
      record(issues, path, sourceLine, "unexpected-script", "Letter from an unexpected script: " + line.trim().slice(0, 95));
    if (script === "urdu") {
      if (/[A-Za-z]/u.test(line))
        record(issues, path, sourceLine, "latin-in-urdu", "Latin letters in Urdu text: " + line.trim().slice(0, 95));
    } else {
      if (/\b(?:Hussain|Hassan)\b/iu.test(line))
        record(issues, path, sourceLine, "roman-name-style", "House style uses Husain and Hasan (one s after the initial consonant)");
      if (arabic.test(line) || romanDigits.test(line))
        record(issues, path, sourceLine, "arabic-in-roman", "Arabic-script character or digit in Roman text: " + line.trim().slice(0, 95));
      // Flag Latin accents (ā, ḥ, ī, etc.), not ordinary curly punctuation.
      if ([...line].some((ch) => latin.test(ch) && unusualLatin.test(ch)) ||
          /[\u0300-\u036F]/u.test(line))
        record(issues, path, sourceLine, "extended-latin-in-roman", "Non-ASCII Latin letter/diacritic in Roman text: " + line.trim().slice(0, 95));
    }
  });
}

interface Portion {
  start: number;
  text: string;
}
function portions(value: string): Portion[] {
  const lines = value.split("\n"), sections: Portion[] = [];
  let begin = 0;
  for (let i = 0; i <= lines.length; i++) {
    if (i === lines.length || /^\s*---\*\*\*---\s*$/u.test(lines[i])) {
      sections.push({ start: begin, text: lines.slice(begin, i).join("\n") });
      begin = i + 1;
    }
  }
  return sections;
}
interface CountedStanza {
  number: number;
  line: number;
  verses: number;
}
function countStanzas(text: string, baseLine: number, path: string, issues: ReviewFinding[], checkSequence: boolean): CountedStanza[] {
  const lines = text.split("\n");
  const stanzas: CountedStanza[] = [];
  for (let i = 0; i < lines.length; i++) {
    const number = numberValue(lines[i]);
    if (number === null) continue;
    stanzas.push({ number, line: baseLine + i, verses: 0 });
  }
  if (!stanzas.length) return stanzas;
  for (let i = 0; i < stanzas.length; i++) {
    const from = stanzas[i].line - baseLine + 1;
    const until = i + 1 < stanzas.length ? stanzas[i + 1].line - baseLine : lines.length;
    stanzas[i].verses = lines.slice(from, until).filter((line) => line.trim() && !/^\s*---\*\*\*---\s*$/u.test(line)).length;
    if (!stanzas[i].verses)
      record(issues, path, stanzas[i].line, "empty-stanza", "Numbered stanza has no verses");
    if (i > 0 && stanzas[i].number <= stanzas[i - 1].number)
      record(issues, path, stanzas[i].line, "stanza-order", "Stanza numbers repeat or decrease (" + stanzas[i - 1].number + " → " + stanzas[i].number + ")");
    if (checkSequence && i > 0 && stanzas[i].number > stanzas[i - 1].number + 1)
      record(issues, path, stanzas[i].line, "stanza-gap", "Stanza sequence skips from " + stanzas[i - 1].number + " to " + stanzas[i].number);
  }
  return stanzas;
}

/** Checks physical lines and matching numbered stanza boundaries, never compares translated words. */
export function compareEditions(
  urdu: string, roman: string, urduPath: string, romanPath: string,
  urduStart = 1, romanStart = 1, checkSequence = true,
): ReviewFinding[] {
  const issues: ReviewFinding[] = [];
  const uParts = portions(urdu), rParts = portions(roman);
  if (uParts.length !== rParts.length) {
    record(issues, urduPath, urduStart, "fragment-count", "Urdu has " + uParts.length + " source fragments; Roman has " + rParts.length);
  }
  for (let i = 0; i < Math.min(uParts.length, rParts.length); i++) {
    const u = uParts[i], r = rParts[i];
    const uBase = urduStart + u.start, rBase = romanStart + r.start;
    const uStanzas = countStanzas(u.text, uBase, urduPath, issues, checkSequence);
    const rStanzas = countStanzas(r.text, rBase, romanPath, issues, checkSequence);
    if (uStanzas.length !== rStanzas.length || uStanzas.some((s, j) => s.number !== rStanzas[j]?.number)) {
      if (uStanzas.length || rStanzas.length) {
        record(issues, urduPath, uBase, "stanza-number-mismatch",
          "Fragment " + (i + 1) + ": Urdu stanza numbers [" + uStanzas.map(x => x.number).join(",") +
          "] differ from Roman [" + rStanzas.map(x => x.number).join(",") + "]");
      }
      continue;
    }
    if (uStanzas.length) {
      for (let k = 0; k < uStanzas.length; k++) {
        if (uStanzas[k].verses !== rStanzas[k].verses)
          record(issues, urduPath, uStanzas[k].line, "stanza-line-mismatch",
            "Fragment " + (i + 1) + ", stanza " + uStanzas[k].number + ": Urdu " +
            uStanzas[k].verses + " verses; Roman " + rStanzas[k].verses);
      }
    } else {
      const count = (s: string) => s.split("\n").filter(l => l.trim()).length;
      if (count(u.text) !== count(r.text))
        record(issues, urduPath, uBase, "line-count-mismatch",
          "Fragment " + (i + 1) + ": Urdu " + count(u.text) + " nonempty lines; Roman " + count(r.text));
    }
  }
  return issues;
}

export function reviewMarkdown(source: MarkdownSource): ReviewedMarkdown {
  const { path, kind, text } = source;
  const issues: ReviewFinding[] = [];
  const normalized = text.replace(/\r\n?/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/u);
  if (!match) {
    record(issues, path, 1, "frontmatter", "Missing or unterminated YAML frontmatter");
    return { path, kind, body: normalized, bodyLine: 1, fields: {}, issues };
  }
  const header = match[1], lines = header.split("\n");
  const body = normalized.slice(match[0].length);
  const bodyLine = match[0].split("\n").length;
  const fields: Record<string, string> = {};
  for (const line of lines) {
    const field = line.match(/^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/u);
    if (field) {
      if (Object.hasOwn(fields, field[1]))
        record(issues, path, 2, "duplicate-metadata", "Repeated YAML frontmatter field: " + field[1]);
      fields[field[1]] = field[2].trim().replace(/^["']|["']$/gu, "");
    }
  }
  if (normalized.startsWith("\uFEFF")) record(issues, path, 1, "bom", "Unexpected UTF-8 BOM");
  if (!body.trim() && !(kind === "basta-urdu" && fields.imageOnly === "true"))
    record(issues, path, bodyLine, "empty-body", "Source text is empty");
  const page = kind !== "lyrics" ? Number(path.match(/(\d+)\.md$/u)?.[1]) : undefined;
  if (page !== undefined && (Number(fields.page) !== page || !Number.isSafeInteger(page)))
    record(issues, path, 2, "page-metadata", "Frontmatter page differs from filename");
  if (kind === "basta-urdu") {
    if (!fields.originalImage && fields.imageOnly !== "true")
      record(issues, path, 2, "missing-image", "Source scan path is missing");
    const imagePage = Number(fields.originalImage?.match(/\/(\d+)\.(?:png|jpe?g)$/iu)?.[1]);
    if (fields.originalImage && imagePage !== page)
      record(issues, path, 2, "image-page-mismatch", "Source image filename does not match printed page " + page);
  }
  if (kind === "lyrics") {
    for (const field of ["title", "language", "lang", "direction", "kalamType"]) {
      if (!fields[field]) record(issues, path, 2, "missing-metadata", "Missing " + field + " field");
    }
    const isUrdu = fields.lang === "ur" || fields.language === "Urdu";
    if (isUrdu) {
      if (fields.direction && fields.direction !== "rtl") record(issues, path, 2, "direction", "Urdu direction is not rtl");
      if (fields.title && /[A-Za-z]/u.test(fields.title))
        record(issues, path, 2, "latin-in-urdu-title", "Latin letters in Urdu title");
      checkLines(path, body, bodyLine, "urdu", issues);
    } else if (fields.lang === "en") checkLines(path, body, bodyLine, "roman", issues);

    const start = lines.findIndex(l => /^romanLyrics:\s*\|[-+]?\s*$/u.test(l));
    let roman: string | undefined, romanLine: number | undefined;
    if (start >= 0) {
      romanLine = 2 + start + 1;
      const values: string[] = [];
      for (const line of lines.slice(start + 1)) {
        if (line.trim() && !/^[ \t]/u.test(line)) break;
        if (line.trim() && !/^ {2}/u.test(line)) {
          record(issues, path, romanLine + values.length, "roman-indentation", "Roman lyrics block has invalid indentation");
        }
        values.push(line.startsWith("  ") ? line.slice(2) : line);
      }
      roman = values.join("\n").trimEnd();
    } else if ("romanLyrics" in fields && fields.romanLyrics) {
      record(issues, path, 2, "roman-format", "Roman text should be a YAML literal block (romanLyrics: |-)");
    }
    if (isUrdu && !roman?.trim()) record(issues, path, 2, "missing-roman", "No Roman Urdu edition found");
    if (roman !== undefined && romanLine !== undefined) {
      checkLines(path, roman, romanLine, "roman", issues);
      if (body.trim() && roman.trim() && isUrdu)
        issues.push(...compareEditions(body, roman, path, path, bodyLine, romanLine));
    }
    // Roman metadata is separate from Urdu source, and can be audited independently.
    for (const key of ["alternateTitle", "romanHaal"]) {
      if (fields[key] && arabic.test(fields[key]))
        record(issues, path, 2, "arabic-in-roman-metadata", key + " contains Arabic-script characters");
      if (fields[key] && [...fields[key]].some(ch => latin.test(ch) && unusualLatin.test(ch)))
        record(issues, path, 2, "extended-latin-in-roman-metadata", key + " contains non-ASCII Latin transliteration");
    }
    return { path, kind, body, bodyLine, roman, romanLine, fields, issues };
  }
  if (kind === "basta-urdu" && fields.imageOnly !== "true") checkLines(path, body, bodyLine, "urdu", issues);
  if (kind === "basta-roman") checkLines(path, body, bodyLine, "roman", issues);
  // Page-number sequences continue across physical pages; individual fragments may start mid-stanza.
  // Only report repeats/decreases within the same page/fragment, not gaps between pages.
  for (const part of portions(body)) {
    countStanzas(part.text, bodyLine + part.start, path, issues, false);
  }
  return { path, kind, page, imageOnly: fields.imageOnly === "true", body, bodyLine, fields, issues };
}
