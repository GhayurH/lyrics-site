// File role: Pagefind search-page controller: URL synchronization, active-filter chips, filter removal, and clear-all behavior.
import { toPagefindOrFilters } from "../lib/search-filters";
import { normalizeSearchQuery } from "../lib/search-normalization";
const FILTER_KEYS = [
  "collection",
  "kalamType",
  "haal",
  "tag",
  "language",
  "occasion",
  "poet",
  "reciter",
] as const;

type FilterKey = (typeof FILTER_KEYS)[number];
type SearchFilters = Partial<Record<FilterKey, string[]>>;

type PagefindInstance = {
  on(event: "search", callback: (term: string, filters: Record<string, unknown>) => void): void;
  on(event: "results", callback: (result: { results?: unknown[] }) => void): void;
  triggerLoad(): Promise<void>;
  triggerSearchWithFilters(term: string, filters: SearchFilters): void;
  // Pagefind Component UI v1.6 stores its underlying search adapter here.
  // Its public filters state is arrays, so keep that state unchanged for the
  // dropdowns and convert only the engine request to OR-within-each-facet.
  __pagefind__?: {
    search: (term: string | null, options?: { filters?: Record<string, unknown>; sort?: Record<string, string> }) => Promise<unknown>;
    filters: () => Promise<Record<string, Record<string, number>>>;
  };
};

declare global {
  interface Window {
    PagefindComponents?: {
      getInstanceManager?: () => { getInstance: (name: string) => PagefindInstance };
    };
  }
}

const FILTER_LABELS: Record<FilterKey, string> = {
  collection: "Archive",
  kalamType: "Kalam Type",
  haal: "Haal",
  tag: "Tag",
  language: "Language",
  occasion: "Occasion",
  poet: "Poet",
  reciter: "Reciter",
};

function normalizeFilters(raw: Record<string, unknown> = {}): SearchFilters {
  const filters: SearchFilters = {};

  for (const key of FILTER_KEYS) {
    const value = raw[key];
    const values = Array.isArray(value) ? value : value ? [value] : [];
    const strings = values.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0,
    );
    if (strings.length) filters[key] = [...new Set(strings)];
  }

  return filters;
}

function readUrlState(): { term: string; filters: SearchFilters } {
  const params = new URLSearchParams(window.location.search);
  const filters: SearchFilters = {};

  for (const key of FILTER_KEYS) {
    const values = params.getAll(key).filter(Boolean);
    if (values.length) filters[key] = [...new Set(values)];
  }

  // Preserve old share links while keeping the current public vocabulary.
  if (!filters.kalamType) {
    const legacyCategory = params.getAll("category").filter(Boolean);
    if (legacyCategory.length) filters.kalamType = legacyCategory;
  }

  return { term: params.get("q") ?? "", filters };
}

function writeUrlState(term: string, filters: SearchFilters): void {
  const params = new URLSearchParams();
  const cleanTerm = term.trim();
  if (cleanTerm) params.set("q", cleanTerm);

  for (const key of FILTER_KEYS) {
    for (const value of filters[key] ?? []) {
      if (value.trim()) params.append(key, value.trim());
    }
  }

  const query = params.toString();
  history.replaceState(
    null,
    "",
    query ? `${location.pathname}?${query}` : location.pathname,
  );
}

function renderFilterChips(filters: SearchFilters): void {
  const shell = document.querySelector<HTMLElement>("#active-search-filters");
  const list = document.querySelector<HTMLElement>("#active-search-filter-list");
  if (!shell || !list) return;

  const chips: HTMLButtonElement[] = [];
  for (const key of FILTER_KEYS) {
    for (const value of filters[key] ?? []) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "search-filter-chip";
      button.dataset.filterKey = key;
      button.dataset.filterValue = value;
      button.setAttribute("aria-label", `Remove ${FILTER_LABELS[key]} filter ${value}`);
      button.append(`${FILTER_LABELS[key]}: ${value} `);

      const remove = document.createElement("span");
      remove.setAttribute("aria-hidden", "true");
      remove.textContent = "×";
      button.append(remove);
      chips.push(button);
    }
  }

  list.replaceChildren(...chips);
  shell.hidden = chips.length === 0;
}

async function getPagefindInstance(): Promise<PagefindInstance> {
  const deadline = performance.now() + 10000;
  while (!customElements.get("pagefind-input") || !window.PagefindComponents?.getInstanceManager) {
    if (performance.now() >= deadline) throw new Error("Search assets did not load.");
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return window.PagefindComponents.getInstanceManager().getInstance("default");
}

export async function initSearchPage(): Promise<void> {
  // The UI component may fail to load because of a blocked asset or network error.
  // Fail visibly rather than leaving a perpetual loading/empty search page.
  let instance: PagefindInstance;
  let facetValues: Record<string, Record<string, number>>;
  try {
    instance = await getPagefindInstance();
    await instance.triggerLoad();
    const engine = instance.__pagefind__;
    if (!engine) throw Error("Pagefind filter adapter unavailable");
    const originalSearch = engine.search.bind(engine);
    engine.search = (term, options) => originalSearch(
      typeof term === "string" ? normalizeSearchQuery(term) : term, {
      ...options,
      filters: toPagefindOrFilters(options?.filters as SearchFilters ?? {}),
    });
    facetValues = await engine.filters();
  } catch (error) {
    console.error("Unable to initialize search:", error);
    const message = document.querySelector<HTMLElement>("#search-load-error");
    if (message) message.hidden = false;
    const clear = document.querySelector<HTMLButtonElement>("#clear-search-state");
    if (clear) clear.disabled = true;
    return;
  }

  const initial = readUrlState();
  let currentTerm = initial.term;
  let currentFilters = initial.filters;

  const facets = Array.from(document.querySelectorAll<HTMLDetailsElement>("[data-search-facet]"));
  const renderFacets = (filters: SearchFilters) => {
    for (const facet of facets) {
      const key = facet.dataset.searchFacet as FilterKey;
      if (!FILTER_KEYS.includes(key)) continue;
      const selected = new Set(filters[key] ?? []);
      const summary = facet.querySelector<HTMLElement>("summary");
      if (summary) {
        const defaults: Partial<Record<FilterKey, string>> = {
          collection: "Both archives", kalamType: "All types", haal: "Any Haal", tag: "Any tag",
        };
        summary.textContent = selected.size === 0 ? defaults[key] ?? FILTER_LABELS[key]
          : selected.size === 1 ? [...selected][0] : selected.size + " selected";
      }
      const query = facet.querySelector<HTMLInputElement>("[data-facet-query]")?.value.trim().toLocaleLowerCase() ?? "";
      const all = [...new Set([...Object.keys(facetValues[key] ?? {}), ...selected])]
        .sort((a, b) => a.localeCompare(b));
      const filtered = all.filter((value) => value.toLocaleLowerCase().includes(query));
      // Bound option rendering when thousands of imports increase the taxonomy:
      // the search input still matches the entire facet vocabulary.
      const visible = filtered.slice(0, 80);
      const list = facet.querySelector<HTMLElement>("[data-facet-options]");
      if (!list) continue;
      const items = visible.map((value) => {
        const label = document.createElement("label");
        label.className = "search-facet-choice";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = value;
        checkbox.checked = selected.has(value);
        checkbox.dataset.facetChoice = key;
        const name = document.createElement("span");
        name.textContent = value;
        const count = document.createElement("small");
        const total = facetValues[key]?.[value];
        count.textContent = typeof total === "number" ? String(total) : "";
        label.append(checkbox, name, count);
        return label;
      });
      list.replaceChildren(...items);
      const hint = facet.querySelector<HTMLElement>("[data-facet-hint]");
      if (hint) {
        hint.textContent = filtered.length > 80
          ? "Showing 80 of " + filtered.length + "; type to find more"
          : filtered.length === 0 ? "No matching options" : "";
      }
    }
  };

  for (const facet of facets) {
    facet.addEventListener("toggle", () => {
      if (facet.open) for (const other of facets) if (other !== facet) other.open = false;
    });
    facet.querySelector<HTMLInputElement>("[data-facet-query]")?.addEventListener("input", () => renderFacets(currentFilters));
    facet.addEventListener("change", (event) => {
      const checkbox = event.target;
      if (!(checkbox instanceof HTMLInputElement) || checkbox.dataset.facetChoice === undefined) return;
      const key = checkbox.dataset.facetChoice as FilterKey;
      if (!FILTER_KEYS.includes(key)) return;
      const next = { ...currentFilters };
      const selected = new Set(next[key] ?? []);
      if (checkbox.checked) selected.add(checkbox.value);
      else selected.delete(checkbox.value);
      if (selected.size) next[key] = [...selected];
      else delete next[key];
      instance.triggerSearchWithFilters(currentTerm, next);
    });
    facet.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && facet.open) {
        facet.open = false;
        facet.querySelector<HTMLElement>("summary")?.focus();
      }
    });
  }

  const apply = (term: string, filters: SearchFilters) => {
    currentTerm = term;
    currentFilters = filters;
    writeUrlState(term, filters);
    renderFilterChips(filters);
    renderFacets(filters);
  };

  instance.on("search", (term, rawFilters) => {
    apply(term, normalizeFilters(rawFilters));
    const help = document.querySelector<HTMLElement>("#search-no-results-help");
    if (help) help.hidden = true;
  });
  instance.on("results", (result) => {
    const help = document.querySelector<HTMLElement>("#search-no-results-help");
    if (help) help.hidden = (result.results?.length ?? 0) > 0 ||
      (!currentTerm.trim() && Object.keys(currentFilters).length === 0);
  });

  const clearSearch = () => instance.triggerSearchWithFilters("", {});
  document.querySelector("#clear-search-state")?.addEventListener("click", clearSearch);
  document.querySelector("#search-clear-no-results")?.addEventListener("click", clearSearch);

  document
    .querySelector("#active-search-filter-list")
    ?.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest<HTMLButtonElement>("[data-filter-key][data-filter-value]");
      if (!button) return;

      const key = button.dataset.filterKey as FilterKey | undefined;
      const value = button.dataset.filterValue;
      if (!key || !value || !FILTER_KEYS.includes(key)) return;

      const next: SearchFilters = { ...currentFilters };
      const remaining = (next[key] ?? []).filter((item) => item !== value);
      if (remaining.length) next[key] = remaining;
      else delete next[key];
      instance.triggerSearchWithFilters(currentTerm, next);
    });

  apply(initial.term, initial.filters);
  instance.triggerSearchWithFilters(initial.term, initial.filters);
}
