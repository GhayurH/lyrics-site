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

import { segmentProgressAt, segmentOffsetAt } from "../src/client/synced-columns.ts";
import { readFileSync } from "node:fs";

test("Basta page 138 really has a second Bain in both editions", () => {
  const urdu = readFileSync(new URL("../src/data/basta/pages/138.md", import.meta.url), "utf8");
  const roman = readFileSync(new URL("../src/data/basta/roman/138.md", import.meta.url), "utf8");
  assert.equal(urdu.split("---***---").length, 2);
  assert.equal(roman.split("---***---").length, 2);
  assert.match(urdu.split("---***---")[1], /بین/);
  assert.match(roman.split("---***---")[1], /Bain/);
});

test("different first-kalam lengths still enter the Bain together", () => {
  // Stops: beginning, the Bain separator, and the end of the scroll range.
  const urduStops = [0, 850, 1000];
  const romanStops = [0, 420, 620];
  for (const position of [0, 210, 420, 630, 850, 1000]) {
    const semantic = segmentProgressAt(position, urduStops);
    const target = segmentOffsetAt(semantic, romanStops);
    assert.ok(Math.abs(segmentProgressAt(target, romanStops) - semantic) < 1e-9);
  }
  assert.equal(segmentOffsetAt(1, urduStops), 850);
  assert.equal(segmentOffsetAt(1, romanStops), 420);
  assert.equal(segmentOffsetAt(1.5, urduStops), 925);
  assert.equal(segmentOffsetAt(1.5, romanStops), 520);
});

test("short last kalams and collapsed boundaries remain safe", () => {
  assert.equal(segmentOffsetAt(0.6, [0, 200, 200]), 120);
  assert.equal(segmentProgressAt(200, [0, 200, 200]), 2);
  assert.equal(segmentProgressAt(201, [0, 200, 200]), 2);
  assert.equal(segmentOffsetAt(2, [0, 200, 200]), 200);
  assert.equal(segmentOffsetAt(-10, [0, 200, 300]), 0);
  assert.equal(segmentProgressAt(900, [0, 200, 300]), 2);
});

test("multiple kalams use their own local progress, not whole-page progress", () => {
  const urdu = [0, 600, 1200, 1400];
  const roman = [0, 200, 450, 650];
  // Halfway through the second kalam in the Urdu column.
  const semantic = segmentProgressAt(900, urdu);
  assert.equal(semantic, 1.5);
  assert.equal(segmentOffsetAt(semantic, roman), 325);
});
