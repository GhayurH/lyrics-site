// Static, cacheable single-lyric payloads; never expose unpublished entries.
import { loadPublishedLyrics, recitationLyricId } from "../../../lib/lyrics-data";
import type { CollectionEntry } from "astro:content";
import { getLyricKalamType, getLyricKalamTypes } from "../../../lib/lyrics";
export const prerender = true;
export async function getStaticPaths() {
  return (await loadPublishedLyrics()).map((item) =>
    ({ params: { id: recitationLyricId(item) }, props: { item } }));
}
export function GET({ props }: { props: { item: CollectionEntry<"lyrics"> } }) {
  const { item } = props;
  const romanOnly = item.data.direction === "ltr" && item.data.language !== "English" && !item.data.romanLyrics;
  return Response.json({
    version: 1, lyric: {
      id: recitationLyricId(item), title: item.data.title,
      sourceUrl: "/lyrics/" + item.id + "/",
      alternateTitle: item.data.alternateTitle,
      language: item.data.language, lang: item.data.lang,
      direction: item.data.direction,
      kalamType: getLyricKalamType(item.data),
      kalamTypes: getLyricKalamTypes(item.data),
      urdu: romanOnly ? "" : item.body || "",
      roman: romanOnly ? item.body || "" : item.data.romanLyrics || "",
      stanzaPattern: item.data.stanzaPattern,
    },
  });
}
