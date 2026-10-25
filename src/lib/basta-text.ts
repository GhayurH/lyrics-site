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

/** Render lines without rewriting the transcription. Stanzas are separated by
 * blank lines; a six-line stanza may be printed as four lines, a blank, then
 * two indented lines. Standalone two-line stanzas indent only their second line.
 */
export interface BastaDisplayLine {
  text: string;
  indent: boolean;
}

function isStanzaNumber(line: string): boolean {
  return /^[0-9٠-٩۰-۹]+[.)۔-]?$/.test(line.trim());
}

function isCreditLine(line: string): boolean {
  return /^[(（]?\s*(?:بشکریہ|بہ\s*شکریہ|bashukriya|ba\s*shukriya)/i.test(line.trim());
}

export function layoutBastaKalam(text: string, indentStanzas = true): BastaDisplayLine[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const display = lines.map((line) => ({ text: line, indent: false }));
  if (!indentStanzas) return display;
  let cursor = 0;
  let previousVerseCount = 0;

  while (cursor < lines.length) {
    if (!lines[cursor].trim()) {
      cursor++;
      continue;
    }

    const start = cursor;
    while (cursor < lines.length && lines[cursor].trim()) cursor++;

    let first = start;
    let last = cursor;
    if (isStanzaNumber(lines[first])) first++;
    while (last > first && isCreditLine(lines[last - 1])) last--;
    const count = last - first;

    if (count === 6) {
      display[last - 2].indent = true;
      display[last - 1].indent = true;
    } else if (count === 2) {
      // In six-line stanzas, the closing couplet is usually split off
      // from four preceding verses by one blank line in the source files.
      const closesSixLineStanza = previousVerseCount === 4;
      display[first].indent = closesSixLineStanza;
      display[first + 1].indent = true;
    }

    previousVerseCount = count;
  }

  return display;
}
