// File role: Distraction-free reading, deep links, mobile navigation, and viewport position retention.
import { pageAtReadingLine } from "./reading-position";
import { visibleReadingAnchor, restoreReadingAnchor, type ReadingAnchor } from "./reading-focus-position";
import { readingScrollBehavior } from "./viewport";

type Anchor = ReadingAnchor;
type ExitSnapshot = { anchor?: Anchor; page?: HTMLElement; pageNumber?: number };
const FOCUS_FLAG = "__kalamReadingFocus";

export function initReadingFocus(root: HTMLElement, controls: HTMLElement): void {
  const enterButton = controls.querySelector<HTMLButtonElement>("[data-reading-focus-enter]");
  const exitButton = controls.querySelector<HTMLButtonElement>("[data-reading-focus-exit]");
  const optionsButton = controls.querySelector<HTMLButtonElement>("[data-reading-focus-options]");
  const fullscreenButton = controls.querySelector<HTMLButtonElement>("[data-reading-fullscreen-toggle]");
  const topButton = controls.querySelector<HTMLButtonElement>("[data-reading-scroll-top]");
  const contentsButton = controls.querySelector<HTMLButtonElement>("[data-reading-focus-contents]");
  if (!enterButton || !exitButton || !optionsButton || !fullscreenButton || !topButton) return;

  const html = document.documentElement;
  const article = root.closest("article");
  const isContinuous = root.dataset.readerKind === "basta-continuous";
  let active = false;
  let anchor: Anchor | undefined;
  let lastPanel: HTMLElement | null = null;
  let previousFocus: HTMLElement | null = null;
  let previousInert: Array<{ node: HTMLElement; value: boolean }> = [];
  let pendingExit: ExitSnapshot | undefined;
  let savedScrollRestoration: ScrollRestoration | undefined;

  const rememberScrollRestoration = () => {
    if (savedScrollRestoration === undefined) {
      savedScrollRestoration = history.scrollRestoration;
      history.scrollRestoration = "manual";
    }
  };
  const restoreScrollRestoration = () => {
    if (savedScrollRestoration !== undefined) {
      history.scrollRestoration = savedScrollRestoration;
      savedScrollRestoration = undefined;
    }
  };

  function readingUrl(enabled: boolean): string {
    const url = new URL(location.href);
    if (enabled) url.searchParams.set("reading", "1");
    else url.searchParams.delete("reading");
    return url.pathname + url.search + url.hash;
  }

  const visibleAnchor = (): Anchor | undefined => visibleReadingAnchor(root);

  const saveAnchor = () => { if (active) anchor = visibleAnchor(); };

  // The fixed continuous reader scrolls independently of the document.
  // Identify the page crossing the upper reading line, never the stale URL hash.
  const captureExit = (): ExitSnapshot => {
    const current = visibleAnchor();
    if (!isContinuous) return { anchor: current };
    const bounds = root.getBoundingClientRect();
    const pages = Array.from(root.querySelectorAll<HTMLElement>("[data-basta-page]"));
    const pageRects = pages.map((node) => {
      const rect = node.getBoundingClientRect();
      return { id: Number(node.dataset.bastaPage), top: rect.top, bottom: rect.bottom };
    });
    // Rotation can leave the upper reading line in a sliver of the previous page.
    // Exiting Focus should return to the page occupying most of the viewport.
    const visible = pageRects.map((item) => ({
      id: item.id,
      height: Math.max(0, Math.min(item.bottom, bounds.bottom) - Math.max(item.top, bounds.top)),
    })).sort((a, b) => b.height - a.height);
    const pageNumber = visible[0]?.height
      ? visible[0].id : pageAtReadingLine(pageRects, bounds.top, bounds.height);
    const page = pages.find((node) => Number(node.dataset.bastaPage) === pageNumber);
    return { anchor: current, page, pageNumber };
  };
  const restoreAnchor = restoreReadingAnchor;

  const optionsOpen = (open: boolean) => {
    controls.dataset.readingOptionsOpen = String(open);
    optionsButton.setAttribute("aria-expanded", String(open));
    optionsButton.setAttribute("aria-label", open ? "Hide reading options" : "Show reading options");
  };
  const contentsOpen = (open: boolean) => {
    if (!isContinuous) return;
    // The contents overlay is below the toolbar: close expanded controls so
    // keyboard focus and reading links are never obscured by two open panels.
    if (open) optionsOpen(false);
    html.dataset.readingTocOpen = String(open);
    contentsButton?.setAttribute("aria-expanded", String(open));
    const index = root.querySelector<HTMLElement>(".basta-reader-index");
    if (open) requestAnimationFrame(() => index?.querySelector<HTMLAnchorElement>("a[href]")?.focus({ preventScroll: true }));
    else if (active && index?.contains(document.activeElement)) {
      const returnTo = contentsButton?.getClientRects().length ? contentsButton : optionsButton;
      returnTo.focus({ preventScroll: true });
    }
  };

  const syncFullscreen = () => {
    const enabled = Boolean(document.fullscreenElement);
    fullscreenButton.textContent = enabled ? "Exit browser fullscreen" : "Browser fullscreen";
    fullscreenButton.setAttribute("aria-pressed", String(enabled));
  };
  fullscreenButton.hidden = !document.fullscreenEnabled;
  document.addEventListener("fullscreenchange", syncFullscreen);

  const setOutsideInert = (enabled: boolean) => {
    if (enabled) {
      const others = [
        document.querySelector<HTMLElement>(".site-header"),
        document.querySelector<HTMLElement>(".site-footer"),
        ...(article ? Array.from(article.children).filter((node): node is HTMLElement =>
          node instanceof HTMLElement && node !== root && node !== controls) : []),
      ];
      previousInert = others.filter((node): node is HTMLElement => Boolean(node))
        .map((node) => ({ node, value: node.inert }));
      previousInert.forEach(({ node }) => { node.inert = true; });
    } else {
      previousInert.forEach(({ node, value }) => { node.inert = value; });
      previousInert = [];
    }
  };

  const enter = (updateHistory: boolean) => {
    if (active) return;
    const current = visibleAnchor();
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    active = true;
    rememberScrollRestoration();
    setOutsideInert(true);
    html.dataset.readingFocus = "true";
    optionsOpen(false);
    contentsOpen(false);
    if (updateHistory) history.pushState({ ...(history.state ?? {}), [FOCUS_FLAG]: true }, "", readingUrl(true));
    requestAnimationFrame(() => {
      restoreAnchor(current, root);
      window.dispatchEvent(new Event("resize"));
      saveAnchor();
      exitButton.focus({ preventScroll: true });
      refreshTopButton();
    });
  };

  const exit = (updateHistory: boolean, saved?: ExitSnapshot) => {
    if (!active) return;
    // Return to the non-Focus history entry before restoring the position;
    // otherwise the browser's own scroll restoration can override our anchor.
    if (updateHistory && history.state?.[FOCUS_FLAG]) {
      pendingExit = captureExit();
      history.back();
      return;
    }

    const snapshot = saved ?? captureExit();
    active = false;
    delete html.dataset.readingFocus;
    optionsOpen(false);
    contentsOpen(false);
    setOutsideInert(false);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});

    // Keep the normal reader's URL anchored to the page visible on exit.
    if (isContinuous && snapshot.pageNumber !== undefined) {
      const url = new URL(location.href);
      url.searchParams.delete("reading");
      url.hash = `page-${snapshot.pageNumber}`;
      history.replaceState(history.state, "", url.pathname + url.search + url.hash);
    } else if (updateHistory) {
      history.replaceState(history.state, "", readingUrl(false));
    }

    const restoreReadingPosition = () => {
      if (isContinuous && snapshot.page?.isConnected) {
        snapshot.page.scrollIntoView({ block: "start", behavior: "auto" });
        // Recover the visible kalam within the page where possible; this also
        // handles pages with different image/text heights in the regular grid.
        if (snapshot.anchor && snapshot.page.contains(snapshot.anchor.node)) {
          restoreAnchor(snapshot.anchor, window);
        }
      } else {
        restoreAnchor(snapshot.anchor, window);
      }
    };
    // Await the reflow from position:fixed -> regular document flow before
    // scrolling; run again after the next layout for deferred Basta page sizes.
    requestAnimationFrame(() => {
      restoreReadingPosition();
      requestAnimationFrame(() => {
        restoreReadingPosition();
        restoreScrollRestoration();
        window.dispatchEvent(new Event("resize"));
        (previousFocus?.isConnected ? previousFocus : enterButton).focus({ preventScroll: true });
        refreshTopButton();
      });
    });
  };

  enterButton.addEventListener("click", () => enter(true));
  exitButton.addEventListener("click", () => exit(true));
  optionsButton.addEventListener("click", () =>
    optionsOpen(controls.dataset.readingOptionsOpen !== "true"));
  contentsButton?.addEventListener("click", () => {
    if (active) contentsOpen(html.dataset.readingTocOpen !== "true");
    else { location.hash = "index"; window.dispatchEvent(new Event("hashchange")); }
  });
  root.querySelector(".basta-reader-index")?.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a[href^='#page-']")) contentsOpen(false);
  });
  fullscreenButton.addEventListener("click", () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else if (document.fullscreenEnabled) void document.documentElement.requestFullscreen().catch(() => {});
  });

  // Tapping noninteractive content toggles preferences; links retain their actions.
  root.addEventListener("click", (event) => {
    if (!active || !(event.target instanceof Element)) return;
    const link = event.target.closest("a");
    if (event.target.closest("button, input, select, textarea") ||
        link ||
        window.getSelection()?.toString()) return;
    optionsOpen(controls.dataset.readingOptionsOpen !== "true");
  });

  document.addEventListener("keydown", (event) => {
    if (active && event.key === "Escape" && !document.querySelector("dialog.scan-viewer[open]")) {
      event.preventDefault();
      if (html.dataset.readingTocOpen === "true") contentsOpen(false);
      else if (controls.dataset.readingOptionsOpen === "true") {
        optionsOpen(false);
        optionsButton.focus({ preventScroll: true });
      } else exit(true);
    }
  });
  window.addEventListener("popstate", () => {
    if (new URL(location.href).searchParams.get("reading") === "1") enter(false);
    else {
      const snapshot = pendingExit;
      pendingExit = undefined;
      exit(false, snapshot);
    }
  });

  // Normal and immersive views use different scrolling elements.
  const scrollPosition = () => Math.max(
    active ? root.scrollTop : window.scrollY,
    lastPanel?.isConnected && lastPanel.getClientRects().length ? lastPanel.scrollTop : 0,
  );
  function refreshTopButton(): void {
    topButton!.hidden = scrollPosition() < 250;
  }
  topButton.addEventListener("click", () => {
    const behavior = readingScrollBehavior();
    if (lastPanel?.isConnected && lastPanel.scrollTop > 150 &&
        lastPanel.getClientRects().length) {
      lastPanel.scrollTo({ top: 0, behavior });
    } else if (active) root.scrollTo({ top: 0, behavior });
    else window.scrollTo({ top: 0, behavior });
  });
  document.addEventListener("scroll", (event) => {
    if (event.target instanceof HTMLElement &&
        event.target.matches("[data-synced-scroll-panel]")) lastPanel = event.target;
    refreshTopButton();
  }, true);
  window.addEventListener("scroll", refreshTopButton, { passive: true });

  const jumpForm = controls.querySelector<HTMLFormElement>("[data-reading-page-jump]");
  jumpForm?.querySelector("input")?.addEventListener("input", (event) => {
    if (event.target instanceof HTMLInputElement) event.target.setCustomValidity("");
  });
  jumpForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = jumpForm.querySelector<HTMLInputElement>('input[name="page"]');
    if (!input) return;
    const page = Number(input.value);
    const available = new Set((jumpForm.dataset.availablePages ?? "").split(",").map(Number));
    const indexStart = Number(jumpForm.dataset.indexStartPage);
    const indexEnd = Number(jumpForm.dataset.indexEndPage);
    if (!Number.isSafeInteger(page) || page < 1) {
      input.setCustomValidity("Enter a valid page number."); input.reportValidity(); return;
    }
    if (page >= indexStart && page <= indexEnd) {
      if (active) contentsOpen(true);
      else { location.hash = "index"; window.dispatchEvent(new Event("basta:navigate-to-page")); }
      return;
    }
    if (!available.has(page)) {
      input.setCustomValidity("That Basta page is not available."); input.reportValidity(); return;
    }
    // Replace rather than push: mobile Back exits Focus mode, not every jump.
    const url = new URL(location.href);
    url.hash = `page-${page}`;
    history.replaceState(history.state, "", url.pathname + url.search + url.hash);
    contentsOpen(false);
    window.dispatchEvent(new Event("basta:navigate-to-page"));
  });

  let frame = 0;
  root.addEventListener("scroll", () => {
    if (!active || frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      saveAnchor();
      refreshTopButton();
    });
  }, { passive: true });

  window.addEventListener("resize", () => {
    if (!active) return;
    const previous = anchor;
    requestAnimationFrame(() => {
      restoreAnchor(previous, root);
      saveAnchor();
    });
  }, { passive: true });

  // /basta/read/?reading=1#page-202 is a shareable, directly immersive link.
  // The stream loader resolves its chunk and scrolls within the fixed reader.
  if (new URL(location.href).searchParams.get("reading") === "1") {
    history.replaceState(history.state, "", readingUrl(false));
    history.pushState({ ...(history.state ?? {}), [FOCUS_FLAG]: true }, "", readingUrl(true));
    enter(false);
    if (isContinuous && location.hash.startsWith("#page-")) {
      window.addEventListener("basta:hash-resolved", saveAnchor, { once: true });
    }
  }
  refreshTopButton();
}
