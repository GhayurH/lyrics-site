import { binding, digest, error, json, readRequest, token } from "../../_lib/recitation.js";

export async function onRequestPost({ request, env }) {
  const db = binding(env);
  if (!db) return error("Sharing is not configured on this deployment", 503);
  let document;
  try { document = await readRequest(request); }
  catch { return error("Invalid recitation set or request too large", 400); }
  const id = token(12);
  const editToken = token(32);
  try {
    await db.prepare("INSERT INTO recitation_sets (id,document,edit_token_hash) VALUES (?,?,?)")
      .bind(id, JSON.stringify(document), await digest(editToken)).run();
  } catch (e) {
    console.error("Failed to create recitation set", e);
    return error("Unable to publish this set", 500);
  }
  return json({ id, editToken }, 201);
}
export function onRequestGet() { return error("Open a particular recitation set", 400); }
