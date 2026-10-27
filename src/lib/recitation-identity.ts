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
