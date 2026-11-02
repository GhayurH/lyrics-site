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
test("separator changes and newly indexed fragments invalidate exceptions", () => {
  const moved = validateReviewedFragments(manifest, new Map([[138, "بین"]]), orphans);
  assert.equal(moved.issues[0].code, "stale-fragment-role");
  const indexed = validateReviewedFragments(manifest, source, []);
  assert.equal(indexed.issues[0].code, "stale-fragment-role");
});
