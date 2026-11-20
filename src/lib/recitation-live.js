import { validateDocument } from "./recitation-document.js";

/** A live pointer must not invalidate the programme the participant is reading.
 * Canonical validation makes this hash identical in the browser and API even
 * if an older stored document uses a different property order. */
async function contentRevision(document) {
  const { live: _live, ...content } = document;
  const bytes = new TextEncoder().encode(JSON.stringify(content));
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function recitationContentRevision(value) {
  return contentRevision(validateDocument(value));
}

export async function recitationLiveState(value) {
  const document = validateDocument(value);
  return { live: document.live ?? null, contentRevision: await contentRevision(document) };
}
