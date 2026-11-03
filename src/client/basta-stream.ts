// File role: Progressive continuous-reader loader: hydrates static page chunks near the viewport and resolves deep #page-N links without shipping the full book HTML initially.
import type { BastaReaderChunk } from "../lib/basta";
import { renderBastaPage } from "./basta-stream-render";
import { node } from "./dom";

/** Reject malformed JSON before the streaming controller alters the visible page list. */
function validChunk(value: unknown): value is BastaReaderChunk {
  if (!value || typeof value !== "object") return false;
  const chunk = value as Partial<BastaReaderChunk>;
  return typeof chunk.id === "string" && Array.isArray(chunk.pages);
}

/** One chunk has a single in-flight request; errors preserve a retry action. */
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

    shell.replaceChildren(...data.pages.map(renderBastaPage));
    window.dispatchEvent(new Event("basta:content-loaded"));
    shell.dataset.chunkLoaded = "true";
    delete shell.dataset.chunkLoading;
    shell.removeAttribute("aria-busy");
  } catch (error) {
    console.error(error);
    delete shell.dataset.chunkLoading;
    shell.removeAttribute("aria-busy");
    shell.classList.add("basta-reader-chunk-error");

    const message = node("p", "basta-reader-chunk-message");
    message.textContent = "These pages could not be loaded.";
    const retry = node("button", "text-button");
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

function settlePageHash(target: HTMLElement): void {
  target.scrollIntoView({ block: "start", behavior: "instant" });
  // Fonts and nearby streamed chunks can otherwise shift the target up a page.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (location.hash !== `#${target.id}`) return;
    if (!new URLSearchParams(location.search).has("resume")) {
      target.scrollIntoView({ block: "start", behavior: "instant" });
    }
    window.dispatchEvent(new Event("basta:hash-resolved"));
  }));
}

/** Resolve deep links even when their numbered page has not been hydrated. */
async function resolveHash(): Promise<void> {
  // The index is already in the document, but loading preceding chunks first
  // prevents it from jumping downward after a direct #index navigation.
  if (location.hash === "#index") {
    const preceding = Array.from(
      document.querySelectorAll<HTMLElement>('[data-basta-chunk^="before-"]'),
    );
    await Promise.all(preceding.map(loadChunk));
    document.getElementById("index")?.scrollIntoView();
    window.dispatchEvent(new Event("basta:hash-resolved"));
    return;
  }

  const page = pageFromHash();
  if (!Number.isInteger(page)) return;

  const target = document.getElementById(`page-${page}`);
  if (target) {
    settlePageHash(target);
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
  const loaded = document.getElementById(`page-${page}`);
  if (loaded) settlePageHash(loaded);
}

/** Install a single progressive loader and delegated retries for the reading route. */
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
  window.addEventListener("basta:navigate-to-page", () => void resolveHash());
  void resolveHash();
}
