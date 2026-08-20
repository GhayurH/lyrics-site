#!/usr/bin/env node
// File role: Keeps the structured Basta index and between-kalam markers synchronized with the corrected Urdu/Roman page transcriptions.

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const INDEX_PATH = path.join(ROOT, "src/data/basta/index.json");
const URDU_DIR = path.join(ROOT, "src/data/basta/pages");
const ROMAN_DIR = path.join(ROOT, "src/data/basta/roman");

const KALAM_BREAK = "---***---";
const CHECK_ONLY = process.argv.includes("--check");
const MIN_INDEX_SCORE = 0.32;
const MIN_BREAK_SCORE = 0.30;
const NON_KALAM_SECTIONS = new Set(["مضامین"]);

// These entries were too corrupted in the original index to recover safely by
// fuzzy matching. Values below were checked against the corrected page text.
// A page value is included only where the old index page itself was wrong.
const MANUAL_OVERRIDES = new Map([
  [
    "مضامین::6",
    {
      page: 61,
      urdu: "معزز ذاکرین، شعراء اہل بیت اور عزاداروں کی توجہ کے لئے ایک غور طلب نکتہ",
    },
  ],
  [
    "سوز::16",
    {
      page: 98,
      urdu: "جب آئی صبحِ قتلِ امامِ فلک وقار",
      roman: "Jab aai subh-e-qatl-e-Imam-e-falak-waqar",
    },
  ],
  [
    "سلام::30",
    {
      page: 118,
      urdu: "جو شب کو دِن بنادیں لعل و گوہر ایسے ہوتے ہیں",
      roman: "Jo shab ko din bana dein lal-o-gauhar aise hote hain",
    },
  ],
  [
    "سلام::43",
    {
      page: 123,
      urdu: "خیر کی ایسی نہ کسی اور کو تقدیر ملی",
      roman: "Khair ki aisi na kisi aur ko taqdir mili",
    },
  ],
  [
    "سلام::47",
    {
      page: 124,
      urdu: "مجرمی کہتے تھے شہؑ کچھ نہیں پروا مجھ کو",
      roman: "Mujrai kehte the Shah kuchh nahin parwa mujh ko",
    },
  ],
  [
    "نوحہ / بین::3",
    {
      page: 329,
      urdu: "سقائے سکینہ شہیدائے سکینہ (ماتم)",
      roman: "Saqqa-e-Sakina, shahidaye Sakina (matam)",
    },
  ],
  [
    "نوحہ / بین::4",
    {
      page: 329,
      urdu: "پروان چڑھالوں ارمان نکالوں (ماتم)",
      roman: "Parwan charha lun arman nikalun (matam)",
    },
  ],
  [
    "نوحہ / بین::6",
    {
      page: 330,
      urdu: "پیاسوں سے زیادہ دور نہ تھا بہتے ہوئے دریا کا پانی",
      roman: "Pyason se zyada dur na tha behte hue darya ka pani",
    },
  ],
  [
    "حمد، نعت و مناقب::29",
    {
      page: 386,
      urdu: "نائبِ خیر الوریٰ، قرآنِ گویا عسکریؑ",
      roman: "Naib-e-Khair-ul-Wara, Quran-e-goya Askari",
    },
  ],
  [
    "حمد، نعت و مناقب::37",
    {
      page: 393,
      urdu: "زید شہید قدرتِ داور کا شاہکار",
      roman: "Zaid Shahid qudrat-e-Dawar ka shahkar",
    },
  ],
  [
    "متفرقات و قومیات::2",
    {
      page: 403,
      urdu: "حقیقت دوستی نہج البلاغہ",
      roman: "Haqiqat-dosti Nahj-ul-Balagha",
    },
  ],
  [
    "متفرقات و قومیات::3",
    {
      page: 404,
      urdu: "ذاکرین سے خطاب / حکیم کاظم زیدی",
      roman: "Zakirin se khitab / Hakim Kazim Zaidi",
    },
  ],
  [
    "متفرقات و قومیات::5",
    {
      page: 405,
      urdu: "نوید بخشِ خیر الوریٰ ہے ذوالعشیرہ میں",
      roman: "Naveed bakhsh-e khair aluri hai Zul-Ashira mein",
    },
  ],
  [
    "متفرقات و قومیات::15",
    {
      page: 412,
      urdu: "میں نہیں مانتا / گوہر جارچوی",
      roman: "Main nahin manta / Gauhar Jarchavi",
    },
  ],
  [
    "متفرقات و قومیات::20",
    {
      page: 416,
      urdu: "کوئی ایسا بھی ہوتا ہے / راہی جہانگیر آبادی",
      roman: "Koi aisa bhi hota hai / Rahi Jahangirabadi",
    },
  ],
  [
    "متفرقات و قومیات::22",
    {
      page: 417,
      urdu: "شرعاً حرام / دلور نگار",
      roman: "Sharan haram / Dilwar Nigar",
    },
  ],
  [
    "متفرقات و قومیات::23",
    {
      page: 418,
      urdu: "شہیدوں اور شہیدوں کے وارثوں کو سلام",
      roman: "Shahidon aur shahidon ke warison ko salam",
    },
  ],
  [
    "متفرقات و قومیات::38",
    {
      page: 434,
      urdu: "اے خمینیؒ زندہ باد",
      roman: "Ay Khomeini zinda-bad",
    },
  ],
  [
    "متفرقات و قومیات::51",
    {
      page: 454,
      urdu: "دن ڈھلے جب کرے مزدوری رضا آتا ہے باپ",
      roman: "Din dhale jab kare mazduri Raza aata hai bap",
    },
  ],
]);

function entryKey(entry) {
  return `${entry.section ?? ""}::${entry.number ?? ""}`;
}

function normalizeNewlines(value) {
  return value.replace(/\r\n?/g, "\n");
}

function stripCombiningMarks(value) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "");
}

function normalizeUrdu(value) {
  return stripCombiningMarks(value)
    .normalize("NFKC")
    .replace(/[ؐؑؒؓﷺ]/g, "")
    .replace(/[يىئ]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ۀة]/g, "ہ")
    .replace(/ؤ/g, "و")
    .replace(/[أإآ]/g, "ا")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeRoman(value) {
  return stripCombiningMarks(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshteinRatio(a, b) {
  if (a === b) return 1;
  if (!a || !b) return 0;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return 1 - previous[b.length] / Math.max(a.length, b.length);
}

function bigramDice(a, b) {
  const left = a.replace(/\s+/g, "");
  const right = b.replace(/\s+/g, "");
  if (left === right) return 1;
  if (left.length < 2 || right.length < 2) return 0;

  const counts = (value) => {
    const map = new Map();
    for (let index = 0; index < value.length - 1; index += 1) {
      const gram = value.slice(index, index + 2);
      map.set(gram, (map.get(gram) ?? 0) + 1);
    }
    return map;
  };

  const leftCounts = counts(left);
  const rightCounts = counts(right);
  let overlap = 0;
  for (const [gram, count] of leftCounts) {
    overlap += Math.min(count, rightCounts.get(gram) ?? 0);
  }

  return (2 * overlap) / (left.length - 1 + right.length - 1);
}

function tokenDice(a, b) {
  const left = new Set(a.split(" ").filter(Boolean));
  const right = new Set(b.split(" ").filter(Boolean));
  if (!left.size || !right.size) return 0;

  let overlap = 0;
  for (const token of left) {
    if (right.has(token)) overlap += 1;
  }
  return (2 * overlap) / (left.size + right.size);
}

function similarity(seed, candidate, language) {
  const normalize = language === "urdu" ? normalizeUrdu : normalizeRoman;
  const left = normalize(seed);
  const right = normalize(candidate);
  if (!left || !right) return 0;
  if (left === right) return 1;

  let score =
    0.5 * levenshteinRatio(left, right) +
    0.3 * bigramDice(left, right) +
    0.2 * tokenDice(left, right);

  if (left.includes(right) || right.includes(left)) {
    const lengthRatio = Math.min(left.length, right.length) / Math.max(left.length, right.length);
    score = Math.max(score, 0.85 * lengthRatio + 0.1);
  }

  return Math.min(score, 1);
}

function splitMarkdown(raw, filePath) {
  const normalized = normalizeNewlines(raw);
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) throw new Error(`Missing frontmatter in ${filePath}`);

  const pageMatch = match[1].match(/^page:\s*(\d+)\s*$/m);
  if (!pageMatch) throw new Error(`Missing page number in ${filePath}`);

  return {
    page: Number(pageMatch[1]),
    frontmatter: match[0],
    body: normalized.slice(match[0].length),
  };
}

function stripBreakMarkers(body) {
  return normalizeNewlines(body)
    .split("\n")
    .filter((line) => line.trim() !== KALAM_BREAK)
    .join("\n");
}

function candidatesFromBody(body) {
  const lines = stripBreakMarkers(body).split("\n");
  const candidates = [];
  lines.forEach((line, lineIndex) => {
    const text = line.trim();
    if (text) candidates.push({ lineIndex, text });
  });
  return { lines, candidates };
}

function bestMatch(seed, body, language) {
  const { lines, candidates } = candidatesFromBody(body);
  let best;

  for (const candidate of candidates) {
    const score = similarity(seed, candidate.text, language);
    if (
      !best ||
      score > best.score + Number.EPSILON ||
      (Math.abs(score - best.score) <= Number.EPSILON && candidate.lineIndex < best.lineIndex)
    ) {
      best = { ...candidate, score };
    }
  }

  return { lines, match: best };
}

function looksLikePreviousAttribution(line) {
  const value = line.trim();
  return (
    /^\(/.test(value) ||
    /^\[/.test(value) ||
    /بشکریہ|Bashukriya|Courtesy/i.test(value)
  );
}

// Index entries commonly point at the first verse while the page contains a
// short title/author block immediately above it. Put the divider before that
// block so a title never gets stranded above the break.
function looksLikeHeadingBlock(block) {
  if (!block.length || block.length > 3) return false;
  if (block.some(looksLikePreviousAttribution)) return false;

  const joined = block.join(" ");
  const last = block.at(-1) ?? "";
  const authorPattern = /(?:سید|سبط|جعفر|شاداں|ڈاکٹر|پروفیسر|حکیم|راہی|زائر|زیدی|نقوی|امروہوی|صاحب|مرحوم|Syed|Sibt|Jafar|Shadan|Doctor|Professor|Hakim|Rahi|Zair|Zaidi|Naqvi|Amrohvi|Sahib|Marhum)/iu;
  const titleLabelPattern = /^(?:رباعی|سوز|سلام|نوحہ|بین|منقبت|حقیقت|دعا|ماتم|Rubai|Soz|Salam|Noha|Bain|Manqabat|Haqiqat|Dua|Matam)/iu;

  return (
    joined.includes("/") ||
    /\((?:ماتم|matam)\)/iu.test(joined) ||
    authorPattern.test(last) ||
    (block.length === 1 && titleLabelPattern.test(block[0].trim()))
  );
}

function adjustBoundaryToHeading(lines, lineIndex) {
  let cursor = lineIndex - 1;
  if (cursor < 0 || lines[cursor].trim()) return lineIndex;

  while (cursor >= 0 && !lines[cursor].trim()) cursor -= 1;
  if (cursor < 0) return lineIndex;

  const blockEnd = cursor;
  while (cursor >= 0 && lines[cursor].trim()) cursor -= 1;
  const blockStart = cursor + 1;
  const block = lines.slice(blockStart, blockEnd + 1).filter((line) => line.trim());

  return looksLikeHeadingBlock(block) ? blockStart : lineIndex;
}

function hasContinuationBefore(lines, boundaryLineIndex) {
  const before = lines.slice(0, boundaryLineIndex).join("\n");
  return /(?:جاری|تسلسل|\bjari\b|\btasalsul\b)/iu.test(before);
}

function addBreaks(body, boundaryLineIndexes) {
  const lines = stripBreakMarkers(body).split("\n");
  const boundaries = [...new Set(boundaryLineIndexes)]
    .filter((lineIndex) => Number.isInteger(lineIndex) && lineIndex > 0 && lineIndex < lines.length)
    .sort((a, b) => b - a);

  for (const originalBoundary of boundaries) {
    let blankStart = originalBoundary;
    while (blankStart > 0 && !lines[blankStart - 1].trim()) blankStart -= 1;

    if (blankStart < originalBoundary) {
      lines.splice(blankStart, originalBoundary - blankStart, "", KALAM_BREAK, "");
    } else {
      lines.splice(originalBoundary, 0, "", KALAM_BREAK, "");
    }
  }

  return lines.join("\n").replace(/^\n+/, "").trimEnd() + "\n";
}

async function loadMarkdownDirectory(directory) {
  const result = new Map();
  let names = [];
  try {
    names = await fs.readdir(directory);
  } catch (error) {
    if (error?.code === "ENOENT") return result;
    throw error;
  }

  for (const name of names.filter((value) => value.endsWith(".md")).sort()) {
    const filePath = path.join(directory, name);
    const raw = await fs.readFile(filePath, "utf8");
    const record = splitMarkdown(raw, filePath);
    result.set(record.page, { filePath, raw, ...record });
  }
  return result;
}

function groupIndexEntries(entries) {
  const byPage = new Map();
  entries.forEach((entry, index) => {
    const group = byPage.get(entry.page) ?? [];
    group.push({ entry, index });
    byPage.set(entry.page, group);
  });
  return byPage;
}

function isKalamEntry(entry) {
  return Boolean(entry.name) && !NON_KALAM_SECTIONS.has(entry.section ?? "");
}

function formatScore(value) {
  return value.toFixed(3);
}

function applyManualOverrides(indexEntries) {
  let indexTextUpdates = 0;
  let pageUpdates = 0;

  for (const entry of indexEntries) {
    const override = MANUAL_OVERRIDES.get(entryKey(entry));
    if (!override) continue;

    if (override.page && entry.page !== override.page) {
      entry.page = override.page;
      pageUpdates += 1;
    }
    if (override.urdu && entry.name !== override.urdu) {
      entry.name = override.urdu;
      indexTextUpdates += 1;
    }
    if (override.roman && entry.romanName !== override.roman) {
      entry.romanName = override.roman;
      indexTextUpdates += 1;
    }
  }

  return { indexTextUpdates, pageUpdates };
}

function findBreakBoundaries(kalamItems, body, language, page, warnings) {
  const matches = [];

  for (const { entry } of kalamItems) {
    const seed = language === "urdu" ? entry.name : entry.romanName;
    if (!seed) continue;

    const { lines, match } = bestMatch(seed, body, language);
    if (!match || match.score < MIN_BREAK_SCORE) {
      warnings.push(
        `${language === "urdu" ? "Urdu" : "Roman"} kalam break skipped: page ${page}, #${entry.number ?? "?"}, score ${formatScore(match?.score ?? 0)} — ${seed}`,
      );
      continue;
    }

    matches.push({
      entry,
      lines,
      match,
      boundaryLineIndex: adjustBoundaryToHeading(lines, match.lineIndex),
    });
  }

  matches.sort((a, b) => a.boundaryLineIndex - b.boundaryLineIndex);
  if (!matches.length) return [];

  const boundaries = matches.slice(1).map((item) => item.boundaryLineIndex);

  // If this page explicitly starts as a continuation from a previous page,
  // the first new indexed kalam on this page also needs a divider.
  const first = matches[0];
  if (
    first.boundaryLineIndex > 0 &&
    hasContinuationBefore(first.lines, first.boundaryLineIndex)
  ) {
    boundaries.unshift(first.boundaryLineIndex);
  }

  return boundaries;
}

async function main() {
  const originalIndexText = await fs.readFile(INDEX_PATH, "utf8");
  const indexEntries = JSON.parse(originalIndexText);
  const urduPages = await loadMarkdownDirectory(URDU_DIR);
  const romanPages = await loadMarkdownDirectory(ROMAN_DIR);
  const manual = applyManualOverrides(indexEntries);
  let grouped = groupIndexEntries(indexEntries);

  let urduIndexUpdates = 0;
  let romanIndexUpdates = 0;
  let urduBreakPages = 0;
  let romanBreakPages = 0;
  const warnings = [];

  // Update non-manual labels from the corrected page text. Matching is now
  // independent rather than forced into index-number order because some source
  // index entries on the same page are intentionally out of physical order.
  for (const [page, group] of grouped) {
    const urduPage = urduPages.get(page);
    if (urduPage) {
      for (const { entry } of group) {
        if (MANUAL_OVERRIDES.has(entryKey(entry))) continue;
        const { match } = bestMatch(entry.name ?? "", urduPage.body, "urdu");
        if (!match) continue;
        if (match.score >= MIN_INDEX_SCORE) {
          if (entry.name !== match.text) {
            entry.name = match.text;
            urduIndexUpdates += 1;
          }
        } else {
          warnings.push(
            `Urdu index unresolved: page ${page}, #${entry.number ?? "?"}, score ${formatScore(match.score)} — ${entry.name}`,
          );
        }
      }
    }

    const romanPage = romanPages.get(page);
    if (romanPage) {
      for (const { entry } of group) {
        if (!entry.romanName || MANUAL_OVERRIDES.has(entryKey(entry))) continue;
        const { match } = bestMatch(entry.romanName, romanPage.body, "roman");
        if (!match) continue;
        if (match.score >= MIN_INDEX_SCORE) {
          if (entry.romanName !== match.text) {
            entry.romanName = match.text;
            romanIndexUpdates += 1;
          }
        } else {
          warnings.push(
            `Roman index unresolved: page ${page}, #${entry.number ?? "?"}, score ${formatScore(match.score)} — ${entry.romanName}`,
          );
        }
      }
    }
  }

  // Re-group because two manually corrected index entries move to the page on
  // which their corrected text actually starts.
  grouped = groupIndexEntries(indexEntries);

  // Rebuild all explicit page markers from scratch. This removes any misplaced
  // markers produced by the first version before inserting the corrected ones.
  for (const [page, group] of grouped) {
    const kalamItems = group.filter(({ entry }) => isKalamEntry(entry));
    if (!kalamItems.length) continue;

    const urduPage = urduPages.get(page);
    if (urduPage) {
      const boundaries = findBreakBoundaries(kalamItems, urduPage.body, "urdu", page, warnings);
      const nextBody = addBreaks(urduPage.body, boundaries);
      const nextRaw = urduPage.frontmatter + nextBody;
      if (nextRaw !== urduPage.raw) {
        urduBreakPages += 1;
        urduPage.nextRaw = nextRaw;
      }
    }

    const romanPage = romanPages.get(page);
    const romanKalamItems = kalamItems.filter(({ entry }) => Boolean(entry.romanName));
    if (romanPage && romanKalamItems.length) {
      const boundaries = findBreakBoundaries(
        romanKalamItems,
        romanPage.body,
        "roman",
        page,
        warnings,
      );
      const nextBody = addBreaks(romanPage.body, boundaries);
      const nextRaw = romanPage.frontmatter + nextBody;
      if (nextRaw !== romanPage.raw) {
        romanBreakPages += 1;
        romanPage.nextRaw = nextRaw;
      }
    }
  }

  const nextIndexText = JSON.stringify(indexEntries, null, 2) + "\n";
  const indexChanged = nextIndexText !== originalIndexText;
  const pageWrites = [
    ...[...urduPages.values()].filter((record) => record.nextRaw),
    ...[...romanPages.values()].filter((record) => record.nextRaw),
  ];
  const hasChanges = indexChanged || pageWrites.length > 0;

  if (!CHECK_ONLY) {
    if (indexChanged) await fs.writeFile(INDEX_PATH, nextIndexText, "utf8");
    for (const record of pageWrites) {
      await fs.writeFile(record.filePath, record.nextRaw, "utf8");
    }
  }

  console.log(`${CHECK_ONLY ? "Checked" : "Synchronized"} Basta index and kalam boundaries.`);
  console.log(`  Manual index text corrections: ${manual.indexTextUpdates}`);
  console.log(`  Manual index page corrections: ${manual.pageUpdates}`);
  console.log(`  Urdu index entries ${CHECK_ONLY ? "needing updates" : "updated"}: ${urduIndexUpdates}`);
  console.log(`  Roman index entries ${CHECK_ONLY ? "needing updates" : "updated"}: ${romanIndexUpdates}`);
  console.log(`  Urdu pages ${CHECK_ONLY ? "needing break updates" : "with break updates"}: ${urduBreakPages}`);
  console.log(`  Roman pages ${CHECK_ONLY ? "needing break updates" : "with break updates"}: ${romanBreakPages}`);

  if (warnings.length) {
    console.warn(`\n${warnings.length} item(s) still need review:`);
    warnings.forEach((warning) => console.warn(`  - ${warning}`));
  } else {
    console.log("  Manual review queue: clear");
  }

  if (CHECK_ONLY && hasChanges) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
