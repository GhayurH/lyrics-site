// Lightweight published index for future recitation-set builders.
import { loadBastaKalamCatalog } from "../../lib/basta-kalam-data";
export const prerender = true;
export async function GET() {
  const catalog = await loadBastaKalamCatalog();
  return Response.json({
    version: 1,
    kalams: catalog.kalams.map((item) => ({
      id: item.id, name: item.name, romanName: item.romanName,
      section: item.section, sectionRoman: item.sectionRoman,
      indexNumber: item.indexNumber, startPage: item.startPage,
      pages: item.pages, status: item.status, numbered: item.numbered,
      stanzaCount: item.stanzas.length,
      sourceUrl: "/basta/" + item.startPage + "/",
    })),
  });
}
