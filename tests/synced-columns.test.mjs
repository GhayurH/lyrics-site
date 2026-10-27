// Content-height selection for parallel reading. Other layouts use document scroll.
import test from "node:test";
import assert from "node:assert/strict";
import { progressOf, tallerPanelLayout } from "../src/client/synced-columns.ts";
import { readFileSync } from "node:fs";

const panel = (scrollHeight, clientHeight, scrollTop = 0) =>
  ({ scrollHeight, clientHeight, scrollTop });

test("progress within the sole scrolling edition stays bounded", () => {
  assert.equal(progressOf(panel(1000, 200, 80)), 0.1);
  assert.equal(progressOf(panel(300, 300)), 0);
  assert.equal(progressOf(panel(1000, 200, 900)), 1);
});

test("only the taller edition scrolls, to the shorter edition's full height", () => {
  assert.deepEqual(tallerPanelLayout([1050, 550]), { index: 0, height: 550 });
  assert.deepEqual(tallerPanelLayout([420, 900]), { index: 1, height: 420 });
});

test("three parallel editions still keep both shorter editions fully visible", () => {
  assert.deepEqual(tallerPanelLayout([400, 1100, 620]), { index: 1, height: 620 });
});

test("equal heights, one edition, and initially unmeasured content do not scroll locally", () => {
  assert.equal(tallerPanelLayout([500, 501]), undefined);
  assert.equal(tallerPanelLayout([500]), undefined);
  assert.equal(tallerPanelLayout([600, 0]), undefined);
});

test("Basta page 138 retains the separate closing Bain in both editions", () => {
  const urdu = readFileSync(new URL("../src/data/basta/pages/138.md", import.meta.url), "utf8");
  const roman = readFileSync(new URL("../src/data/basta/roman/138.md", import.meta.url), "utf8");
  assert.equal(urdu.split("---***---").length, 2);
  assert.equal(roman.split("---***---").length, 2);
  assert.match(urdu.split("---***---")[1], /بین/);
  assert.match(roman.split("---***---")[1], /Bain/);
});
