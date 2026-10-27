import { binding, digest, error, json, readRequest, validId, validateDocument } from "../../_lib/recitation.js";
import { expirationDate, isExpired, previewMode, retentionInfo } from "../../_lib/recitation-retention.js";

export async function onRequestGet({ params, env }) {
  if (!validId(params.id)) return error("Set not found", 404);
  const db = binding(env);
  if (!db) return error("Sharing is not configured on this deployment", 503);
  try {
    const entry = await db.prepare(
      "SELECT document,updated_at,permanent,expires_at FROM recitation_sets WHERE id = ?"
    ).bind(params.id).first();
    if (!entry) return error("Set not found", 404);
    const preview = previewMode(env);
    if (isExpired(entry, new Date().toISOString(), preview))
      return error("This programme has expired", 410);
    return json({ id: params.id, set: JSON.parse(entry.document),
      updatedAt: entry.updated_at, ...retentionInfo(entry, preview) });
  } catch (e) {
    console.error("Failed to load recitation set", e);
    return error("Unable to load the shared set", 500);
  }
}

export async function onRequestPut({ request, params, env }) {
  if (!validId(params.id)) return error("Set not found", 404);
  const db = binding(env);
  if (!db) return error("Sharing is not configured on this deployment", 503);
  const auth = request.headers.get("authorization") || "";
  if (!/^Bearer [a-f0-9]{64}$/.test(auth)) return error("Valid private edit link required", 403);
  let document;
  try { document = await readRequest(request); }
  catch { return error("Invalid recitation set or request too large", 400); }
  const preview = previewMode(env);
  if (preview) delete document.permanent;
  const permanent = !preview && document.permanent === true;
  const now = new Date();
  const expiresAt = permanent ? null : expirationDate(now, preview);
  try {
    const hash = await digest(auth.slice(7));
    const entry = await db.prepare(
      "SELECT updated_at,permanent,expires_at FROM recitation_sets WHERE id=? AND edit_token_hash=?"
    ).bind(params.id, hash).first();
    if (!entry) return error("Edit link invalid or set not found", 403);
    if (isExpired(entry, now.toISOString(), preview)) return error("This programme has expired", 410);
    // Compare the current expiry again inside UPDATE so a concurrent cleanup
    // cannot revive a programme after its expiry.
    const cutoff = new Date(now.getTime() - 30 * 86400000).toISOString();
    const result = await db.prepare(
      `UPDATE recitation_sets
       SET document=?, permanent=?, expires_at=?,
           updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE id=? AND edit_token_hash=?
         AND (permanent=1 OR expires_at>?)
         AND (?=0 OR updated_at>?)`
    ).bind(JSON.stringify(document), permanent ? 1 : 0, expiresAt,
      params.id, hash, now.toISOString(), preview ? 1 : 0, cutoff).run();
    if (result.meta.changes !== 1) return error("Programme expired or was removed", 410);
    return json({ id: params.id, updated: true, permanent, expiresAt });
  } catch (e) {
    console.error("Failed to update recitation set", e);
    return error("Unable to update shared set", 500);
  }
}


/** The private capability can move a live pointer without rewriting programme
 * items. The document compare guards concurrent edits against lost updates. */
export async function onRequestPatch({ request, params, env }) {
  if (!validId(params.id)) return error("Set not found", 404);
  const db = binding(env);
  if (!db) return error("Sharing is not configured on this deployment", 503);
  const auth = request.headers.get("authorization") || "";
  if (!/^Bearer [a-f0-9]{64}$/.test(auth)) return error("Valid private edit link required", 403);
  let live;
  try {
    if (Number(request.headers.get("content-length") || 0) > 1024)
      return error("Live update too large", 400);
    const raw = await request.text();
    if (raw.length > 1024) return error("Live update too large", 400);
    live = JSON.parse(raw);
    if (!live || typeof live !== "object" || Array.isArray(live) ||
        typeof live.active !== "boolean" || typeof live.currentUid !== "string" ||
        !/^[a-f0-9-]{8,80}$/i.test(live.currentUid))
      return error("Invalid live position", 400);
  } catch { return error("Invalid live position", 400); }
  const preview = previewMode(env);
  const now = new Date();
  try {
    const hash = await digest(auth.slice(7));
    const entry = await db.prepare(
      "SELECT document,updated_at,permanent,expires_at FROM recitation_sets WHERE id=? AND edit_token_hash=?"
    ).bind(params.id, hash).first();
    if (!entry) return error("Edit link invalid or set not found", 403);
    if (isExpired(entry, now.toISOString(), preview)) return error("This programme has expired", 410);
    const document = validateDocument(JSON.parse(entry.document));
    if (!document.items.some((item) => item.uid === live.currentUid))
      return error("Live position no longer exists in this programme", 400);
    document.live = { active: live.active, currentUid: live.currentUid };
    const permanent = !preview && !!entry.permanent;
    const expiresAt = permanent ? null : expirationDate(now, preview);
    const cutoff = new Date(now.getTime() - 30 * 86400000).toISOString();
    const updated = await db.prepare(
      `UPDATE recitation_sets
       SET document=?, expires_at=?, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE id=? AND edit_token_hash=? AND document=?
         AND (permanent=1 OR expires_at>?)
         AND (?=0 OR updated_at>?)`
    ).bind(JSON.stringify(document), expiresAt, params.id, hash, entry.document,
      now.toISOString(), preview ? 1 : 0, cutoff).run();
    if (updated.meta.changes !== 1)
      return error("Programme changed; reload before navigating live", 409);
    return json({ id: params.id, live: document.live, expiresAt });
  } catch (e) {
    console.error("Failed to update live programme position", e);
    return error("Unable to update live programme", 500);
  }
}

export async function onRequestDelete({ request, params, env }) {
  if (!validId(params.id)) return error("Set not found", 404);
  const db = binding(env);
  if (!db) return error("Sharing is not configured on this deployment", 503);
  const auth = request.headers.get("authorization") || "";
  if (!/^Bearer [a-f0-9]{64}$/.test(auth)) return error("Valid private edit link required", 403);
  try {
    const hash = await digest(auth.slice(7));
    const result = await db.prepare(
      "DELETE FROM recitation_sets WHERE id=? AND edit_token_hash=?"
    ).bind(params.id, hash).run();
    if (result.meta.changes !== 1) return error("Edit link invalid or set not found", 403);
    return json({ id: params.id, deleted: true });
  } catch (e) {
    console.error("Failed to delete recitation set", e);
    return error("Unable to delete published programme", 500);
  }
}
