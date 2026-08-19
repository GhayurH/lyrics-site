// File role: Server-only Basta navigation loader: centralizes published-page sorting, physical-index exclusion, and Roman page lookup.
import { getCollection, type CollectionEntry } from "astro:content";
import settings from "../data/basta/settings.json";

export interface BastaNavigationData {
  pages: CollectionEntry<"basta">[];
  availablePages: number[];
  lastBeforeIndex?: number;
  firstAfterIndex?: number;
  indexStartPage: number;
  indexEndPage: number;
}

export async function loadBastaNavigationData(): Promise<BastaNavigationData> {
  const { indexStartPage, indexEndPage } = settings;
  const allPages = (
    await getCollection("basta", ({ data }) => data.published)
  ).sort((a, b) => a.data.page - b.data.page);

  const pages = allPages.filter(
    (entry) => entry.data.page < indexStartPage || entry.data.page > indexEndPage,
  );
  const beforeIndex = pages.filter((entry) => entry.data.page < indexStartPage);
  const afterIndex = pages.filter((entry) => entry.data.page > indexEndPage);

  return {
    pages,
    availablePages: pages.map((entry) => entry.data.page),
    lastBeforeIndex: beforeIndex.at(-1)?.data.page,
    firstAfterIndex: afterIndex[0]?.data.page,
    indexStartPage,
    indexEndPage,
  };
}

export async function loadBastaRomanByPage(): Promise<
  Map<number, CollectionEntry<"bastaRoman">>
> {
  const romanPages = await getCollection("bastaRoman", ({ data }) => data.published);
  return new Map(romanPages.map((entry) => [entry.data.page, entry]));
}
