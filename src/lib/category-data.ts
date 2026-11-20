// One build-time category inventory feeds first and subsequent static pages.
import type { CollectionEntry } from "astro:content";
import { groupBastaIndexByKalamType, type BastaCategoryEntry } from "./basta-categories";
import { loadBastaNavigationData } from "./basta-pages";
import { loadPublishedLyrics, groupLyricsByKalamType } from "./lyrics-data";
import { slugifyKalamType } from "./lyrics";
export interface CategoryData {
  kalamType: string;
  slug: string;
  lyrics: CollectionEntry<"lyrics">[];
  bastaEntries: BastaCategoryEntry[];
}
let categories: Promise<CategoryData[]> | undefined;
export function loadCategories(): Promise<CategoryData[]> {
  return categories ??= (async () => {
    const standalone = groupLyricsByKalamType(await loadPublishedLyrics());
    const { availablePages } = await loadBastaNavigationData();
    const basta = groupBastaIndexByKalamType(new Set(availablePages));
    return [...new Set([...standalone.keys(), ...basta.keys()])].map((kalamType) => ({
      kalamType, slug: slugifyKalamType(kalamType), lyrics: standalone.get(kalamType) ?? [],
      bastaEntries: basta.get(kalamType) ?? [],
    }));
  })();
}
