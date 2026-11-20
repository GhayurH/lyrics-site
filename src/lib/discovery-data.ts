// File role: Build-time hub catalog; all groups use existing published metadata.
import { loadPublishedLyrics, type LyricEntry } from "./lyrics-data";
import { DISCOVERY_DIMENSIONS, groupDiscoveryEntries, type DiscoveryDimension,
  type DiscoveryGroup } from "./discovery";
import { PAGE_SIZE } from "./pagination";

let catalog: Promise<Record<DiscoveryDimension, DiscoveryGroup<LyricEntry>[]>> | undefined;
export function loadDiscoveryCatalog() {
  catalog ??= loadPublishedLyrics().then(lyrics => Object.fromEntries(DISCOVERY_DIMENSIONS.map(dimension =>
    [dimension, groupDiscoveryEntries(lyrics, dimension)])) as Record<DiscoveryDimension, DiscoveryGroup<LyricEntry>[]>);
  return catalog;
}

export interface DiscoveryPageProps {
  dimension: DiscoveryDimension;
  groups: DiscoveryGroup<LyricEntry>[];
  group?: DiscoveryGroup<LyricEntry>;
  currentPage: number;
}

export async function discoveryStaticPaths(dimension: DiscoveryDimension) {
  const groups = (await loadDiscoveryCatalog())[dimension];
  const paths: Array<{ params: { path: string | undefined }; props: DiscoveryPageProps }> = [];
  for (let currentPage = 1; currentPage <= Math.max(1, Math.ceil(groups.length / PAGE_SIZE)); currentPage++)
    paths.push({ params: { path: currentPage === 1 ? undefined : `page/${currentPage}` },
      props: { dimension, groups, currentPage } });
  for (const group of groups)
    for (let currentPage = 1; currentPage <= Math.ceil(group.entries.length / PAGE_SIZE); currentPage++)
      paths.push({ params: { path: group.slug + (currentPage === 1 ? "" : `/page/${currentPage}`) },
        props: { dimension, groups: [], group, currentPage } });
  return paths;
}
