// Server-only bridge between Astro content and the canonical Basta kalam catalog.
import { getCollection } from "astro:content";
import index from "../data/basta/index.json";
import identityLock from "../data/recitation/identity-lock.json";
import { applyRecitationIds } from "./recitation-identity";
import { buildBastaKalamCatalog, type BastaKalamAudit, type BastaSourcePage } from "./basta-kalam-units";

let catalogPromise: Promise<BastaKalamAudit> | undefined;
export function loadBastaKalamCatalog(): Promise<BastaKalamAudit> {
  if (!catalogPromise) {
    catalogPromise = (async () => {
      const [urdu, roman] = await Promise.all([
        getCollection("basta", ({ data }) => data.published && !data.imageOnly),
        getCollection("bastaRoman", ({ data }) => data.published),
      ]);
      const byPage = new Map(roman.map((item) => [item.data.page, item.body || ""]));
      const pages: BastaSourcePage[] = urdu.map((item) => ({
        page: item.data.page,
        urdu: item.body || "",
        roman: byPage.get(item.data.page),
      }));
      const catalog = buildBastaKalamCatalog(index, pages);
      return { ...catalog, kalams: applyRecitationIds(catalog.kalams, identityLock) };
    })();
  }
  return catalogPromise;
}
