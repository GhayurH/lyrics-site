// Pure proportional width policy shared by every bilingual reader and tests.
export const DEFAULT_ROMAN_WIDTH = 44;
export const MIN_ROMAN_WIDTH = 25;
export const MAX_ROMAN_WIDTH = 75;

/** Bad saved values restore the default; dragging never makes a column unusable. */
export function normalizeRomanWidth(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_ROMAN_WIDTH;
  return Math.max(MIN_ROMAN_WIDTH, Math.min(MAX_ROMAN_WIDTH, Math.round(value)));
}

/** Physical pointer position relative to the two text panels (not the optional scan). */
export function romanWidthFromPointer(x: number, left: number, right: number): number {
  if (!Number.isFinite(x) || !Number.isFinite(left) || !Number.isFinite(right) || right <= left)
    return DEFAULT_ROMAN_WIDTH;
  return normalizeRomanWidth(100 * (x - left) / (right - left));
}
