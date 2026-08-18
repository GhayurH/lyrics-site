import type { CollectionEntry } from "astro:content";

type LyricData = CollectionEntry<"lyrics">["data"];

const KALAM_TYPE_ALIASES = new Map<string, string>([
  ["noha", "Noha"],
  ["nauha", "Noha"],
  ["nauhay", "Noha"],
  ["salam", "Salam"],
  ["salaam", "Salam"],
  ["manqabat", "Manqabat"],
  ["marsiya", "Marsiya"],
  ["marsia", "Marsiya"],
  ["soz", "Soz"],
  ["qasida", "Qasida"],
  ["qaseeda", "Qasida"],
  ["munajat", "Munajat"],
  ["munajaat", "Munajat"],
  ["dua", "Dua"],
]);

const KALAM_TYPE_ORDER = [
  "Noha",
  "Salam",
  "Manqabat",
  "Marsiya",
  "Soz",
  "Qasida",
  "Munajat",
  "Dua",
  "Uncategorized",
];

function canonicalKalamType(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return KALAM_TYPE_ALIASES.get(trimmed.toLocaleLowerCase("en")) ?? trimmed;
}

function inferredKalamTypeFromTags(data: LyricData) {
  for (const tag of data.tags) {
    const canonical = canonicalKalamType(tag);
    if (canonical && KALAM_TYPE_ORDER.includes(canonical)) return canonical;
  }

  return undefined;
}

/**
 * The site exposes one classification axis: Kalam Type.
 *
 * `category` is accepted only as a legacy compatibility field from the earlier
 * UI upgrade. Existing content therefore keeps building without an immediate
 * migration, while new content should use `kalamType`.
 */
export function getLyricKalamType(data: LyricData) {
  // Preserve established browse grouping if an older file already has category.
  const legacyCategory = canonicalKalamType(data.category);
  if (legacyCategory) return legacyCategory;

  // Prefer a recognised broad kalam type when explicitly supplied.
  const explicitType = canonicalKalamType(data.kalamType);
  if (explicitType && KALAM_TYPE_ORDER.includes(explicitType)) {
    return explicitType;
  }

  // Existing corpus commonly encodes Noha/Salam/etc. as tags.
  const inferredType = inferredKalamTypeFromTags(data);
  if (inferredType) return inferredType;

  // Keep custom future types usable even before they are added to the order list.
  if (explicitType) return explicitType;

  return "Uncategorized";
}

export function slugifyKalamType(kalamType: string) {
  const slug = kalamType
    .normalize("NFKD")
    .toLocaleLowerCase("en")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "other";
}

export function compareKalamTypes(a: string, b: string) {
  const aIndex = KALAM_TYPE_ORDER.indexOf(a);
  const bIndex = KALAM_TYPE_ORDER.indexOf(b);

  if (aIndex !== -1 || bIndex !== -1) {
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  }

  return a.localeCompare(b);
}

// Compatibility aliases for code/content from the earlier category-based drop.
export const getLyricCategory = getLyricKalamType;
export const slugifyCategory = slugifyKalamType;
export const compareCategories = compareKalamTypes;

export function compareLyrics(
  a: CollectionEntry<"lyrics">,
  b: CollectionEntry<"lyrics">,
) {
  return (a.data.alternateTitle ?? a.data.title).localeCompare(
    b.data.alternateTitle ?? b.data.title,
  );
}

type SearchValue = string | string[] | undefined | null;

export function searchUrl(
  filters: Record<string, SearchValue> = {},
  query?: string,
) {
  const params = new URLSearchParams();

  if (query?.trim()) params.set("q", query.trim());

  for (const [key, rawValue] of Object.entries(filters)) {
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const value of values) {
      if (value?.trim()) params.append(key, value.trim());
    }
  }

  const suffix = params.toString();
  return suffix ? `/search/?${suffix}` : "/search/";
}
