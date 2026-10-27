// Explicit page bookmarks are separate from the automatically saved reading position.
import { STORAGE_KEYS, readBastaPosition, readStringList, writeStringList } from "./storage";

export function readBastaBookmarks(): number[] {
  return [...new Set(readStringList(STORAGE_KEYS.bastaBookmarks)
    .map(Number).filter((page) => Number.isSafeInteger(page) && page >= 1 && page <= 1000))];
}

export function initBastaBookmarks(root: HTMLElement, controls: HTMLElement): void {
  const button = controls.querySelector<HTMLButtonElement>("[data-basta-bookmark]");
  if (!button) return;
  const currentPage = () => root.dataset.readerKind === "basta-page"
    ? Number(root.dataset.bastaCurrentPage) : readBastaPosition()?.page;
  const update = () => {
    const page = currentPage();
    const valid = typeof page === "number" && Number.isSafeInteger(page) && page > 0;
    const bookmarked = valid && readBastaBookmarks().includes(page);
    button.disabled = !valid;
    button.textContent = bookmarked ? "Saved page" : "Save page";
    button.setAttribute("aria-pressed", String(bookmarked));
    button.setAttribute("aria-label", valid ? (bookmarked ? "Remove bookmark for Basta page " : "Bookmark Basta page ") + page : "Page not yet available");
    button.title = button.getAttribute("aria-label") || "";
  };
  button.addEventListener("click", () => {
    const page = currentPage();
    if (!page || !Number.isSafeInteger(page)) return;
    const old = readBastaBookmarks();
    const next = old.includes(page) ? old.filter((n) => n !== page) : [page, ...old].slice(0, 100);
    writeStringList(STORAGE_KEYS.bastaBookmarks, next.map(String));
    window.dispatchEvent(new Event("kalam:basta-bookmarks-changed"));
    update();
  });
  window.addEventListener("kalam:reading-progress", update);
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEYS.bastaBookmarks) update();
  });
  update();
}
