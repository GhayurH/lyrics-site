// Contextual, privacy-preserving corrections use the visitor's email app.
// Never transmit selected poetry or contact information without confirmation.
export function initCorrectionDialog(): void {
  const triggers = document.querySelectorAll<HTMLButtonElement>("[data-correction-open]");
  if (!triggers.length || document.querySelector("#correction-dialog")) return;
  const dialog = document.createElement("dialog");
  dialog.id = "correction-dialog";
  dialog.className = "correction-dialog";
  dialog.innerHTML = `<form method="dialog" class="correction-form">
    <h2>Suggest a correction</h2>
    <p>The source and current page are included automatically. No information is sent until you open your email app.</p>
    <label>Selected text<textarea name="quote" rows="3" maxlength="1500"></textarea></label>
    <label>Suggested correction<textarea name="suggestion" required rows="4" maxlength="2500"></textarea></label>
    <div class="correction-actions"><button type="button" data-correction-send>Open email</button>
      <button type="submit">Cancel</button></div>
    <p role="status" data-correction-message></p>
  </form>`;
  document.body.append(dialog);
  let sourceId = "";
  let page = "";
  triggers.forEach((button) => button.addEventListener("click", () => {
    sourceId = button.dataset.sourceId || location.pathname;
    page = button.dataset.sourcePage || "";
    const selection = window.getSelection()?.toString().trim().slice(0, 1500) || "";
    const quote = dialog.querySelector<HTMLTextAreaElement>('[name="quote"]')!;
    const suggestion = dialog.querySelector<HTMLTextAreaElement>('[name="suggestion"]')!;
    quote.value = selection;
    suggestion.value = "";
    dialog.showModal();
    suggestion.focus();
  }));
  dialog.querySelector("[data-correction-send]")?.addEventListener("click", () => {
    const quote = dialog.querySelector<HTMLTextAreaElement>('[name="quote"]')!.value;
    const suggestion = dialog.querySelector<HTMLTextAreaElement>('[name="suggestion"]')!.value.trim();
    if (!suggestion) {
      dialog.querySelector<HTMLElement>("[data-correction-message]")!.textContent = "Enter your proposed correction.";
      return;
    }
    const subject = "Kalam Archive correction: " + sourceId;
    const body = [
      "Source: " + sourceId, "Printed page: " + (page || "not applicable"),
      "URL: " + location.href, "", "Selected text:", quote, "",
      "Proposed correction:", suggestion,
    ].join("\n");
    location.href = "mailto:lyricsadmin@gmail.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    dialog.close();
  });
}
