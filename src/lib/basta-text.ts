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

/** Salam often prints couplets as successive lines without blank stanza
 * separators; other poems follow the original six-verse convention. */
export type BastaStanzaStyle = "auto" | "couplet";

export interface BastaDisplayLine {
  text: string;
  stanzaNumber?: string;
  indent: boolean;
  /** Inset the end of the first line, opposite the second line's indent. */
  reverseIndent?: boolean;
  /** Verse status is retained separately from title-fitting. */
  verse: boolean;
  /** Actual poem titles also use single-line justification/fitting. */
  title?: boolean;
  /** A rule starts each couplet after the first in a two-verse poem. */
  coupletSeparator?: boolean;
  /** Last two lines in a six-line stanza, framed instead of side-ruled. */
  sixClosing?: boolean;
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

/** Ignore the heading/poet preface when it is separated from the verses.
 * A two-line preface is only recognized when its title repeats in the next
 * block; do not infer arbitrary author names from the source text. */
function hasIntroductoryBlock(lines: string[], blocks: Array<{ start: number; end: number }>): boolean {
  if (blocks.length < 2) return false;
  const first = blocks[0];
  const size = first.end - first.start;
  if (size === 1) return !isStanzaNumber(lines[first.start]);
  return size === 2 && lines[first.start].trim() === lines[blocks[1].start].trim();
}

/** Preserve every line; only attach indentation to actual verses. */
export function layoutBastaKalam(
  text: string,
  indentStanzas = true,
  style: BastaStanzaStyle = "auto",
): BastaDisplayLine[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const display = lines.map((line) => {
    const stanzaNumber = parseStanzaNumber(line);
    return {
      text: stanzaNumber ?? line,
      stanzaNumber: stanzaNumber ?? undefined,
      indent: false,
      verse: false,
    };
  });
  if (!indentStanzas) return display;

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
    if (
      block.end - block.start === 2 &&
      !isStanzaNumber(lines[block.start]) &&
      lines[block.start].trim() === lines[blocks[index + 1].start].trim()
    ) {
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

  // Justify the poem's opening title, not the section heading or poet's
  // name. The title normally repeats as the first line of the verse block.
  for (const index of prefaceBlocks) {
    const block = blocks[index];
    const next = blocks[index + 1];
    if (!next) continue;
    const heading = lines[block.start].trim();
    const matchesFirstVerse = heading === lines[next.start].trim();
    const isStandAloneHeading = block.end - block.start === 1 &&
      !prefaceBlocks.has(index + 1) &&
      (heading.includes(" / ") || isStanzaNumber(lines[next.start]));
    if ((matchesFirstVerse || isStandAloneHeading) && !isCreditLine(heading)) {
      display[block.start].title = true;
    }
  }

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
      display[last - 2].sixClosing = true;
      display[last - 2].sixClosingStart = true;
      display[last - 1].indent = true;
      display[last - 1].sixClosing = true;
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
        display[first].sixClosing = true;
        display[first].sixClosingStart = true;
        display[first + 1].indent = true;
        display[first + 1].sixClosing = true;
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

  // A standalone repetition at the very end is part of the poem. It is
  // not a source citation, even when the old OCR had labelled it "Makhaz".
  // Also detect end-of-page continuations whose first verse was on another page.
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
  return [
    "basta-verse-line",
    line.stanzaNumber && "poetry-stanza-number",
    line.indent && "basta-verse-indent",
    line.reverseIndent && "basta-verse-reverse-indent",
    (line.verse || line.title) && "basta-verse-poetry",
    line.title && "basta-poem-title",
    line.coupletSeparator && "basta-couplet-separator",
    line.sixClosing && "basta-six-closing",
    line.sixClosingStart && "basta-six-closing-start",
    line.sixClosingEnd && "basta-six-closing-end",
    line.refrain && "basta-refrain",
    line.refrainSharesRule && "basta-refrain-shared-rule",
  ].filter(Boolean).join(" ");
}
