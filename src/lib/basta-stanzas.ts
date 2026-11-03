// Numbered-stanza extraction and printed-page provenance are independent of index mapping.
// Source texts and repeated/missing counters are never repaired or renumbered here.
import { parseStanzaNumber, stanzaNumberValue } from "./stanza-numbers.ts";

export interface BastaSourceFragment {
  page: number;
  urdu: string;
  roman?: string;
}
export interface BastaStanza {
  id: string;
  number: number;
  printedNumber: string;
  urdu: string;
  roman?: string;
  pages: number[];
}
export interface BastaResolvedStanza extends BastaStanza {
  sourceKalamId: string;
  sourceKalamName: string;
}

/** Reject invalid/zero counters instead of inventing numbered stanza IDs. */
export function normalizePrintedStanzaNumber(value: string): number | null {
  const number = stanzaNumberValue(value);
  return number !== null && Number.isSafeInteger(number) && number > 0 ? number : null;
}

type NumberedLine = { line: string; page: number };
function uniquePages(lines: NumberedLine[]): number[] {
  return [...new Set(lines.map((item) => item.page))];
}
function collectLines(fragments: BastaSourceFragment[], kind: "urdu" | "roman"): NumberedLine[] {
  return fragments.flatMap((fragment) => {
    const text = fragment[kind];
    if (!text) return [];
    return text.split("\n").map((line) => ({ line, page: fragment.page }));
  });
}
/** Preserve printed source pages in each numbered stanza's identity metadata. */
export function extractBastaStanzas(fragments: BastaSourceFragment[]): {
  preface: string; stanzas: BastaStanza[]; issues: string[];
} {
  const lines = collectLines(fragments, "urdu");
  const romanAvailable = fragments.every((part) => Boolean(part.roman));
  const romanLines = romanAvailable ? collectLines(fragments, "roman") : [];
  const starts = lines.flatMap((line, index) => {
    const number = normalizePrintedStanzaNumber(line.line);
    return number === null ? [] : [{ index, number, printed: parseStanzaNumber(line.line)! }];
  });
  const romanStarts = romanLines.flatMap((line, index) => {
    const number = normalizePrintedStanzaNumber(line.line);
    return number === null ? [] : [{ index, number }];
  });
  const romanAligned = romanAvailable && starts.length === romanStarts.length &&
    starts.every((item, index) => item.number === romanStarts[index].number);
  const issues: string[] = [];
  const numbers = new Set<number>();
  for (const item of starts) {
    if (numbers.has(item.number)) issues.push("Repeated stanza number " + item.number);
    numbers.add(item.number);
  }
  if (romanAvailable && starts.length && !romanAligned)
    issues.push("Urdu and Roman stanza numbering differs");
  const preface = lines.slice(0, starts[0]?.index ?? lines.length)
    .map((line) => line.line).join("\n").trim();
  const stanzas: BastaStanza[] = starts.map((item, index) => {
    const group = lines.slice(item.index + 1, starts[index + 1]?.index);
    const romanGroup = romanAligned
      ? romanLines.slice(romanStarts[index].index + 1, romanStarts[index + 1]?.index)
      : [];
    return {
      id: "stanza-" + String(item.number).padStart(3, "0"),
      number: item.number,
      printedNumber: item.printed,
      urdu: group.map((line) => line.line).join("\n").trim(),
      ...(romanAligned ? { roman: romanGroup.map((line) => line.line).join("\n").trim() } : {}),
      pages: uniquePages([lines[item.index], ...group]),
    };
  });
  if (stanzas.some((stanza) => !stanza.urdu))
    issues.push("Empty numbered stanza");
  return { preface, stanzas, issues };
}
