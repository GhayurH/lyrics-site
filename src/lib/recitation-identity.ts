// Source identity is independent of its filename or printed stanza number.
// Once published, a lock entry keeps an ID attached to the same opening verses.
export interface LockedStanza { id: string; anchor: string; retired?: boolean }
export interface LockedBasta { id: string; key: string; stanzas: LockedStanza[]; retired?: boolean }
export interface LockedLyric { id: string; path: string; retired?: boolean }
export interface IdentityLock {
  version: 1;
  lyrics: LockedLyric[];
  basta: LockedBasta[];
}

/** Minor punctuation, vowel marks and whitespace changes do not rename a stanza. */
export function stanzaAnchor(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").map((line) =>
    line.normalize("NFKC").replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/gu, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ").trim().toLowerCase(),
  ).filter(Boolean);
  const content = lines.slice(0, 2).join("\n");
  if (!content) throw Error("Stanza has no source verses");
  let hash = 0xcbf29ce484222325n;
  for (const codepoint of content) {
    hash ^= BigInt(codepoint.codePointAt(0)!);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(36);
}

export function lockedStanzaId(
  lock: LockedBasta | undefined, text: string,
): string | undefined {
  const anchor = stanzaAnchor(text);
  return lock?.stanzas.find((item) => !item.retired && item.anchor === anchor)?.id;
}

export function applyRecitationIds<
  T extends { id: string; status: "ready" | "review"; stanzas: Array<{ id: string; urdu: string }> }
>(kalams: T[], lock: IdentityLock): T[] {
  const entries = new Map(lock.basta.map((item) => [item.id, item]));
  return kalams.map((kalam) => {
    const record = entries.get(kalam.id);
    if (!record || kalam.status !== "ready") return kalam;
    return { ...kalam, stanzas: kalam.stanzas.map((stanza) => ({
      ...stanza,
      // Missing anchors never inherit the printed number of a different verse.
      id: lockedStanzaId(record, stanza.urdu) ?? "unverified-" + stanzaAnchor(stanza.urdu),
    })) };
  });
}

/**
 * Suggest exactly one in-place anchor refresh when every other stanza still
 * matches in order. Invoke only from an explicit sync; never during a build.
 * Insertions, removals, reordering, multiple edits, and retired IDs need review.
 */
export function safeStanzaAnchorRefresh(
  locked: LockedBasta,
  current: Array<{ anchor: string; pages?: number[] }>,
): { id: string; previousAnchor: string; anchor: string; pages: number[] } | null {
  if (locked.retired || locked.stanzas.some((stanza) => stanza.retired)) return null;
  if (locked.stanzas.length !== current.length || current.length < 2) return null;
  const prior = locked.stanzas;
  if (new Set(prior.map((stanza) => stanza.anchor)).size !== prior.length ||
      new Set(current.map((stanza) => stanza.anchor)).size !== current.length) return null;
  const priorAnchors = new Set(prior.map((stanza) => stanza.anchor));
  const currentAnchors = new Set(current.map((stanza) => stanza.anchor));
  const missing = prior.filter((stanza) => !currentAnchors.has(stanza.anchor));
  const added = current.filter((stanza) => !priorAnchors.has(stanza.anchor));
  if (missing.length !== 1 || added.length !== 1) return null;
  const oldIndex = prior.indexOf(missing[0]);
  const newIndex = current.indexOf(added[0]);
  if (oldIndex !== newIndex ||
      prior.some((stanza, index) => index !== oldIndex && stanza.anchor !== current[index].anchor))
    return null;
  return {
    id: missing[0].id,
    previousAnchor: missing[0].anchor,
    anchor: added[0].anchor,
    pages: added[0].pages ?? [],
  };
}

/** The source's actual stanza pages are more useful than its stable ID. */
export function stanzaPageLabel(pages: number[], fallback?: number): string {
  const numbered = [...new Set(pages)].filter((page) => Number.isSafeInteger(page) && page > 0)
    .sort((a, b) => a - b);
  if (!numbered.length && fallback) numbered.push(fallback);
  if (!numbered.length) return "page unknown";
  return (numbered.length === 1 ? "page " : "pages ") + numbered.join(", ");
}
