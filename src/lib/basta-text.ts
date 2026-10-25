// File role: Shared Basta text helpers for detecting the explicit between-kalam marker and rendering each kalam as a separate text block.
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
  indent: boolean;
  /** Only poem lines are justified, never titles, bylines or source notes. */
  verse: boolean;
}

function isStanzaNumber(line: string): boolean {
  return /^[0-9٠-٩۰-۹]+[.)۔-]?$/.test(line.trim());
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
  const display = lines.map((line) => ({ text: line, indent: false, verse: false }));
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

  const hasHeading = hasIntroductoryBlock(lines, blocks);
  let previousVerseCount = 0;
  for (let index = 0; index < blocks.length; index++) {
    if (index === 0 && hasHeading) continue;
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

    if (style === "couplet" && count >= 5) {
      // Two-line stanzas may be transcribed as one continuous paragraph.
      // Preserve explicit four-line stanza blocks as originally printed.
      for (let offset = 1; offset < count; offset += 2) {
        display[first + offset].indent = true;
      }
    } else if (count === 6) {
      display[last - 2].indent = true;
      display[last - 1].indent = true;
    } else if (count === 2) {
      // The pair after four verses belongs to the same six-line stanza.
      const closesSixLineStanza = previousVerseCount === 4;
      display[first].indent = closesSixLineStanza;
      display[first + 1].indent = true;
    }

    previousVerseCount = count;
  }

  return display;
}
