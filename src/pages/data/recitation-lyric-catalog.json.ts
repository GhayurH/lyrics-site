// Compact stable-ID lyric catalog for the recitation builder.
import { loadPublishedLyrics } from "../../lib/lyrics-data";
import { toRecitationLyricCard } from "../../lib/catalog";
export const prerender = true;
export async function GET() {
  return Response.json((await loadPublishedLyrics()).map(toRecitationLyricCard));
}
