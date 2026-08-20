// File role: Progressive continuous-reader loader: hydrates static page chunks near the viewport and resolves deep #page-N links without shipping the full book HTML initially.
import type { BastaReaderChunk, BastaReaderPageData } from "../lib/basta";
import { splitBastaKalams } from "../lib/basta-text";

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function appendBastaText(container: HTMLElement, value: string): void {
  splitBastaKalams(value).forEach((kalam, index) => {
    if (index > 0) {
      const separator = element("div", "basta-kalam-break");
      separator.setAttribute("role", "separator");
      separator.setAttribute("aria-label", "Kalam separator");
      const mark = element("span");
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = "✦";
      separator.append(mark);
      container.append(separator);
    }

    const block = element("div", "basta-kalam-text");
    block.textContent = kalam;
    container.append(block);
  });
}

function renderPage(page: BastaReaderPageData): HTMLElement {
  const section = element("section", "basta-reader-page");
  if (page.imageOnly) section.classList.add("basta-reader-page-image-only");
  if (!page.hasRoman && !page.imageOnly) section.classList.add("basta-reader-page-no-roman");
  section.id = `page-${page.page}`;
  section.dataset.bastaPage = String(page.page);

  if (page.imageOnly) {
    const figure = element("figure", "basta-reader-original-image");
    const image = element("img");
    image.src = page.originalImage;
    image.alt = `Original scan of Basta page ${page.page}`;
    image.loading = "lazy";
    image.decoding = "async";
    figure.append(image);
    section.append(figure);
  } else {
    const grid = element("div", "basta-reader-page-grid");

    const roman = element("section", "basta-reader-column basta-reader-roman");
    roman.lang = "en";
    roman.dir = "ltr";
    roman.setAttribute("aria-label", `Roman Urdu text of Basta page ${page.page}`);
    if (page.hasRoman) {
      const text = element("div", "basta-reader-text");
      appendBastaText(text, page.romanText);
      roman.append(text);
    } else {
      const missing = element("p", "basta-transliteration-missing");
      missing.textContent = "No transliteration available for this page.";
      roman.append(missing);
    }

    const urdu = element("section", "basta-reader-column basta-reader-urdu");
    urdu.lang = "ur";
    urdu.dir = "rtl";
    urdu.setAttribute("aria-label", `Urdu text of Basta page ${page.page}`);
    const urduText = element("div", "basta-reader-text");
    appendBastaText(urduText, page.urduText);
    urdu.append(urduText);

    grid.append(roman, urdu);
    section.append(grid);
  }

  const pageNumber = element("p", "basta-reader-page-number");
  pageNumber.dir = "ltr";
  pageNumber.textContent = String(page.page);
  section.append(pageNumber);

  if (page.showBreak) {
    const rule = element("hr", "basta-reader-page-break");
    rule.setAttribute("aria-hidden", "true");
    section.append(rule);
  }

  return section;
}

function validChunk(value: unknown): value is BastaReaderChunk {
  if (!value || typeof value !== "object") return false;
  const chunk = value as Partial<BastaReaderChunk>;
  return typeof chunk.id === "string" && Array.isArray(chunk.pages);
}

async function loadChunk(shell: HTMLElement): Promise<void> {
  if (shell.dataset.chunkLoaded === "true" || shell.dataset.chunkLoading === "true") return;
  const url = shell.dataset.chunkUrl;
  if (!url) return;

  shell.dataset.chunkLoading = "true";
  shell.setAttribute("aria-busy", "true");

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Basta chunk request failed: ${response.status}`);
    const data: unknown = await response.json();
    if (!validChunk(data)) throw new Error("Invalid Basta chunk response");

    shell.replaceChildren(...data.pages.map(renderPage));
    shell.dataset.chunkLoaded = "true";
    delete shell.dataset.chunkLoading;
    shell.removeAttribute("aria-busy");
  } catch (error) {
    console.error(error);
    delete shell.dataset.chunkLoading;
    shell.removeAttribute("aria-busy");
    shell.classList.add("basta-reader-chunk-error");

    const message = element("p", "basta-reader-chunk-message");
    message.textContent = "These pages could not be loaded.";
    const retry = element("button", "text-button");
    retry.type = "button";
    retry.dataset.retryBastaChunk = "";
    retry.textContent = "Retry";
    shell.replaceChildren(message, retry);
  }
}

function pageFromHash(): number | undefined {
  const match = location.hash.match(/^#page-(\d+)$/);
  return match ? Number(match[1]) : undefined;
}

async function resolveHash(): Promise<void> {
  // The index is already in the document, but loading preceding chunks first
  // prevents it from jumping downward after a direct #index navigation.
  if (location.hash === "#index") {
    const preceding = Array.from(
      document.querySelectorAll<HTMLElement>('[data-basta-chunk^="before-"]'),
    );
    await Promise.all(preceding.map(loadChunk));
    document.getElementById("index")?.scrollIntoView();
    return;
  }

  const page = pageFromHash();
  if (!Number.isInteger(page)) return;

  const target = document.getElementById(`page-${page}`);
  if (target) {
    target.scrollIntoView();
    return;
  }

  const chunk = Array.from(
    document.querySelectorAll<HTMLElement>("[data-basta-chunk]"),
  ).find((candidate) => {
    const start = Number(candidate.dataset.startPage);
    const end = Number(candidate.dataset.endPage);
    return page! >= start && page! <= end;
  });
  if (!chunk) return;

  await loadChunk(chunk);
  document.getElementById(`page-${page}`)?.scrollIntoView();
}

export function initBastaStreamingReader(): void {
  const stream = document.querySelector<HTMLElement>("[data-basta-stream]");
  if (!stream || stream.dataset.streamReady === "true") return;
  stream.dataset.streamReady = "true";

  const pending = stream.querySelectorAll<HTMLElement>(
    '[data-basta-chunk]:not([data-chunk-loaded="true"])',
  );

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) continue;
          observer.unobserve(entry.target);
          void loadChunk(entry.target);
        }
      },
      { rootMargin: "3000px 0px" },
    );
    pending.forEach((chunk) => observer.observe(chunk));
  } else {
    // Old browsers get correctness over progressive loading.
    pending.forEach((chunk) => void loadChunk(chunk));
  }

  stream.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const retry = target.closest<HTMLButtonElement>("[data-retry-basta-chunk]");
    const chunk = retry?.closest<HTMLElement>("[data-basta-chunk]");
    if (!retry || !chunk) return;
    chunk.classList.remove("basta-reader-chunk-error");
    void loadChunk(chunk);
  });

  window.addEventListener("hashchange", () => void resolveHash());
  void resolveHash();
}
