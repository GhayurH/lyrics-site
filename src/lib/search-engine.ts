// File role: Typed, public Pagefind API contract and disjunctive facet counting.
import { normalizeSearchQuery } from "./search-normalization.ts";
import { toPagefindOrFilters } from "./search-filters.ts";
import type { SearchFilters, SearchFacet } from "./search-state.ts";

export type FacetCounts = Record<string, Record<string, number>>;
export interface SearchResultData {
  url: string;
  excerpt: string;
  meta: Record<string, string>;
  sub_results?: Array<{ title: string; url: string; excerpt: string }>;
}
export interface SearchResult { id: string; data(): Promise<SearchResultData> }
export interface SearchResponse { results: SearchResult[]; filters: FacetCounts }
export interface PagefindApi {
  options(options: Record<string, unknown>): Promise<void>;
  filters(): Promise<FacetCounts>;
  destroy(): Promise<void>;
  search(query: string | null, options?: { filters?: ReturnType<typeof toPagefindOrFilters> }): Promise<SearchResponse>;
}

export const SEARCH_RANKING = {
  metaWeights: { title: 5, roman_title: 5, searchTerms: 1 },
};

export async function searchWithFacets(api: PagefindApi, query: string, filters: SearchFilters) {
  const term = query.trim() ? normalizeSearchQuery(query) : null;
  const result = await api.search(term, { filters: toPagefindOrFilters(filters) });
  const counts: FacetCounts = { ...result.filters };
  // Removing only this facet exposes alternatives without losing constraints
  // from the query or other facets; no result documents are downloaded here.
  await Promise.all(Object.keys(filters).map(async rawKey => {
    const key = rawKey as SearchFacet;
    const other = { ...filters };
    delete other[key];
    const contextual = await api.search(term, { filters: toPagefindOrFilters(other) });
    counts[key] = contextual.filters[key] ?? {};
  }));
  return { results: result.results, counts };
}
