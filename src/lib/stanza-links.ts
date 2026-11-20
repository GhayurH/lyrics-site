// Share targets describe displayed source blocks; they never infer or edit poetry.
import { layoutLyricStanzas, type LyricDisplayLine } from "./lyric-stanzas.ts";
import { stanzaAnchor } from "./recitation-identity.ts";
import { stanzaNumberValue } from "./stanza-numbers.ts";
import type { StanzaPattern } from "./stanza-pattern.ts";

export interface StanzaLink { id: string; key: string; label: string }

function number(stanza: LyricDisplayLine[]): number | null {
  const counter = stanza.find((line) => line.number);
  return counter ? stanzaNumberValue(counter.text) : null;
}

export function lyricStanzaLinks(original: string, roman = "", pattern?: StanzaPattern): {
  original: StanzaLink[]; roman: StanzaLink[]; paired: boolean;
} {
  const source = layoutLyricStanzas(original, pattern);
  const alternate = layoutLyricStanzas(roman, pattern);
  const paired = source.length > 0 && source.length === alternate.length && source.every((stanza, i) =>
    number(stanza) === number(alternate[i]) &&
    stanza.filter((line) => !line.number).length === alternate[i].filter((line) => !line.number).length);
  const links = (stanzas: LyricDisplayLine[], index: number, seen: Map<string, number>, edition = ""): StanzaLink => {
    const text = stanzas.filter((line) => !line.number).map((line) => line.text).join("\n");
    // The opening-verse fingerprint survives renumbering and punctuation edits.
    // Duplicate openings receive deterministic occurrence suffixes, never duplicate DOM IDs.
    const fingerprint = text.trim() ? stanzaAnchor(text) : `number-${index + 1}`;
    const occurrence = (seen.get(fingerprint) ?? 0) + 1;
    seen.set(fingerprint, occurrence);
    const key = `stanza-${fingerprint}${occurrence > 1 ? `-${occurrence}` : ""}${edition}`;
    const printed = number(stanzas);
    return { id: key, key, label: printed !== null ? `Stanza ${printed}` : index === 0 ? "Opening" : `Passage ${index + 1}` };
  };
  const sourceSeen = new Map<string, number>();
  const romanSeen = new Map<string, number>();
  const originalLinks = source.map((stanza, i) => links(stanza, i, sourceSeen));
  return {
    original: originalLinks,
    roman: paired ? originalLinks.map((link) => ({ ...link, id: link.id + "-roman" }))
      : alternate.map((stanza, i) => links(stanza, i, romanSeen, "-roman")),
    paired,
  };
}
