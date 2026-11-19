// One-time round2 BCP47 migration. Never changes verses or romanLyrics.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const folder = fileURLToPath(new URL("../src/data/lyrics/", import.meta.url));
const tags = new Map([
  ["Urdu", "ur"], ["Panjabi", "pa-Arab"], ["Punjabi", "pa-Arab"],
  ["Saraiki", "skr-Arab"], ["Balti", "bft-Arab"],
]);
function scalar(header, key) {
  const m = header.match(new RegExp("^" + key + ":\\s*([^\\r\\n]*)$", "m"));
  return m?.[1].trim().replace(/^["']|["']$/g, "");
}
export function migrateLanguageCode(text) {
  const fm = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(text);
  if (!fm) return { text, outcome: "unreadable" };
  const h = fm[1], language = scalar(h, "language"), direction = scalar(h, "direction");
  const expected = tags.get(language);
  // Do not turn Latin originals into Arabic-script sources. Remaining "Roman Urdu"
  // metadata must be adjudicated manually in round2 rather than auto-converted.
  if (!expected || direction !== "rtl") return { text, outcome: "skipped" };
  const existing = scalar(h, "lang");
  if (existing === expected) return { text, outcome: "already-correct" };
  const next = existing === undefined
    ? h.replace(/^language:[^\r\n]*$/m, line => line + "\nlang: " + expected)
    : h.replace(/^lang:[^\r\n]*$/m, line => {
        const raw = line.split(":").slice(1).join(":").trim();
        const q = raw.startsWith('"') ? '"' : raw.startsWith("'") ? "'" : "";
        return "lang: " + q + expected + q;
      });
  const offset = text.indexOf(h, fm.index);
  return { text: text.slice(0, offset) + next + text.slice(offset + h.length), outcome: "changed" };
}
export async function runMigration(directory = folder, write = false) {
  const names = (await readdir(directory)).filter(x => x.endsWith(".md")).sort();
  const counts = { scanned: 0, changed: 0, "already-correct": 0, skipped: 0, unreadable: 0 };
  for (const name of names) {
    const path = resolve(directory, name);
    const result = migrateLanguageCode(await readFile(path, "utf8"));
    counts.scanned++;
    counts[result.outcome]++;
    if (write && result.outcome === "changed") await writeFile(path, result.text, "utf8");
  }
  return counts;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const write = process.argv.includes("--write");
  if (write === process.argv.includes("--check")) {
    console.error("Choose exactly one: --check or --write");
    process.exitCode = 2;
  } else {
    const stats = await runMigration(folder, write);
    console.log(JSON.stringify({ mode: write ? "write" : "check", ...stats }, null, 2));
    if (stats.unreadable) process.exitCode = 2;
    else if (!write && stats.changed) process.exitCode = 1;
  }
}
