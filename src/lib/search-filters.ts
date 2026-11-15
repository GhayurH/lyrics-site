// Pagefind's default arrays mean AND, even when the component dropdown allows
// multiple choices. Each facet should be OR; different facet types stay AND.
export type SelectedSearchFilters = Record<string, string[]>;
export type PagefindOrFilters = Record<string, string[] | { any: string[] }>;

export function toPagefindOrFilters(selected: SelectedSearchFilters): PagefindOrFilters {
  const filters: PagefindOrFilters = {};
  for (const [key, values] of Object.entries(selected)) {
    const clean = [...new Set(values.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()))];
    if (clean.length > 1) filters[key] = { any: clean };
    else if (clean.length === 1) filters[key] = clean;
  }
  return filters;
}
