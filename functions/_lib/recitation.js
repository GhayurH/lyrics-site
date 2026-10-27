// Cloudflare Pages Functions: validate untrusted JSON independently of the UI.
const identifier = /^[\p{L}\p{N}_/-]{1,160}$/u;
const uuid = /^[0-9a-f-]{8,80}$/i;
const text = (value, max) => typeof value === "string" &&
  value.length <= max && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value);
export function validateDocument(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.version !== 1 ||
      !text(value.title, 120) || !value.title.trim() ||
      !text(value.occasion, 120) || !text(value.description, 1000) ||
      (value.permanent !== undefined && typeof value.permanent !== "boolean") ||
      !Array.isArray(value.items) || !value.items.length || value.items.length > 40)
    throw Error("A title and 1–40 kalams are required");
  const seen = new Set();
  const items = value.items.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item) ||
        !text(item.uid, 80) || !uuid.test(item.uid) || seen.has(item.uid) ||
        !["lyric","basta"].includes(item.kind) ||
        !text(item.id, 160) || !identifier.test(item.id) ||
        (item.sourceTitle !== undefined && !text(item.sourceTitle, 180)) ||
        (item.reciter !== undefined && !text(item.reciter, 100)) ||
        (item.note !== undefined && !text(item.note, 400)))
      throw Error("Invalid kalam item");
    seen.add(item.uid);
    let stanzaSequence;
    if (item.stanzaSequence !== undefined) {
      if (item.kind !== "basta" || !item.id.startsWith("basta-marsiye-") ||
          !Array.isArray(item.stanzaSequence) || !item.stanzaSequence.length ||
          item.stanzaSequence.length > 120)
        throw Error("Invalid stanza arrangement");
      stanzaSequence = item.stanzaSequence.map((s) => {
        if (!s || typeof s !== "object" ||
            !text(s.kalamId, 160) || !/^basta-marsiye-[0-9]+$/.test(s.kalamId) ||
            !text(s.stanzaId, 30) || !/^stanza-[0-9]+$/.test(s.stanzaId))
          throw Error("Invalid stanza reference");
        return { kalamId: s.kalamId, stanzaId: s.stanzaId };
      });
    }
    return { uid: item.uid, kind: item.kind, id: item.id,
      ...(item.sourceTitle ? { sourceTitle: item.sourceTitle } : {}),
      ...(item.reciter ? { reciter: item.reciter } : {}),
      ...(item.note ? { note: item.note } : {}),
      ...(stanzaSequence ? { stanzaSequence } : {}) };
  });
  return { version: 1, title: value.title.trim(), occasion: value.occasion.trim(),
    description: value.description.trim(),
    ...(value.permanent ? { permanent: true } : {}), items };
}
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
