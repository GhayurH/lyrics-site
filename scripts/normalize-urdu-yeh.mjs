// Normalize only Urdu-script content; Arabic quotations retain their original orthography.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const CONTENT_DIRS = ["src/data/basta/pages", "src/data/basta/roman", "src/data/lyrics"];
const ARABIC_BASTA_PAGES = new Set(["008.md", "009.md"]);
const PARTIAL_ARABIC_PAGES = new Set(["003.md", "005.md", "006.md"]);
const ARABIC_VOWELS = /[\u064B-\u065F]/g;
const URDU_LETTERS = /[پچٹڈڑژگکںےھ]/;

/** Preserve known Arabic source passages, including unvowelled Hadith al-Kisa. */
function isArabicLine(filePath, line, inBody) {
  if (!inBody) return false;
  // Arabic invocations may already contain individual Urdu-style glyphs.
  // A short, densely vowelled line is still an Arabic quotation.
  if (line.length < 100 && (line.match(ARABIC_VOWELS) ?? []).length >= 8) return true;
  const base = path.basename(filePath);
  if (filePath.includes("/basta/pages/") && ARABIC_BASTA_PAGES.has(base)) return true;
  if (filePath.includes("/basta/pages/") && PARTIAL_ARABIC_PAGES.has(base)) {
    return (line.match(ARABIC_VOWELS) ?? []).length >= 2 && !URDU_LETTERS.test(line);
  }
  // Quotations embedded in Urdu prose are protected individually below.
  // Do not exempt the surrounding Urdu text merely because the quotes have diacritics.
  if (/[“”«»]/.test(line)) return false;
  // Fully vowelled Arabic quotations, not Urdu poetry with occasional diacritics.
  return (line.match(ARABIC_VOWELS) ?? []).length >= 4 && !URDU_LETTERS.test(line)
    && /[\u064A\u0649]/.test(line);
}

export function normalizeUrduYeh(filePath, text) {
  const isYaSari = filePath.endsWith("/lyrics/ya-sari-ar-riza.md");
  let fences = 0;
  let firstUrduStanza = false;
  return text.split("\n").map((line) => {
    if (line.trim() === "---" && fences < 2) {
      fences++;
      return line;
    }
    // This poem begins with an Arabic title and a five-line Arabic du'a.
    if (isYaSari && (fences < 2 || !firstUrduStanza)) {
      if (fences === 2 && line.trim() === "۱") firstUrduStanza = true;
      return line;
    }
    if (isArabicLine(filePath, line, fences === 2)) return line;
    // Roman source editions should use Latin letters, never a stray Arabic/Urdu glyph.
    if (filePath.includes("/basta/roman/")) return line.replace(/[\u064A\u0649]/g, "y");
    // Protect Arabic quotations embedded in an otherwise Urdu prose paragraph.
    return line.split(/(“[^”]*”|"[^"]*")/g).map((part) => {
      const quoted = /^(?:“.*”|".*")$/.test(part);
      const words = quoted ? part.slice(1, -1) : part;
      const vowels = (words.match(ARABIC_VOWELS) ?? []).length;
      if (quoted && !URDU_LETTERS.test(words) &&
          (vowels >= 2 || /(?:^|\s)(?:مع|ال[\u0621-\u064A]+)/u.test(words))) return part;
      return part.replace(/[\u064A\u0649]/g, "ی");
    }).join("");
  }).join("\n");
}

export async function checkOrWrite({ write = false, root = fileURLToPath(new URL("../", import.meta.url)) } = {}) {
  const changes = [];
  for (const directory of CONTENT_DIRS) {
    const absolute = path.join(root, directory);
    const names = (await readdir(absolute)).filter((name) => name.endsWith(".md")).sort();
    for (const name of names) {
      const file = path.join(absolute, name);
      const oldText = await readFile(file, "utf8");
      const nextText = normalizeUrduYeh(path.join(directory, name).replaceAll(path.sep, "/"), oldText);
      if (oldText === nextText) continue;
      changes.push(path.join(directory, name));
      if (write) await writeFile(file, nextText);
    }
  }
  return changes;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const write = process.argv.includes("--write");
  const changed = await checkOrWrite({ write });
  console.log(`${write ? "Updated" : "Found"} ${changed.length} Markdown file(s) with Arabic yeh in Urdu text.`);
  if (!write && changed.length) {
    console.error(changed.join("\n"));
    process.exitCode = 1;
  }
}
