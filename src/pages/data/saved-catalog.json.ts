// File role: Static catalog endpoint for Saved/Recent: emits only the metadata needed to resolve local IDs, keeping the full catalog out of the initial Saved page HTML.
import { getCollection } from "astro:content";
import {
  compareLyrics,
  getLyricKalamType,
} from "../../lib/lyrics";

export const prerender = true;

export async function GET() {
  const lyrics = (
    await getCollection("lyrics", ({ data }) => data.published)
  ).sort(compareLyrics);

  const catalog = lyrics.map((lyric) => ({
    id: lyric.id,
    title: lyric.data.title,
    alternateTitle: lyric.data.alternateTitle ?? "",
    kalamType: getLyricKalamType(lyric.data),
    lang: lyric.data.lang,
    direction: lyric.data.direction,
    href: `/lyrics/${lyric.id}/`,
  }));

  return Response.json(catalog);
}
