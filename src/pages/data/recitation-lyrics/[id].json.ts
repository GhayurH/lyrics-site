// Static, cacheable single-lyric payloads; never expose unpublished entries.
import { loadPublishedLyrics, recitationLyricId } from "../../../lib/lyrics-data";
import type { CollectionEntry } from "astro:content";
export const prerender = true;
export async function getStaticPaths() {
  return (await loadPublishedLyrics()).map((item) =>
    ({ params: { id: recitationLyricId(item) }, props: { item } }));
}
export function GET({ props }: { props: { item: CollectionEntry<"lyrics"> } }) {
  const { item } = props;
  const romanOnly = item.data.language === "Roman Urdu" && !item.data.romanLyrics;
  return Response.json({
    version: 1, lyric: {
      id: recitationLyricId(item), title: item.data.title,
      sourceUrl: "/lyrics/" + item.id + "/",
      alternateTitle: item.data.alternateTitle,
      language: item.data.language, lang: item.data.lang,
      direction: item.data.direction,
      kalamType: item.data.kalamType,
      urdu: romanOnly ? "" : item.body || "",
      roman: romanOnly ? item.body || "" : item.data.romanLyrics || "",
      sixVerseLayout: item.data.sixVerseLayout,
    },
  });
}
