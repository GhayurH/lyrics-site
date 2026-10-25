import test from "node:test";
import assert from "node:assert/strict";
import { pageAtReadingLine } from "../src/client/reading-position.ts";

test("exit follows the page actually being read, not a stale deep-link hash", () => {
  const pages = [
    { id: 201, top: -850, bottom: 30 },
    { id: 202, top: 30, bottom: 780 },
    { id: 203, top: 780, bottom: 1550 },
  ];
  assert.equal(pageAtReadingLine(pages, 0, 700), 202);
});

test("visible page takes precedence over pages occupying the rest of the book", () => {
  const pages = [
    { id: 138, top: -100, bottom: 800 },
    { id: 139, top: 800, bottom: 1600 },
    { id: 284, top: 2000, bottom: 2700 },
  ];
  assert.equal(pageAtReadingLine(pages, 0, 900), 138);
});

test("when a page boundary crosses the reading line, use the next page", () => {
  const pages = [
    { id: 138, top: -600, bottom: 50 },
    { id: 139, top: 50, bottom: 400 },
  ];
  assert.equal(pageAtReadingLine(pages, 0, 800), 139);
});

test("choose the most visible page if the reading line falls in a separator", () => {
  assert.equal(pageAtReadingLine([
    { id: 201, top: 180, bottom: 650 },
    { id: 202, top: 680, bottom: 1120 },
  ], 0, 900), 201);
  assert.equal(pageAtReadingLine([{ id: 1, top: 1200, bottom: 2000 }], 0, 900), undefined);
});
