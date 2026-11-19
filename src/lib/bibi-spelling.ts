// Only standalone Urdu بی‌بی uses U+200C ZERO WIDTH NON-JOINER.
// Roman spells Bibi/bibi continuously, without a spacer or joiner.
const urduBibi = /(?<![\p{L}\p{M}])ب(\p{M}*)[یي](\p{M}*)(?:[ \t\u00A0\u200B-\u200D\uFEFF\u0640-]*)ب(\p{M}*)[یي](\p{M}*)(?![\p{L}\p{M}])/gu;
const romanBibi = /(?<!\p{L})b(?:i|ee)(?:[ \t\u00A0\u200B-\u200D\uFEFF\-_]*)b(?:i|ee)(?=$|[^\p{L}]|y[ao]|o?n)/giu;
// Permit the joiner only inside the standalone Urdu word, never its plural forms.
const approvedUrduNonJoiner = /(?<![\p{L}\p{M}])ب\p{M}*ی\p{M}*\u200Cب\p{M}*ی\p{M}*(?![\p{L}\p{M}])/gu;

export function normalizeBibiText(text: string): string {
  return text
    // Remove every ZWNJ first, then restore it only in standalone Urdu Bibi.
    // Inflections such as بیبیوں and بیبیاں must never retain a non-joiner.
    .replace(/\u200C/gu, "")
    .replace(urduBibi, (_whole, mark1: string, mark2: string, mark3: string, mark4: string) =>
      "ب" + mark1 + "ی" + mark2 + "\u200C" + "ب" + mark3 + "ی" + mark4)
    .replace(romanBibi, (word: string) =>
      word === word.toUpperCase() ? "BIBI" : word[0] === word[0].toUpperCase() ? "Bibi" : "bibi");
}
/** Other invisible characters still need editorial review. */
export function stripCanonicalBibiNonJoiners(text: string): string {
  return text.replace(approvedUrduNonJoiner, (word) => word.replace("\u200C", ""));
}