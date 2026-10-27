import { binding, digest, error, json, readRequest, validId } from "../../_lib/recitation.js";

export async function onRequestGet({ params, env }) {
  if (!validId(params.id)) return error("Set not found", 404);
  const db = binding(env);
  if (!db) return error("Sharing is not configured on this deployment", 503);
  try {
    const entry = await db.prepare(
      "SELECT document,updated_at FROM recitation_sets WHERE id = ?"
    ).bind(params.id).first();
    if (!entry) return error("Set not found", 404);
    return json({ id: params.id, set: JSON.parse(entry.document), updatedAt: entry.updated_at });
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
  try {
    const hash = await digest(auth.slice(7));
    // Capability-based update: the hashed token never leaves D1.
    const result = await db.prepare(
      "UPDATE recitation_sets SET document=?, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND edit_token_hash=?"
    ).bind(JSON.stringify(document), params.id, hash).run();
    if (result.meta.changes !== 1) return error("Edit link invalid or set not found", 403);
    return json({ id: params.id, updated: true });
  } catch (e) {
    console.error("Failed to update recitation set", e);
    return error("Unable to update shared set", 500);
  }
}
