// File role: Lightweight recitation steps and responsive disclosure, separate from draft persistence.
export function initRecitationWorkflow(): void {
  const app = document.querySelector<HTMLElement>("#recite-app");
  if (!app || app.dataset.workflowReady === "true") return;
  app.dataset.workflowReady = "true";

  const navigation = app.querySelector<HTMLElement>(".recite-steps");
  const links = Array.from(navigation?.querySelectorAll<HTMLAnchorElement>('a[href^="#"]') || []);
  const sections = links.map((link) => ({
    link, section: document.getElementById(link.hash.slice(1))?.closest("section"),
  })).filter((entry): entry is { link: HTMLAnchorElement; section: HTMLElement } => !!entry.section);

  const setStep = (link: HTMLAnchorElement) => {
    for (const current of links) {
      if (current === link) current.setAttribute("aria-current", "step");
      else current.removeAttribute("aria-current");
    }
  };
  if (sections.length) setStep(sections[0].link);
  for (const { link } of sections) link.addEventListener("click", () => {
    setStep(link);
    if (link.dataset.reciteStep === "share") {
      const detail = app.querySelector<HTMLDetailsElement>("#recite-share-details");
      if (detail) { detail.open = true; detail.dataset.userToggled = "true"; }
    }
  });
  const sharing = app.querySelector<HTMLDetailsElement>("#recite-share-details");
  sharing?.addEventListener("toggle", (event) => {
    // A programmatic change also emits toggle, but the controller's next
    // render preserves the state; don't fight a reader's manual choice.
    if (!event.isTrusted) return;
    sharing.dataset.userToggled = "true";
  });
  if ("IntersectionObserver" in window && sections.length) {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (!visible.length) return;
      const target = sections.find(({ section }) => section === visible[0].target);
      if (target) setStep(target.link);
    }, { rootMargin: "-12% 0px -65% 0px" });
    sections.forEach(({ section }) => observer.observe(section));
  }

  // Optional fields are discoverable but don't occupy the initial mobile view.
  // On an existing draft containing notes, open them instead of concealing data.
  const details = app.querySelector<HTMLDetailsElement>("#recite-optional-details");
  const initializeDisclosure = () => {
    if (!details) return;
    const occasion = app.querySelector<HTMLInputElement>("#recite-occasion")?.value.trim();
    const notes = app.querySelector<HTMLTextAreaElement>("#recite-description")?.value.trim();
    if (!occasion && !notes) details.open = false;
  };
  if (!app.inert) initializeDisclosure();
  else {
    const ready = new MutationObserver(() => {
      if (app.inert) return;
      ready.disconnect();
      initializeDisclosure();
    });
    ready.observe(app, { attributes: true, attributeFilter: ["inert"] });
  }
}
