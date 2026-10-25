// File role: Compute a safe font-size scale for single-line poetry with no sideways overflow.
/** A line that already fits retains its full size. Long lines scale to available width. */
export function fitLine(base: number, available: number, natural: number): number {
  if (![base, available, natural].every(Number.isFinite) || base <= 0 || available <= 0 || natural <= 0) return base;
  return base * Math.min(1, (available / natural) * 0.97);
}
