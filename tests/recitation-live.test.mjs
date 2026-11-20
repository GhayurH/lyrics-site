import test from "node:test";
import assert from "node:assert/strict";
import { onRequestGet } from "../functions/api/recitation-sets/[id]/live.js";
import { onRequestGet as readProgramme } from "../functions/api/recitation-sets/[id].js";
import { recitationContentRevision } from "../src/lib/recitation-live.js";

const id = "0123456789abcdef01234567";
const first = "391002ab-16f4-4535-bf2a-8ca02cefc956";
const next = "b61002ab-16f4-4535-bf2a-8ca02cefc956";
const set = {
  version: 1, title: "Live programme", occasion: "Gathering", description: "Programme notes",
  items: [first, next].map(uid => ({ uid, kind: "lyric", id: "aa-asghar-bin-tere", note: "Public note" })),
  live: { active: true, currentUid: first },
};
function fixture(document = set, overrides = {}) {
  const row = { document: JSON.stringify(document), updated_at: new Date().toISOString(),
    permanent: 0, expires_at: "2099-12-31T00:00:00.000Z", ...overrides };
  const queries = [];
  const env = { RECITATION_DB: { prepare(sql) {
    queries.push(sql);
    return { bind(value) { assert.equal(value, id); return { first: async () => row }; } };
  } } };
  return { env, queries, context(headers = {}) {
    return { params: { id }, env,
      request: new Request(`https://example.com/api/recitation-sets/${id}/live`, { headers }) };
  } };
}

test("live endpoint returns only position and content identity, with private cache policy", async () => {
  const source = fixture();
  const response = await onRequestGet(source.context());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.match(response.headers.get("etag"), /^"[a-f0-9]{64}"$/);
  const state = await response.json();
  assert.deepEqual(Object.keys(state).sort(), ["contentRevision", "live"]);
  assert.deepEqual(state.live, set.live);
  assert.equal(state.contentRevision, await recitationContentRevision(set));
  const full = await (await readProgramme(source.context())).json();
  assert.equal(full.contentRevision, state.contentRevision);
  assert.ok(source.queries.every(query => !query.includes("edit_token")));
});

test("conditional live reads accept strong, weak and list validators with empty 304 bodies", async () => {
  const source = fixture();
  const etag = (await onRequestGet(source.context())).headers.get("etag");
  for (const validator of [etag, `W/${etag}`, `"older", W/${etag}`, "*"]) {
    const response = await onRequestGet(source.context({ "If-None-Match": validator }));
    assert.equal(response.status, 304);
    assert.equal(await response.text(), "");
    assert.equal(response.headers.get("etag"), etag);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  assert.equal((await onRequestGet(source.context({ "If-None-Match": '"different"' }))).status, 200);
});

test("position changes invalidate ETags but only programme edits change contentRevision", async () => {
  const initial = await onRequestGet(fixture().context());
  const pointer = await onRequestGet(fixture({ ...set, live: { active: true, currentUid: next } }).context());
  const edited = await onRequestGet(fixture({ ...set, items: [...set.items].reverse() }).context());
  const originalState = await initial.json();
  assert.equal((await pointer.json()).contentRevision, originalState.contentRevision);
  assert.notEqual((await edited.json()).contentRevision, originalState.contentRevision);
  assert.notEqual(pointer.headers.get("etag"), initial.headers.get("etag"));
  assert.notEqual(edited.headers.get("etag"), initial.headers.get("etag"));
  const reorderedProperties = { items: set.items, description: set.description, occasion: set.occasion,
    title: set.title, version: set.version };
  assert.equal(await recitationContentRevision(reorderedProperties), originalState.contentRevision);
});

test("live reads check expiry before ETags, including preview permanent programmes", async () => {
  const expired = fixture(set, { expires_at: "2000-01-01T00:00:00.000Z" });
  assert.equal((await onRequestGet(expired.context({ "If-None-Match": "*" }))).status, 410);
  const preview = fixture(set, { permanent: 1, updated_at: "2000-01-01T00:00:00.000Z", expires_at: null });
  preview.env.RECITATION_RETENTION_MODE = "preview";
  assert.equal((await onRequestGet(preview.context({ "If-None-Match": "*" }))).status, 410);
});

test("live reads handle absent binding, malformed IDs and missing programmes without a capability", async () => {
  const request = new Request("https://example.com/live");
  assert.equal((await onRequestGet({ request, params: { id }, env: {} })).status, 503);
  assert.equal((await onRequestGet({ request, params: { id: "bad" }, env: {} })).status, 404);
  const env = { RECITATION_DB: { prepare: () => ({ bind: () => ({ first: async () => null }) }) } };
  assert.equal((await onRequestGet({ request, params: { id }, env })).status, 404);
});
