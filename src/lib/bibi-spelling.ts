// Canonical Urdu spelling بی‌بی uses U+200C ZERO WIDTH NON-JOINER.
// Roman spells Bibi/bibi continuously, without a spacer or joiner.
const urduBibi = /(?<![\p{L}\p{M}])ب([\u064B-\u065F]*)[یي]([\u064B-\u065F]*)(?:[ \t\u00A0\u200B-\u200D\uFEFF\u0640-]*)ب([\u064B-\u065F]*)[یي]([\u064B-\u065F]*)(?=$|[^\p{L}\p{M}]|[اآوؤںی])/gu;
const romanBibi = /(?<!\p{L})b(?:i|ee)(?:[ \t\u00A0\u200B-\u200D\uFEFF\-_]*)b(?:i|ee)(?=$|[^\p{L}]|y[ao]|o?n)/giu;
const approvedUrduNonJoiner = /ب[\u064B-\u065F]*ی[\u064B-\u065F]*\u200Cب[\u064B-\u065F]*ی/gu;

export function normalizeBibiText(text: string): string {
  return text
    .replace(urduBibi, (_whole, mark1: string, mark2: string, mark3: string, mark4: string) =>
      "ب" + mark1 + "ی" + mark2 + "\u200C" + "ب" + mark3 + "ی" + mark4)
    .replace(romanBibi, (word: string) =>
      word === word.toUpperCase() ? "BIBI" : word[0] === word[0].toUpperCase() ? "Bibi" : "bibi");
}
/** Other invisible characters still need editorial review. */
export function stripCanonicalBibiNonJoiners(text: string): string {
  return text.replace(approvedUrduNonJoiner, (word) => word.replace("\u200C", ""));
}
