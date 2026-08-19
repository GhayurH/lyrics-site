// File role: Server-only lyric collection loader/grouping helpers so browse, category, and detail routes share one published-data pipeline.
import { getCollection, type CollectionEntry } from "astro:content";
import { compareLyrics, getLyricKalamType } from "./lyrics";

export type LyricEntry = CollectionEntry<"lyrics">;

export async function loadPublishedLyrics(): Promise<LyricEntry[]> {
  return (
    await getCollection("lyrics", ({ data }) => data.published)
  ).sort(compareLyrics);
}

export function groupLyricsByKalamType(
  lyrics: LyricEntry[],
): Map<string, LyricEntry[]> {
  const grouped = new Map<string, LyricEntry[]>();

  for (const lyric of lyrics) {
    const kalamType = getLyricKalamType(lyric.data);
    const entries = grouped.get(kalamType) ?? [];
    entries.push(lyric);
    grouped.set(kalamType, entries);
  }

  return grouped;
}
