// File role: Static Saved/Recent catalog endpoint built from the canonical lyric-card view model.
import { getCollection } from "astro:content";
import { toLyricCardData } from "../../lib/catalog";
import { compareLyrics } from "../../lib/lyrics";

export const prerender = true;

export async function GET() {
  const lyrics = (
    await getCollection("lyrics", ({ data }) => data.published)
  ).sort(compareLyrics);

  return Response.json(lyrics.map((lyric) => toLyricCardData(lyric)));
}
