import { binding, digest, error, json, readRequest, token } from "../../_lib/recitation.js";
import { checkCreationLimit, expirationDate, previewMode } from "../../_lib/recitation-retention.js";

export async function onRequestPost({ request, env }) {
  const db = binding(env);
  if (!db) return error("Sharing is not configured on this deployment", 503);
  let document;
  try { document = await readRequest(request); }
  catch { return error("Invalid recitation set or request too large", 400); }
  const preview = previewMode(env);
  // Preview data is always temporary, even if a client requests preservation.
  if (preview) delete document.permanent;
  const permanent = !preview && document.permanent === true;
  const expiresAt = permanent ? null : expirationDate(new Date(), preview);
  const id = token(12);
  const editToken = token(32);
  try {
    const allowance = await checkCreationLimit(db, request, env);
    if (!allowance.allowed) {
      const reply = error("Too many sets created. Try again after the next hour.", 429);
      reply.headers.set("Retry-After", String(allowance.retryAfter));
      return reply;
    }
    await db.prepare(
      "INSERT INTO recitation_sets (id,document,edit_token_hash,permanent,expires_at) VALUES (?,?,?,?,?)"
    ).bind(id, JSON.stringify(document), await digest(editToken),
      permanent ? 1 : 0, expiresAt).run();
  } catch (e) {
    console.error("Failed to create recitation set", e);
    return error("Unable to publish this set. Check that D1 migration 0002 has been applied.", 500);
  }
  return json({ id, editToken, permanent, expiresAt }, 201);
}
export function onRequestGet() { return error("Open a particular recitation set", 400); }
