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
  current: Array<{ id: string; anchor: string; pages?: number[] }>,
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
      // A source-number change alongside an edit is ambiguous: review it.
      current[newIndex].id !== missing[0].id ||
      prior.some((stanza, index) => index !== oldIndex && stanza.anchor !== current[index].anchor))
    return null;
  return {
    id: missing[0].id,
    previousAnchor: missing[0].anchor,
    anchor: added[0].anchor,
    pages: added[0].pages ?? [],
  };
}


/**
 * Opt-in review for multiple source corrections and deliberate stanza removals.
 * Matches permanent IDs and the order of every surviving stanza exactly;
 * it never infers an ID from a new anchor or silently renumbers verses.
 * This function only plans changes; callers must validate and commit them.
 */
export function planReviewedStanzaChanges(
  locked: LockedBasta,
  current: Array<{ id: string; anchor: string; pages?: number[] }>,
  approvedEdits: ReadonlySet<string>,
  approvedRetirements: ReadonlySet<string>,
): {
  updates: Array<{ id: string; previousAnchor: string; anchor: string; pages: number[] }>;
  retiredIds: string[];
} {
  const reject = (reason: string): never => { throw new Error(locked.id + ": " + reason); };
  if (locked.retired) reject("Cannot modify a retired kalam");
  if (!approvedEdits.size && !approvedRetirements.size)
    reject("No stanza changes explicitly approved");

  const byId = new Map<string, LockedStanza>();
  const anchorOwner = new Map<string, string>();
  for (const stanza of locked.stanzas) {
    if (byId.has(stanza.id)) reject("Duplicate locked stanza ID " + stanza.id);
    if (anchorOwner.has(stanza.anchor)) reject("Duplicate locked anchor " + stanza.anchor);
    byId.set(stanza.id, stanza);
    anchorOwner.set(stanza.anchor, stanza.id);
  }

  for (const id of approvedEdits) {
    const stanza = byId.get(id);
    if (!stanza || stanza.retired || approvedRetirements.has(id))
      reject("Invalid or retired edit approval " + id);
  }
  for (const id of approvedRetirements) {
    const stanza = byId.get(id);
    if (!stanza || stanza.retired || approvedEdits.has(id))
      reject("Invalid or already retired retirement approval " + id);
  }

  const expected = locked.stanzas.filter((stanza) =>
    !stanza.retired && !approvedRetirements.has(stanza.id));
  if (expected.length !== current.length ||
      expected.some((stanza, index) => stanza.id !== current[index].id))
    reject("Surviving stanza IDs, count or order changed; review mapping manually");

  const seenIds = new Set<string>();
  const seenAnchors = new Set<string>();
  const updates: Array<{
    id: string; previousAnchor: string; anchor: string; pages: number[];
  }> = [];
  for (const stanza of current) {
    if (seenIds.has(stanza.id) || seenAnchors.has(stanza.anchor))
      reject("Duplicate current stanza ID or anchor " + stanza.id);
    seenIds.add(stanza.id);
    seenAnchors.add(stanza.anchor);
    const previous = byId.get(stanza.id)!;
    const owner = anchorOwner.get(stanza.anchor);
    if (owner && owner !== stanza.id)
      reject("Anchor for " + stanza.id + " belongs to historical " + owner);
    if (stanza.anchor === previous.anchor) {
      if (approvedEdits.has(stanza.id))
        reject("Unchanged stanza was approved: " + stanza.id);
    } else {
      if (!approvedEdits.has(stanza.id))
        reject("Unapproved stanza edit: " + stanza.id);
      updates.push({
        id: stanza.id, previousAnchor: previous.anchor,
        anchor: stanza.anchor, pages: stanza.pages ?? [],
      });
    }
  }

  return { updates, retiredIds: [...approvedRetirements] };
}

/** The source's actual stanza pages are more useful than its stable ID. */
export function stanzaPageLabel(pages: number[], fallback?: number): string {
  const numbered = [...new Set(pages)].filter((page) => Number.isSafeInteger(page) && page > 0)
    .sort((a, b) => a - b);
  if (!numbered.length && fallback) numbered.push(fallback);
  if (!numbered.length) return "page unknown";
  return (numbered.length === 1 ? "page " : "pages ") + numbered.join(", ");
}
