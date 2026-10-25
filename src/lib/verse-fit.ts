// File role: Pure poetry fitting math with an explicit readability floor.
export interface FitResult { size: number; minWidth: number }
export function fitLine(base: number, minimum: number, available: number, natural: number): FitResult {
  if (![base, minimum, available, natural].every((value) => Number.isFinite(value) && value >= 0) || base === 0 || natural === 0) {
    return { size: base, minWidth: 0 };
  }
  const size = Math.min(base, Math.max(Math.min(base, minimum), (base * available) / natural));
  return { size, minWidth: natural * size / base };
}
