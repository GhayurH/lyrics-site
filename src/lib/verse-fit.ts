// Canonical, purely numeric one-line verse scaling shared by every reader.
// The longest naturally set line determines stanza font size; all verses
// retain justification even when font enlargement reaches its ceiling.
export const MAX_VERSE_GROWTH = 2.5;
export const MIN_VERSE_COVERAGE = 0.95;

/** Grow toward 97% natural coverage only when a stanza's longest line
 * covers under 95% of the available text track. Shrink if it overflows and
 * cap growth for unusually short stanzas. Alignment is always justified.
 */
export function fitLine(base: number, available: number, natural: number, maxScale = MAX_VERSE_GROWTH): number {
  if (![base, available, natural, maxScale].every(Number.isFinite) ||
      base <= 0 || available <= 0 || natural <= 0 || maxScale < 1) return base;
  if (natural >= available * MIN_VERSE_COVERAGE && natural <= available) return base;
  return base * Math.min(maxScale, (available / natural) * 0.97);
}
