// File role: Progressive search across a complete metadata directory, loaded on demand.
import { node } from "./dom";
import { matchesSearchText } from "../lib/search-normalization";
import { DISCOVERY_DIMENSIONS, type DiscoveryDimension } from "../lib/discovery";

interface DirectoryItem { label: string; href: string; count: number }

export function initDiscovery(): void {
  const root = document.querySelector<HTMLElement>("[data-discovery-dimension]");
  const dimension = root?.dataset.discoveryDimension as DiscoveryDimension | undefined;
  const input = root?.querySelector<HTMLInputElement>("#discovery-query");
  const list = root?.querySelector<HTMLElement>("#discovery-terms");
  const status = root?.querySelector<HTMLElement>("#discovery-status");
  const more = root?.querySelector<HTMLButtonElement>("#discovery-more");
  const pagination = root?.querySelector<HTMLElement>("#discovery-pagination");
  const control = root?.querySelector<HTMLElement>(".discovery-filter");
  if (!root || !dimension || !DISCOVERY_DIMENSIONS.includes(dimension) ||
      !input || !list || !status || !more || !pagination || !control) return;

  control.hidden = false;
  const original = Array.from(list.children, child => child.cloneNode(true));
  let directory: Promise<DirectoryItem[]> | undefined;
  let matches: DirectoryItem[] = [];
  let visible = 60;
  let generation = 0;
  let timer: number | undefined;

  const load = () => directory ??= fetch(`/data/discovery/${dimension}.json`).then(async response => {
    if (!response.ok) throw Error("Directory unavailable");
    const data: unknown = await response.json();
    if (!Array.isArray(data) || data.some(item => !item || typeof item.label !== "string" ||
      typeof item.href !== "string" || !item.href.startsWith(`/${dimension}/`) ||
      !Number.isSafeInteger(item.count) || item.count < 0)) throw Error("Invalid directory");
    return data as DirectoryItem[];
  }).catch(cause => { directory = undefined; throw cause; });

  const show = () => {
    list.replaceChildren(...matches.slice(0, visible).map(item => {
      const row = node("li");
      const link = node("a", "discovery-term");
      link.href = item.href;
      const label = node("span", "", item.label);
      label.dir = "auto";
      link.append(label, node("small", "", item.count.toLocaleString() + (item.count === 1 ? " kalam" : " kalams")));
      row.append(link);
      return row;
    }));
    more.hidden = matches.length <= visible;
    more.disabled = more.hidden;
    status.textContent = matches.length === 0 ? "No matching names. Try a shorter spelling."
      : matches.length.toLocaleString() + (matches.length === 1 ? " match." : " matches.") +
        (matches.length > visible ? " Showing " + visible + "." : "");
  };

  const run = async () => {
    const ticket = ++generation;
    more.disabled = true;
    const query = input.value.trim();
    const url = new URL(location.href);
    if (query) url.searchParams.set("q", input.value); else url.searchParams.delete("q");
    history.replaceState(null, "", url.pathname + url.search + url.hash);
    visible = 60;
    if (!query) {
      matches = [];
      list.replaceChildren(...original.map(child => child.cloneNode(true)));
      pagination.hidden = false;
      more.hidden = true;
      status.textContent = "";
      list.removeAttribute("aria-busy");
      return;
    }
    status.textContent = "Searching all names…";
    list.setAttribute("aria-busy", "true");
    try {
      const entries = await load();
      if (ticket !== generation) return;
      matches = entries.filter(item => matchesSearchText(item.label, query));
      pagination.hidden = true;
      show();
    } catch {
      if (ticket !== generation) return;
      matches = [];
      list.replaceChildren(...original.map(child => child.cloneNode(true)));
      pagination.hidden = false;
      more.hidden = true;
      status.textContent = "Name search could not load. You can still browse the pages below; change your search to try again.";
    } finally {
      if (ticket === generation) list.removeAttribute("aria-busy");
    }
  };

  input.addEventListener("input", () => {
    ++generation;
    // Do not expand the previous query while the next one is debouncing/loading.
    more.disabled = true;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => { void run(); }, 150);
  });
  input.addEventListener("keydown", event => {
    if (event.key === "Enter") { window.clearTimeout(timer); void run(); }
  });
  more.addEventListener("click", () => {
    if (more.disabled || more.hidden) return;
    const firstNew = visible;
    visible += 60;
    show();
    list.children[firstNew]?.querySelector<HTMLAnchorElement>("a")?.focus();
  });
  window.addEventListener("popstate", () => {
    window.clearTimeout(timer);
    input.value = new URLSearchParams(location.search).get("q")?.slice(0, 200) ?? "";
    void run();
  });
  input.value = new URLSearchParams(location.search).get("q")?.slice(0, 200) ?? "";
  if (input.value) void run();
}
