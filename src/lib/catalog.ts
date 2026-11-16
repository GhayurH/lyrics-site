// File role: Canonical lightweight lyric-card/catalog model shared by browse pages and the Saved/Recent client renderer.
import type { CollectionEntry } from "astro:content";
import { getLyricKalamType, getLyricKalamTypes } from "./lyrics";
import { recitationLyricId } from "./lyrics-data";

export interface LyricCardData {
  id: string;
  title: string;
  alternateTitle?: string;
  kalamType: string;
  kalamTypes?: string[];
  lang: string;
  direction: "rtl" | "ltr";
  href: string;
  tags?: string[];
}

/** Convert a full lyric collection entry to the small view model needed by cards. */
export function toLyricCardData(
  lyric: CollectionEntry<"lyrics">,
  includeTags = false,
): LyricCardData {
  const kalamType = getLyricKalamType(lyric.data);
  const kalamTypes = getLyricKalamTypes(lyric.data);

  return {
    id: lyric.id,
    title: lyric.data.title,
    alternateTitle: lyric.data.alternateTitle,
    kalamType,
    kalamTypes,
    lang: lyric.data.lang,
    direction: lyric.data.direction,
    href: `/lyrics/${lyric.id}/`,
    tags: includeTags
      ? lyric.data.tags.filter((tag) => !kalamTypes.includes(tag)).slice(0, 2)
      : undefined,
  };
}

/** Stable compact API view for the programme builder. */
export function toRecitationLyricCard(lyric: CollectionEntry<"lyrics">) {
  return {
    id: recitationLyricId(lyric),
    title: lyric.data.title,
    alternateTitle: lyric.data.alternateTitle,
    kalamType: getLyricKalamTypes(lyric.data).join(" / "),
    kalamTypes: getLyricKalamTypes(lyric.data),
    sourceUrl: "/lyrics/" + lyric.id + "/",
  };
}
