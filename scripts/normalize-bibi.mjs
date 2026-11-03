#!/usr/bin/env node
// Content-only normalization, called by source:sync/source:check.
// Does not touch URLs, media paths, generated files, or non-content Markdown.
import { readFile, writeFile } from "node:fs/promises";
import { markdownFiles } from "./lib/source-files.mjs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeBibiText } from "../src/lib/bibi-spelling.ts";

const args = new Set(process.argv.slice(2));
if ([...args].some(arg => !["--write", "--check"].includes(arg)) ||
    (args.has("--write") && args.has("--check")))
  throw Error("Use --write or --check, not both");
const root = fileURLToPath(new URL("../", import.meta.url));
const dirs = ["src/data/lyrics", "src/data/basta/pages"];
const files = (await Promise.all(dirs.map(dir =>
  markdownFiles(join(root, dir), dir === "src/data/lyrics")
))).flat();
let affected = 0, replacements = 0;
for (const path of files) {
  const before = await readFile(path, "utf8");
  const after = before.split("\n").map(line => {
    // File paths and outgoing links are identifiers, not poetry.
    if (/^\s*(?:cover|originalImage|coverAlt|sourceImage|image|url|href):/u.test(line) ||
        /https?:\/\//u.test(line)) return line;
    return normalizeBibiText(line);
  }).join("\n");
  if (before === after) continue;
  const previousLines = before.split("\n"), nextLines = after.split("\n");
  const changed = previousLines.map((text, i) => ({old: text, updated: nextLines[i], line: i+1}))
    .filter(x => x.old !== x.updated);
  affected++;
  replacements += changed.length;
  const name = relative(root, path).replaceAll("\\", "/");
  console.log(name + ": " + changed.length + " lines");
  for (const item of changed.slice(0, 12))
    console.log("  L" + item.line + " " + item.old.trim().slice(0, 105)
      + " => " + item.updated.trim().slice(0, 105));
  if (args.has("--write")) await writeFile(path, after);
}
console.log("Scanned " + files.length + " poetry Markdown files; "
  + affected + " files and " + replacements + " lines require normalization.");
if (args.has("--check") && affected) process.exitCode = 1;
