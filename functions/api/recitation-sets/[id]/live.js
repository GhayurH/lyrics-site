import { binding, digest, error, json, validId } from "../../../_lib/recitation.js";
import { isExpired, previewMode } from "../../../_lib/recitation-retention.js";
import { recitationLiveState } from "../../../../src/lib/recitation-live.js";

/** Public, small live state. Read the stored document to respect both retention
 * and concurrent edits; never cache programme data or organizer capabilities. */
export async function onRequestGet({ request, params, env }) {
  if (!validId(params.id)) return error("Set not found", 404);
  const db = binding(env);
  if (!db) return error("Sharing is not configured on this deployment", 503);
  try {
    const entry = await db.prepare(
      "SELECT document,updated_at,permanent,expires_at FROM recitation_sets WHERE id = ?"
    ).bind(params.id).first();
    if (!entry) return error("Set not found", 404);
    if (isExpired(entry, new Date().toISOString(), previewMode(env)))
      return error("This programme has expired", 410);
    const state = await recitationLiveState(JSON.parse(entry.document));
    const etag = `"${await digest(JSON.stringify(state))}"`;
    const response = json(state);
    response.headers.set("ETag", etag);
    // Conditional requests still use no-store. The participant retains only
    // the last state in memory, rather than a shared HTTP or service-worker cache.
    const matches = request.headers.get("if-none-match")?.split(",").some(value => {
      const candidate = value.trim().replace(/^W\//, "");
      return candidate === "*" || candidate === etag;
    });
    return matches ? new Response(null, { status: 304, headers: response.headers }) : response;
  } catch (e) {
    console.error("Failed to load recitation live state", e);
    return error("Unable to retrieve organizer's live position", 500);
  }
}
