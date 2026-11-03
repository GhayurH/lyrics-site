// DOM-only rendering for continuously streamed Basta pages.
// Content and indentation rules live in lib/basta-text.ts, also used by Astro.
import type { BastaReaderPageData } from "../lib/basta";
import { splitBastaKalams, type BastaStanzaStyle } from "../lib/basta-text";
import { renderBastaTextBlock } from "./basta-dom";
import { romanUnavailable } from "../lib/edition-availability";
import settings from "../data/basta/settings.json";
import { node } from "./dom";

/** Mark printed poem boundaries, not individual verse breaks. */
function renderKalamBreak(): HTMLElement {
  const separator = node("div", "basta-kalam-break");
  separator.setAttribute("role", "separator");
  separator.setAttribute("aria-label", "Kalam separator");
  const mark = node("span");
  mark.setAttribute("aria-hidden", "true");
  mark.textContent = "✦";
  separator.append(mark);
  return separator;
}

/** One scan renderer for image-only pages and parallel pages. */
function renderOriginalImage(page: BastaReaderPageData): HTMLElement {
  const figure = node("figure", "basta-reader-original-image");
  const image = node("img");
  image.src = page.originalImage;
  image.alt = `Original scan of Basta page ${page.page}`;
  image.loading = "lazy";
  image.decoding = "async";
  const link = node("a", "scan-viewer-trigger");
  link.href = page.originalImage;
  link.setAttribute("aria-label", `Enlarge scan of Basta page ${page.page}`);
  link.append(image);
  figure.append(link);
  return figure;
}

/** Use the same pure stanza model as static Astro pages and Recitation Sets. */
function appendBastaText(container: HTMLElement, value: string, indentStanzas = true, stanzaStyle: BastaStanzaStyle = "auto"): void {
  splitBastaKalams(value).forEach((kalam, index) => {
    if (index > 0) container.append(renderKalamBreak());
    container.append(renderBastaTextBlock(kalam, indentStanzas, stanzaStyle));
  });
}

/** Keep streamed Urdu/Roman structure, roles and column order aligned with static markup. */
function renderParallelText(page: BastaReaderPageData): HTMLElement {
  // Mirror BastaParallelText.astro for chunks loaded after the first one.
  const wrapper = node("div", "basta-parallel-kalams basta-parallel-kalams-reader");

  const roman = node("section", "basta-reader-column basta-reader-roman");
  roman.lang = "en";
  roman.dir = "ltr";
  roman.setAttribute("aria-label", `Roman Urdu text of Basta page ${page.page}`);
  const romanText = node("div", "basta-reader-text");
  appendBastaText(romanText, page.romanText, true, page.stanzaStyle);
  roman.append(romanText);

  const urdu = node("section", "basta-reader-column basta-reader-urdu");
  urdu.lang = "ur";
  urdu.dir = "rtl";
  urdu.setAttribute("aria-label", `Urdu text of Basta page ${page.page}`);
  const urduText = node("div", "basta-reader-text");
  appendBastaText(urduText, page.urduText, true, page.stanzaStyle);
  urdu.append(urduText);

  wrapper.append(roman, urdu);
  return wrapper;
}

/** Materialize one progressive page using the same pure Basta stanza layout as SSR. */
export function renderBastaPage(page: BastaReaderPageData): HTMLElement {
  const section = node("section", "basta-reader-page");
  if (page.imageOnly) section.classList.add("basta-reader-page-image-only");
  if (!page.hasRoman && !page.imageOnly) section.classList.add("basta-reader-page-no-roman");
  section.id = `page-${page.page}`;
  section.dataset.bastaPage = String(page.page);
  section.dataset.pageHasRoman = String(page.hasRoman);

  if (page.imageOnly) {
    section.append(renderOriginalImage(page));
  } else if (page.hasRoman) {
    const grid = node("div", "basta-reader-page-grid basta-reader-page-grid-with-roman");
    grid.append(renderOriginalImage(page), renderParallelText(page));
    section.append(grid);
  } else {
    const grid = node("div", "basta-reader-page-grid");
    const original = renderOriginalImage(page);
    original.dataset.readingImageExtra = "";
    grid.append(original);

    const roman = node("section", "basta-reader-column basta-reader-roman");
    roman.lang = "en";
    roman.dir = "ltr";
    roman.setAttribute("aria-label", `Roman Urdu text of Basta page ${page.page}`);
    const missing = node("p", "basta-transliteration-missing");
    missing.textContent = romanUnavailable("page", true);
    roman.append(missing);

    const urdu = node("section", "basta-reader-column basta-reader-urdu");
    urdu.lang = "ur";
    urdu.dir = "rtl";
    urdu.setAttribute("aria-label", `Urdu text of Basta page ${page.page}`);
    const urduText = node("div", "basta-reader-text");
    appendBastaText(urduText, page.urduText, page.page >= settings.romanLyricsStartPage, page.stanzaStyle);
    urdu.append(urduText);

    grid.append(roman, urdu);
    section.append(grid);
  }

  if (!page.imageOnly && !page.hasRoman) {
    const notice = node("p", "basta-edition-unavailable");
    notice.setAttribute("role", "status");
    notice.textContent = romanUnavailable("page", true);
    section.append(notice);
  }

  const pageNumber = node("p", "basta-reader-page-number");
  pageNumber.dir = "ltr";
  pageNumber.textContent = String(page.page);
  section.append(pageNumber);

  if (page.showBreak) {
    const rule = node("hr", "basta-reader-page-break");
    rule.setAttribute("aria-hidden", "true");
    section.append(rule);
  }

  return section;
}
