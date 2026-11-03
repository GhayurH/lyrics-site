import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ROMAN_WIDTH, normalizeRomanWidth, romanWidthFromPointer } from "../src/lib/reading-split.ts";

test("default ratio is asymmetric and invalid stored values recover", () => {
  assert.equal(DEFAULT_ROMAN_WIDTH, 44);
  for (const value of [null, undefined, "50", NaN, Infinity, {}])
    assert.equal(normalizeRomanWidth(value), DEFAULT_ROMAN_WIDTH);
});
test("pointer and keyboard widths clamp to usable fractions", () => {
  assert.equal(normalizeRomanWidth(-20), 25);
  assert.equal(normalizeRomanWidth(100), 85);
  assert.equal(normalizeRomanWidth(51.6), 52);
  assert.equal(normalizeRomanWidth(84.6), 85);
  assert.equal(romanWidthFromPointer(350, 100, 600), 50);
  assert.equal(romanWidthFromPointer(0, 100, 600), 25);
  assert.equal(romanWidthFromPointer(900, 100, 600), 85);
  assert.equal(romanWidthFromPointer(300, 600, 100), DEFAULT_ROMAN_WIDTH);
});
