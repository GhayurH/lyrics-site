// Search-only aliases. Canonical text and displayed Roman spellings remain untouched.
// Bidirectional variants cover established alternate spellings without fuzzy-matching unrelated words.
const groups = [
  ["husain","hussain","hussein","hussayn"],
  ["hasan","hassan"], ["kiun","kyun","kiuṅ"], ["bole","bolay"], ["wale","walay"],
  ["karbala","kerbala"], ["ali","alee"], ["zahra","zehra","zohra"],
  ["fatima","fatimah","fatma"], ["zainab","zaynab","zeinab","zenab"],
  ["imam","imaam"], ["aza","azaa"], ["shaam","sham"],
  ["asghar","asgar"], ["akbar","akber"], ["abbas","abbaas"],
  ["qasim","kasim"], ["muharram","moharram"], ["marsiya","marsia"],
  ["noha","nauha"], ["salam","salaam"], ["ya","yaa"],
] as const;
const variants = new Map<string,string[]>();
for (const group of groups) {
  const unique = [...new Set(group)];
  for (const form of unique) variants.set(form, unique.filter((other) => other !== form));
}
export function normalizeSearchToken(word: string): string {
  return word.normalize("NFKC").toLowerCase().replace(/ṅ/gu, "n")
    .replace(/[\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g,"")
    .replace(/ك/g,"ک").replace(/[يى]/g,"ی")
    .replace(/ة/g,"ہ").replace(/[إأٱآ]/g,"ا");
}
export function searchIndexAliases(source: string): string {
  const aliases = new Set<string>();
  for (const token of source.match(/[\p{L}\p{M}]+/gu) || []) {
    const word = token.toLowerCase();
    for (const alt of variants.get(word) || []) aliases.add(alt);
    const normalized = normalizeSearchToken(word);
    if (normalized !== word && normalized.length >= 2) aliases.add(normalized);
    if (aliases.size >= 1000) break;
  }
  return [...aliases].join(" ");
}

// Keep titles searchable as metadata, but don't repeat an opening line that
// already appears as the result title or alternate title in the excerpt.
// Only drop the *first* identical line; later repetitions can be real poetry.
export function searchExcerptLines(source: string | undefined, title: string | undefined): string[] {
  const lines = (source ?? "").split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  const normalizedTitle = title?.trim().normalize("NFKC").toLocaleLowerCase();
  if (normalizedTitle && lines[0]?.normalize("NFKC").toLocaleLowerCase() === normalizedTitle)
    lines.shift();
  return lines;
}
