// Source references, not copied poetry. Shared by draft storage and reader.
export interface StanzaRef { kalamId: string; stanzaId: string }
export interface RecitationItem {
  uid: string;
  kind: "lyric" | "basta";
  id: string;
  /** Fallback label if the original source is later retired. */
  sourceTitle?: string;
  reciter?: string;
  note?: string;
  /** Absent means the unmodified canonical poem. Empty arrays are rejected. */
  stanzaSequence?: StanzaRef[];
}
export interface RecitationSet {
  version: 1;
  title: string;
  occasion: string;
  description: string;
  items: RecitationItem[];
}
export interface RecitationDraft {
  id: string;
  set: RecitationSet;
  remoteId?: string;
  editToken?: string;
  publishedSnapshot?: string;
}

const ID = /^[\p{L}\p{N}_/-]{1,160}$/u;
const UID = /^[a-f0-9-]{8,80}$/i;
function plain(value: unknown, limit: number): value is string {
  return typeof value === "string" && value.length <= limit && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value);
}
export function validateRecitationSet(raw: unknown): RecitationSet {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw Error("Invalid recitation set");
  const doc = raw as Record<string, unknown>;
  if (doc.version !== 1 || !plain(doc.title, 120) || !doc.title.trim() ||
      !plain(doc.occasion, 120) || !plain(doc.description, 1000) ||
      !Array.isArray(doc.items) || doc.items.length < 1 || doc.items.length > 40)
    throw Error("Provide a title and between 1 and 40 kalams");
  const seen = new Set<string>();
  const items: RecitationItem[] = doc.items.map((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw Error("Invalid kalam entry");
    const item = value as Record<string, unknown>;
    if (!plain(item.uid, 80) || !UID.test(item.uid) || seen.has(item.uid) ||
        (item.kind !== "lyric" && item.kind !== "basta") ||
        !plain(item.id, 160) || !ID.test(item.id) ||
        (item.sourceTitle !== undefined && !plain(item.sourceTitle, 180)) ||
        (item.reciter !== undefined && !plain(item.reciter, 100)) ||
        (item.note !== undefined && !plain(item.note, 400)))
      throw Error("Invalid kalam reference or notes");
    seen.add(item.uid);
    if (item.stanzaSequence !== undefined) {
      if (item.kind !== "basta" || !item.id.startsWith("basta-marsiye-") ||
          !Array.isArray(item.stanzaSequence) ||
          !item.stanzaSequence.length || item.stanzaSequence.length > 120)
        throw Error("Custom stanzas are only supported for Marsiyas");
    }
    const sequence: StanzaRef[] | undefined = Array.isArray(item.stanzaSequence)
      ? item.stanzaSequence.map((ref: unknown) => {
      if (!ref || typeof ref !== "object" || Array.isArray(ref)) throw Error("Invalid stanza");
      const s = ref as Record<string, unknown>;
      if (!plain(s.kalamId, 160) || !/^basta-marsiye-[0-9]+$/.test(s.kalamId) ||
          !plain(s.stanzaId, 30) || !/^stanza-[0-9]+$/.test(s.stanzaId))
        throw Error("Invalid stanza reference");
      return { kalamId: s.kalamId, stanzaId: s.stanzaId };
    }) : undefined;
    return {
      uid: item.uid, kind: item.kind, id: item.id,
      ...(item.sourceTitle ? { sourceTitle: item.sourceTitle } : {}),
      ...(item.reciter ? { reciter: item.reciter } : {}),
      ...(item.note ? { note: item.note } : {}),
      ...(sequence ? { stanzaSequence: sequence } : {}),
    };
  });
  return {
    version: 1, title: doc.title.trim(), occasion: doc.occasion.trim(),
    description: doc.description.trim(), items,
  };
}
export function emptyRecitationSet(): RecitationSet {
  return { version: 1, title: "", occasion: "", description: "", items: [] };
}
export function newDraft(): RecitationDraft {
  return { id: crypto.randomUUID(), set: emptyRecitationSet() };
}
