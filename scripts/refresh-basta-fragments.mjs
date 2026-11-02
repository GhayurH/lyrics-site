#!/usr/bin/env node
// A reviewed fragment's role is durable editorial data; only its opening
// fingerprint may be reapproved, explicitly by printed page, after an edit.
import { readFile, writeFile } from "node:fs/promises";
import { bastaPageSources } from "./lib/source-files.mjs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { buildBastaKalamCatalog, splitBastaSource } from "../src/lib/basta-kalam-units.ts";
import { validateReviewedFragments } from "../src/lib/basta-fragment-roles.ts";

const root = fileURLToPath(new URL("../src/data/basta/", import.meta.url));
const args = process.argv.slice(2);
const approve = args.length === 1 && /^--pages=\d+(?:,\d+)*$/.test(args[0]);
if (!approve && !(args.length === 1 && args[0] === "--check")) {
  console.error("Usage: node scripts/refresh-basta-fragments.mjs --check | --pages=138,421");
  process.exit(2);
}
const permittedPages = new Set(approve ? args[0].slice("--pages=".length).split(",").map(Number) : []);
const urdu = await bastaPageSources(join(root, "pages"));
const roman = new Map([...await bastaPageSources(join(root, "roman"))]
  .map(([page, source]) => [page, source.body]));
const sourcePages = [...urdu].filter(([_, data]) =>
  !/^imageOnly:\s*true$/m.test(data.header) &&
  !/^published:\s*false$/m.test(data.header) &&
  !/^contentKind:/m.test(data.header)).map(([page, data]) =>
    ({ page, urdu: data.body, roman: roman.get(page) }));
const manifestPath = join(root, "fragment-roles.json");
const original = await readFile(manifestPath, "utf8");
const manifest = JSON.parse(original);
const updated = structuredClone(manifest);
const changed = [];
for (const [key, decision] of Object.entries(updated.fragments)) {
  const [page, part] = key.split(":").map(Number);
  const source = urdu.get(page);
  const opening = source && splitBastaSource(source.body)[part - 1]
    ?.split("\n").find(line => line.trim())?.trim();
  if (opening === decision.opening) continue;
  changed.push({ key, before: decision.opening, after: opening });
  if (approve && permittedPages.has(page) && opening) decision.opening = opening;
}
for (const record of changed) {
  console.log(record.key + ": " + JSON.stringify(record.before) + " => " + JSON.stringify(record.after));
}
if (approve && changed.some(({ key }) => !permittedPages.has(Number(key.split(":")[0])))) {
  console.error("Approval must name every changed page; no changes written.");
  process.exit(1);
}
if (approve && [...permittedPages].some(page =>
  !changed.some(({ key }) => Number(key.split(":")[0]) === page))) {
  console.error("Requested page has no changed opening; no changes written.");
  process.exit(1);
}
const index = JSON.parse(await readFile(join(root, "index.json"), "utf8"));
const catalog = buildBastaKalamCatalog(index, sourcePages, updated.fragments);
const validation = validateReviewedFragments(updated,
  new Map(sourcePages.map(item => [item.page, item.urdu])),
  catalog.orphans, catalog.assignments);
const issues = [...validation.issues.map(x => x.key + ": " + x.detail),
  ...catalog.kalams.filter(x => x.status === "review").flatMap(x =>
    x.issues.map(detail => x.id + ": " + detail)),
  ...catalog.issues];
if (issues.length) {
  for (const issue of issues.slice(0, 35)) console.error(issue);
  console.error("Fragment mapping is ambiguous; review source/index assignments before approving.");
  process.exit(1);
}
if (!approve && changed.length) {
  console.error("Reviewed fragment openings changed. After inspecting the source scans, run " +
    "npm run source:sync -- --approve-fragments=" +
    [...new Set(changed.map(item => Number(item.key.split(":")[0])))].sort((a,b)=>a-b).join(","));
  process.exit(1);
}
if (approve && changed.length) {
  await writeFile(manifestPath, JSON.stringify(updated, null, 2) + "\n");
  console.log("Approved " + changed.length + " opening fingerprint(s); existing fragment roles and IDs unchanged.");
} else {
  console.log("Verified " + Object.keys(manifest.fragments).length + " reviewed fragment assignments.");
}
