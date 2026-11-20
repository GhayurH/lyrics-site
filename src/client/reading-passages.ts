// Progressive sharing and search navigation. Source text and stanza markup stay intact.
import { matchesSearchText, searchTokens } from "../lib/search-normalization";

type Edition = "original" | "roman";
interface Passage { key: string; label: string; editions: Partial<Record<Edition, HTMLElement>> }
const VERSE = ".lyric-verse, .basta-verse-poetry";

function passageLines(target: HTMLElement): HTMLElement[] {
  if (target.dataset.stanzaFragment === "true") {
    const lines = [target];
    for (let next = target.nextElementSibling; next; next = next.nextElementSibling) {
      if (next.classList.contains("poetry-stanza-number")) break;
      if (next instanceof HTMLElement && next.matches(VERSE)) lines.push(next);
    }
    return lines;
  }
  return [...target.querySelectorAll<HTMLElement>(VERSE + ", .poetry-stanza-number")];
}

function shareURL(target: HTMLElement): string {
  const url = new URL(location.pathname, location.origin);
  url.hash = target.id;
  return url.href;
}

function reveal(target: HTMLElement): void {
  const edition = target.closest(".lyric-reading-roman, .basta-page-roman, .basta-reader-roman") ? "roman" : "urdu";
  window.dispatchEvent(new CustomEvent("kalam:reveal-edition", { detail: { edition } }));
  requestAnimationFrame(() => {
    target.scrollIntoView({ block: "start", behavior: "instant" });
    // A stanza can already be a bookmark button or a keyboard-pannable line.
    // Preserve its position in the Tab order while making plain blocks focusable.
    if (!target.matches("button, input, select, textarea, a[href], [tabindex]")) target.tabIndex = -1;
    target.focus({ preventScroll: true });
  });
}

export function initReadingPassages(root: HTMLElement, controls: HTMLElement): void {
  if (root.dataset.passagesReady === "true") return;
  root.dataset.passagesReady = "true";
  const passages = new Map<string, Passage>();
  for (const target of root.querySelectorAll<HTMLElement>("[id][data-stanza-key]")) {
    const key = target.dataset.stanzaKey!;
    const passage = passages.get(key) ?? { key, label: target.dataset.stanzaLabel || "Passage", editions: {} };
    passage.editions[target.dataset.stanzaEdition === "roman" ? "roman" : "original"] = target;
    passages.set(key, passage);
  }
  const originalLabel = controls.dataset.originalLabel || "Original";
  const shareButton = controls.querySelector<HTMLButtonElement>("[data-reading-share]");
  let dialog: HTMLDialogElement | undefined;
  let navigateAfterClose: HTMLElement | null = null;
  if (shareButton && passages.size) {
    shareButton.hidden = false;
    shareButton.addEventListener("click", () => {
      if (!dialog) {
        dialog = document.createElement("dialog");
        dialog.className = "reading-passage-dialog";
        dialog.setAttribute("aria-labelledby", "passage-dialog-title");
        dialog.innerHTML = `<form method="dialog"><h2 id="passage-dialog-title">Share a stanza</h2>
          <button class="passage-close" aria-label="Close stanza sharing">Close</button></form>
          <label>Passage <select data-passage-choice></select></label>
          <label>Edition <select data-passage-edition></select></label>
          <label>Text <textarea data-passage-text readonly rows="7" dir="auto"></textarea></label>
          <div class="passage-actions"><button type="button" data-passage-copy>Copy text</button>
          <button type="button" data-passage-link>Copy link</button><a data-passage-go>Go to stanza</a></div>
          <input data-passage-url readonly aria-label="Stanza link" />
          <p data-passage-status role="status" aria-live="polite"></p>`;
        document.body.append(dialog);
        const choice = dialog.querySelector<HTMLSelectElement>("[data-passage-choice]")!;
        const editions = dialog.querySelector<HTMLSelectElement>("[data-passage-edition]")!;
        const text = dialog.querySelector<HTMLTextAreaElement>("[data-passage-text]")!;
        const address = dialog.querySelector<HTMLInputElement>("[data-passage-url]")!;
        const go = dialog.querySelector<HTMLAnchorElement>("[data-passage-go]")!;
        const status = dialog.querySelector<HTMLElement>("[data-passage-status]")!;
        for (const passage of passages.values()) {
          const label = passage.editions.original ? passage.label : passage.label + " · Roman";
          choice.add(new Option(label, passage.key));
        }
        const update = (reset = false) => {
          const passage = passages.get(choice.value)!;
          if (reset) {
            const preferred = editions.value;
            editions.replaceChildren();
            if (passage.editions.original) editions.add(new Option(originalLabel, "original"));
            if (passage.editions.roman) editions.add(new Option("Roman", "roman"));
            if (passage.editions.original && passage.editions.roman) editions.add(new Option("Both editions", "both"));
            if ([...editions.options].some((option) => option.value === preferred)) editions.value = preferred;
          }
          const selected: Edition[] = editions.value === "both" ? ["original", "roman"] : [editions.value as Edition];
          text.value = selected.map((edition) => passageLines(passage.editions[edition]!)
            .map((line) => line.textContent || "").join("\n")).join("\n\n");
          const target = passage.editions[selected[0]]!;
          address.value = shareURL(target);
          go.href = "#" + target.id;
          status.textContent = "";
        };
        choice.addEventListener("change", () => update(true));
        editions.addEventListener("change", () => update());
        const copy = async (field: HTMLInputElement | HTMLTextAreaElement, message: string) => {
          try {
            if (!navigator.clipboard?.writeText) throw Error("Clipboard unavailable");
            await navigator.clipboard.writeText(field.value);
            status.textContent = message;
          } catch {
            field.focus(); field.select();
            status.textContent = "Clipboard access is unavailable. The text is selected; use your device’s Copy action.";
          }
        };
        dialog.querySelector("[data-passage-copy]")!.addEventListener("click", () => { void copy(text, "Stanza text copied."); });
        dialog.querySelector("[data-passage-link]")!.addEventListener("click", () => { void copy(address, "Stanza link copied."); });
        go.addEventListener("click", () => {
          const target = document.getElementById(go.hash.slice(1));
          // Reopening the same hash does not dispatch hashchange.
          navigateAfterClose = target && root.contains(target) ? target : null;
          dialog!.close();
        });
        dialog.addEventListener("close", () => {
          if (navigateAfterClose) reveal(navigateAfterClose);
          else shareButton.focus();
          navigateAfterClose = null;
        });
        dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
        update(true);
      }
      dialog.showModal();
    });
  }

  const openHash = () => {
    let id: string;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    if (!id) return;
    const target = document.getElementById(id);
    if (target && root.contains(target) && target.hasAttribute("data-stanza-key")) {
      // Following a copied link within this document keeps its existing modal.
      // Close the sharing surface before moving focus outside its inert subtree.
      if (dialog?.open) { navigateAfterClose = target; dialog.close(); }
      else reveal(target);
    }
  };
  window.addEventListener("hashchange", openHash);
  openHash();

  const query = new URL(location.href).searchParams.get("highlight")?.trim().slice(0, 200);
  if (!query) return;
  if (!searchTokens(query).length) return;
  let matches: HTMLElement[] = [];
  const inspected = new WeakSet<HTMLElement>();
  const matching = new WeakSet<HTMLElement>();
  const streamed = root.dataset.readerKind === "basta-continuous";
  const banner = document.createElement("div");
  banner.className = "reading-search-navigation";
  banner.setAttribute("data-pagefind-ignore", "");
  const status = document.createElement("span");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const previous = document.createElement("button"), next = document.createElement("button"), clear = document.createElement("button");
  for (const button of [previous, next, clear]) button.type = "button";
  previous.textContent = "Previous match"; next.textContent = "Next match"; clear.textContent = "Clear highlights";
  let active = 0;
  const describe = () => { status.textContent = matches.length
    ? `Match ${active + 1} of ${matches.length}${streamed ? " in loaded text" : ""} for “${query}”`
    : `No verse matches${streamed ? " in loaded text" : ""} for “${query}”. Search may have matched this page’s title or metadata.`; };
  const move = (amount: number) => {
    if (!matches.length) return;
    active = (active + amount + matches.length) % matches.length;
    describe(); reveal(matches[active]);
  };
  const refresh = () => {
    const current = matches[active];
    matches = [...root.querySelectorAll<HTMLElement>(VERSE)].filter((line) => {
      if (!inspected.has(line)) {
        inspected.add(line);
        if (matchesSearchText(line.textContent || "", query)) {
          matching.add(line);
          line.classList.add("reading-search-match");
        }
      }
      return matching.has(line);
    });
    active = Math.max(0, matches.indexOf(current));
    previous.disabled = next.disabled = matches.length < 2;
    describe();
  };
  previous.addEventListener("click", () => move(-1)); next.addEventListener("click", () => move(1));
  clear.addEventListener("click", () => {
    matches.forEach((line) => line.classList.remove("reading-search-match"));
    const url = new URL(location.href); url.searchParams.delete("highlight");
    history.replaceState(history.state, "", url);
    window.removeEventListener("basta:content-loaded", refresh);
    banner.remove();
  });
  banner.append(status, previous, next, clear);
  // Keep navigation inside the active Focus Mode shell and its Options panel.
  controls.append(banner);
  refresh();
  window.addEventListener("basta:content-loaded", refresh);
  if (matches.length && !location.hash) reveal(matches[0]);
}
