// File role: Lyric-domain helpers: centralizes Kalam Type ordering/slugging, lyric sorting, and construction of search URLs so routes use one classification model.
import type { CollectionEntry } from "astro:content";

type LyricData = CollectionEntry<"lyrics">["data"];

const KALAM_TYPE_ORDER = [
  "Noha",
  "Salam",
  "Manqabat",
  "Marsiya",
  "Soz",
  "Qasida",
  "Munajat",
  "Dua",
];

/** Canonicalize scalar or multi-valued classification metadata without creating combined facet labels. */
export function lyricMetadataValues(value: string | string[] | undefined): string[] {
  const values = Array.isArray(value) ? value : value === undefined ? [] : [value];
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}

export function getLyricKalamTypes(data: LyricData): string[] {
  return lyricMetadataValues(data.kalamType);
}

/** A stable primary type for a single poem route's previous/next navigation. */
export function getLyricKalamType(data: LyricData): string {
  return getLyricKalamTypes(data)[0] ?? "Other";
}

export function getLyricReciters(data: LyricData): string[] {
  return lyricMetadataValues(data.reciter);
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
