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

function resolveOrderedMatches(seeds, body, language) {
  const { lines, candidates } = candidatesFromBody(body);
  if (!seeds.length || candidates.length < seeds.length) {
    return { lines, matches: [] };
  }

  const scores = seeds.map((seed) =>
    candidates.map((candidate) => similarity(seed, candidate.text, language)),
  );
  const entryCount = seeds.length;
  const candidateCount = candidates.length;
  const negativeInfinity = Number.NEGATIVE_INFINITY;
  const dp = Array.from({ length: entryCount }, () =>
    Array(candidateCount).fill(negativeInfinity),
  );
  const previous = Array.from({ length: entryCount }, () =>
    Array(candidateCount).fill(-1),
  );

  for (let candidateIndex = 0; candidateIndex < candidateCount; candidateIndex += 1) {
    dp[0][candidateIndex] = scores[0][candidateIndex];
  }

  for (let entryIndex = 1; entryIndex < entryCount; entryIndex += 1) {
    for (let candidateIndex = entryIndex; candidateIndex < candidateCount; candidateIndex += 1) {
      let bestScore = negativeInfinity;
      let bestPrevious = -1;
      for (let previousIndex = entryIndex - 1; previousIndex < candidateIndex; previousIndex += 1) {
        const score = dp[entryIndex - 1][previousIndex];
        if (score > bestScore) {
          bestScore = score;
          bestPrevious = previousIndex;
        }
      }
      if (bestPrevious >= 0) {
        dp[entryIndex][candidateIndex] = bestScore + scores[entryIndex][candidateIndex];
        previous[entryIndex][candidateIndex] = bestPrevious;
      }
    }
  }

  let lastCandidate = -1;
  let bestFinal = negativeInfinity;
  for (let candidateIndex = entryCount - 1; candidateIndex < candidateCount; candidateIndex += 1) {
    if (dp[entryCount - 1][candidateIndex] > bestFinal) {
      bestFinal = dp[entryCount - 1][candidateIndex];
      lastCandidate = candidateIndex;
    }
  }
  if (lastCandidate < 0) return { lines, matches: [] };

  const chosen = Array(entryCount).fill(-1);
  chosen[entryCount - 1] = lastCandidate;
  for (let entryIndex = entryCount - 1; entryIndex > 0; entryIndex -= 1) {
    chosen[entryIndex - 1] = previous[entryIndex][chosen[entryIndex]];
  }

  return {
    lines,
    matches: chosen.map((candidateIndex, entryIndex) => ({
      ...candidates[candidateIndex],
      score: scores[entryIndex][candidateIndex],
    })),
  };
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

async function main() {
  const originalIndexText = await fs.readFile(INDEX_PATH, "utf8");
  const indexEntries = JSON.parse(originalIndexText);
  const urduPages = await loadMarkdownDirectory(URDU_DIR);
  const romanPages = await loadMarkdownDirectory(ROMAN_DIR);
  const grouped = groupIndexEntries(indexEntries);

  let urduIndexUpdates = 0;
  let romanIndexUpdates = 0;
  let urduBreakPages = 0;
  let romanBreakPages = 0;
  const warnings = [];

  // First pass: update index labels from the corrected first lines on their target pages.
  for (const [page, group] of grouped) {
    const urduPage = urduPages.get(page);
    if (urduPage) {
      const { matches } = resolveOrderedMatches(
        group.map(({ entry }) => entry.name ?? ""),
        urduPage.body,
        "urdu",
      );
      group.forEach(({ entry }, position) => {
        const match = matches[position];
        if (!match) return;
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
      });
    }

    const romanPage = romanPages.get(page);
    const romanItems = group.filter(({ entry }) => Boolean(entry.romanName));
    if (romanPage && romanItems.length) {
      const { matches } = resolveOrderedMatches(
        romanItems.map(({ entry }) => entry.romanName ?? ""),
        romanPage.body,
        "roman",
      );
      romanItems.forEach(({ entry }, position) => {
        const match = matches[position];
        if (!match) return;
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
      });
    }
  }

  // Second pass: use the now-canonical index first lines as the only kalam boundaries.
  for (const [page, group] of grouped) {
    const kalamItems = group.filter(({ entry }) => isKalamEntry(entry));
    if (kalamItems.length < 2) continue;

    const urduPage = urduPages.get(page);
    if (urduPage) {
      const { matches } = resolveOrderedMatches(
        kalamItems.map(({ entry }) => entry.name),
        urduPage.body,
        "urdu",
      );
      const boundaries = matches
        .slice(1)
        .filter((match) => match.score >= MIN_BREAK_SCORE)
        .map((match) => match.lineIndex);
      const nextBody = addBreaks(urduPage.body, boundaries);
      const nextRaw = urduPage.frontmatter + nextBody;
      if (nextRaw !== urduPage.raw) {
        urduBreakPages += 1;
        urduPage.nextRaw = nextRaw;
      }
      matches.slice(1).forEach((match, index) => {
        if (match.score < MIN_BREAK_SCORE) {
          const entry = kalamItems[index + 1].entry;
          warnings.push(
            `Urdu kalam break skipped: page ${page}, #${entry.number ?? "?"}, score ${formatScore(match.score)} — ${entry.name}`,
          );
        }
      });
    }

    const romanPage = romanPages.get(page);
    const romanKalamItems = kalamItems.filter(({ entry }) => Boolean(entry.romanName));
    if (romanPage && romanKalamItems.length >= 2) {
      const { matches } = resolveOrderedMatches(
        romanKalamItems.map(({ entry }) => entry.romanName),
        romanPage.body,
        "roman",
      );
      const boundaries = matches
        .slice(1)
        .filter((match) => match.score >= MIN_BREAK_SCORE)
        .map((match) => match.lineIndex);
      const nextBody = addBreaks(romanPage.body, boundaries);
      const nextRaw = romanPage.frontmatter + nextBody;
      if (nextRaw !== romanPage.raw) {
        romanBreakPages += 1;
        romanPage.nextRaw = nextRaw;
      }
      matches.slice(1).forEach((match, index) => {
        if (match.score < MIN_BREAK_SCORE) {
          const entry = romanKalamItems[index + 1].entry;
          warnings.push(
            `Roman kalam break skipped: page ${page}, #${entry.number ?? "?"}, score ${formatScore(match.score)} — ${entry.romanName}`,
          );
        }
      });
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
  console.log(`  Urdu index entries ${CHECK_ONLY ? "needing updates" : "updated"}: ${urduIndexUpdates}`);
  console.log(`  Roman index entries ${CHECK_ONLY ? "needing updates" : "updated"}: ${romanIndexUpdates}`);
  console.log(`  Urdu pages ${CHECK_ONLY ? "needing break updates" : "with break updates"}: ${urduBreakPages}`);
  console.log(`  Roman pages ${CHECK_ONLY ? "needing break updates" : "with break updates"}: ${romanBreakPages}`);

  if (warnings.length) {
    console.warn(`\n${warnings.length} low-confidence item(s) were left untouched:`);
    warnings.forEach((warning) => console.warn(`  - ${warning}`));
  }

  if (CHECK_ONLY && hasChanges) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
