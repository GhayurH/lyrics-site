import test from "node:test";
import assert from "node:assert/strict";
import { canUseNaturalVerseSpacing, fitLine, MAX_VERSE_GROWTH } from "../src/lib/verse-fit.ts";

test("a naturally short stanza line grows rather than stretching its word spaces", () => {
  const fitted = fitLine(20, 500, 250);
  assert.ok(fitted > 20);
  assert.ok(fitted < 40);
  assert.ok(250 * fitted / 20 < 500);
});
test("the stanza font grows monotonically as the selected column widens", () => {
  const sizes = [200, 300, 500, 700].map(width => fitLine(20, width, 300));
  for (let i = 1; i < sizes.length; i++) assert.ok(sizes[i] > sizes[i - 1]);
});
test("very short stanzas have a sensible growth ceiling", () => {
  assert.equal(fitLine(20, 2000, 200), 20 * MAX_VERSE_GROWTH);
});
test("a title can request shrink-only fitting", () => {
  assert.equal(fitLine(30, 500, 200, 1), 30);
});
test("long verses still shrink enough to fit their column", () => {
  const result = fitLine(32, 200, 400);
  assert.ok(result < 16);
  assert.ok(400 * result / 32 < 200);
});
test("extreme lengths never trigger a minimum-font overflow", () => {
  const fitted = fitLine(24, 80, 2400);
  assert.ok(fitted > 0 && fitted < 1);
  assert.ok(2400 * fitted / 24 < 80);
});
test("unmeasurable lines retain their original size", () => {
  assert.equal(fitLine(24, 0, 500), 24);
  assert.equal(fitLine(24, 500, 0), 24);
  assert.equal(fitLine(24, 500, 300, 0), 24);
});

test("longest lines justify when capped growth leaves a substantial right gap", () => {
  assert.equal(canUseNaturalVerseSpacing(970, 1000), true);
  assert.equal(canUseNaturalVerseSpacing(950, 1000), true);
  assert.equal(canUseNaturalVerseSpacing(940, 1000), false);
  assert.equal(canUseNaturalVerseSpacing(760, 1000), false);
  assert.equal(canUseNaturalVerseSpacing(NaN, 1000), false);
  assert.equal(canUseNaturalVerseSpacing(500, 0), false);
});
