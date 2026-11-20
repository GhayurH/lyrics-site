import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { analyzeBuild, validateBudgets } from "../scripts/lib/build-budgets.mjs";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "kalam-build-budget-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  function write(path, contents) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), contents);
  }
  write("index.html", '<!doctype html><html><body><script type="module" src="/_astro/main.js"></script></body></html>');
  write("categories/noha/index.html", '<html><body><ul><li>Poem</li></ul><script type="module" src="/_astro/main.js"></script></body></html>');
  write("_astro/main.js", 'import { shared } from "./shared.js"; export { extra } from "./extra.js"; console.log(shared); export function print() { return import("./export.js"); }');
  write("_astro/shared.js", 'import "./main.js"; export const shared = 1;');
  write("_astro/extra.js", 'export const extra = 2;');
  write("_astro/export.js", 'export const font = "' + "dGVzdCBmb250".repeat(1000) + '";');
  write("_astro/font.woff2", Buffer.alloc(77));
  write("pagefind/chunk.pf_fragment", Buffer.alloc(123));
  write("data/saved-catalog.json", "[]");
  write("data/discovery/poets.json", "[]");
  return { root, write };
}

test("build report counts every deployed file and follows static imports without optional export payloads", t => {
  const { root } = fixture(t);
  const report = analyzeBuild(root);
  assert.equal(report.totals.files, 10);
  assert.equal(report.pagefind.files, 1);
  assert.equal(report.pagefind.bytes, 123);
  assert.equal(report.byType.woff2.bytes, 77);
  assert.deepEqual(report.initialJs.representative[0].initialJsFiles,
    ["_astro/extra.js", "_astro/main.js", "_astro/shared.js"]);
  assert.ok(report.initialJs.representative.every(page => page.initialJsBytes < 1000));
  assert.equal(report.collectionPages.largest[0].openingTags, 5);
  assert.deepEqual(report.catalogs.map(file => file.path), ["data/discovery/poets.json", "data/saved-catalog.json"]);
  assert.deepEqual(report.violations, []);
  assert.deepEqual(analyzeBuild(root), report, "report has no timestamps or nondeterministic ordering");
});

test("budgets enforce deployment, catalog, collection, index and initial-JS limits independently", t => {
  const { root } = fixture(t);
  const report = analyzeBuild(root, { deploymentFiles: 1, catalogJsonBytes: 1, collectionHtmlBytes: 1,
    collectionOpeningTags: 1, pagefindBytes: 1, initialJsGzipBytes: 1, singleFileBytes: 1 });
  assert.deepEqual([...new Set(report.violations.map(item => item.budget))].sort(),
    ["catalogJsonBytes", "collectionHtmlBytes", "collectionOpeningTags", "deploymentFiles",
      "initialJsGzipBytes", "pagefindBytes", "singleFileBytes"]);
  assert.ok(report.violations.every(item => item.actual > item.limit));
});

test("missing initial modules are an explicit build failure", t => {
  const { root, write } = fixture(t);
  write("missing/index.html", '<script type="module" src="/_astro/missing.js"></script>');
  assert.ok(analyzeBuild(root).violations.some(item => item.budget === "missingInitialModule" && item.path === "_astro/missing.js"));
});

test("CLI check fails on budget regressions and emits parseable JSON", t => {
  const { root, write } = fixture(t);
  const script = new URL("../scripts/report-build-assets.mjs", import.meta.url).pathname;
  write("budgets.json", JSON.stringify({ deploymentFiles: 1 }));
  const result = spawnSync(process.execPath, [script, "--root", root, "--check", "--json", "--budgets", join(root, "budgets.json")], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).violations[0].budget, "deploymentFiles");
  assert.equal(result.stderr, "");
  assert.throws(() => validateBudgets({ deploymentFiles: 0 }), /Invalid build budget/);
  assert.throws(() => validateBudgets({ deployFiles: 1000 }), /Unknown build budget/);
});
