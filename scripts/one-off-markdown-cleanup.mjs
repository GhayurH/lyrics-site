// One-time corpus audit. Review the report before enabling changes.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
const roots = ["src/data", "docs", "audit", "public", "."];
const excludes = new Set([".git", "node_modules", ".astro", "dist", "coverage", "test-results", "playwright-report", "old"]);
async function list(directory) {
  const found = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (excludes.has(item.name)) continue;
    const p = join(directory, item.name);
    if (item.isDirectory()) found.push(...await list(p));
    else if (item.name.endsWith(".md")) found.push(p);
  }
  return found;
}
const matches = (s, r) => [...s.matchAll(r)].length;
const counters = new Map();
const add = (key, filename, line, sample) => {
  const entry = counters.get(key) ?? { count: 0, files: new Set(), samples: [] };
  entry.count++; entry.files.add(filename);
  if (entry.samples.length < 24) entry.samples.push(filename + ":" + line + " " + sample.slice(0, 150));
  counters.set(key, entry);
};
const isContent = (p) => p.startsWith("src/data/");
const apply = process.argv.includes("--write");
let changedFiles = 0, changedLines = 0;
const files = await list(".");
for (const f of files.sort()) {
  const p = relative(".", f).replaceAll("\\", "/");
  const original = await readFile(f, "utf8");
  let fence = false;
  const out = original.split("\n").map((line, i) => {
    if (/^\s*(?:\x60{3,}|~{3,})/.test(line)) { fence = !fence; return line; }
    if (fence || /^\s*\|/.test(line) || /^\s*(?:-{3,}|={3,})\s*$/.test(line)) return line;
    if (/(\S)[ \t\u00A0\u2007\u202F]{2,}(?=\S)/u.test(line))
      add("repeated_internal_whitespace", p, i+1, line);
    if (/(\S)[\t\u00A0\u2007\u202F](?=\S)/u.test(line))
      add("internal_tab_or_nonbreaking_space", p, i+1, line);
    if (/[\u200B\uFEFF\u2060]/u.test(line))
      add("zero_width_or_word_joiner", p, i+1, line);
    if (/[\t ]+$/u.test(line)) add("trailing_ascii_whitespace", p, i+1, line);
    if (/[�]/u.test(line)) add("replacement_character", p, i+1, line);
    if (/[,،]{2,}/u.test(line)) add("repeated_comma", p, i+1, line);
    if (/([!?؟])\1/u.test(line)) add("repeated_question_or_exclamation", p, i+1, line);
    if (isContent(p) && /[كۀة]/u.test(line)) add("arabic_kaf_heh_teh_marbuta", p, i+1, line);
    if (isContent(p) && /[يهى]/u.test(line) && !p.includes("basta/roman/"))
      add("arabic_yeh_or_heh",p,i+1,line);
    if (p.includes("basta/roman/") && /[\u0600-\u06FF]/u.test(line))
      add("arabic_in_roman_edition", p, i+1, line);
    if (isContent(p) && /(?:\bHussain\b|\bHassan\b|\bBolay\b|\bbolay\b)/iu.test(line))
      add("roman_style_variant", p, i+1, line);
    if (/\s[,.!?;:،؟]/u.test(line) && !/^\s*#/.test(line))
      add("space_before_punctuation", p, i+1, line);
    let next = line;
    if (isContent(p) || (p.endsWith(".md") && !/^\s*(?:[-*+] |\d+\. )/.test(p))) {
      next = next.replace(/(\S)[ \t\u00A0\u2007\u202F]{2,}(?=\S)/gu, "$1 ")
        .replace(/(\S)[\t\u00A0\u2007\u202F](?=\S)/gu, "$1 ");
    }
    if (next !== line) changedLines++;
    return next;
  }).join("\n");
  if (out !== original) {
    changedFiles++;
    if (apply) await writeFile(f, out);
  }
}
console.log(JSON.stringify({files:files.length,changedFiles,changedLines,write:apply},null,2));
for (const [kind, entry] of counters) {
  console.log("CATEGORY " + kind + " lines=" + entry.count + " files=" + entry.files.size);
  console.log(entry.samples.join("\n"));
}
