// Source-level, non-destructive review checks shared by Basta and standalone lyric audits.
// Findings identify review candidates, not permission to alter uncertain printed wording.
import { stanzaNumberValue } from "./stanza-numbers.ts";
import { isBastaBoundary, splitBastaSource } from "./basta-text.ts";
import { arabic, latin, unusualLatin, record, checkLines, type ReviewFinding } from "./source-text-quality.ts";
export type { ReviewFinding } from "./source-text-quality.ts";

export interface MarkdownSource {
  path: string;
  kind: "lyrics" | "basta-urdu";
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

interface CountedStanza {
  number: number;
  line: number;
  verses: number;
}
/** Count separately numbered stanzas without inventing cross-page continuity. */
function countStanzas(text: string, baseLine: number, path: string, issues: ReviewFinding[], checkSequence: boolean): CountedStanza[] {
  const lines = text.split("\n");
  const stanzas: CountedStanza[] = [];
  for (let i = 0; i < lines.length; i++) {
    const number = stanzaNumberValue(lines[i]);
    if (number === null) continue;
    stanzas.push({ number, line: baseLine + i, verses: 0 });
  }
  if (!stanzas.length) return stanzas;
  for (let i = 0; i < stanzas.length; i++) {
    const from = stanzas[i].line - baseLine + 1;
    const until = i + 1 < stanzas.length ? stanzas[i + 1].line - baseLine : lines.length;
    stanzas[i].verses = lines.slice(from, until).filter((line) => line.trim() && !isBastaBoundary(line)).length;
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
  const uParts = splitBastaSource(urdu), rParts = splitBastaSource(roman);
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

/** Report source and structural violations without editing source or resetting the baseline.
 * Unknown frontmatter is returned as a finding so the audit can continue. */
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

    if (isUrdu && !roman?.trim()) record(issues, path, 2, "missing-roman", "No Roman Urdu edition found");
    if (roman !== undefined && romanLine !== undefined) {
      checkLines(path, roman, romanLine, "roman", issues);
      if (body.trim() && roman.trim() && isUrdu)
        {
          const compared = compareEditions(body, roman, path, path, bodyLine, romanLine);
          const exceptionText = fields.stanzaLineExceptions;
          const declaration = exceptionText?.match(/^\[\s*\d+(?:\s*,\s*\d+)*\s*\]$/u);
          const exceptionNumbers = declaration
            ? declaration[0].slice(1, -1).split(",").map(value => Number(value.trim()))
            : [];
          if (exceptionText && !declaration)
            record(issues, path, 2, "invalid-stanza-exception",
              "stanzaLineExceptions must be a nonempty list of stanza numbers");
          const approved = new Set(exceptionNumbers);
          if (approved.size !== exceptionNumbers.length || exceptionNumbers.some(n => !Number.isSafeInteger(n) || n < 1))
            record(issues, path, 2, "invalid-stanza-exception",
              "stanzaLineExceptions must contain distinct positive stanza numbers");
          const observed = new Set<number>();
          for (const finding of compared) {
            const stanza = Number(finding.detail.match(/^Fragment 1, stanza (\d+):/u)?.[1]);
            if (finding.code === "stanza-line-mismatch" && approved.has(stanza)) {
              observed.add(stanza);
              continue;
            }
            issues.push(finding);
          }
          for (const number of approved)
            if (!observed.has(number))
              record(issues, path, 2, "stale-stanza-exception",
                "Declared intentional stanza difference " + number + " no longer exists");
        }
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
  if (kind === "basta-urdu" && fields.imageOnly !== "true")
    checkLines(path, body, bodyLine, "urdu", issues,
      (page ?? 0) < 85 || fields.contentKind === "english-appendix");
  if (kind === "basta-urdu" && roman !== undefined && romanLine !== undefined) {
    checkLines(path, roman, romanLine, "roman", issues);
    if (body.trim() && roman.trim())
      issues.push(...compareEditions(body, roman, path, path, bodyLine, romanLine, false));
  }
  if (kind === "basta-urdu" && page !== undefined && page >= 85) {
    // Physical lines and review locations are preserved across both editions.
    // A Roman literal lives above the Urdu body, but uses the same audit rules.
    const editions = [{ text: body, line: bodyLine },
      ...(roman === undefined || romanLine === undefined ? [] : [{ text: roman, line: romanLine }])];
    for (const edition of editions) {
      const sourceLines = edition.text.split("\n");
      sourceLines.forEach((line, index) => {
        if (index > 1 && !line.trim() && !sourceLines[index - 1].trim() &&
            sourceLines[index - 2].trim())
          record(issues, path, edition.line + index, "basta-excess-blank-lines",
            "Two or more consecutive blank lines in a Basta source");
        if (/^\s*\(?(?:بشکریہ|Bashukriya)(?:\s|[):]|$)/iu.test(line) &&
            index > 0 && sourceLines[index - 1].trim())
          record(issues, path, edition.line + index, "basta-courtesy-spacing",
            "Source acknowledgement should have one blank line above it");
        const normalized = line.replace(/\u0640/gu, "").replace(/[\u064B-\u065F]/gu, "").trim();
        if (/^\(?\s*(?:التماس|iltimas)(?:[\sِ-]*e)?[\sِ-]*(?:(?:سور[ۃہ]|surah|surat)(?:[\s-]*e)?[\s-]*)?(?:فاتحہ|fatiha|fateha|دعا|dua)/iu.test(normalized))
          record(issues, path, edition.line + index, "basta-prayer-block",
            "Prayer/dedication request left in poetry source");
      });
      // Continuations cross pages. Only detect repeats/decreases inside each fragment.
      for (const part of splitBastaSource(edition.text))
        countStanzas(part.text, edition.line + part.start, path, issues, false);
    }
  }
  return { path, kind, page, imageOnly: fields.imageOnly === "true",
    body, bodyLine, roman, romanLine, fields, issues };
}
