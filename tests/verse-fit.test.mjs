import test from "node:test";
import assert from "node:assert/strict";
import { fitLine } from "../src/lib/verse-fit.ts";

test("a short verse keeps its natural font size", () => {
  assert.equal(fitLine(30, 500, 200), 30);
});
test("long verses shrink enough to fit their column with a measurement margin", () => {
  const result = fitLine(32, 200, 400);
  assert.ok(result < 16);
  assert.ok(400 * result / 32 < 200);
});
test("extreme lengths never trigger a minimum-font overflow", () => {
  const fitted = fitLine(24, 80, 2400);
  assert.ok(fitted > 0 && fitted < 1);
  assert.ok(2400 * fitted / 24 < 80);
});
test("unmeasurable lines retain the existing size", () => {
  assert.equal(fitLine(24, 0, 500), 24);
  assert.equal(fitLine(24, 500, 0), 24);
});
