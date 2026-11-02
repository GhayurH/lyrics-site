#!/usr/bin/env node
// Reconcile Basta index labels against current source Markdown.
// The index is authoritative for section, numbering and page assignment;
// this command never modifies lyric pages, printed stanza breaks or identities.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = path.join(root, "src/data/basta/index.json");
const sourceDir = path.join(root, "src/data/basta");
const check = process.argv.includes("--check");
if (process.argv.some((argument) => argument.startsWith("--") && argument !== "--check")) {
  console.error("Usage: node scripts/sync-basta-index.mjs [--check]");
  process.exit(2);
}
const minimumScore = 0.78;

function normalize(value, script) {
  let result = value.normalize("NFKD").replace(/\p{M}/gu, "");
  if (script === "roman")
    return result.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
  return result.normalize("NFKC")
    .replace(/[ؐؑؒؓﷺ]/gu, "")
    .replace(/[يىئ]/gu, "ی").replace(/ك/gu, "ک")
    .replace(/[ۀة]/gu, "ہ").replace(/ؤ/gu, "و").replace(/[أإآ]/gu, "ا")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim().replace(/\s+/g, " ").toLowerCase();
}
function editSimilarity(a, b) {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++)
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    previous.splice(0, previous.length, ...current);
  }
  return 1 - previous[b.length] / Math.max(a.length, b.length);
}
function diceBigrams(a, b) {
  const left = a.replace(/\s+/g, ""), right = b.replace(/\s+/g, "");
  if (left === right) return 1;
  if (left.length < 2 || right.length < 2) return 0;
  const grams = (text) => {
    const result = new Map();
    for (let i = 0; i < text.length - 1; i++) {
      const pair = text.slice(i, i + 2);
      result.set(pair, (result.get(pair) ?? 0) + 1);
    }
    return result;
  };
  const counts = grams(left);
  let overlap = 0;
  for (const [pair, count] of grams(right))
    overlap += Math.min(count, counts.get(pair) ?? 0);
  return 2 * overlap / (left.length + right.length - 2);
}
function diceTokens(a, b) {
  const left = new Set(a.split(" ").filter(Boolean));
  const right = new Set(b.split(" ").filter(Boolean));
  if (!left.size || !right.size) return 0;
  return 2 * [...left].filter((term) => right.has(term)).length / (left.size + right.size);
}
function similarity(seed, candidate, script) {
  const a = normalize(seed, script), b = normalize(candidate, script);
  if (!a || !b) return 0;
  if (a === b) return 1;
  let value = 0.5 * editSimilarity(a, b) +
    0.3 * diceBigrams(a, b) + 0.2 * diceTokens(a, b);
  if (a.includes(b) || b.includes(a))
    value = Math.max(value, 0.85 * Math.min(a.length, b.length) / Math.max(a.length, b.length) + 0.1);
  return Math.min(value, 1);
}
async function loadPages(kind) {
  const directory = path.join(sourceDir, kind);
  const files = (await fs.readdir(directory)).filter((file) => /^\d+\.md$/.test(file));
  const result = new Map();
  for (const file of files) {
    const raw = (await fs.readFile(path.join(directory, file), "utf8")).replace(/\r\n?/g, "\n");
    const head = raw.match(/^---\n[\s\S]*?\n---(?:\n|$)/u);
    if (!head) throw Error("Unterminated Markdown frontmatter: " + file);
    const lines = raw.slice(head[0].length).split("\n")
      .map((line) => line.trim()).filter((line) => line && line !== "---***---");
    result.set(Number(file.slice(0, -3)), lines);
  }
  return result;
}
function bestMatch(label, lines, script) {
  // On ties, prefer the earliest match. Titles and refrains may share wording.
  let result = { score: 0, text: "" };
  for (const line of lines ?? []) {
    const score = similarity(label, line, script);
    if (score > result.score + Number.EPSILON) result = { score, text: line };
  }
  return result;
}
async function main() {
  const original = await fs.readFile(indexPath, "utf8");
  const entries = JSON.parse(original);
  const [urdu, roman] = await Promise.all([loadPages("pages"), loadPages("roman")]);
  const warnings = [];
  let changedUrdu = 0, changedRoman = 0;
  const ids = new Set();
  for (const entry of entries) {
    const key = entry.sectionRoman + ":" + entry.number;
    if (ids.has(key)) throw Error("Duplicate indexed poem: " + key);
    ids.add(key);
    if (!Number.isSafeInteger(entry.page) || entry.page < 1)
      throw Error("Invalid indexed page: " + key);
    for (const [field, source, script] of [
      ["name", urdu, "urdu"], ["romanName", roman, "roman"],
    ]) {
      if (!entry[field]) continue;
      const lines = source.get(entry.page);
      if (!lines) continue; // An untranscribed page is not a title correction.
      const { score, text } = bestMatch(entry[field], lines, script);
      if (score < minimumScore) {
        warnings.push(key + " on page " + entry.page + " (" + script +
          ", score " + score.toFixed(3) + "): " + entry[field]);
        continue;
      }
      if (entry[field] !== text) {
        entry[field] = text;
        if (script === "urdu") changedUrdu++;
        else changedRoman++;
      }
    }
  }
  const updated = JSON.stringify(entries, null, 2) + "\n";
  if (!check && updated !== original) await fs.writeFile(indexPath, updated, "utf8");
  console.log((check ? "Checked" : "Synchronized") +
    " Basta index labels; lyric Markdown and stanza breaks unchanged.");
  console.log("  Urdu titles " + (check ? "out of sync" : "updated") + ": " + changedUrdu);
  console.log("  Roman titles " + (check ? "out of sync" : "updated") + ": " + changedRoman);
  if (warnings.length) {
    console.warn("  " + warnings.length + " low-confidence title(s) require manual review:");
    for (const warning of warnings) console.warn("  - " + warning);
  }
  if (check && updated !== original) process.exitCode = 1;
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
