// Shared publishing operations; no DOM state or editor navigation.
import { validateRecitationSet, type RecitationDraft, type RecitationSet } from "../lib/recitation-set";

export async function publishSharedRecitation(draft: RecitationDraft, clean: RecitationSet): Promise<boolean> {
  const update = Boolean(draft.remoteId && draft.editToken);
  const url = update ? "/api/recitation-sets/" + draft.remoteId : "/api/recitation-sets/";
  if (update && !draft.remoteRevision) {
    // Existing drafts without revision metadata may only update unchanged publications.
    const current = await fetch(url, { cache: "no-store" });
    if (!current.ok) throw Error("Cannot verify the published copy. Reload its edit link.");
    const existing = await current.json();
    if (JSON.stringify(validateRecitationSet(existing.set)) !== draft.publishedSnapshot)
      throw Error("The published programme changed elsewhere. Duplicate your draft before reloading.");
    draft.remoteRevision = existing.revision;
  }
  const response = await fetch(url, {
    method: update ? "PUT" : "POST",
    headers: { "Content-Type": "application/json",
      ...(update ? { Authorization: "Bearer " + draft.editToken,
        "If-Match": `"${draft.remoteRevision}"` } : {}) },
    body: JSON.stringify(clean),
  });
  const result = await response.json();
  if (!response.ok) throw Error(result.error || "Publishing failed");
  // Preview deployments enforce temporary retention even when requested permanent.
  if (!result.permanent) delete clean.permanent;
  draft.set = clean;
  draft.remoteRevision = result.revision;
  draft.expiresAt = result.expiresAt ?? null;
  if (!update) {
    draft.remoteId = result.id;
    draft.editToken = result.editToken;
  }
  draft.publishedSnapshot = JSON.stringify(clean);
  return update;
}

export async function updateSharedLivePosition(draft: RecitationDraft, uid: string, active: boolean): Promise<void> {
  if (!draft.remoteId || !draft.editToken || !draft.remoteRevision)
    throw Error("Reload the shared programme before navigating live.");
  const response = await fetch("/api/recitation-sets/" + draft.remoteId, {
    method: "PATCH",
    headers: { Authorization: "Bearer " + draft.editToken,
      "Content-Type": "application/json", "If-Match": '"' + draft.remoteRevision + '"' },
    body: JSON.stringify({ active, currentUid: uid }),
  });
  const payload = await response.json();
  if (!response.ok) throw Error(payload.error || "Unable to change the live position");
  draft.set.live = payload.live;
  draft.remoteRevision = payload.revision;
  draft.expiresAt = payload.expiresAt ?? null;
  draft.publishedSnapshot = JSON.stringify(draft.set);
}

export async function deleteSharedRecitation(draft: RecitationDraft): Promise<void> {
  if (!draft.remoteId || !draft.editToken)
    throw Error("Only someone with the organizer edit link can delete a published set.");
  const response = await fetch("/api/recitation-sets/" + draft.remoteId, {
    method: "DELETE", headers: { Authorization: "Bearer " + draft.editToken },
  });
  const result = await response.json();
  if (!response.ok) throw Error(result.error || "Unable to delete published set");
}
