// Proportional scrolling uses each pane's own scrollable extent.
import test from "node:test";
import assert from "node:assert/strict";
import { progressOf, alignPanels } from "../src/client/synced-columns.ts";

const panel = (scrollHeight, clientHeight, scrollTop = 0) =>
  ({ scrollHeight, clientHeight, scrollTop });

test("scroll percentage is independent of column height", () => {
  assert.equal(progressOf(panel(1000, 200, 80)), 0.1);
  assert.equal(progressOf(panel(500, 100, 40)), 0.1);
  assert.equal(progressOf(panel(300, 300)), 0);
  assert.equal(progressOf(panel(1000, 200, 900)), 1);
});

test("all columns move to the same fractional progress", () => {
  const source = panel(1000, 200, 200);
  const roman = panel(600, 200);
  const image = panel(1500, 500);
  alignPanels([source, roman, image], progressOf(source), source);
  assert.equal(source.scrollTop, 200);
  assert.equal(roman.scrollTop, 100);
  assert.equal(image.scrollTop, 250);
});

test("zero-overflow columns and boundaries stay safe", () => {
  const long = panel(900, 100);
  const short = panel(100, 100);
  alignPanels([long, short], 1);
  assert.equal(long.scrollTop, 800);
  assert.equal(short.scrollTop, 0);
  alignPanels([long], -2);
  assert.equal(long.scrollTop, 0);
});
