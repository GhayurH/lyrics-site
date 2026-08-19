// File role: Shared Basta page-jump controller for the landing page and all pager instances; owns validation and the physical-index routing gap.
function parseAvailablePages(form: HTMLFormElement): Set<number> {
  return new Set(
    (form.dataset.availablePages ?? "")
      .split(",")
      .map(Number)
      .filter(Number.isInteger),
  );
}

export function initBastaPageJumps(): void {
  document
    .querySelectorAll<HTMLFormElement>("[data-basta-jump-form]")
    .forEach((form) => {
      if (form.dataset.bastaJumpReady === "true") return;
      form.dataset.bastaJumpReady = "true";

      const input = form.querySelector<HTMLInputElement>('input[name="page"]');
      if (!input) return;

      const availablePages = parseAvailablePages(form);
      const indexStartPage = Number(form.dataset.indexStartPage);
      const indexEndPage = Number(form.dataset.indexEndPage);

      input.addEventListener("input", () => input.setCustomValidity(""));

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const page = Number(input.value);

        if (!Number.isInteger(page)) {
          input.setCustomValidity("Enter a valid page number.");
          input.reportValidity();
          return;
        }

        if (page >= indexStartPage && page <= indexEndPage) {
          window.location.href = "/basta/index/";
          return;
        }

        if (!availablePages.has(page)) {
          input.setCustomValidity("That page is not available.");
          input.reportValidity();
          return;
        }

        window.location.href = `/basta/${page}/`;
      });
    });
}
