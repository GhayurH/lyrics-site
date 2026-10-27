// Source IDs are immutable; display routes may follow renamed Markdown files.
import { loadPublishedLyrics, recitationLyricId } from "../../lib/lyrics-data";
import { getLyricKalamType } from "../../lib/lyrics";
export const prerender = true;
export async function GET() {
  const lyrics = await loadPublishedLyrics();
  return Response.json(lyrics.map((lyric) => ({
    id: recitationLyricId(lyric),
    title: lyric.data.title,
    alternateTitle: lyric.data.alternateTitle,
    kalamType: getLyricKalamType(lyric.data),
    sourceUrl: "/lyrics/" + lyric.id + "/",
  })));
}
