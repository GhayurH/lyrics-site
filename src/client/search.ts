// File role: Accessible search UI using only Pagefind's documented browser API.
import { node } from "./dom";
import { matchesSearchText } from "../lib/search-normalization";
import { searchWithFacets, SEARCH_RANKING, type PagefindApi, type FacetCounts,
  type SearchResultData } from "../lib/search-engine";
import { SEARCH_FACETS, SEARCH_PAGE_SIZE, readSearchState, searchStateHref,
  searchResultHref, type SearchFacet, type SearchState } from "../lib/search-state";

/** Pagefind excerpts contain highlighting, but no other markup is trusted. */
function appendExcerpt(target: HTMLElement, excerpt: string): void {
  const template = document.createElement("template");
  template.innerHTML = excerpt;
  const append = (source: Node, parent: Node) => {
    if (source.nodeType === Node.TEXT_NODE) parent.appendChild(document.createTextNode(source.textContent ?? ""));
    else if (source instanceof Element) {
      const next = source.tagName === "MARK" ? document.createElement("mark") : parent;
      if (next !== parent) parent.appendChild(next);
      for (const child of source.childNodes) append(child, next);
    }
  };
  for (const child of template.content.childNodes) append(child, target);
}

function renderResult(data: SearchResultData, query: string): HTMLLIElement | null {
  const matchedSection = query.trim() ? data.sub_results?.find(result => result.url.includes("#")) : undefined;
  const href = searchResultHref(data.meta.url || data.url, query, matchedSection?.url);
  if (!href) return null;
  const item = node("li", "pf-result");
  const card = node("article", "pf-result-card");
  if (data.meta.collection) card.append(node("p", "search-result-collection", data.meta.collection));
  const heading = node("h2", "pf-result-title");
  heading.dir = "auto";
  const link = node("a", "pf-result-link", data.meta.title || data.meta.roman_title || "Read kalam");
  if (data.meta.lang && /[\u0600-\u06ff]/u.test(link.textContent ?? "")) heading.lang = data.meta.lang;
  link.href = href;
  heading.append(link);
  card.append(heading);
  if (data.meta.roman_title && data.meta.roman_title !== data.meta.title) {
    const roman = node("p", "search-result-roman-title", data.meta.roman_title);
    roman.dir = "ltr";
    card.append(roman);
  }
  if (data.excerpt) {
    const excerpt = node("p", "pf-result-excerpt");
    excerpt.dir = "auto";
    appendExcerpt(excerpt, matchedSection?.excerpt || data.excerpt);
    card.append(excerpt);
  }
  if (matchedSection) card.append(node("p", "search-result-section", "Opens at the matching passage"));
  item.append(card);
  return item;
}

export async function initSearchPage(): Promise<void> {
  const root = document.querySelector<HTMLElement>(".search-page");
  const input = document.querySelector<HTMLInputElement>("#search-query");
  const list = document.querySelector<HTMLOListElement>("#search-results");
  const summary = document.querySelector<HTMLElement>("#search-summary");
  const pagination = document.querySelector<HTMLElement>("#search-pagination");
  const error = document.querySelector<HTMLElement>("#search-load-error");
  const noResults = document.querySelector<HTMLElement>("#search-no-results-help");
  if (!root || !input || !list || !summary || !pagination || !error || !noResults) return;
  let state = readSearchState(location.search);
  let vocabulary: FacetCounts = {};
  let counts: FacetCounts = {};
  let generation = 0;
  let timer: number | undefined;
  let typingSession = false;
  let enginePromise: Promise<PagefindApi> | undefined;
  let engine: PagefindApi | undefined;
  let engineReset = Promise.resolve();
  let lastSearch: { key: string; value: Awaited<ReturnType<typeof searchWithFacets>> } | undefined;
  const facets = Array.from(root.querySelectorAll<HTMLDetailsElement>("[data-search-facet]"));

  const getEngine = () => {
    if (!enginePromise) {
      const path = "/pagefind/pagefind.js";
      enginePromise = engineReset.then(() => import(/* @vite-ignore */ path)).then(async module => {
        const api = module as PagefindApi;
        engine = api;
        await api.options({ excerptLength: 25, metaCacheTag: root.dataset.searchVersion,
          ranking: SEARCH_RANKING });
        vocabulary = await api.filters();
        return api;
      }).catch(cause => { enginePromise = undefined; throw cause; });
    }
    return enginePromise;
  };

  function renderFacets(): void {
    const active = document.activeElement instanceof HTMLInputElement
      ? { key: document.activeElement.dataset.facetChoice, value: document.activeElement.value } : undefined;
    for (const facet of facets) {
      const definition = SEARCH_FACETS.find(item => item.key === facet.dataset.searchFacet);
      if (!definition) continue;
      const { key, label, empty } = definition;
      const selected = new Set(state.filters[key] ?? []);
      const title = facet.querySelector("summary");
      if (title) {
        title.textContent = selected.size === 0 ? empty : selected.size === 1
          ? [...selected][0] : selected.size + " selected";
        title.setAttribute("aria-label", label + ": " + title.textContent);
        title.dir = "auto";
      }
      const query = facet.querySelector<HTMLInputElement>("[data-facet-query]")?.value ?? "";
      const values = [...new Set([...Object.keys(vocabulary[key] ?? {}), ...selected])]
        .filter(value => matchesSearchText(value, query))
        .sort((a, b) => Number(selected.has(b)) - Number(selected.has(a)) ||
          Number((counts[key]?.[b] ?? 0) > 0) - Number((counts[key]?.[a] ?? 0) > 0) ||
          a.localeCompare(b, "en", { numeric: true }));
      const options = facet.querySelector<HTMLElement>("[data-facet-options]");
      if (!options) continue;
      const visible = values.slice(0, 80);
      for (const value of selected)
        if (values.includes(value) && !visible.includes(value)) visible.push(value);
      options.replaceChildren(...visible.map(value => {
        const choice = node("label", "search-facet-choice");
        const checkbox = node("input");
        checkbox.type = "checkbox";
        checkbox.value = value;
        checkbox.checked = selected.has(value);
        checkbox.dataset.facetChoice = key;
        const total = counts[key]?.[value] ?? 0;
        checkbox.disabled = !checkbox.checked && total === 0;
        const name = node("span", "", value);
        name.dir = "auto";
        const count = node("small", "", String(total));
        count.dataset.facetCount = String(total);
        count.setAttribute("aria-label", total + (total === 1 ? " matching kalam" : " matching kalams"));
        choice.append(checkbox, name, count);
        return choice;
      }));
      const hint = facet.querySelector<HTMLElement>("[data-facet-hint]");
      if (hint) {
        hint.setAttribute("aria-live", facet.open ? "polite" : "off");
        const message = values.length > 80 ? "Showing " + visible.length + " of " + values.length + "; type to find more"
          : values.length === 0 ? "No matching options" : "Counts include your query and other filters.";
        if (hint.textContent !== message) hint.textContent = message;
      }
    }
    if (active?.key) root!.querySelector<HTMLInputElement>(
      `[data-facet-choice="${CSS.escape(active.key)}"][value="${CSS.escape(active.value)}"]`)?.focus({ preventScroll: true });
  }

  function renderChips(): void {
    const shell = root!.querySelector<HTMLElement>("#active-search-filters");
    const chips = root!.querySelector<HTMLElement>("#active-search-filter-list");
    if (!shell || !chips) return;
    const buttons = SEARCH_FACETS.flatMap(({ key, label }) => (state.filters[key] ?? []).map(value => {
      const button = node("button", "search-filter-chip", label + ": " + value + " ×");
      button.type = "button";
      button.dataset.filterKey = key;
      button.dataset.filterValue = value;
      button.setAttribute("aria-label", "Remove " + label + " filter " + value);
      return button;
    }));
    chips.replaceChildren(...buttons);
    shell.hidden = !buttons.length;
  }

  function renderPagination(totalPages: number): void {
    pagination!.replaceChildren();
    pagination!.hidden = totalPages < 2;
    if (totalPages < 2) return;
    const pages = [...new Set([1, state.page - 1, state.page, state.page + 1, totalPages])]
      .filter(page => page >= 1 && page <= totalPages).sort((a, b) => a - b);
    const add = (label: string, page: number) => {
      const link = node("a", "search-page-link", label);
      link.href = searchStateHref({ ...state, page });
      link.dataset.searchPage = String(page);
      link.setAttribute("aria-label", label === "Previous" || label === "Next" ? label + " results page" : "Results page " + page);
      if (page === state.page) link.setAttribute("aria-current", "page");
      pagination!.append(link);
    };
    if (state.page > 1) add("Previous", state.page - 1);
    pages.forEach((page, index) => {
      if (index && page - pages[index - 1] > 1) pagination!.append(node("span", "", "…"));
      add(String(page), page);
    });
    if (state.page < totalPages) add("Next", state.page + 1);
  }

  async function run(focusResults = false): Promise<void> {
    const ticket = ++generation;
    const requested = state;
    const key = searchStateHref({ ...requested, page: 1 });
    list!.setAttribute("aria-busy", "true");
    summary!.textContent = "Searching…";
    error!.hidden = noResults!.hidden = true;
    try {
      const api = await getEngine();
      const response = lastSearch?.key === key ? lastSearch.value
        : await searchWithFacets(api, requested.query, requested.filters);
      if (ticket !== generation) return;
      lastSearch = { key, value: response };
      const total = response.results.length;
      const pages = Math.max(1, Math.ceil(total / SEARCH_PAGE_SIZE));
      state = { ...requested, page: Math.min(requested.page, pages) };
      if (state.page !== requested.page) history.replaceState(null, "", searchStateHref(state));
      counts = response.counts;
      renderFacets();
      const start = (state.page - 1) * SEARCH_PAGE_SIZE;
      const loaded = await Promise.allSettled(response.results.slice(start, start + SEARCH_PAGE_SIZE).map(item => item.data()));
      if (ticket !== generation) return;
      const cards = loaded.flatMap(result => result.status === "fulfilled"
        ? [renderResult(result.value, requested.query)].filter((item): item is HTMLLIElement => item !== null) : []);
      list!.replaceChildren(...cards);
      const failed = loaded.filter(result => result.status === "rejected").length;
      summary!.textContent = total === 0 ? "No matching kalams." : total.toLocaleString() +
        (total === 1 ? " matching kalam." : " matching kalams.") + " Showing " + (start + 1) + "–" +
        Math.min(start + SEARCH_PAGE_SIZE, total) + "." + (failed ? " Some results could not load; retry the search." : "");
      error!.hidden = failed === 0;
      noResults!.hidden = total !== 0;
      renderPagination(pages);
      if (focusResults) { summary!.focus({ preventScroll: true }); summary!.scrollIntoView({ block: "start" }); }
    } catch {
      if (ticket !== generation) return;
      list!.replaceChildren();
      pagination!.hidden = true;
      summary!.textContent = "Search could not load.";
      error!.hidden = false;
    } finally {
      if (ticket === generation) list!.setAttribute("aria-busy", "false");
    }
  }

  function apply(next: SearchState, historyMode: "push" | "replace" | "none", focusResults = false): void {
    window.clearTimeout(timer);
    state = next;
    input!.value = state.query;
    const href = searchStateHref(state);
    if (historyMode !== "none" && href !== location.pathname + location.search)
      history[historyMode === "push" ? "pushState" : "replaceState"](null, "", href);
    renderChips();
    void run(focusResults);
  }

  input.value = state.query;
  input.addEventListener("input", () => {
    ++generation;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      apply({ ...state, query: input.value, page: 1 }, typingSession ? "replace" : "push");
      typingSession = true;
    }, 220);
  });
  input.addEventListener("blur", () => { typingSession = false; });
  root.querySelector("#search-form")?.addEventListener("submit", event => {
    event.preventDefault();
    typingSession = false;
    apply({ ...state, query: input.value, page: 1 }, "push");
  });
  const clear = () => { typingSession = false; apply({ query: "", filters: {}, page: 1 }, "push"); input.focus(); };
  root.querySelector("#clear-search-state")?.addEventListener("click", clear);
  root.querySelector("#search-clear-no-results")?.addEventListener("click", clear);
  root.querySelector("#search-retry")?.addEventListener("click", () => {
    if (list.getAttribute("aria-busy") === "true") return;
    const previous = engine;
    engine = undefined;
    lastSearch = undefined;
    enginePromise = undefined;
    // A failed metadata/fragment request can remain cached by an instance.
    // New searches wait for the public reset, including if the query changes.
    engineReset = Promise.resolve().then(() => previous?.destroy()).then(() => {}).catch(() => {});
    input.focus({ preventScroll: true });
    void run();
  });

  for (const facet of facets) {
    facet.addEventListener("toggle", () => {
      if (facet.open) for (const other of facets) if (other !== facet) other.open = false;
      facet.querySelector("[data-facet-hint]")?.setAttribute("aria-live", facet.open ? "polite" : "off");
    });
    facet.querySelector("[data-facet-query]")?.addEventListener("input", renderFacets);
    facet.addEventListener("change", event => {
      const checkbox = event.target;
      if (!(checkbox instanceof HTMLInputElement) || !checkbox.dataset.facetChoice) return;
      const key = checkbox.dataset.facetChoice as SearchFacet;
      const filters = { ...state.filters };
      const selected = new Set(filters[key] ?? []);
      if (checkbox.checked) selected.add(checkbox.value); else selected.delete(checkbox.value);
      if (selected.size) filters[key] = [...selected]; else delete filters[key];
      typingSession = false;
      apply({ query: input.value, filters, page: 1 }, "push");
    });
    facet.addEventListener("keydown", event => {
      if (event.key === "Escape" && facet.open) {
        facet.open = false;
        facet.querySelector("summary")?.focus();
      }
    });
  }
  root.querySelector("#active-search-filter-list")?.addEventListener("click", event => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("[data-filter-key]") : null;
    if (!button) return;
    const hadFocus = document.activeElement === button;
    const index = Array.from(button.parentElement?.children ?? []).indexOf(button);
    const key = button.dataset.filterKey as SearchFacet;
    const filters = { ...state.filters };
    const remaining = (filters[key] ?? []).filter(value => value !== button.dataset.filterValue);
    if (remaining.length) filters[key] = remaining; else delete filters[key];
    typingSession = false;
    apply({ query: input.value, filters, page: 1 }, "push");
    if (hadFocus) {
      const remaining = root.querySelectorAll<HTMLButtonElement>("#active-search-filter-list button");
      (remaining[Math.min(index, remaining.length - 1)] ?? input).focus({ preventScroll: true });
    }
  });
  pagination.addEventListener("click", event => {
    if (!(event instanceof MouseEvent) || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("[data-search-page]") : null;
    if (!link) return;
    event.preventDefault();
    typingSession = false;
    apply({ ...state, page: Number(link.dataset.searchPage) }, "push", true);
  });
  window.addEventListener("popstate", () => {
    typingSession = false;
    apply(readSearchState(location.search), "none");
  });
  apply(state, "none");
}
