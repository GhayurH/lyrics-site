import test from "node:test";
import assert from "node:assert/strict";
import { resolveBastaPageJump } from "../src/client/basta-navigation.ts";

const pages = new Set([1, 85, 138, 500]);
test("all Basta jump surfaces use one positive-page and availability contract", () => {
  assert.deepEqual(resolveBastaPageJump(138, pages, 9, 17), { kind: "page", page: 138 });
  assert.deepEqual(resolveBastaPageJump(11, pages, 9, 17), { kind: "index" });
  assert.deepEqual(resolveBastaPageJump(0, pages, 9, 17), { kind: "invalid", message: "Enter a valid page number." });
  assert.deepEqual(resolveBastaPageJump(200, pages, 9, 17), { kind: "invalid", message: "That Basta page is not available." });
  assert.deepEqual(resolveBastaPageJump(138.5, pages, 9, 17), { kind: "invalid", message: "Enter a valid page number." });
});
