#!/usr/bin/env node
// Repair mechanical Git whitespace errors without interpreting Urdu/Roman text.
// Keep every internal blank line, verse, YAML literal indent and source marker.
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const flags = new Set(process.argv.slice(2));
const allowed = new Set(["--check", "--write", "--changed", "--all", "--staged", "--help"]);
if ([...flags].some(flag => !allowed.has(flag)) ||
    (flags.has("--write") && flags.has("--check")) ||
    ["--changed", "--all", "--staged"].filter(flag => flags.has(flag)).length > 1) {
  console.error("Usage: node scripts/tidy-whitespace.mjs [--check|--write] [--changed|--staged|--all]");
  process.exit(2);
}
if (flags.has("--help")) {
  console.log("--changed (default): files changed against main, including worktree edits.");
  console.log("--staged: staged files only. --all: every tracked text file.");
  console.log("--check (default): report only. --write: apply mechanical whitespace fixes.");
  process.exit(0);
}

function git(...args) {
  const run = spawnSync("git", args, { cwd: root, encoding: "buffer", maxBuffer: 32 * 1024 * 1024 });
  if (run.error || run.status !== 0) {
    throw Error("git " + args.join(" ") + ": " + (run.stderr?.toString("utf8") || run.error));
  }
  return run.stdout;
}
const list = buffer => buffer.toString("utf8").split("\0").filter(Boolean);
const scope = flags.has("--all") ? "--all" : flags.has("--staged") ? "--staged" : "--changed";
const paths = new Set();
if (scope === "--all") {
  for (const path of list(git("ls-files", "-z"))) paths.add(path);
} else if (scope === "--staged") {
  for (const path of list(git("diff", "--cached", "--name-only", "-z", "--diff-filter=ACMR"))) paths.add(path);
} else {
  const base = ["origin/main", "main"].find(name =>
    spawnSync("git", ["rev-parse", "--verify", name], { cwd: root, stdio: "ignore" }).status === 0);
  if (!base) throw Error("Cannot find origin/main or main. Use --all or fetch the base branch.");
  const mergeBase = git("merge-base", "HEAD", base).toString("utf8").trim();
  for (const path of list(git("diff", "--name-only", "-z", "--diff-filter=ACMR", mergeBase, "HEAD")))
    paths.add(path);
  for (const path of list(git("diff", "--name-only", "-z", "--diff-filter=ACMR"))) paths.add(path);
  for (const path of list(git("diff", "--cached", "--name-only", "-z", "--diff-filter=ACMR"))) paths.add(path);
  for (const path of list(git("ls-files", "--others", "--exclude-standard", "-z"))) paths.add(path);
}
const types = new Set([".md", ".mjs", ".js", ".ts", ".tsx", ".jsx", ".astro",
  ".css", ".json", ".yml", ".yaml", ".toml", ".csv", ".txt"]);
const tidy = text => {
  if (!text) return text;
  // CRLF, trailing ASCII spaces/tabs, and all EOF newlines (including the final one).
  // Do not trim leading/interior whitespace or normalize Unicode.
  return text.replace(/\r\n?/gu, "\n").replace(/[ \t]+$/gmu, "")
    .replace(/\n+$/u, "");
};
const write = flags.has("--write");
let checked = 0, changed = 0;
for (const path of [...paths].sort()) {
  if (!types.has(extname(path))) continue;
  const full = join(root, path);
  if (!existsSync(full)) continue;
  const raw = await readFile(full);
  if (raw.includes(0)) continue;
  const original = new TextDecoder("utf-8", { fatal: true }).decode(raw);
  const normalized = tidy(original);
  checked++;
  if (normalized === original) continue;
  changed++;
  console.log((write ? "Fixed: " : "Needs cleanup: ") + path);
  if (write) await writeFile(full, normalized, "utf8");
}
console.log(checked + " text files inspected; " + changed + (write ? " cleaned." : " need cleanup."));
if (!write && changed) process.exitCode = 1;
