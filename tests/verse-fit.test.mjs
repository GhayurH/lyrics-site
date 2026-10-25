import test from "node:test";
import assert from "node:assert/strict";
import { fitLine } from "../src/lib/verse-fit.ts";

test("fitting never grows a short verse", () => {
  assert.deepEqual(fitLine(30, 22, 500, 200), { size: 30, minWidth: 200 });
});
test("fitting preserves a readability floor and requests horizontal room", () => {
  const fit = fitLine(32, 28, 200, 400);
  assert.equal(fit.size, 28);
  assert.equal(fit.minWidth, 350);
});
test("minimum above the available font size cannot enlarge text", () => {
  const fit = fitLine(24, 30, 100, 500);
  assert.equal(fit.size, 24);
  assert.equal(fit.minWidth, 500);
});
