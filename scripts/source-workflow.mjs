#!/usr/bin/env node
// Canonical source-change pipeline. Direct Node child processes avoid nested
// npm aliases; each specialist retains a runnable, independently safe CLI.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const [mode, ...flags] = process.argv.slice(2);
if (!["--check", "--sync"].includes(mode) ||
    flags.length > 1 ||
    flags.some(flag => !/^--approve-fragments=\d+(?:,\d+)*$/.test(flag)) ||
    (mode === "--check" && flags.length)) {
  console.error("Usage: npm run source:check | npm run source:sync [-- --approve-fragments=138,421]");
  process.exit(2);
}

const root = fileURLToPath(new URL("../", import.meta.url));
const approvedPages = flags[0]?.split("=")[1];
const review = ["Editorial and mapping regressions", "review-content.mjs", "--summary", "--regression"];
const stages = mode === "--check"
  ? [
      ["Canonical Bibi spelling", "normalize-bibi.mjs", "--check"],
      ["Basta index title labels", "sync-basta-index.mjs", "--check"],
      ["Permanent recitation identities", "recitation-identities.mjs", "--check"],
      review,
    ]
  : [
      ["Normalize Bibi spelling", "normalize-bibi.mjs", "--write"],
      ["Reconcile Basta title labels", "sync-basta-index.mjs"],
      ["Verify reviewed fragment openings", "refresh-basta-fragments.mjs",
        approvedPages ? "--pages=" + approvedPages : "--check"],
      ["Synchronize permanent recitation identities", "recitation-identities.mjs", "--sync"],
      // Mutators validate their own output. Do not rerun all four source
      // checks; the final regression gate checks cross-file constraints.
      review,
    ];

for (const [label, script, ...args] of stages) {
  console.log("\n=== " + label + " ===");
  const stripTypes = script === "sync-basta-index.mjs" ? [] : ["--experimental-strip-types"];
  const result = spawnSync(process.execPath, [...stripTypes, "scripts/" + script, ...args], {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });
  if (result.error || result.status !== 0) {
    console.error("\nSource " + (mode === "--sync" ? "sync" : "check") + " stopped at " + label + ".");
    if (result.error) console.error(result.error);
    if (mode === "--sync") console.error(
      "Inspect any changed Markdown/metadata before retrying; source IDs and " +
      "reviewed fragment roles must never be reassigned without review.");
    process.exit(result.status || 1);
  }
}
console.log("\nSource " + (mode === "--sync" ? "synchronization" : "validation") +
  " passed. The production build refreshes rendered pages, Pagefind and the offline manifest.");
