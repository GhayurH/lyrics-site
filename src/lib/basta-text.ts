// File role: Shared Basta text helpers for detecting the explicit between-kalam marker and rendering each kalam as a separate text block.
import { parseStanzaNumber } from "./stanza-numbers.ts";

export const BASTA_KALAM_BREAK = "---***---";

export function splitBastaKalams(text: string): string[] {
  const normalized = text.replace(/\r\n?/g, "\n");
  const kalams: string[] = [];
  let current: string[] = [];

  const pushCurrent = () => {
    const value = current.join("\n").trim();
    if (value) kalams.push(value);
    current = [];
  };

  for (const line of normalized.split("\n")) {
    if (line.trim() === BASTA_KALAM_BREAK) {
      pushCurrent();
      continue;
    }
    current.push(line);
  }

  pushCurrent();
  return kalams;
}

/** Explicit couplet mode for Salam; auto mode detects long unnumbered
 * couplet blocks and treats the remaining numbered stanzas as six-verse forms. */
export type BastaStanzaStyle = "auto" | "couplet";

export interface BastaDisplayLine {
  text: string;
  stanzaNumber?: string;
  indent: boolean;
  /** Inset the end of the first line, opposite the second line's indent. */
  reverseIndent?: boolean;
  /** Verse status is retained separately from title-fitting. */
  verse: boolean;
  /** Actual poem titles remain on one line and participate in width fitting. */
  title?: boolean;
  /** A poet's byline immediately following a verified opening title. */
  poet?: boolean;
  /** Editorially marked subordinate heading, not a verse or poet attribution. */
  subtitle?: boolean;
  /** A rule starts each couplet after the first in a two-verse poem. */
  coupletSeparator?: boolean;
  /** Closing couplet rules are shared with a final reprise when present. */
  sixClosingStart?: boolean;
  sixClosingEnd?: boolean;
  /** Hide only the source blank between lines four and five, or before a reprise. */
  hidden?: boolean;
  refrain?: boolean;
  refrainSharesRule?: boolean;
}

function isStanzaNumber(line: string): boolean {
  return parseStanzaNumber(line) !== null;
}

function isCreditLine(line: string): boolean {
  return /^[(（]?\s*(?:بشکریہ|بہ\s*شکریہ|bashukriya|ba\s*shukriya)/i.test(line.trim());
}

/** Attribution cues are roles, not a list of individual poets. Evaluate
 * them only in a separate introductory block, never in ordinary verses. */
function isKnownByline(line: string): boolean {
  const value = line.trim().replace(/^[([（]\s*/u, "");
  return /^(?:سید|سیّد|پیر|حکیم|شاعر|مولانا|حضرت|علامہ|ڈاکٹر|پروفیسر|مرزا|سردار|سبط جعفر$|شفق اکبر آبادی|روایتی نوحہ|Syed|Sayyid|Pir|Hakim|Shair|Maulana|Hazrat|Allama|Dr\.?\s|Doctor|Professor|Mirza|Sardar|Sibt Jafar$|Shafaq Akbar Abadi|Riwayati nauha)/iu.test(value);
}

/** A genre or editorial section heading may not repeat in the verses.
 * Only classify a label in its own introductory block as a title. */
function isGenreHeading(line: string): boolean {
  const value = line.trim().replace(/^\[|\]$/gu, "").trim();
  return /^(?:رباعی|قطعہ|قطعات|منقبت|مناجات|سوزخوانی|مختصر زیارات|[\p{L}\sِ]+ سے خطاب|Rubai|Ruba(?:i|yat)|Qit['’]a|Qita['’]?at|Manqabat|Munajat|(?:Soz|Soaz)khwani|Mukhtasar Ziarat|[A-Za-z\s-]+ se khitab)$/iu.test(value);
}

/** Scan transcriptions can vary slightly between a printed heading and
 * its repeated first verse (harakat, punctuation or a short omitted word).
 * Match only long, near-identical lines so ordinary stanza lines stay verses. */
function matchesOpeningTitle(title: string, opening: string): boolean {
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
function hasIntroductoryBlock(lines: string[], blocks: Array<{ start: number; end: number }>): boolean {
  if (blocks.length < 2) return false;
  const first = blocks[0];
  const size = first.end - first.start;
  if (size === 1) return !isStanzaNumber(lines[first.start]);
  const repeats = matchesOpeningTitle(lines[first.start], lines[blocks[1].start]);
  return (size === 2 && (repeats || isKnownByline(lines[first.start + 1]) ||
      isGenreHeading(lines[first.start]))) ||
    (size === 3 && repeats && isKnownByline(lines[first.start + 2]));
}

/** Preserve every line; only attach indentation to actual verses. */
export function layoutBastaKalam(
  text: string,
  indentStanzas = true,
  style: BastaStanzaStyle = "auto",
  prefaceOnly = false,
): BastaDisplayLine[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const display: BastaDisplayLine[] = lines.map((line) => {
    const subtitle = line.startsWith("[[subtitle]] ");
    const explicitRefrain = line.startsWith("[[refrain]] ");
    const visibleText = subtitle ? line.slice("[[subtitle]] ".length)
      : explicitRefrain ? line.slice("[[refrain]] ".length) : line;
    const stanzaNumber = parseStanzaNumber(visibleText);
    return {
      text: stanzaNumber ?? visibleText,
      subtitle,
      stanzaNumber: stanzaNumber ?? undefined,
      indent: false,
      verse: explicitRefrain,
      refrain: explicitRefrain,
    };
  });
  const blocks: Array<{ start: number; end: number }> = [];
  for (let pos = 0; pos < lines.length;) {
    if (!lines[pos].trim()) {
      pos++;
      continue;
    }
    const start = pos;
    while (pos < lines.length && lines[pos].trim()) pos++;
    blocks.push({ start, end: pos });
  }

  // Some pages start with a section heading before the normal
  // title/byline block. Both are prefaces, not the poem's first couplet.
  const prefaceBlocks = new Set<number>();
  if (hasIntroductoryBlock(lines, blocks)) prefaceBlocks.add(0);
  for (let index = 0; index + 1 < blocks.length; index++) {
    const block = blocks[index];
    const count = block.end - block.start;
    const repeats = matchesOpeningTitle(lines[block.start], lines[blocks[index + 1].start]);
    if (!isStanzaNumber(lines[block.start]) &&
        ((count === 2 && (repeats || isKnownByline(lines[block.start + 1]) ||
          isGenreHeading(lines[block.start]))) ||
         (count === 3 && repeats && isKnownByline(lines[block.start + 2])))) {
      prefaceBlocks.add(index);
    }
  }

  // Unnumbered poems often print many two-verse stanzas as one unbroken
  // block. Eight or more consecutive verses distinguish them from the
  // usual six-verse stanza, whose closing pair has its own printed rules.
  // Decide once per kalam so its shorter final couplet follows suit.
  const inferredCouplets =
    style === "auto" &&
    !blocks.some((block) => isStanzaNumber(lines[block.start])) &&
    blocks.some((block, index) =>
      !prefaceBlocks.has(index) &&
      block.end - block.start >= 8 &&
      (block.end - block.start) % 2 === 0,
    );
  const usesCouplets = style === "couplet" || inferredCouplets;

  // Identify the poem's opening title, not the section heading or poet's
  // name. The title normally repeats as the first line of the verse block.
  for (const index of prefaceBlocks) {
    const block = blocks[index];
    const next = blocks[index + 1];
    if (!next) continue;
    const heading = lines[block.start].trim();
    const matchesFirstVerse = matchesOpeningTitle(heading, lines[next.start]);
    const hasKnownByline = block.end - block.start === 2 &&
      (isKnownByline(lines[block.start + 1]) || isGenreHeading(heading));
    const isStandAloneHeading = block.end - block.start === 1 &&
      !prefaceBlocks.has(index + 1) &&
      (heading.includes(" / ") ||
        isStanzaNumber(lines[next.start]) ||
        /^(?:بین|Bain)$/iu.test(heading) ||
        isGenreHeading(heading));
    // A standalone attribution is not a title, even if visually short.
    if (block.end - block.start === 1 && isKnownByline(heading) &&
        !matchesFirstVerse && !isStandAloneHeading) {
      display[block.start].poet = true;
      continue;
    }
    if ((matchesFirstVerse || isStandAloneHeading || hasKnownByline) && !isCreditLine(heading)) {
      display[block.start].title = true;
      // A printed separator is not a full-height empty verse after a title.
      // Preserve gaps elsewhere, including ordinary stanza boundaries.
      for (let gap = block.end; gap < next.start; gap++) {
        if (!lines[gap].trim()) display[gap].hidden = true;
      }
      // Only the adjacent second line of a verified two-line preface is a
      // byline; standalone headings, credits, and verses are untouched.
      if (block.end - block.start === 2 && !display[block.start + 1].subtitle && !isCreditLine(lines[block.start + 1])) {
        display[block.start + 1].poet = true;
      }
      if (block.end - block.start === 3 && matchesFirstVerse &&
          isKnownByline(lines[block.start + 2])) {
        display[block.start + 1].subtitle = true;
        display[block.start + 2].poet = true;
      }
    }
  }

  // Numbered Recitation Sets render the canonical preface separately from
  // its stanzas. The final two-line preface block is the known title/byline;
  // unlike a full source page it has no following verse for title detection.
  if (prefaceOnly) {
    const byline = blocks.at(-1);
    if (byline && byline.end - byline.start === 2 &&
        !isStanzaNumber(lines[byline.start]) &&
        !isCreditLine(lines[byline.start]) &&
        !isCreditLine(lines[byline.start + 1])) {
      display[byline.start].title = true;
      display[byline.start + 1].poet = true;
    } else if (byline && byline.end - byline.start === 3 &&
        isKnownByline(lines[byline.start + 2])) {
      // Recitation Sets render this three-part preface without its next verse.
      display[byline.start].title = true;
      display[byline.start + 1].subtitle = true;
      display[byline.start + 2].poet = true;
    }
  }

  // Titles are independent of stanza indentation (including early Basta pages).
  if (!indentStanzas) return display;

  let previousVerseCount = 0;
  let previousCoupletBlock: { start: number; end: number } | undefined;
  for (let index = 0; index < blocks.length; index++) {
    if (prefaceBlocks.has(index)) continue;
    const block = blocks[index];
    let first = block.start;
    let last = block.end;
    if (isStanzaNumber(lines[first])) first++;
    while (last > first && isCreditLine(lines[last - 1])) last--;
    const count = last - first;
    if (count >= 2) {
      for (let verse = first; verse < last; verse++) {
        if (!/^[\[(（]/.test(lines[verse].trim())) display[verse].verse = true;
      }
    }

    let endsWithCouplet = false;
    if (usesCouplets && count >= 5) {
      // Two-line stanzas may be transcribed as one continuous paragraph.
      // Preserve explicit four-line stanza blocks as originally printed.
      for (let offset = 0; offset < count; offset += 2) {
        display[first + offset].reverseIndent = true;
        if (first + offset + 1 < last) display[first + offset + 1].indent = true;
      }
      for (let offset = 2; offset < count; offset += 2) {
        display[first + offset].coupletSeparator = true;
      }
      endsWithCouplet = count % 2 === 0;
    } else if (count === 6) {
      // The first four verses share the first-couplet-line end inset;
      // the framed closing two share the second-line start inset.
      for (let verse = first; verse < last - 2; verse++) {
        display[verse].reverseIndent = true;
      }
      display[last - 2].indent = true;
      display[last - 2].sixClosingStart = true;
      display[last - 1].indent = true;
      display[last - 1].sixClosingEnd = true;
    } else if (count === 2) {
      // A source blank may divide a 6-line stanza into 4 + 2.
      const closesSixLineStanza = previousVerseCount === 4 && !usesCouplets;
      if (closesSixLineStanza) {
        // The 4+2 case is only identifiable upon reaching the final pair.
        // Retroactively apply the opposite inset to its first four verses.
        const previousBlock = blocks[index - 1];
        for (let verse = previousBlock.start; verse < previousBlock.end; verse++) {
          if (display[verse].verse) display[verse].reverseIndent = true;
        }
        display[first].indent = true;
        display[first].sixClosingStart = true;
        display[first + 1].indent = true;
        display[first + 1].sixClosingEnd = true;
        for (let space = previousBlock.end; space < block.start; space++) {
          if (!lines[space].trim()) display[space].hidden = true;
        }
      } else {
        display[first].reverseIndent = true;
        display[first + 1].indent = true;
        endsWithCouplet = true;
      }
    }

    // An explicit blank between two couplets becomes a single ruled gap;
    // never insert rules between a 4+2 six-verse stanza's halves.
    if (endsWithCouplet && previousCoupletBlock) {
      display[first].coupletSeparator = true;
      for (let gap = previousCoupletBlock.end; gap < block.start; gap++) {
        if (!lines[gap].trim()) display[gap].hidden = true;
      }
    }
    previousCoupletBlock = endsWithCouplet ? block : undefined;
    previousVerseCount = count;
  }

  // The final single line may repeat the opening verse, including on pages
  // where that opening was printed earlier in the book. Preserve the reprise.
  const finalBlock = blocks.at(-1);
  if (finalBlock && finalBlock.end - finalBlock.start === 1) {
    const at = finalBlock.start;
    const candidate = lines[at].trim();
    const verseOnly = candidate.split(/\s+\/\s+/u)[0].trim();
    let preceding = at - 1;
    while (preceding >= 0 && !lines[preceding].trim()) preceding--;
    const sharesRule = preceding >= 0 && Boolean(display[preceding].sixClosingEnd);
    const repeatsEarlierLine = lines.slice(0, at).some(
      (earlier) => earlier.trim() === verseOnly,
    );
    if (candidate && !isStanzaNumber(candidate) && !isCreditLine(candidate) &&
        (sharesRule || repeatsEarlierLine)) {
      display[at].refrain = true;
      display[at].refrainSharesRule = sharesRule;
      display[at].verse = true;
      if (sharesRule) {
        // The lower rule of line six is also the upper rule of the reprise.
        for (let space = preceding + 1; space < at; space++) {
          if (!lines[space].trim()) display[space].hidden = true;
        }
      }
    }
  }

  return display;
}

/** Shared classes keep static Astro pages and streamed pages identical. */
export function bastaVerseClassNames(line: BastaDisplayLine): string {
  // A counter uses only its own class; poetry line layout and fitting do not apply.
  if (line.stanzaNumber) return "poetry-stanza-number";
  return [
    "basta-verse-line",
    line.indent && "basta-verse-indent",
    line.reverseIndent && "basta-verse-reverse-indent",
    (line.verse || line.title) && "basta-verse-poetry",
    line.title && "basta-kalam-title",
    line.title && "kalam-reading-title",
    line.poet && "kalam-poet-credit",
    line.subtitle && "basta-kalam-subtitle",
    line.coupletSeparator && "basta-couplet-separator",
    line.sixClosingStart && "basta-six-closing-start",
    line.sixClosingEnd && "basta-six-closing-end",
    line.refrain && "basta-refrain",
    line.refrainSharesRule && "basta-refrain-shared-rule",
  ].filter(Boolean).join(" ");
}
