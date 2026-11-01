// File role: Load, validate and cache browseable lyric and Basta sources for Recitation Sets.
import type { BastaKalam } from "../lib/basta-kalam-units";
import type { RecitationItem } from "../lib/recitation-set";

export interface CatalogItem {
  kind: "lyric" | "basta";
  id: string;
  title: string;
  alternateTitle?: string;
  type: string;
  sourceUrl: string;
  ready: boolean;
  numbered: boolean;
}
export const catalogById = new Map<string, CatalogItem>();
const details = new Map<string, Promise<BastaKalam>>();
function sourceKey(kind: string, id: string): string { return kind + ":" + id; }
export function getCatalog(item: RecitationItem): CatalogItem | undefined {
  return catalogById.get(sourceKey(item.kind, item.id));
}
export async function loadCatalog(): Promise<void> {
  const responses = await Promise.all([
    fetch("/data/recitation-lyric-catalog.json"),
    fetch("/data/basta-kalams.json"),
  ]);
  if (!responses.every((r) => r.ok)) throw Error("Unable to load the poetry index");
  const [lyrics, basta] = await Promise.all(responses.map((r) => r.json()));
  if (!Array.isArray(lyrics) || !Array.isArray(basta.kalams)) throw Error("Invalid catalog");
  for (const lyric of lyrics) {
    const item: CatalogItem = {
      kind: "lyric", id: lyric.id, title: lyric.title,
      alternateTitle: lyric.alternateTitle, type: lyric.kalamType,
      sourceUrl: lyric.sourceUrl, ready: true, numbered: false,
    };
    catalogById.set(sourceKey(item.kind, item.id), item);
  }
  for (const kalam of basta.kalams) {
    const item: CatalogItem = {
      kind: "basta", id: kalam.id, title: kalam.name,
      alternateTitle: kalam.romanName, type: kalam.sectionRoman,
      sourceUrl: kalam.sourceUrl, ready: kalam.status === "ready",
      numbered: !!kalam.numbered && kalam.sectionRoman === "Marsiye",
    };
    catalogById.set(sourceKey(item.kind, item.id), item);
  }
}
export async function loadBasta(id: string): Promise<BastaKalam> {
  if (!details.has(id)) {
    const request = fetch("/data/basta-kalams/" + encodeURIComponent(id) + ".json")
      .then(async (response) => {
        if (!response.ok) throw Error("Kalam source is not verified or available");
        const result = await response.json();
        if (result.kalam?.id !== id || result.kalam.status !== "ready")
          throw Error("Invalid kalam source");
        return result.kalam as BastaKalam;
      });
    details.set(id, request);
  }
  try { return await details.get(id)!; }
  catch (error) { details.delete(id); throw error; }
}
