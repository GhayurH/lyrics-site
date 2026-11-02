// Canonical text for the two-syllable Urdu title بی‍بی (Bibi).
// U+200D is deliberate ONLY between the two Urdu syllables. Roman has no separator.
const urduBibi = /(?<![\p{L}\p{M}])ب([\u064B-\u065F]*)[یي]([\u064B-\u065F]*)(?:[ \t\u00A0\u200B-\u200D\uFEFF\u0640-]*)ب([\u064B-\u065F]*)[یي]([\u064B-\u065F]*)(?=$|[^\p{L}\p{M}]|[اوؤں])/gu;
const romanBibi = /(?<!\p{L})b(?:i|ee)(?:[ \t\u00A0\u200B-\u200D\uFEFF\-_]*)b(?:i|ee)(?=$|[^\p{L}]|y[ao]|o?n)/giu;
const approvedUrduJoiner = /ب[\u064B-\u065F]*ی[\u064B-\u065F]*\u200Dب[\u064B-\u065F]*ی/gu;

export function normalizeBibiText(text: string): string {
  return text
    .replace(urduBibi, (_whole, mark1: string, mark2: string, mark3: string, mark4: string) =>
      "ب" + mark1 + "ی" + mark2 + "\u200D" + "ب" + mark3 + "ی" + mark4)
    .replace(romanBibi, (word: string) =>
      word[0] === word[0].toUpperCase() ? "Bibi" : "bibi");
}
/** Other invisible characters still need editorial review. */
export function stripCanonicalBibiJoiners(text: string): string {
  return text.replace(approvedUrduJoiner, (word) => word.replace("\u200D", ""));
}
