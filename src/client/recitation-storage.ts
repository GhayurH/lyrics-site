// Browser-owned drafts; shareable copies are explicitly published to D1.
import { newDraft, type RecitationDraft, type RecitationSet } from "../lib/recitation-set";
const KEY = "kalam:recitation-drafts-v1";
function looksLikeDraft(value: unknown): value is RecitationDraft {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<RecitationDraft>;
  return typeof item.id === "string" && !!item.set &&
    item.set.version === 1 && Array.isArray(item.set.items);
}
export function readDrafts(): RecitationDraft[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? raw.filter(looksLikeDraft).slice(0, 30) : [];
  } catch { return []; }
}
export function saveDraft(draft: RecitationDraft): void {
  const drafts = readDrafts().filter((item) => item.id !== draft.id);
  drafts.unshift(draft);
  try { localStorage.setItem(KEY, JSON.stringify(drafts.slice(0, 30))); }
  catch { throw Error("Could not save this draft locally. Check browser storage."); }
}
export function removeDraft(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(readDrafts().filter((item) => item.id !== id)));
}
export function duplicateDraft(source: RecitationDraft): RecitationDraft {
  const set = structuredClone(source.set);
  delete set.live;
  return { ...newDraft(), set };
}
export function findRemoteDraft(remoteId: string): RecitationDraft | undefined {
  return readDrafts().find((draft) => draft.remoteId === remoteId);
}
export function createLocalDraft(): RecitationDraft {
  const draft = newDraft(); saveDraft(draft); return draft;
}
export function draftUrl(id: string): string { return "/recite/?draft=" + encodeURIComponent(id); }
export function readerUrl(draft: RecitationDraft): string {
  return draft.remoteId && draft.publishedSnapshot === JSON.stringify(draft.set)
    ? "/recite/read/?set=" + encodeURIComponent(draft.remoteId)
    : "/recite/read/?draft=" + encodeURIComponent(draft.id);
}
export function publicUrl(remoteId: string): string {
  return location.origin + "/r/" + encodeURIComponent(remoteId);
}
export function editorUrl(draft: RecitationDraft): string {
  if (!draft.remoteId || !draft.editToken) throw Error("No edit link available");
  return location.origin + "/recite/?set=" + encodeURIComponent(draft.remoteId) +
    "#edit=" + encodeURIComponent(draft.editToken);
}
export function draftFromRemote(id: string, set: RecitationSet, editToken?: string): RecitationDraft {
  return { ...newDraft(), set, remoteId: id, ...(editToken ? { editToken } : {}),
    publishedSnapshot: JSON.stringify(set) };
}
