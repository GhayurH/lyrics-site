// File role: Shareable search state, facet vocabulary and safe result navigation.
export const SEARCH_FACETS = [
  { key: "collection", label: "Archive", empty: "Both archives", primary: true },
  { key: "kalamType", label: "Kalam Type", empty: "All types", primary: true },
  { key: "haal", label: "Haal", empty: "Any Haal", primary: true },
  { key: "tag", label: "Tag", empty: "Any tag", primary: true },
  { key: "language", label: "Language", empty: "All languages", primary: false },
  { key: "occasion", label: "Occasion", empty: "Any occasion", primary: false },
  { key: "poet", label: "Poet", empty: "Any poet", primary: false },
  { key: "reciter", label: "Reciter", empty: "Any reciter", primary: false },
] as const;
export type SearchFacet = typeof SEARCH_FACETS[number]["key"];
export type SearchFilters = Partial<Record<SearchFacet, string[]>>;
export interface SearchState { query: string; filters: SearchFilters; page: number }
export const SEARCH_PAGE_SIZE = 20;

export function readSearchState(search: string): SearchState {
  const params = new URLSearchParams(search);
  const filters: SearchFilters = {};
  for (const { key } of SEARCH_FACETS) {
    const values = params.getAll(key);
    if (key === "kalamType" && !values.length) values.push(...params.getAll("category"));
    const clean = [...new Set(values.map(value => value.trim()).filter(value => value && value.length <= 300))].slice(0, 20);
    if (clean.length) filters[key] = clean;
  }
  const page = Number(params.get("page") ?? "1");
  return { query: (params.get("q") ?? "").slice(0, 500), filters,
    page: Number.isSafeInteger(page) && page > 0 ? Math.min(page, 10000) : 1 };
}

export function searchStateHref(state: SearchState): string {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  for (const { key } of SEARCH_FACETS)
    for (const value of state.filters[key] ?? []) params.append(key, value);
  if (state.page > 1) params.set("page", String(state.page));
  return "/search/" + (params.size ? "?" + params.toString() : "");
}

/** Only public archive routes may be supplied by search result metadata. */
export function searchResultHref(value: string, query: string, subresult?: string): string | null {
  const origin = "https://kalamarchive.com";
  try {
    const target = new URL(value, origin);
    if (target.origin !== origin || !/^\/(?:lyrics|basta)\//u.test(target.pathname)) return null;
    if (subresult) {
      const section = new URL(subresult, origin);
      if (section.origin === origin && section.pathname === target.pathname && section.hash)
        target.hash = section.hash;
    }
    if (query.trim()) target.searchParams.set("highlight", query);
    return target.pathname + target.search + target.hash;
  } catch { return null; }
}
