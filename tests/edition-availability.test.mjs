import assert from "node:assert/strict";
import { test } from "node:test";
import { romanUnavailable } from "../src/lib/edition-availability.ts";

test("missing-edition wording only offers an available scan", () => {
  assert.equal(romanUnavailable("page", true),
    "Roman Urdu is not available for this page. The original scan can be viewed instead.");
  assert.equal(romanUnavailable("kalam", false),
    "Roman Urdu is not available for this kalam.");
  assert.equal(romanUnavailable("stanza", true, 3),
    "Roman Urdu is not available for stanza 3. The original scan can be viewed instead.");
});
