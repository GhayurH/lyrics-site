// File role: Optional immersive reading layer; keeps the existing reader DOM and scroll synchronization intact.
type Anchor = { node: HTMLElement; top: number };

export function initReadingFocus(root: HTMLElement, controls: HTMLElement): void {
  const enterButton = controls.querySelector<HTMLButtonElement>("[data-reading-focus-enter]");
  const exitButton = controls.querySelector<HTMLButtonElement>("[data-reading-focus-exit]");
  const optionsButton = controls.querySelector<HTMLButtonElement>("[data-reading-focus-options]");
  const fullscreenButton = controls.querySelector<HTMLButtonElement>("[data-reading-fullscreen-toggle]");
  if (!enterButton || !exitButton || !optionsButton || !fullscreenButton) return;

  const focusFlag = "__kalamReadingFocus";
  const html = document.documentElement;
  const article = root.closest("article");
  let active = false;
  let anchor: Anchor | undefined;
  let previousInert: Array<{ node: HTMLElement; value: boolean }> = [];
  let previousFocus: HTMLElement | null = null;

  // Hit-test the visible edition, rather than measuring offscreen streamed pages.
  const visibleAnchor = (): Anchor | undefined => {
    for (const y of [0.44, 0.65, 0.25]) {
      for (const x of [0.5, 0.75, 0.25]) {
        const candidate = document.elementFromPoint(innerWidth * x, innerHeight * y);
        if (!(candidate instanceof HTMLElement) || !root.contains(candidate)) continue;
        const node = candidate.closest<HTMLElement>(
          ".basta-kalam-text, .lyric-stanza, .basta-reader-page, .basta-original-page, .lyric-reading-panel",
        ) ?? candidate;
        if (root.contains(node)) return { node, top: node.getBoundingClientRect().top };
      }
    }
    return undefined;
  };

  const rememberAnchor = () => { if (active) anchor = visibleAnchor(); };
  const restoreAnchor = (saved: Anchor | undefined, scroller: HTMLElement | Window) => {
    if (!saved?.node.isConnected) return;
    const delta = saved.node.getBoundingClientRect().top - saved.top;
    if (Math.abs(delta) < 1) return;
    if (scroller instanceof Window) scroller.scrollBy(0, delta);
    else scroller.scrollTop += delta;
  };

  const optionsOpen = (open: boolean) => {
    controls.dataset.readingOptionsOpen = String(open);
    optionsButton.setAttribute("aria-expanded", String(open));
    optionsButton.setAttribute("aria-label", open ? "Hide reading options" : "Show reading options");
  };

  const syncFullscreen = () => {
    const enabled = Boolean(document.fullscreenElement);
    fullscreenButton.textContent = enabled ? "Exit fullscreen" : "Fullscreen";
    fullscreenButton.setAttribute("aria-pressed", String(enabled));
  };
  fullscreenButton.hidden = !document.fullscreenEnabled;
  document.addEventListener("fullscreenchange", syncFullscreen);

  const setInert = (enabled: boolean) => {
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

  const open = (pushHistory: boolean) => {
    if (active) return;
    const current = visibleAnchor();
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    active = true;
    setInert(true);
    html.dataset.readingFocus = "true";
    optionsOpen(false);
    if (pushHistory) {
      try {
        history.pushState({ ...(history.state ?? {}), [focusFlag]: true }, "", location.href);
      } catch {
        // Reading mode still works if the history entry cannot be added.
      }
    }
    requestAnimationFrame(() => {
      restoreAnchor(current, root);
      rememberAnchor();
      exitButton.focus({ preventScroll: true });
    });
  };

  const close = (popHistory: boolean) => {
    if (!active) return;
    const current = visibleAnchor();
    active = false;
    delete html.dataset.readingFocus;
    optionsOpen(false);
    setInert(false);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    requestAnimationFrame(() => {
      restoreAnchor(current, window);
      (previousFocus?.isConnected ? previousFocus : enterButton).focus({ preventScroll: true });
    });
    if (popHistory && history.state?.[focusFlag]) history.back();
  };

  enterButton.addEventListener("click", () => open(true));
  exitButton.addEventListener("click", () => close(true));
  optionsButton.addEventListener("click", () =>
    optionsOpen(controls.dataset.readingOptionsOpen !== "true"));
  fullscreenButton.addEventListener("click", () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else if (document.fullscreenEnabled) void document.documentElement.requestFullscreen().catch(() => {});
  });

  // Tapping blank/text content shows or hides preferences, but must not activate scan links.
  root.addEventListener("click", (event) => {
    if (!active || !(event.target instanceof Element)) return;
    const link = event.target.closest("a");
    if (link?.closest(".basta-original-page")) event.preventDefault();
    if (event.target.closest("button, input, select, textarea") ||
        (link && !link.closest(".basta-original-page")) ||
        window.getSelection()?.toString()) return;
    optionsOpen(controls.dataset.readingOptionsOpen !== "true");
  });

  document.addEventListener("keydown", (event) => {
    if (active && event.key === "Escape") {
      event.preventDefault();
      close(true);
    }
  });

  // An Android back gesture / browser Back first closes the same-URL focus entry.
  window.addEventListener("popstate", () => {
    if (history.state?.[focusFlag]) open(false);
    else close(false);
  });

  let frame = 0;
  root.addEventListener("scroll", () => {
    if (!active || frame) return;
    frame = requestAnimationFrame(() => { frame = 0; rememberAnchor(); });
  }, { passive: true });

  // Preserve the visible kalam/page through a portrait-landscape reflow.
  window.addEventListener("resize", () => {
    if (!active) return;
    const previous = anchor;
    requestAnimationFrame(() => {
      restoreAnchor(previous, root);
      rememberAnchor();
    });
  }, { passive: true });
}
