// Canonical lazy source loading and validation for the Recitation Set reader.
import type { BastaKalam } from "../lib/basta-kalam-units";
export type Poem = {
  title: string; alternateTitle?: string; urdu: string; roman?: string;
  sourceUrl: string; image?: string; lang: string; direction: string;
  kind: "lyric" | "basta"; basta?: BastaKalam; sixVerseLayout?: "pairs";
};
const poemCache = new Map<string, Promise<Poem>>();
export async function fetchPoem(kind: "lyric" | "basta", id: string): Promise<Poem> {
  const key = kind + ":" + id;
  if (!poemCache.has(key)) {
    const request = (async (): Promise<Poem> => {
      const address = kind === "lyric" ? "/data/recitation-lyrics/" + encodeURIComponent(id) + ".json" :
        "/data/basta-kalams/" + encodeURIComponent(id) + ".json";
      const response = await fetch(address);
      if (!response.ok) throw Error("Source unavailable or awaiting verification");
      const payload = await response.json();
      if (kind === "lyric") {
        const lyric = payload.lyric;
        if (!lyric || lyric.id !== id || typeof lyric.urdu !== "string") throw Error("Invalid source data");
        return { kind, title: lyric.title, alternateTitle: lyric.alternateTitle,
          urdu: lyric.urdu, roman: lyric.roman || "",
          sourceUrl: lyric.sourceUrl || "/lyrics/" + encodeURIComponent(id) + "/",
          image: lyric.cover || undefined, lang: lyric.lang || "ur",
          direction: lyric.direction || "rtl",
          sixVerseLayout: lyric.sixVerseLayout === "pairs" ? "pairs" : undefined };
      }
      const kalam = payload.kalam as BastaKalam;
      if (!kalam || kalam.id !== id || kalam.status !== "ready") throw Error("Unverified source");
      return { kind, title: kalam.name, alternateTitle: kalam.romanName,
        urdu: kalam.urdu, roman: kalam.roman || "",
        sourceUrl: "/basta/kalam/" + encodeURIComponent(kalam.id) + "/",
        image: "/images/basta/original/" + String(kalam.startPage).padStart(3, "0") + ".png",
        lang: "ur", direction: "rtl", basta: kalam };
    })();
    poemCache.set(key, request);
  }
  try { return await poemCache.get(key)!; }
  catch (e) { poemCache.delete(key); throw e; }
}
