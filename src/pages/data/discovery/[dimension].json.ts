// File role: Lightweight metadata directory for searching all hub names on demand.
import { DISCOVERY_DIMENSIONS, type DiscoveryDimension } from "../../../lib/discovery";
import { loadDiscoveryCatalog } from "../../../lib/discovery-data";
export const prerender = true;
export function getStaticPaths() { return DISCOVERY_DIMENSIONS.map(dimension => ({ params: { dimension } })); }
export async function GET({ params }: { params: { dimension: DiscoveryDimension } }) {
  return Response.json((await loadDiscoveryCatalog())[params.dimension].map(group => ({
    label: group.label, href: group.href, count: group.entries.length,
  })));
}
