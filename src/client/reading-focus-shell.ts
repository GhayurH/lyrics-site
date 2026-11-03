// Temporary page isolation for Focus Mode. Normal page landmarks retain their original state.
export function createReadingFocusShell(root: HTMLElement, controls: HTMLElement) {
  const article = root.closest("article");
  let previousInert: Array<{ node: HTMLElement; value: boolean }> = [];
  let savedScrollRestoration: ScrollRestoration | undefined;

  return {
    /** Preserve manual/auto browser scroll policy and isolate only outside page landmarks. */
    enter(): void {
      if (savedScrollRestoration === undefined) {
        savedScrollRestoration = history.scrollRestoration;
        history.scrollRestoration = "manual";
      }
      const others = [
        document.querySelector<HTMLElement>(".site-header"),
        document.querySelector<HTMLElement>(".site-footer"),
        ...(article ? Array.from(article.children).filter((node): node is HTMLElement =>
          node instanceof HTMLElement && node !== root && node !== controls) : []),
      ];
      previousInert = others.filter((node): node is HTMLElement => Boolean(node))
        .map((node) => ({ node, value: node.inert }));
      previousInert.forEach(({ node }) => { node.inert = true; });
    },
    /** Restore the original inert values, even for landmarks already inert before Focus. */
    leave(): void {
      previousInert.forEach(({ node, value }) => { node.inert = value; });
      previousInert = [];
    },
    /** Run after reflow and anchor recovery, not when Focus is first closed. */
    restoreScrollRestoration(): void {
      if (savedScrollRestoration !== undefined) {
        history.scrollRestoration = savedScrollRestoration;
        savedScrollRestoration = undefined;
      }
    },
  };
}
