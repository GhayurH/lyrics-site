// File role: Portable offline/print snapshots of resolved programme text.
// Nothing in a snapshot depends on the site's scripts, assets, or network.
import type { RecitationSet } from "../lib/recitation-set";

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
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>${title} — Recitation programme</title>
<style>
:root { color-scheme: light; } * { box-sizing: border-box; }
body { max-width: 76rem; margin: 0 auto; padding: 1.5rem; color: #171717; background: #fff; font: 1rem/1.7 system-ui,sans-serif; }
h1 { font-size: 1.8rem; line-height: 1.3; } h2 { font-size: 1.2rem; margin: 0; } h3 { font-size: .9rem; }
header.programme { margin-bottom: 1.6rem; border-bottom: 2px solid #333; padding-bottom: .7rem; }
header.programme p { margin: .3rem 0; } .hint { font-size: .85rem; color: #555; }
.recite-work { margin: 0 0 1.4rem; padding: 0 0 1rem; border-bottom: 1px solid #999; break-inside: avoid-page; }
.recite-work-header { margin-bottom: .6rem; } .recite-work-header p { margin: .2rem 0; }
.recite-work-note { margin: .25rem 0; padding: .2rem .4rem; background: #f3f3f3; }
.recite-editions { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 1rem; }
.lyric-reading-panel { min-width: 0; overflow-x: auto; } .lyric-reading-urdu, [lang="ur"] {
  font-family: "Noto Nastaliq Urdu","Noto Naskh Arabic",serif;
}
.lyric-reading-urdu { font-size: 1.15rem; } .lyric-reading-roman { font-size: .96rem; }
.lyric-version-heading { border-bottom: 1px solid #aaa; padding-bottom: .25rem; }
.lyric-stanza { margin-bottom: .8rem; break-inside: avoid; }
.lyric-verse, .basta-verse-line, .basta-verse-poetry, .basta-kalam-text span { display: block; white-space: nowrap; line-height: 2.6; }
.lyric-reading-roman :is(.lyric-verse,.basta-kalam-text span) { line-height: 1.8; }
.poetry-stanza-number { display: block; margin: .5rem auto; text-align: center; border: 1px solid #777; border-radius: 50%; width: 2rem; height: 2rem; line-height: 2rem; }
.recite-stanza-source, .recite-missing-stanza { font-size: .83rem; background: #f2f2f2; padding: .4rem; }
@media (max-width: 700px) { body { padding: .75rem; } .recite-editions { display: block; } .lyric-reading-panel { margin-bottom: 1.2rem; } }
@media print {
  @page { size: auto; margin: 14mm; } body { max-width: none; padding: 0; print-color-adjust: exact; }
  .recite-editions { display: block; } .lyric-reading-panel { overflow: visible; margin-bottom: 1rem; }
  .recite-work { break-inside: auto; break-before: page; border: 0; margin: 0; }
  .recite-work:first-of-type { break-before: auto; } .lyric-stanza, .basta-kalam-text { break-inside: avoid; }
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
