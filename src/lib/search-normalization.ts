// Search aliases index common spelling variants without modifying source poetry.
// Output is plain text, never interpolated HTML. Prefer conservative mappings.
const romanVariants: Record<string,string[]> = {
  husain: ["hussain","hussein","hussayn"],
  hasan: ["hassan"],
  bole: ["bolay"],
  wale: ["walay"],
  karbala: ["kerbala"],
  ali: ["alee"],
  zahra: ["zehra"],
  fatima: ["fatimah"],
  zainab: ["zaynab","zeinab"],
  imam: ["imaam"],
  aza: ["azaa"],
  shaam: ["sham"],
};
const arabicPresentation = (word: string) => word
  .replace(/[\u064b-\u065f\u0670\u06d6-\u06ed]/g, "")
  .replace(/[ك]/g, "ک").replace(/[يى]/g, "ی")
  .replace(/[ة]/g, "ہ").replace(/[إأٱ]/g, "ا");

export function searchIndexAliases(source: string): string {
  const aliases = new Set<string>();
  for (const token of source.match(/[\p{L}\p{M}]+/gu) || []) {
    const word = token.toLowerCase();
    if (romanVariants[word]) romanVariants[word].forEach((alias) => aliases.add(alias));
    const normalized = arabicPresentation(word);
    if (normalized !== word) aliases.add(normalized);
    // Ignore extremely short words to avoid overwhelming irrelevant results.
    if (aliases.size > 2500) break;
  }
  return [...aliases].join(" ");
}
