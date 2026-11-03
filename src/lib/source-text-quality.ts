// Read-only Unicode, OCR-uncertainty and script-mixing diagnostics.
// These rules report review candidates; they never mutate religious source text.
import { stripCanonicalBibiNonJoiners } from "./bibi-spelling.ts";

export interface ReviewFinding {
  path: string;
  line: number;
  code: string;
  detail: string;
}

/** Append a stable file/line/code finding; callers decide whether it is approved debt. */
export function record(issues: ReviewFinding[], path: string, line: number, code: string, detail: string): void {
  issues.push({ path, line, code, detail });
}

export const arabic = /\p{Script=Arabic}/u;
export const latin = /\p{Script=Latin}/u;
undefined /[^\x00-\x7f]/u;
const romanDigits = /[٠-٩۰-۹]/u;
const commonPlaceholders = /(?:\b(?:TODO|TBD|FIXME|OCR|PLACEHOLDER)\b|\bmissing\s+v\d+(?:-\d+)?\b|\?{2,})/iu;
const urduUncertainty = /\[[^\]\n]*(?:جزوی\s*طور\s*پر\s*غیر\s*واضح|غیر\s*واضح|واضح\s*نہیں|مبہم|نامعلوم|نامکمل|ناقابل|پڑھ(?:ا|ی|ے)?\s*نہیں\s*(?:جا\s*)?سک(?:ا|ی|ے)?)[^\]\n]*\]/iu;
const romanUncertainty = /\[[^\]\n]*(?:juzwi\s+taur\s+par\s+ghair[-\s]?wazeh|ghair[-\s]?wazeh|wazeh\s+nah(?:i|ee)n|na[-\s]?qabil|unclear|illegible|unknown|incomplete|unreadable|not\s+clear|cannot\s+read)[^\]\n]*\]/iu;
const invisible = /[\u200B\u200C\u200D\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/u;

/** Inspect printed lines independently of metadata and stanza alignment. */
export function checkLines(path: string, text: string, firstLine: number, script: "urdu" | "roman", issues: ReviewFinding[], allowLatin = false): void {
  text.split("\n").forEach((line, index) => {
    const sourceLine = firstLine + index;
    if (!line.trim()) return;
    // Explicit editorial labels are metadata, not Arabic-to-Latin script mixing.
    const visibleLine = line.replace(/^\[\[(?:subtitle|refrain)\]\] /u, "");
    if (/\uFFFD/u.test(line)) record(issues, path, sourceLine, "replacement-character", "Unicode replacement character (�)");
    if (/\t/u.test(line)) record(issues, path, sourceLine, "tab", "Tab inside source text");
    if (invisible.test(stripCanonicalBibiNonJoiners(line)))
      record(issues, path, sourceLine, "invisible-character", "Invisible/bidirectional control character; confirm intentional use");
    if (commonPlaceholders.test(line) ||
        (script === "urdu" ? urduUncertainty : romanUncertainty).test(line))
      record(issues, path, sourceLine, "unverified-text", "Editorial/OCR uncertainty or placeholder present");
    if (/(?:ï¿½|Ã.|Â.|â€|Ø.|Ù.|�)/u.test(line))
      record(issues, path, sourceLine, "encoding", "Possible misdecoded text");
    const otherScript = [...line].some(ch => /\p{L}/u.test(ch) && !latin.test(ch) && !arabic.test(ch));
    if (otherScript)
      record(issues, path, sourceLine, "unexpected-script", "Letter from an unexpected script: " + line.trim().slice(0, 95));
    if (script === "urdu") {
      // Latin text in book front matter, English appendices and quoted
      // credits is an intentional source feature, not an OCR script error.
      const credit = /^\s*(?:\([^\n]*\)|(?:بشکریہ|شاعرِ|شاعر\s)[^\n]*)$/u.test(visibleLine);
      if (!allowLatin && !credit && /[A-Za-z]/u.test(visibleLine))
        record(issues, path, sourceLine, "latin-in-urdu", "Latin letters in Urdu text: " + visibleLine.trim().slice(0, 95));
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
