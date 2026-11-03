#!/usr/bin/env node
// Read-only review across standalone lyrics and both editions in each Basta page source.
// Usage: npm run content:review [-- --json|--markdown|--summary|--strict]
import { readFile } from "node:fs/promises";
import { markdownFiles } from "./lib/source-files.mjs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildBastaKalamCatalog } from "../src/lib/basta-kalam-units.ts";
import { auditBastaEditorial } from "../src/lib/basta-editorial-audit.ts";
import { validateReviewedFragments } from "../src/lib/basta-fragment-roles.ts";
import { reviewMarkdown } from "../src/lib/source-review.ts";

const flags = new Set(process.argv.slice(2));
const allowed = new Set(["--json", "--markdown", "--csv", "--summary", "--strict", "--regression", "--help"]);
if ([...flags].some(x => !allowed.has(x))) {
  console.error("Usage: npm run content:review -- [--json|--markdown|--csv|--summary] [--strict|--regression]");
  process.exit(2);
}
if (flags.has("--help")) {
  console.log("Read-only editorial audit of ALL Basta and standalone Markdown sources.");
  console.log("Default: list every file needing review with line references and findings.");
  console.log("--markdown: scan-linked report; --json: structured report; --csv: spreadsheet-ready findings;");
  console.log("--summary: counts only; --strict: fail on all findings; --regression: fail on mapping errors or new editorial debt.");
  process.exit(0);
}
if (["--json", "--markdown", "--csv", "--summary"].filter(x => flags.has(x)).length > 1) {
  console.error("Choose only one report format");
  process.exit(2);
}

const root = fileURLToPath(new URL("../src/data/", import.meta.url));
async function collect(relative, kind) {
  const dir = join(root, relative);
  const names = await markdownFiles(dir, relative === "lyrics");
  return Promise.all(names.map(async (file) => {
    const path = "src/data/" + relative + "/" + file.slice(dir.length + 1).replaceAll("\\", "/");
    return reviewMarkdown({ path, kind, text: await readFile(file, "utf8") });
  }));
}

const [lyrics, pagesList] = await Promise.all([
  collect("lyrics", "lyrics"),
  collect("basta/pages", "basta-urdu"),
]);
const pages = new Map(pagesList.map(x => [x.page, x]));
const findings = [...lyrics, ...pagesList].flatMap(x => x.issues);
function issue(path, line, code, detail) {
  findings.push({ path, line, code, detail });
}
const settings = JSON.parse(await readFile(join(root, "basta/settings.json"), "utf8"));
for (const page of pagesList) {
  if (page.imageOnly && page.roman?.trim())
    issue(page.path, page.romanLine ?? 2, "image-only-transcription",
      "Roman text is present for an image-only Basta page; verify it belongs here");
  // No romanLyrics key means intentionally untranscribed: never generate or require it.
  if (page.fields.contentKind === "english-appendix" &&
      page.roman?.trim() && page.roman.trim() !== page.body.trim())
    issue(page.path, page.romanLine ?? 2, "appendix-edition-diff",
      "English appendix duplicate differs from the original source page");
}
const index = JSON.parse(await readFile(join(root, "basta/index.json"), "utf8"));
const fragmentRoles = JSON.parse(await readFile(join(root, "basta/fragment-roles.json"), "utf8"));
const sourcePages = pagesList.filter(x => !x.imageOnly &&
  x.fields.contentKind !== "english-appendix" &&
  x.fields.contentKind !== "editorial-note").map(x => ({
  page: x.page, urdu: x.body, roman: x.roman || undefined,
}));
const editorial = auditBastaEditorial(index, sourcePages);
let catalog;
try {
  catalog = buildBastaKalamCatalog(index, sourcePages, fragmentRoles.fragments);
} catch (error) {
  issue("src/data/basta/index.json", 1, "catalog-error",
    "Basta index-to-source mapping could not be built: " + String(error?.message ?? error));
  catalog = { kalams: [], orphans: [], assignments: {}, issues: [] };
}
const sourcePath = (page) => pages.get(page)?.path ??
  "src/data/basta/pages/" + String(page).padStart(3, "0") + ".md";
for (const item of catalog.kalams) {
  if (item.status === "review") {
    for (const message of item.issues)
      issue(sourcePath(item.startPage), 1, "basta-index-mapping",
        item.id + " (" + item.name + "): " + message);
  }
}
const reviewed = validateReviewedFragments(fragmentRoles,
  new Map(pagesList.map(page => [page.page, page.body])),
  catalog.orphans, catalog.assignments);
for (const finding of reviewed.issues)
  issue("src/data/basta/fragment-roles.json", 1, finding.code,
    finding.key + ": " + finding.detail);
for (const orphan of catalog.orphans) {
  if (reviewed.approved.has(orphan.page + ":" + orphan.part)) continue;
  // The book's front matter and prose pages are not poetry entries in the
  // printed index; they are not unassigned kalams needing editorial review.
  if (orphan.page < settings.romanLyricsStartPage) continue;
  issue(sourcePath(orphan.page), 1, "unassigned-fragment",
    "Printed fragment " + orphan.part + " not assigned to an indexed kalam: " + orphan.opening.slice(0, 95));
}
for (const message of catalog.issues) {
  const page = Number(message.match(/\bpage\s+(\d+)\b/i)?.[1]);
  issue(Number.isSafeInteger(page) ? sourcePath(page) : "src/data/basta/index.json",
    1, "basta-source-mapping", message);
}
for (const key of editorial.duplicateIndexEntries)
  issue("src/data/basta/index.json", 1, "duplicate-index", "Duplicate section/number: " + key);
for (const key of editorial.nonMonotonicSectionNumbers)
  issue("src/data/basta/index.json", 1, "index-order", "Index sequence is not increasing: " + key);
for (const key of editorial.missingRomanTitles)
  issue("src/data/basta/index.json", 1, "missing-roman-title", "Indexed kalam has no Roman title: " + key);
// Missing Roman source and fragment mismatch are already identified above.
const unique = new Map();
for (const item of findings) {
  const key = [item.path, item.line, item.code, item.detail].join("\0");
  unique.set(key, item);
}
const all = [...unique.values()].sort((a,b) =>
  a.path.localeCompare(b.path, "en", { numeric: true }) || a.line - b.line ||
  a.code.localeCompare(b.code));
const byFile = new Map();
for (const f of all) {
  const entry = byFile.get(f.path) || [];
  entry.push(f);
  byFile.set(f.path, entry);
}
const files = [...byFile].map(([path, issues]) => ({
  path, issues, scan: (() => {
    const n = Number(path.match(/src\/data\/basta\/pages\/(\d+)\.md$/)?.[1]);
    if (!Number.isSafeInteger(n) || !n) return null;
    return "https://kalamarchive.com/images/basta/original/" + String(n).padStart(3, "0") + ".png";
  })(),
}));
const byCode = Object.fromEntries([...new Set(all.map(x => x.code))].sort().map(code =>
  [code, all.filter(x => x.code === code).length]));
const baseline = flags.has("--regression")
  ? JSON.parse(await readFile(join(root, "basta/review-baseline.json"), "utf8"))
  : undefined;
const hardErrors = new Set([
  "catalog-error", "basta-index-mapping", "unassigned-fragment",
  "stale-fragment-role", "invalid-fragment-role", "basta-source-mapping",
  "duplicate-index", "index-order", "fragment-count", "stanza-number-mismatch",
  "missing-roman-title", "page-metadata", "frontmatter",
  "invalid-stanza-exception", "stale-stanza-exception",
]);
const regressions = [];
if (baseline) {
  if (baseline.version !== 1 || !baseline.counts) throw Error("Invalid editorial baseline");
  const countsByFile = new Map();
  for (const finding of all) {
    const key = finding.path + "\0" + finding.code;
    countsByFile.set(key, (countsByFile.get(key) || 0) + 1);
    const permitted = baseline.counts[finding.path]?.[finding.code] ?? 0;
    if (hardErrors.has(finding.code) || countsByFile.get(key) > permitted)
      regressions.push(finding);
  }
}
const report = {
  scanned: { lyrics: lyrics.length, bastaPages: pagesList.length,
    bastaPagesWithRoman: pagesList.filter(page => Boolean(page.roman?.trim())).length },
  filesNeedingReview: files.length,
  totalFindings: all.length,
  findingCounts: byCode,
  ...(baseline ? { regressions: regressions.length } : {}),
  bastaCatalog: {
    indexedKalams: catalog.kalams.length,
    verifiedKalams: catalog.kalams.filter(x => x.status === "ready").length,
    unverifiedKalams: catalog.kalams.filter(x => x.status === "review").length,
    orphanFragments: catalog.orphans.filter(x =>
      x.page >= settings.romanLyricsStartPage &&
      !reviewed.approved.has(x.page + ":" + x.part)).length,
    reviewedSupplements: reviewed.approved.size,
    nonPoetryFragmentsExcluded: catalog.orphans.filter(x => x.page < settings.romanLyricsStartPage).length,
    romanMissingPages: editorial.absentRomanTranscriptions.filter(page => page >= settings.romanLyricsStartPage).length,
    untranscribedFrontMatterPages: editorial.absentRomanTranscriptions.filter(page => page < settings.romanLyricsStartPage).length,
  },
  files,
};
const intro = "Audited " + (lyrics.length + pagesList.length) +
  " Markdown files (" + lyrics.length + " standalone, " + pagesList.length +
  " Basta pages, " + pagesList.filter(page => Boolean(page.roman?.trim())).length +
  " with Roman). " + files.length +
  " files need review (" + all.length + " findings).";
if (flags.has("--csv")) {
  // UTF-8 BOM lets spreadsheet applications recognize Urdu without re-encoding.
  const quote = value => '"' + String(value ?? "").replaceAll('"', '""') + '"';
  console.log("\uFEFF" + ["file", "line", "check", "detail", "source_scan"].map(quote).join(","));
  for (const file of files) for (const item of file.issues)
    console.log([file.path, item.line, item.code, item.detail, file.scan ?? ""].map(quote).join(","));
} else if (flags.has("--json")) console.log(JSON.stringify(report, null, 2));
else if (flags.has("--summary")) {
  console.log(intro);
  for (const [code, count] of Object.entries(byCode)) console.log("  " + code + ": " + count);
} else if (flags.has("--markdown")) {
  console.log("# Kalam Archive source review");
  console.log("\n" + intro);
  console.log("\n**Review is advisory.** Counts may include deliberate refrains, prose, quotations, untranscribed pages, or editorial uncertainties. Do not auto-correct source text or map unidentified OCR fragments by guesswork.");
  console.log("\n## Findings by type\n");
  console.log("| Check | Findings |\n| --- | ---: |");
  for (const [code, count] of Object.entries(byCode)) console.log("| " + code + " | " + count + " |");
  console.log("\n## Files requiring review\n");
  const safe = value => String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
  for (const file of files) {
    console.log("### " + file.path + (file.scan ? " · [Source scan](" + file.scan + ")" : ""));
    for (const f of file.issues)
      console.log("- Line " + f.line + " [" + f.code + "]: " + safe(f.detail));
    console.log("");
  }
  console.log("## Basta catalog status");
  console.log("\n" + JSON.stringify(report.bastaCatalog, null, 2));
} else {
  console.log(intro);
  for (const file of files) {
    console.log("\n" + file.path + " (" + file.issues.length + " findings)" +
      (file.scan ? " · scan: " + file.scan : ""));
    for (const f of file.issues) console.log("  L" + f.line + " [" + f.code + "] " + f.detail);
  }
  console.log("\nRun with --markdown for scan links, --csv for spreadsheet review, --json for structured data, or --summary for counts.");
}
if (baseline) {
  console.log("\nEditorial regression gate: " + regressions.length + " new or structural findings.");
  for (const issue of regressions.slice(0, 30))
    console.log("  " + issue.path + ":" + issue.line + " [" + issue.code + "] " + issue.detail);
  if (regressions.length) process.exitCode = 1;
}
if (flags.has("--strict") && all.length) process.exitCode = 1;
