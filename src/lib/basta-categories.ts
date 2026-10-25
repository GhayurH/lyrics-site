// File role: Read-only Basta index adapter for browse categories; poems remain in the book and link to their original page.
import indexEntries from "../data/basta/index.json";
import type { BastaIndexEntry } from "./basta";
import type { LyricCardData } from "./catalog";

/* The mixed Hamd/Naat/Manaqib index section intentionally shares the
   Manqabat category with standalone kalams. Non-poetic introductory
   articles remain excluded from category browsing. */
const BASTA_CATEGORY_BY_SECTION: Record<string, string | null> = {
  Mazameen: null,
  "Qita'aat": "Qita",
  Rubaiyat: "Rubaiyat",
  Soz: "Soz",
  Salam: "Salam",
  Marsiye: "Marsiya",
  "Noha / Bain": "Noha",
  "Hamd, Naat-o-Manaqib": "Manqabat",
  "Mutafarriqat-o-Qaumiyat": "Miscellaneous",
};

export interface BastaCategoryEntry {
  title: string;
  alternateTitle?: string;
  page: number;
  number?: number;
  section: string;
  kalamType: string;
  href: string;
}

export function groupBastaIndexByKalamType(
  availablePages?: ReadonlySet<number>,
): Map<string, BastaCategoryEntry[]> {
  const grouped = new Map<string, BastaCategoryEntry[]>();

  for (const entry of indexEntries as BastaIndexEntry[]) {
    const kalamType = BASTA_CATEGORY_BY_SECTION[entry.sectionRoman ?? ""];
    if (!kalamType || (availablePages && !availablePages.has(entry.page))) continue;

    const browseEntry: BastaCategoryEntry = {
      title: entry.name,
      alternateTitle: entry.romanName || undefined,
      page: entry.page,
      number: entry.number,
      section: entry.sectionRoman ?? entry.section ?? "",
      kalamType,
      href: `/basta/${entry.page}/`,
    };
    const list = grouped.get(kalamType) ?? [];
    list.push(browseEntry);
    grouped.set(kalamType, list);
  }

  return grouped;
}

export function toBastaCardData(entry: BastaCategoryEntry): LyricCardData {
  return {
    id: `basta-${entry.page}-${entry.number ?? "entry"}`,
    title: entry.title,
    alternateTitle: entry.alternateTitle,
    kalamType: entry.kalamType,
    lang: "ur",
    direction: "rtl",
    href: entry.href,
    tags: [`Basta · Page ${entry.page}`],
  };
}

/**
 * Match a printed Basta page to the same canonical Kalam Types used by
 * category browsing. The index stores poem *start* pages, so pages without
 * their own index entries inherit the preceding indexed section; introductory
 * matter and pages beyond the final indexed poem have no type.
 *
 * When several poems begin on one page, the type values are deduplicated
 * before passing them to Pagefind's multi-valued facet.
 */
export function getBastaKalamTypesForPage(page: number): string[] {
  const entries = indexEntries as BastaIndexEntry[];
  const lastPoetryPage = entries.at(-1)?.page ?? 0;
  if (page > lastPoetryPage) return [];

  const types = new Set<string>();
  let previousType: string | null = null;
  for (const entry of entries) {
    if (entry.page > page) break;
    const type = BASTA_CATEGORY_BY_SECTION[entry.sectionRoman ?? ""] ?? null;
    if (entry.page === page) {
      if (type) types.add(type);
    } else {
      previousType = type;
    }
  }

  return types.size > 0 ? [...types] : previousType ? [previousType] : [];
}
