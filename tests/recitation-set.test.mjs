import test from "node:test";
import assert from "node:assert/strict";
import { validateRecitationSet } from "../src/lib/recitation-set.ts";
import { validateDocument, digest } from "../functions/_lib/recitation.js";
import { onRequestPost } from "../functions/api/recitation-sets/index.js";
import { onRequestGet, onRequestPut } from "../functions/api/recitation-sets/[id].js";
import { onRequestGet as redirect } from "../functions/r/[id].js";

const first = { uid: "391002ab-16f4-4535-bf2a-8ca02cefc956", kind: "basta",
  id: "basta-marsiye-001", stanzaSequence: [
    { kalamId: "basta-marsiye-002", stanzaId: "stanza-004" },
    { kalamId: "basta-marsiye-001", stanzaId: "stanza-001" },
  ] };
const example = { version: 1, title: "Muharram 8th Night",
  occasion: "Majlis", description: "Example", items: [first] };

test("canonical set preserves cross-Marsiya order and duplicate use", () => {
  assert.deepEqual(validateRecitationSet(example), validateDocument(example));
  assert.deepEqual(validateDocument(example).items[0].stanzaSequence, first.stanzaSequence);
  const extra = { ...first, uid: "b61002ab-16f4-4535-bf2a-8ca02cefc956" };
  assert.equal(validateDocument({ ...example, items: [first, extra] }).items.length, 2);
});
test("server rejects empty, oversized, spoofed and malicious references", () => {
  for (const doc of [
    { ...example, title: "" },
    { ...example, items: [] },
    { ...example, items: Array(41).fill(first) },
    { ...example, items: [first, first] },
    { ...example, items: [{ ...first, id: "../../bad" }] },
    { ...example, items: [{ ...first, stanzaSequence: [{ kalamId: "lyric", stanzaId: "1" }] }] },
    { ...example, items: [{ ...first, kind: "lyric" }] },
    { ...example, description: "bad\u0000" },
  ]) {
    assert.throws(() => validateDocument(doc));
    assert.throws(() => validateRecitationSet(doc));
  }
});
function fakeDb() {
  const data = new Map();
  return {
    data,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async run() {
              if (sql.startsWith("INSERT")) {
                const [id, document, hash] = args;
                data.set(id, { document, hash, updatedAt: "now" });
                return { meta: { changes: 1 } };
              }
              const [document, id, hash] = args;
              const row = data.get(id);
              if (!row || row.hash !== hash) return { meta: { changes: 0 } };
              row.document = document;
              return { meta: { changes: 1 } };
            },
            async first() {
              const row = data.get(args[0]);
              return row && { document: row.document, updated_at: row.updatedAt };
            },
          };
        },
      };
    },
  };
}
const postRequest = (set) => new Request("https://kalamarchive.com/api/recitation-sets/", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(set),
});
test("private editor token is hashed in D1; public link contains no edit capability", async () => {
  const db = fakeDb(), env = { RECITATION_DB: db };
  const created = await onRequestPost({ request: postRequest(example), env });
  assert.equal(created.status, 201);
  const { id, editToken } = await created.json();
  assert.match(id, /^[a-f0-9]{24}$/);
  assert.match(editToken, /^[a-f0-9]{64}$/);
  assert.equal(db.data.get(id).hash, await digest(editToken));
  assert.doesNotMatch(db.data.get(id).document, new RegExp(editToken));
  const read = await onRequestGet({ params: { id }, env });
  assert.equal(read.status, 200);
  assert.deepEqual((await read.json()).set, example);
  const location = redirect({
    params: { id }, request: new Request("https://kalamarchive.com/r/" + id),
  });
  assert.equal(location.status, 302);
  assert.equal(location.headers.get("location"), "https://kalamarchive.com/recite/read/?set=" + id);
  const updated = { ...example, title: "Updated programme" };
  const denied = await onRequestPut({
    params: { id }, env, request: new Request("https://kalamarchive.com/api/recitation-sets/" + id, {
      method: "PUT", headers: { Authorization: "Bearer " + "0".repeat(64) },
      body: JSON.stringify(updated),
    }),
  });
  assert.equal(denied.status, 403);
  const approved = await onRequestPut({
    params: { id }, env, request: new Request("https://kalamarchive.com/api/recitation-sets/" + id, {
      method: "PUT", headers: { Authorization: "Bearer " + editToken },
      body: JSON.stringify(updated),
    }),
  });
  assert.equal(approved.status, 200);
  assert.equal((await (await onRequestGet({ params: { id }, env })).json()).set.title, updated.title);
});
test("missing D1 binding reports unavailable rather than pretending to publish", async () => {
  assert.equal((await onRequestPost({ request: postRequest(example), env: {} })).status, 503);
});
