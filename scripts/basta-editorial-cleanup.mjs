// One-off, reviewed Basta content normalization. No image/OCR inference.
import { readFile, readdir, writeFile } from "node:fs/promises";
import { buildBastaKalamCatalog, splitBastaSource } from "../src/lib/basta-kalam-units.ts";

const apply = process.argv.includes("--apply");
const root = new URL("../src/data/basta/", import.meta.url);
const index = JSON.parse(await readFile(new URL("index.json", root), "utf8"));
const docs = new Map();
for (const kind of ["pages", "roman"]) {
  const dir = new URL(kind + "/", root);
  const names = (await readdir(dir)).filter(n => /^\d+\.md$/.test(n));
  for (const name of names) {
    const page = Number(name.slice(0, -3));
    if (page < 85) continue;
    const url = new URL(name, dir);
    const raw = await readFile(url, "utf8");
    const front = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
    if (!front) throw Error("Invalid frontmatter: " + kind + "/" + name);
    docs.set(kind + ":" + page, {kind, page, url, front:front[0], body:raw.slice(front[0].length),
      original:raw, imageOnly:/^imageOnly:\s*true\s*$/m.test(front[0])});
  }
}
const report = {prayer:[],latin:[],poets:[],refrains:[],skipped:[]};
const prayerStart = text => /^(?:\(?\s*)?(?:التماس|iltimas)(?:[\sِ\-]*(?:سور[ۃہ]|surah|surat))?[\sِ\-]*(?:فاتحہ|fatiha|fateha|دعا|dua)/iu
  .test(text.replace(/\u0640/gu,"").replace(/[\u064B-\u065F]/gu,"").trim());
function removePrayers(body,kind,page) {
  const originalParts = body.split(/^\s*---\*\*\*---\s*$/gmu);
  let changed = false;
  const parts = originalParts.map(part => {
    const lines = part.split("\n");
    const kept = [];
    for (let i=0; i<lines.length; i++) {
      if (!prayerStart(lines[i])) { kept.push(lines[i]); continue; }
      const begin=i, removed=[];
      while (i<lines.length && lines[i].trim() && !/^\s*---\*\*\*---\s*$/u.test(lines[i])) {
        removed.push(lines[i].trim()); i++;
      }
      report.prayer.push({kind,page,block:removed.join(" | ").slice(0,280),line:begin+1});
      changed = true; i--;
    }
    return kept.join("\n");
  });
  if (!changed) return body;
  // Discard fragments composed solely of prayer requests. Keep a separator
  // between surviving poems when a prayer-only fragment lay between them.
  const remaining = parts.map(p=>p.trim()).filter(Boolean);
  const out = remaining.join("\n\n---***---\n\n");
  return out ? out + "\n" : "";
}
for(const doc of docs.values()){
  doc.body = removePrayers(doc.body,doc.kind,doc.page);
  if (doc.kind === "roman") {
    // Only Latin letters lose transliteration diacritics. Preserve quotation
    // punctuation and non-Latin source characters for separate manual review.
    doc.body = [...doc.body].map(ch => {
      if(!/\p{Script=Latin}/u.test(ch) || ch.codePointAt(0)<=127) return ch;
      const plain=ch.normalize("NFKD").replace(/\p{M}/gu,"");
      const replacement=plain===ch ? ({ł:"l",Ł:"L",ø:"o",Ø:"O",đ:"d",Đ:"D",ı:"i"}[ch]||ch) : plain;
      if(replacement!==ch) report.latin.push({page:doc.page,from:ch,to:replacement});
      return replacement;
    }).join("");
  }
}
const files = kind => [...docs.values()].filter(x=>x.kind===kind && !x.imageOnly);
const roman = new Map(files("roman").map(x=>[x.page,x.body]));
const catalog = buildBastaKalamCatalog(index,files("pages").map(x=>({page:x.page,urdu:x.body,roman:roman.get(x.page)})));
const bracketNote = line => /^(?:[\[(]\s*)?(?:بشکریہ|ماخوذ|تدوین|بمناسبت|shukriya|beshukriya|makhuz)(?:\s|$|[\)\]])/iu.test(line.trim());
const lineNorm = s => s.normalize("NFKD").replace(/[\u064B-\u065F\u0670\u06D6-\u06EDؐؑؔ]/gu,"")
  .replace(/[أإآ]/gu,"ا").replace(/[ىیي]/gu,"ی").replace(/ك/gu,"ک")
  .replace(/[^\p{L}\p{N}]/gu,"").toLowerCase();
const arabicPoet = /^(?:\(?)\s*(?:نسیم(?:\s+امروہوی)?|تسلیم\s+امروہوی|ظہور\s+چارچوی|فراست\s+زید\s*پوری)\s*\)?$/u;
const romanPoet = /^(?:\(?)\s*(?:Nasim(?:\s+Amrohvi)?|Taslim\s+Amrohvi|Zuhur\s+Charchavi|Farasat\s+Zaidpuri)\s*\)?$/iu;
const credit = (s,kind) => (kind==="pages" ? arabicPoet : romanPoet).test(s.trim());
const normalizeCredit = s=>s.trim().replace(/^\(|\)$/gu,"").trim();
function findPoemPart(doc, target, mode) {
  const parts=splitBastaSource(doc.body);
  const choices=parts.map((piece,i)=>({piece,i})).filter(x =>
    mode==="start" ? x.piece.split("\n").map(z=>z.trim()).filter(Boolean).slice(0,5).includes(target.trim())
                   : x.piece.trimEnd().endsWith(target.trim()));
  return {parts,match:choices.length===1?choices[0]:null,count:choices.length};
}
function replacePart(doc, parts, at, old, changed) {
  if (parts[at] !== old) throw Error("Source part was modified during cleanup");
  parts[at] = changed;
  // Other page material is retained, with explicit poem separators preserved.
  doc.body=parts.join("\n\n---***---\n\n")+"\n";
}
for (const poem of catalog.kalams) {
  if (poem.status!=="ready" || !poem.pages.length) continue;
  const addRefrain = poem.sectionRoman==="Salam" || poem.sectionRoman==="Marsiye";
  for (const [kind, text] of [["pages",poem.urdu],["roman",poem.roman]]) {
    if(!text?.trim()) continue;
    const starts=text.trim().split("\n").map(x=>x.trim()).filter(Boolean);
    let first=starts[0];
    // A few short Salam/Qit'a pieces have a genre label or only a poet
    // byline where the printed title would otherwise be.
    if(poem.sectionRoman==="Salam") {
      let skip=0;
      if (/^(?:\[?(?:مختصر\s+)?قطعہ\]?|رباعی|Qit'?a|Rubai|Salam ba-huzur|سلام بحضور|قطعہ\s*\/)/iu.test(starts[skip])) skip++;
      if (/^(?:ڈاکٹر|پروفیسر|سید|الحاج|علامہ|مولانا|Professor|Doctor|Allama|Maulana|Syed|Alhaj)\s/iu.test(starts[skip]||"")) skip++;
      if(skip && starts[skip]) first=starts[skip];
    }
    const tail = starts.at(-1);
    const lastPage = poem.pages.at(-1), startPage=poem.pages[0];
    const endDoc=docs.get(kind+":"+lastPage),beginDoc=docs.get(kind+":"+startPage);
    if(!endDoc||!beginDoc) { report.skipped.push({id:poem.id,kind,why:"page missing"});continue; }
    const destination=findPoemPart(endDoc,tail,"end");
    if(!destination.match) {report.skipped.push({id:poem.id,kind,why:"ending ambiguous",page:lastPage,tail:tail.slice(0,60),matches:destination.count});continue;}
    let tailPiece=destination.match.piece, poet=null;
    const endLines=tailPiece.trimEnd().split("\n");
    // A printed "/ poet" appended to the final repeated opening line.
    const combined=endLines.at(-1).match(/^(.*?)\s+\/\s+([^\/]+)$/u);
    if(combined && credit(combined[2],kind) && lineNorm(combined[1])===lineNorm(first)) {
      poet=normalizeCredit(combined[2]);
      endLines[endLines.length-1]=combined[1];
    } else if (credit(endLines.at(-1),kind)) {
      poet=normalizeCredit(endLines.pop());
    }
    if(poet) {
      // Move an actual poet attribution, never a verse with an embedded takhallus
      // or a "courtesy of the reciter" source note.
      const origin=findPoemPart(beginDoc,starts[0],"start");
      if(origin.match) {
        const lines=origin.match.piece.split("\n");
        const offset=lines.findIndex(l=>l.trim()===starts[0]);
        const nearby=lines.slice(offset+1,offset+6).some(l=>lineNorm(l)===lineNorm(poet));
        if(!nearby) {
          lines.splice(offset+1,0,poet);
          replacePart(beginDoc,origin.parts,origin.match.i,origin.match.piece,lines.join("\n"));
        }
        report.poets.push({id:poem.id,kind,from:lastPage,to:startPage,name:poet,alreadyAtStart:nearby});
      } else {
        poet=null;
        report.skipped.push({id:poem.id,kind,why:"poet start ambiguous"});
      }
    }
    // Changing the start page can change the endDoc itself when both are equal;
    // resolve the ending again after the insertion.
    if(poet){
      const fresh=findPoemPart(endDoc,tail,"end");
      if (!fresh.match) { report.skipped.push({id:poem.id,kind,why:"poet ending changed"});continue; }
      const list=fresh.match.piece.trimEnd().split("\n");
      const combined2=list.at(-1).match(/^(.*?)\s+\/\s+([^\/]+)$/u);
      if(combined2 && credit(combined2[2],kind)) list[list.length-1]=combined2[1];
      else if(credit(list.at(-1),kind)) list.pop();
      tailPiece=list.join("\n");
      replacePart(endDoc,fresh.parts,fresh.match.i,fresh.match.piece,tailPiece);
    }
    if(!addRefrain) continue;
    const update=findPoemPart(endDoc,poet ? tailPiece.split("\n").at(-1) : tail,"end");
    if(!update.match) {report.skipped.push({id:poem.id,kind,why:"refrain ending ambiguous"});continue;}
    const content=update.match.piece.trimEnd().split("\n");
    const lastContent=content.filter(x=>x.trim()&&!bracketNote(x)).at(-1)?.trim();
    const recent=content.filter(x=>x.trim()&&!bracketNote(x)).slice(-3).map(lineNorm);
    if(recent.some(x=>x===lineNorm(first)))continue;
    if(!first || first.length<12 || /^[0-9٠-٩۰-۹]+$/u.test(first) || bracketNote(first) || credit(first,kind)) {
      report.skipped.push({id:poem.id,kind,why:"opening unsuitable",first});continue;
    }
    let insertAt=content.length;
    while(insertAt>0 && (!content[insertAt-1].trim() || bracketNote(content[insertAt-1])))insertAt--;
    content.splice(insertAt,0,"",first);
    replacePart(endDoc,update.parts,update.match.i,update.match.piece,content.join("\n"));
    report.refrains.push({id:poem.id,kind,page:lastPage,line:first.slice(0,90)});
  }
}
let changed=0;
for(const doc of docs.values()){
  const final=doc.front+doc.body;
  if(final===doc.original)continue;
  changed++;
  if(apply)await writeFile(doc.url,final);
}
report.changedFiles=changed;
report.statusCount={ready:catalog.kalams.filter(x=>x.status==="ready").length,review:catalog.kalams.filter(x=>x.status==="review").length};
console.log(JSON.stringify(report,null,2));
