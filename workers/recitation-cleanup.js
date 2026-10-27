// Separate scheduled Cloudflare Worker. Pages Functions cannot receive cron events.
// Configure PRODUCTION_RECITATION_DB and PREVIEW_RECITATION_DB D1 bindings on
// this Worker, then a daily UTC Cron Trigger (e.g., 0 3 * * *).
// No public administration endpoint or database credentials are exposed.
export async function cleanRecitationDatabase(db, name, now = new Date().toISOString()) {
  if (!db) throw new Error("Missing cleanup D1 binding: " + name);
  const removed = await db.prepare(
    `DELETE FROM recitation_sets WHERE id IN (
      SELECT id FROM recitation_sets
      WHERE permanent = 0 AND expires_at <= ?
      ORDER BY expires_at ASC LIMIT 200
    )`,
  ).bind(now).run();
  const buckets = await db.prepare(
    `DELETE FROM recitation_creation_limits WHERE bucket_key IN (
      SELECT bucket_key FROM recitation_creation_limits WHERE expires_at <= ?
      ORDER BY expires_at ASC LIMIT 500
    )`,
  ).bind(now).run();
  const stats = await db.prepare(
    `SELECT count(*) AS sets_total,
       sum(CASE WHEN permanent=1 THEN 1 ELSE 0 END) AS sets_permanent,
       sum(CASE WHEN permanent=0 AND expires_at <= ? THEN 1 ELSE 0 END) AS sets_expired_pending,
       coalesce(sum(length(document)),0) AS document_bytes_estimate
     FROM recitation_sets`,
  ).bind(now).first();
  const result = { database: name, time: now, deleted_sets: removed.meta?.changes || 0,
    deleted_limit_buckets: buckets.meta?.changes || 0, ...stats };
  console.log("recitation_retention", JSON.stringify(result));
  return result;
}
export default {
  async scheduled(_event, env) {
    // Both databases run independently. Keep a failed database visible as an
    // invocation error instead of silently skipping its retention cleanup.
    const results = await Promise.allSettled([
      cleanRecitationDatabase(env.PRODUCTION_RECITATION_DB, "production"),
      cleanRecitationDatabase(env.PREVIEW_RECITATION_DB, "preview"),
    ]);
    for (const entry of results) if (entry.status === "rejected") {
      console.error("Recitation cleanup failed:", entry.reason);
    }
    if (results.some(entry => entry.status === "rejected"))
      throw new Error("At least one recitation database cleanup failed");
  },
  fetch() { return new Response("Not found", { status: 404 }); },
};
