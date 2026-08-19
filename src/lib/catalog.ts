// File role: Canonical lightweight lyric-card/catalog model shared by browse pages and the Saved/Recent client renderer.
import type { CollectionEntry } from "astro:content";
import { getLyricKalamType } from "./lyrics";

export interface LyricCardData {
  id: string;
  title: string;
  alternateTitle?: string;
  kalamType: string;
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

  return {
    id: lyric.id,
    title: lyric.data.title,
    alternateTitle: lyric.data.alternateTitle,
    kalamType,
    lang: lyric.data.lang,
    direction: lyric.data.direction,
    href: `/lyrics/${lyric.id}/`,
    tags: includeTags
      ? lyric.data.tags.filter((tag) => tag !== kalamType).slice(0, 2)
      : undefined,
  };
}
