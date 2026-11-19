// Search-only canonicalization; never change displayed source lyrics.
const groups = [
  ["husain", "hussain", "hussein", "hussayn", "husayn"],
  ["hasan", "hassan"], ["kiun", "kyun", "kiuṅ"], ["bole", "bolay"],
  ["wale", "walay"], ["karbala", "kerbala"], ["ali", "alee"],
  ["zahra", "zehra", "zohra"], ["fatima", "fatimah", "fatma"],
  ["zainab", "zaynab", "zeinab", "zenab"], ["imam", "imaam"],
  ["aza", "azaa"], ["shaam", "sham"], ["asghar", "asgar"],
  ["akbar", "akber"], ["abbas", "abbaas"], ["qasim", "kasim"],
  ["muharram", "moharram"], ["marsiya", "marsia"], ["noha", "nauha"],
  ["salam", "salaam"], ["ya", "yaa"],
] as const;
const variants = new Map<string, string[]>();
for (const group of groups)
  for (const form of group)
    variants.set(form, group.filter(other => other !== form));

const tokens = /[\p{L}\p{M}\u200c\u200d]+/gu;
const arabic = /[\u0600-\u06ff]/u;
export function normalizeSearchToken(word: string): string {
  const lower = word.normalize("NFKC").toLowerCase();
  if (!arabic.test(lower))
    return lower.normalize("NFKD").replace(/[\u0300-\u036f\u200c\u200d]/gu, "");
  return lower.replace(/[\u064b-\u065f\u0670\u06d6-\u06ed\u0640\u200c\u200d]/gu, "")
    .replace(/ك/g, "ک").replace(/[يى]/g, "ی")
    .replace(/[ةهۀ]/g, "ہ").replace(/[إأٱآ]/g, "ا");
}

// The Pagefind request is canonicalized, but the UI and ?q= keep the typed text.
export function normalizeSearchQuery(query: string): string {
  return query.replace(tokens, word => normalizeSearchToken(word));
}

// Searchable metadata aliases are not part of result excerpts.
export function searchIndexAliases(source: string): string {
  const aliases = new Set<string>();
  for (const token of source.match(tokens) || []) {
    const word = token.toLowerCase();
    const canonical = normalizeSearchToken(word);
    if (canonical !== word && canonical.length >= 2) aliases.add(canonical);
    for (const form of new Set([word, canonical]))
      for (const other of variants.get(form) || []) aliases.add(other);
    if (arabic.test(canonical)) {
      const reverse = canonical.replace(/ک/g, "ك").replace(/ی/g, "ي").replace(/ہ/g, "ه");
      if (reverse !== canonical && canonical.length >= 2) aliases.add(reverse);
    }
    if (aliases.size >= 1000) break;
  }
  return [...aliases].join(" ");
}

// Skip only a duplicated opening title, not real refrains later in the poem.
export function searchExcerptLines(source: string | undefined, title: string | undefined): string[] {
  const lines = (source ?? "").split(/\r?\n/u).map(line => line.trim()).filter(Boolean);
  const normalizedTitle = title?.trim().normalize("NFKC").toLocaleLowerCase();
  if (normalizedTitle && lines[0]?.normalize("NFKC").toLocaleLowerCase() === normalizedTitle)
    lines.shift();
  return lines;
}
