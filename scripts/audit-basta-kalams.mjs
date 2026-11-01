// Audits source-to-index mapping without touching or rewriting OCR material.
import { readFile, readdir } from "node:fs/promises";
import { buildBastaKalamCatalog } from "../src/lib/basta-kalam-units.ts";
import { auditBastaEditorial } from "../src/lib/basta-editorial-audit.ts";

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
const sourcePages = urdu.map((entry) => ({
  page: entry.page, urdu: entry.text, roman: romanByPage.get(entry.page),
}));
const catalog = buildBastaKalamCatalog(index, sourcePages);
const editorial = auditBastaEditorial(index, sourcePages);
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
  editorial,
};
if (process.argv.includes("--review")) {
  // Every uncertain fragment is linked to its original scan; the report does
  // not infer or silently approve OCR boundaries or printed stanza numbers.
  console.log("# Basta editorial source review");
  console.log("Generated from the current source/index; review against original scans before editing.");
  console.log("\n## Unverified indexed kalams (" + review.length + ")\n");
  console.log("| ID | Title | Page | Findings |");
  console.log("| --- | --- | --- | --- |");
  for (const item of report.review) {
    const scan = "https://kalamarchive.com/images/basta/original/" + String(item.page).padStart(3,"0") + ".png";
    const safe = (value) => String(value).replaceAll("|","\\|").replaceAll("\n"," ");
    console.log("| \`" + item.id + "` | " + safe(item.name) + " | [Page " + item.page + "](" + scan + ") | " +
      item.issues.map(safe).join("; ") + " |");
  }
  console.log("\n## Unassigned printed fragments (" + catalog.orphans.length + ")\n");
  console.log("| Page | Fragment | Opening text | Scan |");
  console.log("| --- | --- | --- | --- |");
  for (const orphan of catalog.orphans) {
    const scan = "https://kalamarchive.com/images/basta/original/" + String(orphan.page).padStart(3,"0") + ".png";
    console.log("| " + orphan.page + " | " + orphan.part + " | " +
      orphan.opening.replaceAll("|","\\|").replaceAll("\n"," ") + " | [Original scan](" + scan + ") |");
  }
  console.log("\n**Editorial rule:** review each excerpt and scan manually; never assign fragments by positional guesses.");
}
else if (process.argv.includes("--json")) console.log(JSON.stringify(report, null, 2));
else {
  console.log("Indexed kalams:", report.indexedKalams);
  console.log("Verified kalams:", report.mapped);
  console.log("Needs review:", report.needsReview);
  console.log("Verified numbered stanzas:", report.numberedStanzas);
  console.log("Unassigned page fragments:", report.orphanSourceFragments);
  console.log("Duplicate index references:", editorial.duplicateIndexEntries.length);
  console.log("Urdu/Roman page separator mismatches:", editorial.mismatchedPageBoundaries.length);
  console.log("Missing Roman title metadata:", editorial.missingRomanTitles.length);
  console.log("Source pages without Roman text (may be intentional):", editorial.absentRomanTranscriptions.length);
  for (const item of report.review.slice(0, 20))
    console.log("REVIEW", item.id, "page", item.page, item.issues.join("; "));
  if (review.length > 20) console.log("...use --json for the full report");
}
// A separate --strict mode is provided for enforcing complete verification.
// Normal audits report the remaining manual review workload, not pretend it is done.
if (process.argv.includes("--strict") &&
    (review.length || catalog.orphans.length || catalog.issues.length || editorial.duplicateIndexEntries.length || editorial.mismatchedPageBoundaries.length || editorial.nonMonotonicSectionNumbers.length)) process.exitCode = 1;
