// File role: Show only the reader's actual recent work, without fetching a catalog.
import { readBastaPosition, readStringList, STORAGE_KEYS } from "./storage";
import { readDrafts } from "./recitation-storage";

export function initHomeContinue(): void {
  const section = document.querySelector<HTMLElement>("#home-continue");
  const list = document.querySelector<HTMLElement>("#home-continue-links");
  if (!section || !list) return;

  const links: Array<{ href: string; title: string; detail: string }> = [];
  const lastBasta = readBastaPosition();
  if (lastBasta) {
    const query = lastBasta.offset === undefined ? "" : "?resume=" + lastBasta.offset;
    links.push({
      href: lastBasta.mode === "continuous"
        ? "/basta/read/" + query + "#page-" + lastBasta.page
        : "/basta/" + lastBasta.page + "/" + query,
      title: "Continue Basta",
      detail: "Page " + lastBasta.page,
    });
  }
  const recent = readStringList(STORAGE_KEYS.recent)[0];
  if (recent && /^[a-z0-9-]+$/i.test(recent)) {
    links.push({ href: "/lyrics/" + encodeURIComponent(recent) + "/", title: "Recent kalam", detail: "Continue reading" });
  }
  const draft = readDrafts().find((item) => item.set.items.length > 0 || item.set.title?.trim());
  if (draft) {
    links.push({
      href: "/recite/?draft=" + encodeURIComponent(draft.id),
      title: draft.set.title?.trim() || "Untitled programme",
      detail: "Continue arranging",
    });
  }

  list.replaceChildren(...links.map(({ href, title, detail }) => {
    const link = document.createElement("a");
    link.href = href;
    link.className = "home-continue-link";
    const heading = document.createElement("strong");
    heading.textContent = title;
    const sub = document.createElement("span");
    sub.textContent = detail;
    link.append(heading, sub);
    return link;
  }));
  section.hidden = links.length === 0;
}
