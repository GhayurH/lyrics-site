import test from "node:test";
import assert from "node:assert/strict";
import { materializeTemplate, STARTER_TEMPLATES } from "../src/client/recitation-templates.ts";

test("a programme template is copied without live or retention rights", () => {
  const source = structuredClone(STARTER_TEMPLATES[0]);
  source.set.live = { active: false, currentUid: "not-published" };
  source.set.permanent = true;
  const result = materializeTemplate(source, false, []);
  assert.equal(result.live, undefined);
  assert.equal(result.permanent, undefined);
  assert.deepEqual(source.set.live, { active: false, currentUid: "not-published" });
  assert.equal(source.set.permanent, true);
});

test("suggested kalams come only from ready sources and do not duplicate selection", () => {
  const template = STARTER_TEMPLATES[0];
  const items = [
    { kind: "lyric", id: "a", title: "Salam one", type: "Salam", ready: true },
    { kind: "lyric", id: "b", title: "Marsiya awaiting review", type: "Marsiya", ready: false },
    { kind: "basta", id: "c", title: "Verified Marsiya", type: "Marsiya", ready: true },
    { kind: "lyric", id: "d", title: "Noha", type: "Noha", ready: true },
  ].map(item => ({ ...item, sourceUrl: "/", numbered: false }));
  const result = materializeTemplate(template, true, items);
  assert.deepEqual(result.items.map(item => item.id), ["a", "c", "d"]);
  assert.equal(new Set(result.items.map(item => item.uid)).size, 3);
  assert.equal(template.set.items.length, 0);
});
