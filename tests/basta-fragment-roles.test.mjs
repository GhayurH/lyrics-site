import test from "node:test";
import assert from "node:assert/strict";
import { validateReviewedFragments } from "../src/lib/basta-fragment-roles.ts";

const source = new Map([[138, "عنوان\n---***---\nبین\nمتن"]]);
const orphans = [{ page: 138, part: 2, opening: "بین" }];
const manifest = { version: 1, fragments: {
  "138:2": { role: "supplement", opening: "بین", reason: "Unindexed intervening bain" },
} };
test("reviewed unindexed poetry is excluded only from orphan warnings", () => {
  const result = validateReviewedFragments(manifest, source, orphans);
  assert.deepEqual([...result.approved], ["138:2"]);
  assert.deepEqual(result.issues, []);
});
test("explicit continuations must belong to the declared indexed poem", () => {
  const role = { version: 1, fragments: {
    "138:2": { role: "continuation", of: "basta-salam-001", opening: "بین",
      reason: "Source-confirmed continuation" },
  } };
  const correct = validateReviewedFragments(role, source, [],
    { "138:2": "basta-salam-001" });
  assert.deepEqual(correct.issues, []);
  assert.equal(correct.approved.size, 0);
  const wrong = validateReviewedFragments(role, source, [],
    { "138:2": "basta-salam-002" });
  assert.equal(wrong.issues[0].code, "stale-fragment-role");
});
test("separator changes and newly indexed fragments invalidate exceptions", () => {
  const moved = validateReviewedFragments(manifest, new Map([[138, "بین"]]), orphans);
  assert.equal(moved.issues[0].code, "stale-fragment-role");
  const indexed = validateReviewedFragments(manifest, source, []);
  assert.equal(indexed.issues[0].code, "stale-fragment-role");
});
