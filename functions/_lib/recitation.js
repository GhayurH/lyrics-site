// Cloudflare Pages Functions: validate untrusted JSON independently of the UI.
import { validateDocument } from "../../src/lib/recitation-document.js";
export { validateDocument } from "../../src/lib/recitation-document.js";

export function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  } });
}
export function error(message, status) { return json({ error: message }, status); }
export async function readRequest(request) {
  if (Number(request.headers.get("content-length") || 0) > 64000)
    throw Error("Request is too large");
  const body = await request.text();
  if (body.length > 64000) throw Error("Request is too large");
  return validateDocument(JSON.parse(body));
}
export function token(bytes = 24) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return Array.from(data, (value) => value.toString(16).padStart(2,"0")).join("");
}
export async function digest(tokenText) {
  const binary = new TextEncoder().encode(tokenText);
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", binary)),
    (value) => value.toString(16).padStart(2, "0")).join("");
}
export function validId(value) { return /^[a-f0-9]{24}$/.test(value); }
export function binding(env) {
  return env.RECITATION_DB || null;
}
