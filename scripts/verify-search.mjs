// File role: Rank real corpus fixtures against the generated Pagefind index, without a web server.
// Run after `npm run build`. The fetch adapter reads only this build's search assets;
// ranking, tokenization, filters and result fragments run in Pagefind's real WASM engine.
import { readFile, writeFile, mkdir, realpath } from "node:fs/promises";
import { dirname, resolve, relative, sep } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { normalizeSearchQuery } from "../src/lib/search-normalization.ts";
import { toPagefindOrFilters } from "../src/lib/search-filters.ts";
import { SEARCH_RANKING } from "../src/lib/search-engine.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
let dist = resolve(root, "dist");
let reportPath;
for (let index = 0; index < args.length; index++) {
  const option = args[index];
  if ((option === "--dist" || option === "--report") && args[index + 1]) {
    const value = resolve(args[++index]);
    if (option === "--dist") dist = value; else reportPath = value;
  } else throw Error("Usage: node --experimental-strip-types scripts/verify-search.mjs [--dist path] [--report path]");
}

const json = async path => JSON.parse(await readFile(path, "utf8"));
const fixtures = await json(resolve(root, "tests/fixtures/search-relevance.json"));
const [lyrics, basta] = await Promise.all([
  json(resolve(dist, "data/recitation-lyric-catalog.json")),
  json(resolve(dist, "data/basta-kalams.json")),
]).catch(error => { throw Error("Built catalogs are required. Run npm run build before verifying search.", { cause: error }); });
const urls = new Map([
  ...lyrics.map(item => ["lyric:" + item.id, item.sourceUrl]),
  ...basta.kalams.filter(item => item.status === "ready").map(item => ["basta:" + item.id, item.sourceUrl]),
]);

const origin = "https://kalamarchive.com";
const searchRoot = await realpath(resolve(dist, "pagefind"));
const priorFetch = globalThis.fetch;
const priorDocument = globalThis.document;
// Match the production document language. Pagefind's noWorker public option
// makes this a supported single-threaded search, using the same index and WASM.
globalThis.document = { currentScript: null, querySelector: () => ({ getAttribute: () => "en" }) };
globalThis.fetch = async input => {
  const url = new URL(typeof input === "string" ? input : input.url, origin);
  if (url.origin !== origin || !url.pathname.startsWith("/pagefind/"))
    throw Error("Search requested an unexpected URL: " + url.href);
  const file = await realpath(resolve(dist, "." + decodeURIComponent(url.pathname)));
  const within = relative(searchRoot, file);
  if (within === ".." || within.startsWith(".." + sep)) throw Error("Search asset is outside the build");
  const data = await readFile(file);
  return new Response(data, { headers: { "content-type": url.pathname.endsWith(".json")
    ? "application/json" : "application/octet-stream" } });
};

let pagefind;
try {
  pagefind = await import(pathToFileURL(resolve(searchRoot, "pagefind.js")).href);
  await pagefind.options({ basePath: "/pagefind/", baseUrl: "/", noWorker: true,
    metaCacheTag: "relevance-benchmark", ranking: SEARCH_RANKING });
  await pagefind.filters();
  const results = [];
  for (const fixture of fixtures) {
    const expected = fixture.expectEmpty ? null : urls.get(fixture.kind + ":" + fixture.id);
    if (!fixture.expectEmpty && !expected) throw Error("Published permanent ID missing from build: " + fixture.id);
    const start = performance.now();
    const query = fixture.query.trim() ? normalizeSearchQuery(fixture.query) : null;
    const search = await pagefind.search(query, { filters: toPagefindOrFilters(fixture.filters ?? {}) });
    const top = await Promise.all(search.results.slice(0, Math.max(fixture.maxRank ?? 0, 10)).map(item => item.data()));
    const paths = top.map(item => new URL(item.meta.url || item.url, origin).pathname);
    const index = expected ? paths.indexOf(expected) : -1;
    const rank = index < 0 ? null : index + 1;
    const pass = fixture.expectEmpty ? search.results.length === 0 : rank !== null && rank <= fixture.maxRank;
    results.push({ name: fixture.name, query: fixture.query, expected, maxRank: fixture.maxRank ?? null,
      rank, total: search.results.length, pass, milliseconds: Math.round((performance.now() - start) * 10) / 10,
      top: top.slice(0, 5).map((item, index) => ({ url: paths[index], title: item.meta.title })) });
    console.log(`${pass ? "PASS" : "FAIL"} ${fixture.name}: ${fixture.expectEmpty ? search.results.length + " results" : "rank " + (rank ?? ">10") + "/" + fixture.maxRank}`);
  }
  const relevant = results.filter(result => result.expected);
  const mrr = relevant.reduce((sum, result) => sum + (result.rank ? 1 / result.rank : 0), 0) / relevant.length;
  const report = { fixtureCount: results.length, passed: results.filter(result => result.pass).length,
    recallAt5: relevant.filter(result => result.rank && result.rank <= 5).length / relevant.length,
    meanReciprocalRank: Math.round(mrr * 1000) / 1000, ranking: SEARCH_RANKING, results };
  if (reportPath) { await mkdir(dirname(reportPath), { recursive: true }); await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n"); }
  console.log(`Search relevance: ${report.passed}/${report.fixtureCount}; recall@5 ${report.recallAt5.toFixed(3)}; MRR ${report.meanReciprocalRank.toFixed(3)}`);
  if (report.passed !== report.fixtureCount) process.exitCode = 1;
} finally {
  await pagefind?.destroy();
  globalThis.fetch = priorFetch;
  if (priorDocument === undefined) delete globalThis.document; else globalThis.document = priorDocument;
}
