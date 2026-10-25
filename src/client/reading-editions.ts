// File role: Pure normalization of per-reader visible editions, shared by UI and tests.
export const EDITIONS = ["image", "urdu", "roman"] as const;
export type Edition = (typeof EDITIONS)[number];

export function isEdition(value: unknown): value is Edition {
  return typeof value === "string" && EDITIONS.some((edition) => edition === value);
}

/** Keep only available editions; never render a completely empty reader. */
export function selectedEditions(saved: unknown, available: Edition[], imageOnly = false): Edition[] {
  const remembered = Array.isArray(saved) ? saved.filter(isEdition).filter((edition) => available.includes(edition)) : [];
  if (remembered.length) return [...new Set(remembered)];
  return imageOnly && available.includes("image") ? ["image"] : [...available];
}

/** Maintain compatible single-edition selectors in the existing reader CSS. */
export function readingModeFromEditions(selected: Edition[]): "parallel" | Edition {
  return selected.length === 1 ? selected[0] : "parallel";
}
