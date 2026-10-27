// Static, cacheable single-lyric payloads; never expose unpublished entries.
import { loadPublishedLyrics } from "../../../lib/lyrics-data";
import type { CollectionEntry } from "astro:content";
export const prerender = true;
export async function getStaticPaths() {
  return (await loadPublishedLyrics()).map((item) =>
    ({ params: { id: item.id }, props: { item } }));
}
export function GET({ props }: { props: { item: CollectionEntry<"lyrics"> } }) {
  const { item } = props;
  return Response.json({
    version: 1, lyric: {
      id: item.id, title: item.data.title,
      alternateTitle: item.data.alternateTitle,
      language: item.data.language, lang: item.data.lang,
      direction: item.data.direction,
      kalamType: item.data.kalamType,
      urdu: item.body || "", roman: item.data.romanLyrics || "",
      cover: item.data.cover || null,
    },
  });
}
