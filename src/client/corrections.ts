// The visitor initiates each correction in their own email client, with a precise
// reader location when one can be derived from the displayed source.
export interface CorrectionReference { stanza?: string; verse?: number; sourcePages?: number[] }
export function selectedCorrectionReference(anchor: Node | null, root: ParentNode = document): CorrectionReference {
  const element = anchor instanceof Element ? anchor : anchor?.parentElement;
  if (!element) return {};
  const verse = element.closest<HTMLElement>(".lyric-verse, .basta-kalam-text > span, .poetry-stanza-number");
  if (!verse) return {};
  const group = verse.closest(".lyric-stanza, .basta-kalam-text");
  if (!group) return {};
  const number = verse.classList.contains("poetry-stanza-number") ? verse :
    verse.closest(".lyric-stanza")?.querySelector(".poetry-stanza-number") ||
    [...group.querySelectorAll(".poetry-stanza-number")].reverse().find((item) =>
      !!(item.compareDocumentPosition(verse) & Node.DOCUMENT_POSITION_FOLLOWING));
  const stanza = number?.textContent?.trim() || undefined;
  // A Basta text container holds several numbered stanzas. Count lines from
  // the nearest preceding printed number, not from the start of the poem.
  const lines = [...group.querySelectorAll<HTMLElement>(
    group.classList.contains("lyric-stanza") ? ".lyric-verse" : ":scope > span"
  )];
  const afterNumber = group.classList.contains("lyric-stanza") ? 0 :
    number ? Math.max(0,lines.indexOf(number as HTMLElement) + 1) : 0;
  const verseLines = lines.slice(afterNumber).filter((line) =>
    line.matches(".lyric-verse,.basta-verse-poetry"));
  const position = verseLines.indexOf(verse);
  const source = stanza && "querySelector" in root ?
    root.querySelector<HTMLElement>(`[data-source-stanza="${CSS.escape(stanza)}"]`) : null;
  const sourcePages = source?.dataset.sourcePages?.split(",").map(Number).filter(Number.isSafeInteger);
  return { ...(stanza ? { stanza } : {}), ...(position >= 0 ? { verse: position + 1 } : {}),
    ...(sourcePages?.length ? { sourcePages } : {}) };
}
export function initCorrectionDialog(): void {
  const triggers = document.querySelectorAll<HTMLButtonElement>("[data-correction-open]");
  if (!triggers.length || document.querySelector("#correction-dialog")) return;
  const dialog = document.createElement("dialog");
  dialog.id = "correction-dialog"; dialog.className = "correction-dialog";
  dialog.innerHTML = `<form method="dialog" class="correction-form">
    <h2>Suggest a correction</h2>
    <p>Page and stanza references are included when available. Nothing is sent until you open your email app.</p>
    <p data-correction-location aria-live="polite"></p>
    <label>Selected text<textarea name="quote" rows="3" maxlength="1500"></textarea></label>
    <label>Suggested correction<textarea name="suggestion" required rows="4" maxlength="2500"></textarea></label>
    <div class="correction-actions"><button type="button" data-correction-send>Open email</button>
      <button type="submit" formnovalidate>Cancel</button></div>
    <p role="status" data-correction-message></p>
  </form>`;
  document.body.append(dialog);
  let sourceId = "", page = "", reference: CorrectionReference = {};
  let lastSelection: { text: string; anchor: Node | null } | undefined;
  document.addEventListener("selectionchange", () => {
    const selection = window.getSelection();
    const readingRoot = document.querySelector("[data-reading-root]");
    if (selection && !selection.isCollapsed && selection.anchorNode && readingRoot?.contains(selection.anchorNode)) {
      const text = selection.toString().trim().slice(0,1500);
      if (text) lastSelection = {text,anchor:selection.anchorNode};
    }
  });
  for (const button of triggers) button.addEventListener("click", () => {
    sourceId = button.dataset.sourceId || location.pathname;
    page = button.dataset.sourcePage || "";
    const selection = window.getSelection();
    const currentText = selection?.toString().trim() || "";
    const anchor = currentText ? selection?.anchorNode || null : lastSelection?.anchor || null;
    reference = selectedCorrectionReference(anchor);
    const locationNote = dialog.querySelector<HTMLElement>("[data-correction-location]");
    if (locationNote) locationNote.textContent = [
      "Source " + sourceId,
      reference.stanza ? "stanza " + reference.stanza : "",
      reference.verse ? "verse " + reference.verse : "",
      reference.sourcePages?.length ? "printed page(s) " + reference.sourcePages.join(", ") : "page " + (page || "unspecified"),
    ].filter(Boolean).join(" · ");
    const quote = dialog.querySelector<HTMLTextAreaElement>('[name="quote"]')!;
    const suggestion = dialog.querySelector<HTMLTextAreaElement>('[name="suggestion"]')!;
    quote.value = (currentText || lastSelection?.text || "").slice(0,1500);
    suggestion.value = "";
    dialog.querySelector<HTMLElement>("[data-correction-message]")!.textContent = "";
    dialog.showModal(); suggestion.focus();
  });
  dialog.querySelector("[data-correction-send]")?.addEventListener("click", () => {
    const quote = dialog.querySelector<HTMLTextAreaElement>('[name="quote"]')!.value;
    const suggestion = dialog.querySelector<HTMLTextAreaElement>('[name="suggestion"]')!.value.trim();
    if (!suggestion) {
      dialog.querySelector<HTMLElement>("[data-correction-message]")!.textContent = "Enter your proposed correction.";
      return;
    }
    const subject = "Kalam Archive correction: " + sourceId;
    const body = ["Source: "+sourceId,"Printed page: "+(page || "not applicable"),
      "Stanza: "+(reference.stanza || "not selected"),
      "Verse: "+(reference.verse || "not selected"),
      "Source scan pages: "+(reference.sourcePages?.join(", ") || page || "not specified"),
      "URL: "+location.href,"","Selected text:",quote,"","Proposed correction:",suggestion].join("\n");
    location.href = "mailto:lyricsadmin@gmail.com?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body);
    dialog.close();
  });
}
