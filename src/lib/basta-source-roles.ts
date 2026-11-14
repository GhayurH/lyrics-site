// Interpret printed source roles; never rewrite the underlying Urdu or Roman verses.
// This is the single title/byline/credit recognition contract used by layout and exports.
import { parseStanzaNumber } from "./stanza-numbers.ts";

/** Isolated counters only: digits embedded within a verse cannot be stanza numbers. */
export function isStanzaNumber(line: string): boolean {
  return parseStanzaNumber(line) !== null;
}

export function isCreditLine(line: string): boolean {
  return /^[(（]?\s*(?:بشکریہ|بہ\s*شکریہ|bashukriya|ba\s*shukriya)/i.test(line.trim());
}

/** Attribution cues are roles, not a list of individual poets. Evaluate
 * them only in a separate introductory block, never in ordinary verses. */
export function isKnownByline(line: string): boolean {
  const value = line.trim().replace(/^[([（]\s*/u, "");
  return /^(?:سید|سیّد|پیر|حکیم|شاعر|مولانا|حضرت|علامہ|ڈاکٹر|پروفیسر|مرزا|سردار|سبط جعفر$|شفق اکبر آبادی|روایتی نوحہ|Syed|Sayyid|Pir|Hakim|Shair|Maulana|Hazrat|Allama|Dr\.?\s|Doctor|Professor|Mirza|Sardar|Sibt Jafar$|Shafaq Akbar Abadi|Riwayati nauha)/iu.test(value);
}

/** A genre or editorial section heading may not repeat in the verses.
 * Only classify a label in its own introductory block as a title. */
export function isGenreHeading(line: string): boolean {
  const value = line.trim().replace(/^\[|\]$/gu, "").trim();
  return /^(?:رباعی|قطعہ|قطعات|منقبت|مناجات|سوزخوانی|مختصر زیارات|[\p{L}\sِ]+ سے خطاب|Rubai|Ruba(?:i|yat)|Qit['’]?a|Qita['’]?at|Manqabat|Munajat|(?:Soz|Soaz)khwani|Mukhtasar Ziarat|[A-Za-z\s-]+ se khitab)$/iu.test(value);
}

/** Scan transcriptions can vary slightly between a printed heading and
 * its repeated first verse (harakat, punctuation or a short omitted word).
 * Match only long, near-identical lines so ordinary stanza lines stay verses. */
export function matchesOpeningTitle(title: string, opening: string): boolean {
  const normalize = (value: string) => value.normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06EDؐؑؒؓ]/gu, "")
    .replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
  const a = normalize(title), b = normalize(opening);
  if (a === b) return Boolean(a);
  if (Math.min(a.length, b.length) < 18 || Math.abs(a.length - b.length) > 3)
    return false;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        current[j - 1] + 1, previous[j] + 1,
        previous[j - 1] + Number(a[i - 1] !== b[j - 1]),
      );
    }
    if (Math.min(...current) > 3) return false;
    previous = current;
  }
  return previous[b.length] <= 3;
}

/** An opening title/byline is verified by a repeated first verse or
 * distinctive author attribution, not by its arbitrary line count. */
export function hasIntroductoryBlock(lines: string[], blocks: Array<{ start: number; end: number }>): boolean {
  if (blocks.length < 2) return false;
  const first = blocks[0];
  const size = first.end - first.start;
  if (size === 1) return !isStanzaNumber(lines[first.start]);
  const repeats = matchesOpeningTitle(lines[first.start], lines[blocks[1].start]);
  return (size === 2 && (repeats || isKnownByline(lines[first.start + 1]) ||
      isGenreHeading(lines[first.start]))) ||
    (size === 3 && repeats && isKnownByline(lines[first.start + 2]));
}
