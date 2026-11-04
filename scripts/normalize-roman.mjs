#!/usr/bin/env node
// One corpus-wide pass; preserves untouched text/metadata and reports unaligned editions.
import { readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { markdownFiles } from "./lib/source-files.mjs";
import { normalizeRomanMarkdown } from "./lib/roman-normalize.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const mode = process.argv[2] || "--report";
if (!["--write", "--check", "--report"].includes(mode))
  throw Error("Usage: node scripts/normalize-roman.mjs --write|--check|--report");
const sources = [
  ...await markdownFiles(join(root, "src/data/lyrics")),
  ...await markdownFiles(join(root, "src/data/basta/pages")),
];
const changed = [], findings = [];
let marked = 0, paired = 0;
for (const sourcePath of sources) {
  const path = relative(root, sourcePath).replace(/\\/g, "/");
  const content = await readFile(sourcePath, "utf8");
  // A spelling substitution can expose a previously hyphenated or obscured
  // word alignment. Iterate only the reviewed deterministic rules to a fixpoint.
  let candidate = content, result, totalMarked = 0, passes = 0;
  while (passes < 8) {
    result = normalizeRomanMarkdown(candidate, path);
    totalMarked += result.underlined || 0;
    if (!result.changed) break;
    candidate = result.text;
    passes++;
  }
  if (result.changed) throw Error("Roman normalizer did not converge: " + path);
  if (candidate !== content) {
    changed.push(path);
    if (mode === "--write") await writeFile(sourcePath, candidate);
  }
  marked += totalMarked;
  paired += result.paired || 0;
  for (const detail of result.findings) findings.push({ path, detail });
}
console.log(JSON.stringify({ scanned: sources.length, changed: changed.length,
  underlined: marked, pairedRomanUrduLines: paired,
  filesChanged: changed, findings }, null, 2));
if (mode === "--check" && changed.length) process.exitCode = 1;
