// Every Basta page jump uses this policy. The landing/pager controller navigates
// between routes; the continuous Focus controller resolves the same target in place.
/** Parse the printed-page availability list published by the static reader. */
function parseAvailablePages(form: HTMLFormElement): Set<number> {
  return new Set(
    (form.dataset.availablePages ?? "")
      .split(",")
      .map(Number)
      .filter(Number.isInteger),
  );
}

/** One validation policy for route navigation and in-reader hash jumps.
 * A printed index page is not a scanned poetry page and requires its own view.
 */
export type BastaJumpTarget =
  | { kind: "invalid"; message: string }
  | { kind: "index" }
  | { kind: "page"; page: number };

export function resolveBastaPageJump(
  page: number, available: ReadonlySet<number>, indexStart: number, indexEnd: number,
): BastaJumpTarget {
  if (!Number.isSafeInteger(page) || page < 1)
    return { kind: "invalid", message: "Enter a valid page number." };
  if (page >= indexStart && page <= indexEnd) return { kind: "index" };
  if (!available.has(page))
    return { kind: "invalid", message: "That Basta page is not available." };
  return { kind: "page", page };
}

/** Read the same form contract from any static or Focus-mode pager. */
export function resolveBastaJumpForm(form: HTMLFormElement, input: HTMLInputElement): BastaJumpTarget {
  return resolveBastaPageJump(Number(input.value), parseAvailablePages(form),
    Number(form.dataset.indexStartPage), Number(form.dataset.indexEndPage));
}

/** Attach once per pager, preserving progressive enhancement without JavaScript. */
export function initBastaPageJumps(): void {
  document
    .querySelectorAll<HTMLFormElement>("[data-basta-jump-form]")
    .forEach((form) => {
      if (form.dataset.bastaJumpReady === "true") return;
      form.dataset.bastaJumpReady = "true";

      const input = form.querySelector<HTMLInputElement>('input[name="page"]');
      if (!input) return;

      input.addEventListener("input", () => input.setCustomValidity(""));

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const target = resolveBastaJumpForm(form, input);
        if (target.kind === "invalid") {
          input.setCustomValidity(target.message);
          input.reportValidity();
          return;
        }
        window.location.href = target.kind === "index"
          ? "/basta/index/" : `/basta/${target.page}/`;
      });
    });
}
