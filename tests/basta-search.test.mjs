import test from "node:test";
import assert from "node:assert/strict";
import { unclaimedBastaPageText } from "../src/lib/basta-search.ts";

test("Basta page index skips all fully indexed kalams without losing their page routes", () => {
  const assigned = { "287:1": "basta-marsiye-120", "287:2": "basta-marsiye-121" };
  const ready = new Set(["basta-marsiye-120", "basta-marsiye-121"]);
  assert.deepEqual(unclaimedBastaPageText(
    "پہلا\\n---***---\\nدوسرا", "First\\n---***---\\nSecond", 287, assigned, ready,
  ), { urdu: "", roman: "" });
});

test("Basta printed pages retain unindexed fragments and review-needed kalams", () => {
  const assigned = { "288:1": "basta-marsiye-120", "288:2": "basta-marsiye-999" };
  const ready = new Set(["basta-marsiye-120"]);
  assert.deepEqual(unclaimedBastaPageText(
    "مشترک\\n---***---\\nغیر تصدیق شدہ\\n---***---\\nاضافی",
    "Shared\\n---***---\\nUnverified\\n---***---\\nSupplement",
    288, assigned, ready,
  ), { urdu: "غیر تصدیق شدہ\\nاضافی", roman: "Unverified\\nSupplement" });
});

test("mismatched Roman divisions keep unverified text for investigation", () => {
  const assigned = { "300:1": "basta-marsiye-120" };
  assert.deepEqual(unclaimedBastaPageText(
    "اصل", "Original\\n---***---\\nExtra", 300, assigned, new Set(["basta-marsiye-120"]),
  ), { urdu: "", roman: "Original\\nExtra" });
});
