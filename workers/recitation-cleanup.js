// Separate scheduled Cloudflare Worker. Pages Functions cannot receive cron events.
// Bind PRODUCTION_RECITATION_DB and PREVIEW_RECITATION_DB to distinct D1 databases.
// Configure a daily UTC Cron Trigger (e.g. 0 3 * * *) on this Worker.
// No public administration endpoint or database credentials are exposed.
export async function cleanRecitationDatabase(db, name, now = new Date().toISOString()) {
  if (!db) throw new Error("Missing cleanup D1 binding: " + name);
  let deletedSets = 0;
  let deletedBuckets = 0;
  const isPreview = name === "preview";
  const previewCutoff = new Date(Date.parse(now) - 30 * 86400000).toISOString();
  // Bounded work: at most 2,000 expired sets and 5,000 rate buckets each day.
  // Preview always uses last edit + 30 days, regardless of the stored preservation flag.
  for (let batch = 0; batch < 10; batch++) {
    const removed = await db.prepare(isPreview
      ? `DELETE FROM recitation_sets WHERE id IN (
          SELECT id FROM recitation_sets WHERE updated_at <= ?
          ORDER BY updated_at ASC LIMIT 200
        )`
      : `DELETE FROM recitation_sets WHERE id IN (
          SELECT id FROM recitation_sets
          WHERE permanent = 0 AND expires_at <= ?
          ORDER BY expires_at ASC LIMIT 200
        )`
    ).bind(isPreview ? previewCutoff : now).run();
    const count = removed.meta?.changes || 0;
    deletedSets += count;
    if (count < 200) break;
  }
  for (let batch = 0; batch < 10; batch++) {
    const removed = await db.prepare(
      `DELETE FROM recitation_creation_limits WHERE bucket_key IN (
        SELECT bucket_key FROM recitation_creation_limits WHERE expires_at <= ?
        ORDER BY expires_at ASC LIMIT 500
      )`,
    ).bind(now).run();
    const count = removed.meta?.changes || 0;
    deletedBuckets += count;
    if (count < 500) break;
  }
  const stats = await db.prepare(isPreview
    ? `SELECT count(*) AS sets_total,
       sum(CASE WHEN permanent=1 THEN 1 ELSE 0 END) AS sets_permanent,
       sum(CASE WHEN updated_at <= ? THEN 1 ELSE 0 END) AS sets_expired_pending,
       coalesce(sum(length(document)),0) AS document_bytes_estimate
     FROM recitation_sets`
    : `SELECT count(*) AS sets_total,
       sum(CASE WHEN permanent=1 THEN 1 ELSE 0 END) AS sets_permanent,
       sum(CASE WHEN permanent=0 AND expires_at <= ? THEN 1 ELSE 0 END) AS sets_expired_pending,
       coalesce(sum(length(document)),0) AS document_bytes_estimate
     FROM recitation_sets`
  ).bind(isPreview ? previewCutoff : now).first();
  const day = now.slice(0, 10);
  await db.prepare(
    `INSERT INTO recitation_maintenance_metrics
       (day,sets_total,sets_permanent,sets_expired_pending,document_bytes_estimate,deleted_sets)
     VALUES (?,?,?,?,?,?)
     ON CONFLICT(day) DO UPDATE SET
       sets_total=excluded.sets_total,
       sets_permanent=excluded.sets_permanent,
       sets_expired_pending=excluded.sets_expired_pending,
       document_bytes_estimate=excluded.document_bytes_estimate,
       deleted_sets=excluded.deleted_sets`,
  ).bind(day, stats.sets_total || 0, stats.sets_permanent || 0,
    stats.sets_expired_pending || 0, stats.document_bytes_estimate || 0, deletedSets).run();
  await db.prepare("DELETE FROM recitation_maintenance_metrics WHERE day < ?")
    .bind(new Date(Date.parse(day + "T00:00:00Z") - 90 * 86400000)
      .toISOString().slice(0, 10)).run();
  const result = { database: name, time: now, deleted_sets: deletedSets,
    deleted_limit_buckets: deletedBuckets, ...stats };
  console.log("recitation_retention", JSON.stringify(result));
  return result;
}
export default {
  async scheduled(_event, env) {
    // Both databases run independently. A binding failure should be visible
    // as a Cron invocation error, never silently skip one environment.
    const results = await Promise.allSettled([
      cleanRecitationDatabase(env.PRODUCTION_RECITATION_DB, "production"),
      cleanRecitationDatabase(env.PREVIEW_RECITATION_DB, "preview"),
    ]);
    for (const entry of results) if (entry.status === "rejected")
      console.error("Recitation cleanup failed:", entry.reason);
    if (results.some(entry => entry.status === "rejected"))
      throw new Error("At least one recitation database cleanup failed");
  },
  fetch() { return new Response("Not found", { status: 404 }); },
};
