// Canonical, purely numeric one-line verse scaling shared by every reader.
// A stanza's longest naturally set line determines the font size; shorter
// lines can still use justification, but the longest should not be stretched.
export const MAX_VERSE_GROWTH = 2.5;

/** Fill the available line with its natural glyph advances, not extra word gaps.
 * A finite growth ceiling prevents one-word stanzas from becoming huge;
 * the widest line is left naturally aligned when it reaches this ceiling.
 */
export function fitLine(base: number, available: number, natural: number, maxScale = MAX_VERSE_GROWTH): number {
  if (![base, available, natural, maxScale].every(Number.isFinite) ||
      base <= 0 || available <= 0 || natural <= 0 || maxScale < 1) return base;
  return base * Math.min(maxScale, (available / natural) * 0.97);
}
