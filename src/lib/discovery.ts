// File role: Literal metadata grouping and stable links for public browse hubs.
export const DISCOVERY_DIMENSIONS = ["poets", "languages", "occasions"] as const;
export type DiscoveryDimension = typeof DISCOVERY_DIMENSIONS[number];
export const DISCOVERY_LABELS = {
  poets: { title: "Poets", singular: "poet", field: "poet" },
  languages: { title: "Languages", singular: "language", field: "language" },
  occasions: { title: "Occasions", singular: "occasion", field: "occasion" },
} as const;

/** The suffix keeps distinct spellings/cases separate and links stable as names are added. */
export function discoverySlug(value: string): string {
  let hash = 2166136261;
  for (const char of value) { hash ^= char.codePointAt(0)!; hash = Math.imul(hash, 16777619); }
  const readable = value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 80) || "entry";
  return readable + "-" + (hash >>> 0).toString(16).padStart(8, "0");
}

export function discoveryHref(dimension: DiscoveryDimension, value: string): string {
  return "/" + dimension + "/" + encodeURIComponent(discoverySlug(value)) + "/";
}

export interface DiscoveryGroup<T> { label: string; slug: string; href: string; entries: T[] }
export interface DiscoveryMetadata { data: { poet?: string; occasion?: string; language: string } }

export function groupDiscoveryEntries<T extends DiscoveryMetadata>(entries: readonly T[], dimension: DiscoveryDimension): DiscoveryGroup<T>[] {
  const groups = new Map<string, T[]>();
  const field = DISCOVERY_LABELS[dimension].field;
  for (const entry of entries) {
    const value = entry.data[field]?.trim();
    if (!value) continue;
    const group = groups.get(value) ?? [];
    group.push(entry);
    groups.set(value, group);
  }
  const slugs = new Set<string>();
  return [...groups].sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }))
    .map(([label, grouped]) => {
      const slug = discoverySlug(label);
      if (slugs.has(slug)) throw Error("Duplicate discovery URL: " + label);
      slugs.add(slug);
      return { label, slug, href: discoveryHref(dimension, label), entries: grouped };
    });
}
