import { existsSync, readFileSync } from "node:fs";
import { analyzeBuild } from "./lib/build-budgets.mjs";

const args = process.argv.slice(2);
let root = "dist", budgets = {}, check = false, json = false;
try {
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--check") check = true;
    else if (arg === "--json") json = true;
    else if (arg === "--root" && args[index + 1]) root = args[++index];
    else if (arg === "--budgets" && args[index + 1]) budgets = JSON.parse(readFileSync(args[++index], "utf8"));
    else throw Error(`Unknown or incomplete argument: ${arg}`);
  }
  if (!existsSync(root)) throw Error(`Build ${root}/ first`);
  const report = analyzeBuild(root, budgets);
  if (json) console.log(JSON.stringify(report, null, 2));
  else {
    const kib = bytes => (bytes / 1024).toFixed(1) + " KiB";
    console.log(`Build output: ${report.totals.files} files, ${(report.totals.bytes / 1048576).toFixed(1)} MiB, ${report.totals.htmlPages} HTML pages`);
    console.log("Output by type: " + JSON.stringify(report.byType));
    console.log(`Pagefind: ${report.pagefind.files} files, ${kib(report.pagefind.bytes)}`);
    console.log("Largest output files:\n" + report.largestFiles.map(file => `  ${file.path}: ${kib(file.bytes)}`).join("\n"));
    console.log("Representative initial JavaScript (static imports + inline, gzip estimate):\n" +
      report.initialJs.representative.map(page => `  ${page.path}: ${kib(page.initialJsGzipBytes)}`).join("\n"));
    console.log("Largest collection pages:\n" + report.collectionPages.largest
      .map(page => `  ${page.path}: ${kib(page.bytes)}, ${page.openingTags} opening tags`).join("\n"));
    if (report.violations.length) console.error("Budget violations:\n" + report.violations
      .map(item => `  ${item.budget}: ${item.path} = ${item.actual} (limit ${item.limit})`).join("\n"));
    else console.log("All deterministic build budgets passed.");
    console.log("These are output limits, not measured transfer sizes or timing guarantees. Optional dynamic chunks are excluded from initial JS; browser performance tests measure actual loading.");
    console.log("Deployment file budget defaults to 20,000. Use --budgets <JSON> only for an explicitly reviewed budget or confirmed hosting plan.");
  }
  if (check && report.violations.length) process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
