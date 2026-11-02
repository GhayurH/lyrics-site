// Published lyric cards share the same loader and card model as browse routes.
import { loadPublishedLyrics } from "../../lib/lyrics-data";
import { toLyricCardData } from "../../lib/catalog";

export const prerender = true;
export async function GET() {
  return Response.json((await loadPublishedLyrics()).map(lyric => toLyricCardData(lyric)));
}
