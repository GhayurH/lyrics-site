// Central retention and creation-limit policy for Cloudflare Pages Functions.
export const CREATIONS_PER_HOUR = 10;
export function previewMode(env) {
  // Set this explicitly in the Pages preview environment. Do not infer from
  // the request hostname: production also has a *.pages.dev domain.
  return env.RECITATION_RETENTION_MODE === "preview";
}
export function expirationDate(now = new Date(), preview = false) {
  if (preview) return new Date(now.getTime() + 30 * 86400000).toISOString();
  // Two calendar years, clamping leap-day dates to the final valid day.
  const year = now.getUTCFullYear() + 2;
  const month = now.getUTCMonth();
  const day = Math.min(now.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
  return new Date(Date.UTC(year, month, day, now.getUTCHours(),
    now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds())).toISOString();
}
export function isExpired(row, now = new Date().toISOString(), preview = false) {
  if (!row) return false;
  if (preview) {
    const previewExpiry = new Date(Date.parse(row.updated_at) + 30 * 86400000).toISOString();
    return previewExpiry <= now || (!!row.expires_at && row.expires_at <= now);
  }
  return Number(row.permanent) !== 1 && !!row.expires_at && row.expires_at <= now;
}
export function retentionInfo(row, preview = false) {
  return {
    permanent: !preview && Number(row.permanent) === 1,
    expiresAt: preview
      ? new Date(Date.parse(row.updated_at) + 30 * 86400000).toISOString()
      : Number(row.permanent) === 1 ? null : row.expires_at,
  };
}
export async function checkCreationLimit(db, request, env, now = new Date()) {
  // CF-Connecting-IP is set by Cloudflare at the edge. Only an opaque digest
  // survives in D1; salt may be supplied as an encrypted Pages secret.
  const ip = request.headers.get("CF-Connecting-IP") || "unidentified-client";
  const window = Math.floor(now.getTime() / 3600000);
  const keyMaterial = (env.RECITATION_RATE_LIMIT_SECRET || "recitation-creation-v1") +
    ":" + ip + ":" + window;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(keyMaterial));
  const key = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, "0")).join("");
  const end = new Date((window + 1) * 3600000).toISOString();
  const record = await db.prepare(
    `INSERT INTO recitation_creation_limits (bucket_key,attempts,expires_at)
     VALUES (?,1,?)
     ON CONFLICT(bucket_key) DO UPDATE SET attempts=attempts+1
     WHERE attempts < ?
     RETURNING attempts`,
  ).bind(key, end, CREATIONS_PER_HOUR).first();
  return { allowed: !!record, retryAfter: Math.max(1, Math.ceil((Date.parse(end) - now.getTime()) / 1000)) };
}
