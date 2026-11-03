import { validateDocument } from "./recitation-document.js";
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
export interface LiveRecitationPosition {
  active: boolean;
  /** The permanent programme-entry UID, not the source kalam ID. */
  currentUid: string;
}
export interface RecitationSet {
  version: 1;
  title: string;
  occasion: string;
  description: string;
  /** Explicitly preserves published production programmes from automatic expiry. */
  permanent?: boolean;
  /** Organizer-controlled position; readers follow only when they opt in. */
  live?: LiveRecitationPosition;
  items: RecitationItem[];
}
export interface RecitationDraft {
  id: string;
  set: RecitationSet;
  remoteId?: string;
  editToken?: string;
  publishedSnapshot?: string;
  /** Server document hash for compare-and-swap updates across organizer tabs. */
  remoteRevision?: string;
  expiresAt?: string | null;
}

/** Validate untrusted browser or network input with the *same* rules as Pages Functions.
 * The JS implementation is the runtime source of truth; this adapter supplies
 * the TypeScript domain shape to the Astro client and editor.
 */
export function validateRecitationSet(raw: unknown): RecitationSet {
  return validateDocument(raw) as RecitationSet;
}

export function emptyRecitationSet(): RecitationSet {
  return { version: 1, title: "", occasion: "", description: "", items: [] };
}
export function newDraft(): RecitationDraft {
  return { id: crypto.randomUUID(), set: emptyRecitationSet() };
}
