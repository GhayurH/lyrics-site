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
  // A step link is an explicit navigation choice. Smooth anchor scrolling
  // generates intermediate IntersectionObserver updates for earlier sections;
  // do not let those stale intersections overwrite the selected step.
  // Resume scroll-driven tracking when the visitor actively scrolls elsewhere.
  let selectedByNavigation: HTMLAnchorElement | undefined;
  const resumeScrollTracking = () => { selectedByNavigation = undefined; };
  window.addEventListener("wheel", resumeScrollTracking, { passive: true });
  window.addEventListener("touchstart", resumeScrollTracking, { passive: true });
  document.addEventListener("pointerdown", (event) => {
    if (!(event.target instanceof Element) || !event.target.closest(".recite-steps"))
      resumeScrollTracking();
  }, { passive: true });
  document.addEventListener("keydown", (event) => {
    if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key))
      resumeScrollTracking();
  });
  for (const { link } of sections) link.addEventListener("click", () => {
    selectedByNavigation = link;
    setStep(link);
    if (link.dataset.reciteStep === "share") {
      const detail = app.querySelector<HTMLDetailsElement>("#recite-share-details");
      if (detail) { detail.open = true; detail.dataset.userToggled = "true"; }
    }
  });
  const sharing = app.querySelector<HTMLDetailsElement>("#recite-share-details");
  sharing?.querySelector("summary")?.addEventListener("click", () => {
    // Only an intentional click overrides automatic expansion on readiness.
    sharing.dataset.userToggled = "true";
  });
  if ("IntersectionObserver" in window && sections.length) {
    const observer = new IntersectionObserver((entries) => {
      if (selectedByNavigation && location.hash === selectedByNavigation.hash) return;
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
