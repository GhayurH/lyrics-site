// One static poem payload per verified source identity. Fetch on demand.
import { loadBastaKalamCatalog } from "../../../lib/basta-kalam-data";
import type { BastaKalam } from "../../../lib/basta-kalam-units";

export const prerender = true;
export async function getStaticPaths() {
  const { kalams } = await loadBastaKalamCatalog();
  return kalams.filter((item) => item.status === "ready")
    .map((item) => ({ params: { id: item.id }, props: { item } }));
}
export function GET({ props }: { props: { item: BastaKalam } }) {
  return Response.json({ version: 1, kalam: props.item });
}
