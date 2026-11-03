// Canonical, purely numeric one-line verse scaling shared by every reader.
// A stanza's longest naturally set line determines the font size; shorter
// lines can still use justification, but the longest should not be stretched.
export const MAX_VERSE_GROWTH = 2.5;

/** Fill the available line with its natural glyph advances, not extra word gaps.
 * A finite growth ceiling prevents one-word stanzas from becoming huge;
 * if the ceiling prevents the line filling its track, it remains justified.
 */
export function fitLine(base: number, available: number, natural: number, maxScale = MAX_VERSE_GROWTH): number {
  if (![base, available, natural, maxScale].every(Number.isFinite) ||
      base <= 0 || available <= 0 || natural <= 0 || maxScale < 1) return base;
  return base * Math.min(maxScale, (available / natural) * 0.97);
}

/** Disable justification only when the line's shaped text nearly fills its
 * track. At the growth ceiling a line can remain substantially shorter:
 * leaving that line left-aligned would produce a visibly ragged margin.
 */
export function canUseNaturalVerseSpacing(glyphWidth: number, availableWidth: number): boolean {
  return Number.isFinite(glyphWidth) && Number.isFinite(availableWidth) &&
    availableWidth > 0 && glyphWidth >= availableWidth * 0.95;
}
