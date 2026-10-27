// Canonical, source-preserving identities for Basta poems and numbered stanzas.
// The printed index supplies names; explicit ---***--- breaks supply boundaries.
// Uncertain mappings are reported, never silently combined with another poem.
import { parseStanzaNumber } from "./stanza-numbers.ts";

export interface BastaKalamIndex {
  section?: string;
  sectionRoman?: string;
  number?: number;
  name: string;
  romanName?: string;
  page: number;
}
export interface BastaSourcePage {
  page: number;
  urdu: string;
  roman?: string;
}
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
export interface BastaKalam {
  id: string;
  name: string;
  romanName?: string;
  section: string;
  sectionRoman: string;
  indexNumber: number;
  startPage: number;
  pages: number[];
  status: "ready" | "review";
  issues: string[];
  urdu: string;
  roman?: string;
  preface: string;
  stanzas: BastaStanza[];
  /** True only when the source explicitly contains isolated stanza numerals. */
  numbered: boolean;
}
export interface BastaKalamAudit {
  kalams: BastaKalam[];
  orphans: Array<{ page: number; part: number; opening: string }>;
  issues: string[];
}

export function bastaKalamId(entry: BastaKalamIndex): string {
  const section = (entry.sectionRoman || entry.section || "unknown")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!Number.isSafeInteger(entry.number) || !entry.number || entry.number < 1)
    throw new Error("Basta index entry requires a positive number: " + entry.name);
  return "basta-" + section + "-" + String(entry.number).padStart(3, "0");
}

export function splitBastaSource(text: string): string[] {
  return text.replace(/\r\n?/g, "\n").split(/^\s*---\*\*\*---\s*$/gm)
    .map((piece) => piece.trim()).filter(Boolean);
}
export function normalizePrintedStanzaNumber(value: string): number | null {
  const numeral = parseStanzaNumber(value);
  if (!numeral) return null;
  const western = Array.from(numeral).map((digit) => {
    const code = digit.charCodeAt(0);
    if (code >= 0x06F0 && code <= 0x06F9) return String(code - 0x06F0);
    if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
    return digit;
  }).join("");
  const number = Number(western);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

type NumberedLine = { line: string; page: number };
function stripHeading(value: string): string {
  return value.normalize("NFKC").replace(/[\u064B-\u065F\u0670\u06D6-\u06EDؐؑ]/gu, "")
    .replace(/[أإآ]/gu, "ا").replace(/[يى]/gu, "ی").replace(/ك/gu, "ک")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim().toLowerCase();
}
function likelyTitle(segment: string, name: string): boolean {
  const words = stripHeading(name).split(" ").filter((word) => word.length >= 3).slice(0, 8);
  if (words.length < 2) return false;
  return segment.split("\n").slice(0, 12).some((line) => {
    const normalized = stripHeading(line);
    return words.filter((word) => normalized.includes(word)).length / words.length >= 0.75;
  });
}
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
function extractStanzas(fragments: BastaSourceFragment[]): {
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

/**
 * Split pages against the book index, retaining a review state when an entry
 * cannot be mapped unambiguously. Source Markdown is never rewritten.
 * A multi-page poem is composed from its ordered page fragments.
 */
export function buildBastaKalamCatalog(index: BastaKalamIndex[], pages: BastaSourcePage[]): BastaKalamAudit {
  const poetry = index.filter((entry) => entry.sectionRoman !== "Mazameen");
  const ids = new Set<string>();
  const work = poetry.map((entry) => {
    const id = bastaKalamId(entry);
    if (ids.has(id)) throw new Error("Duplicate Basta identity: " + id);
    ids.add(id);
    return { entry, id, parts: [] as BastaSourceFragment[], issues: [] as string[] };
  });
  type Working = (typeof work)[number];
  const byPage = new Map<number, Working[]>();
  for (const item of work) {
    const list = byPage.get(item.entry.page) || [];
    list.push(item);
    byPage.set(item.entry.page, list);
  }
  const orphans: BastaKalamAudit["orphans"] = [];
  const issues: string[] = [];
  let previous: Working | undefined;
  for (const page of [...pages].sort((a, b) => a.page - b.page)) {
    const starts = byPage.get(page.page) || [];
    const urduPieces = splitBastaSource(page.urdu);
    if (!urduPieces.length) continue;
    const romanPieces = page.roman ? splitBastaSource(page.roman) : [];
    const romanMatches = romanPieces.length === urduPieces.length;
    const fragment = (part: number): BastaSourceFragment => ({
      page: page.page, urdu: urduPieces[part],
      ...(romanMatches ? { roman: romanPieces[part] } : {}),
    });
    // Page 141 is an editorial instruction page, not a continuation of the
    // Salam on 140. These two pages must never be combined.
    if (page.page === 141 && !starts.length) { previous = undefined; continue; }

    let positions: number[] = [];
    let continuation = -1;
    if (page.page === 140) {
      // Four indexed poems + an opening continuation + an unindexed excerpt.
      // Verified against the six explicit source fragments on this page.
      positions = [1, 2, 4, 5];
      continuation = 0;
    } else if (starts.length === urduPieces.length) {
      positions = starts.map((_, index) => index);
    } else if (previous && starts.length + 1 === urduPieces.length) {
      // An extra part can be either an opening continuation or an ending
      // unindexed excerpt. Never shift the indexed poem automatically.
      const firstMatches = starts.length > 0 &&
        likelyTitle(urduPieces[0], starts[0].entry.name);
      const trailingMatches = starts.length > 0 &&
        starts.every((item, index) => likelyTitle(urduPieces[index + 1], item.entry.name));
      const initialNumber = normalizePrintedStanzaNumber(
        urduPieces[0].trim().split("\n")[0],
      );
      if (firstMatches && !trailingMatches) {
        positions = starts.map((_, index) => index);
      } else if (trailingMatches || (initialNumber !== null && initialNumber > 1)) {
        positions = starts.map((_, index) => index + 1);
        continuation = 0;
      } else {
        // Neither boundary is established by an index title or a continued
        // stanza number. Mark for source-image verification.
        positions = starts.map(() => -1);
        previous.issues.push("Ambiguous fragment boundary on page " + page.page);
      }
    } else if (!starts.length && previous && urduPieces.length === 1) {
      continuation = 0;
    } else if (starts.length) {
      // Extra unindexed fragments: match by a distinctive opening line, not
      // by positional guesswork. Ambiguous names remain unresolved.
      const used = new Set<number>();
      positions = starts.map(({ entry }) => {
        const choices = urduPieces.map((text, index) => ({ text, index }))
          .filter(({ text, index }) => !used.has(index) && likelyTitle(text, entry.name));
        if (choices.length !== 1) return -1;
        used.add(choices[0].index);
        return choices[0].index;
      });
      if (previous && !used.has(0) && positions.every((i) => i !== 0)) continuation = 0;
    }
    if (continuation !== -1 && previous) previous.parts.push(fragment(continuation));
    const assigned = new Set<number>();
    if (continuation !== -1 && previous) assigned.add(continuation);
    starts.forEach((item, index) => {
      const position = positions[index] ?? -1;
      if (position < 0 || position >= urduPieces.length || assigned.has(position)) {
        item.issues.push("Unresolved start on page " + page.page);
        return;
      }
      // A segment starting at number >1 belongs to a preceding poem unless
      // its index title occurs in that segment. This needs human review.
      const firstLine = urduPieces[position].trim().split("\n").find((line) => line.trim()) || "";
      const initialNumber = normalizePrintedStanzaNumber(firstLine);
      if (initialNumber !== null && initialNumber > 1 &&
          !likelyTitle(urduPieces[position], item.entry.name)) {
        item.issues.push("Suspicious continuation at page " + page.page);
        if (previous && previous !== item)
          previous.issues.push("Possible unassigned continuation at page " + page.page);
      }
      item.parts.push(fragment(position));
      assigned.add(position);
      previous = item;
    });
    for (let i = 0; i < urduPieces.length; i++) {
      if (!assigned.has(i)) {
        orphans.push({ page: page.page, part: i + 1,
          opening: urduPieces[i].split("\n").find((line) => Boolean(line.trim())) || "" });
      }
    }
    const lastAssigned = Math.max(-1, ...assigned);
    if (previous && urduPieces.some((_, index) => index > lastAssigned && !assigned.has(index))) {
      // A printed separator safely ends the indexed poem; the extra poem
      // is separately reported as an orphan, not appended to its neighbour.
      previous = undefined;
    }
    if (previous && !starts.length && continuation === -1) {
      previous.issues.push("Unmapped continuation on page " + page.page);
      previous = undefined;
    }
    if (!romanMatches && page.roman && (starts.length || continuation !== -1))
      issues.push("Roman source fragment count differs on page " + page.page);
  }
  const kalams = work.map((item): BastaKalam => {
    const extracted = extractStanzas(item.parts);
    const pages = [...new Set(item.parts.map((part) => part.page))];
    const problems = [...item.issues, ...extracted.issues];
    if (!item.parts.length) problems.push("No source fragments assigned");
    const allRoman = item.parts.length > 0 && item.parts.every((part) => Boolean(part.roman));
    return {
      id: item.id, name: item.entry.name, romanName: item.entry.romanName || undefined,
      section: item.entry.section || "", sectionRoman: item.entry.sectionRoman || "",
      indexNumber: item.entry.number!, startPage: item.entry.page, pages,
      status: problems.length ? "review" : "ready", issues: problems,
      urdu: item.parts.map((part) => part.urdu).join("\n").trim(),
      ...(allRoman ? { roman: item.parts.map((part) => part.roman).join("\n").trim() } : {}),
      preface: extracted.preface, stanzas: extracted.stanzas,
      numbered: extracted.stanzas.length > 0,
    };
  });
  return { kalams, orphans, issues };
}

/** Recitation arrangements refer to the original source, never duplicate or edit it. */
export interface RecitationStanzaReference { kalamId: string; stanzaId: string }
export interface RecitationKalamArrangement {
  kalamId: string;
  /** Undefined = full original poem; supplied sequence can mix other poems. */
  stanzaSequence?: RecitationStanzaReference[];
}
export function resolveStanzaSequence(
  arrangement: RecitationKalamArrangement, catalog: BastaKalam[],
): BastaResolvedStanza[] {
  const byId = new Map(catalog.map((poem) => [poem.id, poem]));
  const original = byId.get(arrangement.kalamId);
  if (!original || original.status !== "ready") throw new Error("Kalam not verified");
  if (!arrangement.stanzaSequence) return original.stanzas.map((stanza) => ({ ...stanza,
    sourceKalamId: original.id, sourceKalamName: original.name }));
  if (original.sectionRoman !== "Marsiye") throw new Error("Custom stanza sequences require a Marsiya");
  if (arrangement.stanzaSequence.length > 120) throw new Error("Too many stanzas in arrangement");
  return arrangement.stanzaSequence.map((reference) => {
    const poem = byId.get(reference.kalamId);
    if (!poem || poem.status !== "ready" || poem.sectionRoman !== "Marsiye")
      throw new Error("Only verified Marsiya stanzas may be inserted");
    const stanza = poem.stanzas.find((item) => item.id === reference.stanzaId);
    if (!stanza) throw new Error("Unknown stanza: " + reference.stanzaId);
    return { ...stanza, sourceKalamId: poem.id, sourceKalamName: poem.name };
  });
}
