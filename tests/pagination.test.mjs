import test from "node:test";
import assert from "node:assert/strict";
import { PAGE_SIZE, pageHref, paginateItems, paginationLinks } from "../src/lib/pagination.ts";

test("static pagination preserves every member once, including the final partial page", () => {
  const items = Array.from({ length: PAGE_SIZE * 2 + 7 }, (_, index) => index);
  const pages = [1, 2, 3].map(page => paginateItems(items, page));
  assert.deepEqual(pages.flatMap(page => page.slice), items);
  assert.deepEqual(pages.map(page => [page.startItem, page.endItem]), [[1, 60], [61, 120], [121, 127]]);
  assert.equal(pages[2].totalPages, 3);
  assert.equal(pages[2].totalItems, 127);
  assert.deepEqual(paginateItems([], 1), { slice: [], totalItems: 0, totalPages: 1, currentPage: 1, startItem: 0, endItem: 0 });
  assert.throws(() => paginateItems(items, 4), RangeError);
  assert.throws(() => paginateItems(items, 1, 0), RangeError);
});

test("first-page links retain established category and discovery URLs", () => {
  assert.equal(pageHref("/categories/noha/", 1), "/categories/noha/");
  assert.equal(pageHref("/categories/noha", 2), "/categories/noha/page/2/");
  assert.equal(pageHref("/poets/rehan-azmi/", 3), "/poets/rehan-azmi/page/3/");
  for (const path of ["https://example.com/", "//example.com/", "/search/?q=x", "/poets/#a"])
    assert.throws(() => pageHref(path, 1), TypeError);
  assert.throws(() => pageHref("/", 1.5), RangeError);
});

test("long collections have a bounded navigation window with first and last access", () => {
  assert.deepEqual(paginationLinks(1, 1), [1]);
  assert.deepEqual(paginationLinks(1, 20), [1, 2, 3, null, 20]);
  assert.deepEqual(paginationLinks(10, 20), [1, null, 8, 9, 10, 11, 12, null, 20]);
  assert.deepEqual(paginationLinks(4, 6), [1, 2, 3, 4, 5, 6]);
});
