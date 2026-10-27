// Audits source-to-index mapping without touching or rewriting OCR material.
import { readFile, readdir } from "node:fs/promises";
import { buildBastaKalamCatalog } from "../src/lib/basta-kalam-units.ts";

const root = new URL("../src/data/basta/", import.meta.url);
const index = JSON.parse(await readFile(new URL("index.json", root), "utf8"));
async function sourceDir(relative) {
  const dir = new URL(relative + "/", root);
  const names = (await readdir(dir)).filter((name) => /^[0-9]+\.md$/.test(name));
  const entries = await Promise.all(names.map(async (name) => {
    const text = await readFile(new URL(name, dir), "utf8");
    const frontMatter = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
    if (!frontMatter) throw new Error("Missing YAML header: " + relative + "/" + name);
    return { page: Number(name.slice(0, -3)), text: text.slice(frontMatter[0].length),
      imageOnly: /^imageOnly:\s*true\s*$/m.test(frontMatter[0]) };
  }));
  return entries.filter((entry) => !entry.imageOnly);
}
const [urdu, roman] = await Promise.all([sourceDir("pages"), sourceDir("roman")]);
const romanByPage = new Map(roman.map((entry) => [entry.page, entry.text]));
const catalog = buildBastaKalamCatalog(index, urdu.map((entry) => ({
  page: entry.page, urdu: entry.text, roman: romanByPage.get(entry.page),
})));
const ready = catalog.kalams.filter((item) => item.status === "ready");
const review = catalog.kalams.filter((item) => item.status === "review");
const report = {
  indexedKalams: catalog.kalams.length,
  mapped: ready.length,
  needsReview: review.length,
  numberedKalams: ready.filter((item) => item.numbered).length,
  numberedStanzas: ready.reduce((sum, item) => sum + item.stanzas.length, 0),
  orphanSourceFragments: catalog.orphans.length,
  review: review.map((item) => ({
    id: item.id, name: item.name, page: item.startPage, issues: item.issues,
  })),
  orphans: catalog.orphans,
  sourceIssues: catalog.issues,
};
if (process.argv.includes("--json")) console.log(JSON.stringify(report, null, 2));
else {
  console.log("Indexed kalams:", report.indexedKalams);
  console.log("Verified kalams:", report.mapped);
  console.log("Needs review:", report.needsReview);
  console.log("Verified numbered stanzas:", report.numberedStanzas);
  console.log("Unassigned page fragments:", report.orphanSourceFragments);
  for (const item of report.review.slice(0, 20))
    console.log("REVIEW", item.id, "page", item.page, item.issues.join("; "));
  if (review.length > 20) console.log("...use --json for the full report");
}
// A separate --strict mode is provided for enforcing complete verification.
// Normal audits report the remaining manual review workload, not pretend it is done.
if (process.argv.includes("--strict") &&
    (review.length || catalog.orphans.length || catalog.issues.length)) process.exitCode = 1;
