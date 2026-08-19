// File role: Pagefind search-page controller: URL synchronization, active-filter chips, filter removal, and clear-all behavior.
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
  triggerLoad(): Promise<void>;
  triggerSearchWithFilters(term: string, filters: SearchFilters): void;
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
    if (strings.length) filters[key] = strings;
  }

  return filters;
}

function readUrlState(): { term: string; filters: SearchFilters } {
  const params = new URLSearchParams(window.location.search);
  const filters: SearchFilters = {};

  for (const key of FILTER_KEYS) {
    const values = params.getAll(key).filter(Boolean);
    if (values.length) filters[key] = values;
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
  await customElements.whenDefined("pagefind-input");
  while (!window.PagefindComponents?.getInstanceManager) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return window.PagefindComponents.getInstanceManager().getInstance("default");
}

export async function initSearchPage(): Promise<void> {
  const instance = await getPagefindInstance();
  const initial = readUrlState();
  let currentTerm = initial.term;
  let currentFilters = initial.filters;

  const apply = (term: string, filters: SearchFilters) => {
    currentTerm = term;
    currentFilters = filters;
    writeUrlState(term, filters);
    renderFilterChips(filters);
  };

  instance.on("search", (term, rawFilters) => {
    apply(term, normalizeFilters(rawFilters));
  });

  document.querySelector("#clear-search-state")?.addEventListener("click", () => {
    instance.triggerSearchWithFilters("", {});
  });

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

  await instance.triggerLoad();
  renderFilterChips(initial.filters);
  instance.triggerSearchWithFilters(initial.term, initial.filters);
}
