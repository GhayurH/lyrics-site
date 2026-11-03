// File role: Server-only adapter between Astro content and the canonical Basta kalam catalog.
import { getCollection } from "astro:content";
import index from "../data/basta/index.json";
import identityLock from "../data/recitation/identity-lock.json";
import fragmentRoles from "../data/basta/fragment-roles.json";
import { applyRecitationIds } from "./recitation-identity";
import { buildBastaKalamCatalog, type BastaKalamAudit, type BastaSourcePage } from "./basta-kalam-units";

let catalogPromise: Promise<BastaKalamAudit> | undefined;
export function loadBastaKalamCatalog(): Promise<BastaKalamAudit> {
  if (!catalogPromise) {
    catalogPromise = (async () => {
      const sources = await getCollection("basta", ({ data }) =>
        data.published && !data.imageOnly && !data.contentKind);
      const pages: BastaSourcePage[] = sources.map((item) => ({
        page: item.data.page,
        urdu: item.body || "",
        roman: item.data.romanLyrics,
      }));
      const catalog = buildBastaKalamCatalog(index, pages, fragmentRoles.fragments);
      return { ...catalog, kalams: applyRecitationIds(catalog.kalams, { ...identityLock, version: 1 }) };
    })();
  }
  return catalogPromise;
}
