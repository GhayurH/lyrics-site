import test from "node:test";
import assert from "node:assert/strict";
import { validateRecitationSet } from "../src/lib/recitation-set.ts";
import { validateDocument, digest } from "../functions/_lib/recitation.js";
import { onRequestPost } from "../functions/api/recitation-sets/index.js";
import { onRequestGet, onRequestPut, onRequestPatch, onRequestDelete } from "../functions/api/recitation-sets/[id].js";
import { onRequestGet as redirect } from "../functions/r/[id].js";
import { expirationDate } from "../functions/_lib/recitation-retention.js";
import { cleanRecitationDatabase } from "../workers/recitation-cleanup.js";

const first = { uid: "391002ab-16f4-4535-bf2a-8ca02cefc956", kind: "basta",
  id: "basta-marsiye-001", stanzaSequence: [
    { kalamId: "basta-marsiye-002", stanzaId: "stanza-004" },
    { kalamId: "basta-marsiye-001", stanzaId: "stanza-001" },
  ] };
const example = { version: 1, title: "Muharram 8th Night",
  occasion: "Majlis", description: "Example", items: [first] };
const now = () => new Date().toISOString();

function fakeDb() {
  const data = new Map();
  const limits = new Map();
  return {
    data, limits,
    prepare(query) {
      const sql = query.replace(/\s+/g, " ").trim();
      return {
        bind(...args) {
          return {
            async first() {
              if (sql.startsWith("INSERT INTO recitation_creation_limits")) {
                const [key, expiry, max] = args;
                const count = limits.get(key)?.attempts || 0;
                if (count >= max) return null;
                limits.set(key, { attempts: count + 1, expires_at: expiry });
                return { attempts: count + 1 };
              }
              if (sql.startsWith("SELECT document,updated_at,permanent,expires_at FROM recitation_sets WHERE id=? AND edit_token_hash=?")) {
                const row = data.get(args[0]);
                return row?.hash === args[1] ? { document: row.document, updated_at: row.updated_at,
                  permanent: row.permanent, expires_at: row.expires_at } : null;
              }
              if (sql.startsWith("SELECT document,updated_at")) {
                const row = data.get(args[0]);
                return row && { document: row.document, updated_at: row.updated_at,
                  permanent: row.permanent, expires_at: row.expires_at };
              }
              if (sql.startsWith("SELECT updated_at,permanent")) {
                const row = data.get(args[0]);
                return row && row.hash === args[1]
                  ? { updated_at: row.updated_at, permanent: row.permanent, expires_at: row.expires_at }
                  : null;
              }
              if (sql.startsWith("SELECT count(*)")) {
                const rows = [...data.values()];
                return { sets_total: rows.length,
                  sets_permanent: rows.filter(x => x.permanent).length,
                  sets_expired_pending: rows.filter(x => sql.includes("WHEN updated_at <=")
                    ? x.updated_at <= args[0] : !x.permanent && x.expires_at <= args[0]).length,
                  document_bytes_estimate: rows.reduce((n,x) => n + x.document.length, 0) };
              }
              throw Error("Unmocked D1 read: " + sql);
            },
            async run() {
              if (sql.startsWith("INSERT INTO recitation_sets")) {
                const [id, document, hash, permanent, expiresAt] = args;
                data.set(id, { document, hash, permanent,
                  expires_at: expiresAt, updated_at: now() });
                return { meta: { changes: 1 } };
              }
              if (sql.startsWith("UPDATE recitation_sets") && sql.includes("AND document=?")) {
                const [document, expiresAt, id, hash, original, timestamp, isPreview, cutoff] = args;
                const row = data.get(id);
                if (!row || row.hash !== hash || row.document !== original ||
                    !(row.permanent || row.expires_at > timestamp) ||
                    (isPreview && row.updated_at <= cutoff)) return { meta: { changes: 0 } };
                Object.assign(row, { document, expires_at: expiresAt, updated_at: now() });
                return { meta: { changes: 1 } };
              }
              if (sql.startsWith("UPDATE recitation_sets")) {
                const [document, permanent, expiresAt, id, hash, timestamp, isPreview, cutoff] = args;
                const row = data.get(id);
                if (!row || row.hash !== hash || !(row.permanent || row.expires_at > timestamp) ||
                  (isPreview && row.updated_at <= cutoff)) return { meta: { changes: 0 } };
                Object.assign(row, { document, permanent, expires_at: expiresAt, updated_at: now() });
                return { meta: { changes: 1 } };
              }
              if (sql.startsWith("DELETE FROM recitation_sets WHERE id=?")) {
                const [id, hash] = args;
                if (data.get(id)?.hash !== hash) return { meta: { changes: 0 } };
                data.delete(id);
                return { meta: { changes: 1 } };
              }
              if (sql.startsWith("DELETE FROM recitation_sets WHERE id IN")) {
                let count = 0;
                for (const [id, row] of data) {
                  if (count >= 200) break;
                  const eligible = sql.includes("WHERE updated_at <=")
                    ? row.updated_at <= args[0] : !row.permanent && row.expires_at <= args[0];
                  if (eligible) { data.delete(id); count++; }
                }
                return { meta: { changes: count } };
              }
              if (sql.startsWith("DELETE FROM recitation_creation_limits")) {
                let count = 0;
                for (const [key, row] of limits) {
                  if (count >= 500) break;
                  if (row.expires_at <= args[0]) { limits.delete(key); count++; }
                }
                return { meta: { changes: count } };
              }
              if (sql.startsWith("INSERT INTO recitation_maintenance_metrics") ||
                  sql.startsWith("DELETE FROM recitation_maintenance_metrics")) {
                return { meta: { changes: 1 } };
              }
              throw Error("Unmocked D1 write: " + sql);
            },
          };
        },
      };
    },
  };
}
const postRequest = (set, ip = "203.0.113.5") => new Request("https://kalamarchive.com/api/recitation-sets/", {
  method: "POST", headers: { "Content-Type": "application/json", "CF-Connecting-IP": ip },
  body: JSON.stringify(set),
});
const editRequest = (id, method, token, set = undefined) =>
  new Request("https://kalamarchive.com/api/recitation-sets/" + id, {
    method, headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    ...(set ? { body: JSON.stringify(set) } : {}),
  });

test("set validators agree on permanent preservation and reject invalid values", () => {
  assert.deepEqual(validateRecitationSet(example), validateDocument(example));
  assert.deepEqual(validateDocument({ ...example, permanent: true }),
    validateRecitationSet({ ...example, permanent: true }));
  assert.equal(validateDocument({ ...example, permanent: false }).permanent, undefined);
  const dup = { ...first, uid: "b61002ab-16f4-4535-bf2a-8ca02cefc956" };
  assert.equal(validateDocument({ ...example, items: [first, dup] }).items.length, 2);
  for (const input of [
    { ...example, permanent: "true" }, { ...example, permanent: 1 },
    { ...example, title: "" }, { ...example, items: [] },
    { ...example, items: Array(41).fill(first) }, { ...example, items: [first, first] },
    { ...example, items: [{ ...first, id: "../../bad" }] },
    { ...example, items: [{ ...first, kind: "lyric" }] },
    { ...example, description: "bad\u0000" },
  ]) {
    assert.throws(() => validateDocument(input));
    assert.throws(() => validateRecitationSet(input));
  }
});
test("24 calendar months clamp leap day, and preview uses 30 days", () => {
  assert.equal(expirationDate(new Date("2028-02-29T10:15:00.000Z")),
    "2030-02-28T10:15:00.000Z");
  assert.equal(expirationDate(new Date("2026-05-01T00:00:00.000Z"), true),
    "2026-05-31T00:00:00.000Z");
});
test("creation stores hashed capability, 24-month expiry; editing renews and deletion revokes", async () => {
  const db = fakeDb(), env = { RECITATION_DB: db };
  const created = await onRequestPost({ request: postRequest(example), env });
  assert.equal(created.status, 201);
  const { id, editToken, expiresAt } = await created.json();
  assert.match(id, /^[a-f0-9]{24}$/);
  assert.match(editToken, /^[a-f0-9]{64}$/);
  assert.equal(db.data.get(id).hash, await digest(editToken));
  assert.doesNotMatch(db.data.get(id).document, new RegExp(editToken));
  assert.match(expiresAt, /^20\d\d-/);
  const read = await onRequestGet({ params: { id }, env });
  assert.equal(read.status, 200);
  assert.deepEqual((await read.json()).set, example);
  const location = redirect({ params: { id },
    request: new Request("https://kalamarchive.com/r/" + id) });
  assert.equal(location.headers.get("location"), "https://kalamarchive.com/recite/read/?set=" + id);
  const update = { ...example, title: "Updated", permanent: true };
  assert.equal((await onRequestPut({ params: { id }, env,
    request: editRequest(id, "PUT", "0".repeat(64), update) })).status, 403);
  const approved = await onRequestPut({ params: { id }, env,
    request: editRequest(id, "PUT", editToken, update) });
  assert.equal(approved.status, 200);
  assert.deepEqual(await approved.json(), { id, updated: true, permanent: true, expiresAt: null });
  assert.equal(db.data.get(id).permanent, 1);
  assert.equal((await (await onRequestGet({ params: { id }, env })).json()).permanent, true);
  assert.equal((await onRequestDelete({ params: { id }, env,
    request: editRequest(id, "DELETE", "0".repeat(64)) })).status, 403);
  assert.equal((await onRequestDelete({ params: { id }, env,
    request: editRequest(id, "DELETE", editToken) })).status, 200);
  assert.equal((await onRequestGet({ params: { id }, env })).status, 404);
});
test("editing a permanent set back to timed retention starts a new expiry", async () => {
  const db = fakeDb(), env = { RECITATION_DB: db };
  const { id, editToken } = await (await onRequestPost({
    request: postRequest({ ...example, permanent: true }), env,
  })).json();
  const response = await onRequestPut({ params: { id }, env,
    request: editRequest(id, "PUT", editToken, example) });
  const payload = await response.json();
  assert.equal(payload.permanent, false);
  assert.ok(Date.parse(payload.expiresAt) > Date.now());
  assert.equal(db.data.get(id).permanent, 0);
});
test("preview programmes always expire after 30 days, even if permanent requested", async () => {
  const db = fakeDb(), env = { RECITATION_DB: db, RECITATION_RETENTION_MODE: "preview" };
  const result = await (await onRequestPost({
    request: postRequest({ ...example, permanent: true }), env,
  })).json();
  assert.equal(result.permanent, false);
  assert.equal(JSON.parse(db.data.get(result.id).document).permanent, undefined);
  assert.ok(Date.parse(result.expiresAt) - Date.now() < 31 * 86400000);
  db.data.get(result.id).updated_at = "2026-01-01T00:00:00.000Z";
  assert.equal((await onRequestGet({ params: { id: result.id }, env })).status, 410);
  assert.equal((await onRequestPut({ params: { id: result.id }, env,
    request: editRequest(result.id, "PUT", result.editToken, example) })).status, 410);
});
test("expired nonpermanent sets cannot be read or resurrected through edits", async () => {
  const db = fakeDb(), env = { RECITATION_DB: db };
  const { id, editToken } = await (await onRequestPost({ request: postRequest(example), env })).json();
  db.data.get(id).expires_at = "2020-01-01T00:00:00.000Z";
  assert.equal((await onRequestGet({ params: { id }, env })).status, 410);
  assert.equal((await onRequestPut({ params: { id }, env,
    request: editRequest(id, "PUT", editToken, example) })).status, 410);
});
test("creation limiter caps one IP at ten sets per hour without losing other editors", async () => {
  const db = fakeDb(), env = { RECITATION_DB: db };
  for (let i = 0; i < 10; i++)
    assert.equal((await onRequestPost({ request: postRequest(example), env })).status, 201);
  const blocked = await onRequestPost({ request: postRequest(example), env });
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get("Retry-After")) > 0);
  assert.equal(db.data.size, 10);
  assert.equal((await onRequestPost({
    request: postRequest(example, "203.0.113.12"), env,
  })).status, 201);
});
test("scheduled cleanup removes only expired ordinary sets in batches and reports usage", async () => {
  const db = fakeDb(), env = { RECITATION_DB: db };
  const current = await (await onRequestPost({ request: postRequest(example), env })).json();
  const important = await (await onRequestPost({
    request: postRequest({ ...example, permanent: true }), env,
  })).json();
  const expired = await (await onRequestPost({
    request: postRequest(example), env,
  })).json();
  db.data.get(expired.id).expires_at = "2020-01-01T00:00:00.000Z";
  db.data.get(important.id).expires_at = "2020-01-01T00:00:00.000Z";
  const stats = await cleanRecitationDatabase(db, "test");
  assert.equal(stats.deleted_sets, 1);
  assert.equal(stats.sets_total, 2);
  assert.equal(stats.sets_permanent, 1);
  assert.ok(stats.document_bytes_estimate > 0);
  assert.ok(db.data.has(current.id));
  assert.ok(db.data.has(important.id));
  assert.ok(!db.data.has(expired.id));
});
test("no D1 binding means publication explicitly fails", async () => {
  assert.equal((await onRequestPost({ request: postRequest(example), env: {} })).status, 503);
});

test("preview cron deletes outdated sets even if legacy retention metadata says permanent", async () => {
  const db = fakeDb(), env = { RECITATION_DB: db, RECITATION_RETENTION_MODE: "preview" };
  const { id } = await (await onRequestPost({ request: postRequest(example), env })).json();
  db.data.get(id).updated_at = "2024-01-01T00:00:00.000Z";
  db.data.get(id).permanent = 1;
  db.data.get(id).expires_at = "2038-01-01T00:00:00.000Z";
  const result = await cleanRecitationDatabase(db, "preview");
  assert.equal(result.deleted_sets, 1);
  assert.equal(db.data.size, 0);
});

test("organizer live pointer is private to edit capability and follows programme-entry UIDs", async () => {
  const db = fakeDb(), env = { RECITATION_DB: db };
  const second = { ...first, uid: "a61002ab-16f4-4535-bf2a-8ca02cefc956" };
  const set = { ...example, items: [first, second] };
  const { id, editToken } = await (await onRequestPost({ request: postRequest(set), env })).json();
  const pointer = { active: true, currentUid: second.uid };
  assert.equal((await onRequestPatch({ params: { id }, env,
    request: editRequest(id, "PATCH", "0".repeat(64), pointer) })).status, 403);
  assert.equal((await onRequestPatch({ params: { id }, env,
    request: editRequest(id, "PATCH", editToken, { ...pointer, currentUid: "missing-entry" }) })).status, 400);
  const response = await onRequestPatch({ params: { id }, env,
    request: editRequest(id, "PATCH", editToken, pointer) });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).live, pointer);
  const shared = await (await onRequestGet({ params: { id }, env })).json();
  assert.deepEqual(shared.set.live, pointer);
  assert.deepEqual(validateRecitationSet(shared.set), validateDocument(shared.set));
  assert.equal(db.data.get(id).hash, await digest(editToken));
  const stopped = await onRequestPatch({ params: { id }, env,
    request: editRequest(id, "PATCH", editToken, { active: false, currentUid: second.uid }) });
  assert.equal(stopped.status, 200);
  assert.equal((await (await onRequestGet({ params: { id }, env })).json()).set.live.active, false);
  assert.throws(() => validateDocument({ ...set, live: { active: true, currentUid: "missing" } }));
  assert.throws(() => validateRecitationSet({ ...set, live: { active: "yes", currentUid: first.uid } }));
});
