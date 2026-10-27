// File role: Portable offline/print snapshots of resolved programme text.
// Nothing in a snapshot depends on the site's scripts, assets, or network.
import type { RecitationSet } from "../lib/recitation-set";
// Bundle the same Noto Nastaliq Urdu font as the website. Inline assets make
// downloaded programme HTML and its PDF printout independent of external URLs.
import nastaliqRegular from "@fontsource/noto-nastaliq-urdu/files/noto-nastaliq-urdu-arabic-400-normal.woff2?inline";
import nastaliqBold from "@fontsource/noto-nastaliq-urdu/files/noto-nastaliq-urdu-arabic-700-normal.woff2?inline";

const escape = (value: string): string => value.replace(/[&<>"']/g, (char) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

export function programmeHtml(set: RecitationSet, works: HTMLElement[]): string {
  const copies = works.map((work) => {
    const clone = work.cloneNode(true) as HTMLElement;
    clone.hidden = false;
    clone.removeAttribute("hidden");
    clone.removeAttribute("id");
    // The source images are held in a separate R2 bucket. A portable
    // document must never suggest those network-only images are available offline.
    clone.querySelectorAll("figure.lyric-reading-image, script, iframe, button").forEach((el) => el.remove());
    // On-screen JS measures and sets pixel sizes for a different viewport.
    // Preserve authored text, not those screen-specific height/font overrides.
    clone.querySelectorAll(".lyric-reading-panel[style], .lyric-verse[style], .basta-verse-line[style], .basta-kalam-text span[style]")
      .forEach((el) => el.removeAttribute("style"));
    clone.querySelectorAll("a").forEach((link) => link.replaceWith(
      document.createTextNode(link.textContent || "")));
    clone.querySelectorAll("[id], [data-synced-scroll-root], [data-synced-scroll-panel]")
      .forEach((el) => {
        el.removeAttribute("id");
        el.removeAttribute("data-synced-scroll-root");
        el.removeAttribute("data-synced-scroll-panel");
      });
    return clone.outerHTML;
  });
  const title = escape(set.title);
  const occasion = escape(set.occasion);
  const notes = escape(set.description);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src data:; base-uri 'none'; form-action 'none'">
<title>${title} — Recitation programme</title>
<style>
:root { color-scheme: light; } * { box-sizing: border-box; }
@font-face {
  font-family: "Noto Nastaliq Urdu"; font-weight: 400; font-style: normal;
  font-display: block; src: url("${nastaliqRegular}") format("woff2");
}
@font-face {
  font-family: "Noto Nastaliq Urdu"; font-weight: 700; font-style: normal;
  font-display: block; src: url("${nastaliqBold}") format("woff2");
}
body {
  max-width: 76rem; margin: 0 auto; padding: 1.25rem; color: #171717;
  background: #fff; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 1rem; line-height: 1.6;
}
h1 { font-size: 1.6rem; line-height: 1.3; } h2 { font-size: 1.15rem; margin: 0; } h3 { font-size: .9rem; }
[lang="ur"], .lyric-reading-urdu, .lyric-reading-urdu .lyrics-text {
  font-family: "Noto Nastaliq Urdu", serif; font-weight: 400; direction: rtl;
}
.recite-work-header [lang="ur"] { font-weight: 700; line-height: 2.1; }
header.programme { margin-bottom: 1rem; border-bottom: 1px solid #777; padding-bottom: .6rem; }
header.programme p { margin: .25rem 0; } .hint { font-size: .8rem; color: #555; }
.recite-work { margin: 0 0 1rem; padding: 0 0 .65rem; border-bottom: 1px solid #999; }
.recite-work-header { margin-bottom: .75rem; }
.recite-work-header p { margin: .15rem 0; }
.recite-work-note { margin: .25rem 0; padding: .2rem .35rem; background: #f3f3f3; }
.recite-editions {
  display: grid; grid-template-areas: "roman urdu";
  grid-template-columns: repeat(2,minmax(0,1fr)); gap: .75rem;
  align-items: start;
}
.lyric-reading-panel { min-width: 0; width: 100%; overflow: visible; padding: 0; }
.lyric-reading-roman { grid-area: roman; font-size: .88rem; }
.lyric-reading-urdu { grid-area: urdu; font-size: 1rem; }
.lyric-reading-roman .lyric-reading-text { font-family: Inter, system-ui, -apple-system, sans-serif; }
.lyric-reading-urdu .lyric-reading-text { font-family: "Noto Nastaliq Urdu",serif; }
.lyric-version-heading { display: none; }
.lyric-stanza { margin: 0 0 .65rem; break-inside: avoid; }
.lyric-stanza + .lyric-stanza { border-top: 1px solid #aaa; padding-top: .35rem; }
.lyric-verse, .basta-verse-line, .basta-verse-poetry, .basta-kalam-text span {
  display: block; white-space: nowrap; text-align: start; font-size: inherit !important;
  overflow: visible; line-height: 1.75;
}
.lyric-reading-urdu :is(.lyric-verse,.basta-verse-line,.basta-verse-poetry,.basta-kalam-text span) {
  line-height: 2.35; text-align: right;
}
.poetry-stanza-number {
  display: grid; place-items: center; width: 1.8rem; height: 1.8rem;
  margin: .5rem auto; border: 1px solid #777; border-radius: 50%;
  font-family: inherit; font-size: .76rem; line-height: 1;
}
.recite-stanza-source, .recite-missing-stanza { font-size: .8rem; background: #f2f2f2; padding: .35rem; }
@media (max-width: 700px) {
  body { padding: .65rem; }
  .recite-editions { grid-template-areas: "roman" "urdu"; grid-template-columns: minmax(0,1fr); }
}
@media print {
  @page { size: auto; margin: 11mm; }
  html, body { margin: 0; padding: 0; background: #fff; print-color-adjust: exact; }
  .recite-editions { grid-template-areas: "roman urdu"; grid-template-columns: repeat(2,minmax(0,1fr)); }
  .recite-work { break-inside: auto; break-before: page; border-bottom: 0; margin: 0; }
  .recite-work:first-of-type { break-before: auto; }
  .lyric-stanza, .basta-kalam-text { break-inside: avoid; }
  .lyric-verse, .basta-kalam-text span { -webkit-print-color-adjust: exact; }
}
</style></head><body>
<header class="programme"><h1>${title}</h1>${occasion ? `<p><strong>Occasion:</strong> ${occasion}</p>` : ""}
${notes ? `<p><strong>Programme notes:</strong> ${notes}</p>` : ""}
<p class="hint">Offline copy of the programme text, reciter assignments, notes, and stanza arrangement. Original scans and live navigation require the website.</p></header>
<main>${copies.join("\n")}</main></body></html>`;
}

export function downloadProgramme(html: string, title: string): void {
  const filename = (title.normalize("NFKC").replace(/[^\p{L}\p{N} ._-]/gu, "").trim().slice(0, 72) || "recitation-programme") + ".html";
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
