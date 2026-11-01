// One-time Markdown cleanup. Remove this tool after validating its changes.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, basename } from "node:path";
import { buildBastaKalamCatalog } from "../src/lib/basta-kalam-units.ts";
import { stanzaAnchor } from "../src/lib/recitation-identity.ts";

const write = process.argv.includes("--write");
const excludes = new Set([".git", "node_modules", "dist", ".astro", "old", "coverage", "test-results", "playwright-report"]);
const collect = async function visit(dir) {
  const paths = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (excludes.has(entry.name)) continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) paths.push(...await visit(p));
    else if (entry.isFile() && entry.name.endsWith(".md")) paths.push(p);
  }
  return paths;
};
const textContent = p => p.startsWith("src/data/basta/pages/") || p.startsWith("src/data/lyrics/");
const urduChars = /[پچٹڈڑژگکںےھ]/u;
const vowel = /[\u064B-\u065F]/gu;
const arabic = (p, line, intro) => {
  if (intro || /^src\/data\/basta\/pages\/00[1-9]\.md$/.test(p)) return true;
  if (/چه کار کردی|تو همین/u.test(line)) return true; // Genuine Persian refrain.
  if (/^ *(?:لا حول ولا قوة|وَمِنَ النَّاسِ|قَدْ أَفْلَحَ|وَالَّذِينَ|السَّلامُ|صَلَّتْ|عَلِيٌّ|وَصِيُّ|وصیُّ)/u.test(line)) return true;
  if (/^ *لا إله إلا (?:الله|علی)/u.test(line)) return true;
  return (line.match(vowel) ?? []).length >= 4 && !urduChars.test(line);
};
const stats = new Map();
const record = (category,p,before,after) => {
  const s=stats.get(category) ?? {count:0,samples:[]};
  s.count++;
  if(s.samples.length<15) s.samples.push(p+" "+before.slice(0,110)+" -> "+after.slice(0,110));
  stats.set(category,s);
};
function normalizeLine(p, line, {fenced,intro}) {
  if(fenced || /^\s*\|/.test(line)) return line;
  let s=line.replace(/(\S)[ \t\u00A0\u2007\u202F]{2,}(?=\S)/gu,"$1 ")
            .replace(/(\S)[\t\u00A0\u2007\u202F](?=\S)/gu,"$1 ");
  if(s!==line)record("inter-word whitespace",p,line,s);
  if(/[\uFF01-\uFF65\uFE50-\uFE6F\u3000\u00AD]/u.test(s))
    record("suspicious Unicode punctuation",p,line,s);
  if(!textContent(p))return s;
  if(/\S[ \t]+$/.test(s) && !/\S {2}$/.test(s))
    s=s.replace(/[ \t]+$/u,"");
  if(p==="src/data/basta/pages/030.md")s=s.replace(/،،/gu,"،");
  if(/^src\/data\/basta\/(?:pages|roman)\/091\.md$/.test(p))
    s=s.replace(/ !(?=$)/gu,"!");
  if(p==="src/data/lyrics/tu-na-aaya-ghazi.md")
    s=s.replace(/شیرِ ِجری/gu,"شیرِ جری").replace(/شہہ/gu,"شہ");
  if(p==="src/data/basta/pages/193.md")
    s=s.replace(/کبہی بجہے ہوئے گہہ/gu,"کبھی بجھے ہوئے گہ");
  if(p==="src/data/basta/pages/202.md")
    s=s.replace(/تیغ بڑہا/gu,"تیغ بڑھا");
  if(p==="src/data/lyrics/ya-sari-ar-riza.md")
    s=s.replace(/شبِ جمہ/gu,"شبِ جمعہ");
  if(textContent(p)) s=s.replace(/，/gu,"،").replace(/ +،/gu,"،");
  if(!arabic(p,s,intro)){
    const guards=/(لا إله إلا (?:الله|علی)|“[^”]*”|"[^"]*")/gu;
    s=s.split(guards).map(part=>{
      if(/^لا إله إلا (?:الله|علی)$/u.test(part))return part;
      if(/^(?:“[^”]*”|"[^"]*")$/u.test(part) &&
        ((part.match(vowel)??[]).length>1 || /(?:^| )(?:ال|مع )[^\s]+/u.test(part)))return part;
      return part.replace(/ك/gu,"ک").replace(/ه/gu,"ہ").replace(/خدیجة/gu,"خدیجہ");
    }).join("");
  }
  if(s!==line)record("content typography",p,line,s);
  return s;
}
function transform(p,source){
  let fenced=false,frontmatter=0,arabicIntro=p.endsWith("/lyrics/ya-sari-ar-riza.md");
  return source.split("\n").map(line=>{
    if(line.trim()==="---"&&frontmatter<2){frontmatter++;return line;}
    if(/^\s*(?:\x60{3,}|~{3,})/.test(line)){fenced=!fenced;return line;}
    const intro=arabicIntro&&(frontmatter<2||line.trim()!=="۱");
    if(arabicIntro&&frontmatter===2&&line.trim()==="۱")arabicIntro=false;
    return normalizeLine(p,line,{fenced,intro});
  }).join("\n");
}
const body=source=>{
  const fm=source.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  if(!fm)throw Error("Missing frontmatter");return source.slice(fm[0].length);
};
async function catalog(sources){
  const index=JSON.parse(await readFile("src/data/basta/index.json","utf8")).filter(x=>x.sectionRoman!=="Mazameen");
  const roman=new Map(),pages=[];
  for(const [p,s] of sources){
    if(p.startsWith("src/data/basta/roman/"))roman.set(Number(basename(p).slice(0,-3)),body(s));
    else if(p.startsWith("src/data/basta/pages/")){
      const fm=s.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
      if(!fm||/^published:\s*false$/m.test(fm[1])||/^imageOnly:\s*true$/m.test(fm[1]))continue;
      pages.push({page:Number(basename(p).slice(0,-3)),urdu:body(s)});
    }
  }
  return buildBastaKalamCatalog(index,pages.map(x=>({...x,roman:roman.get(x.page)}))).kalams;
}
const original=new Map(),updated=new Map(),changed=[];
const paths=(await collect(".")).map(p=>relative(".",p).replaceAll("\\","/")).sort();
for(const p of paths){
  const before=await readFile(p,"utf8"),after=transform(p,before);
  original.set(p,before);updated.set(p,after);
  if(before!==after)changed.push(p);
}
console.log("MARKDOWN_FILES "+paths.length+" CHANGED_FILES "+changed.length);
console.log("CHANGED_PATHS "+JSON.stringify(changed));
for(const [kind,s] of stats)console.log("CHANGES "+kind+" count="+s.count+"\n"+s.samples.join("\n"));
if(write){
  const before=await catalog(original),after=await catalog(updated);
  const byId=new Map(after.map(k=>[k.id,k]));
  const registry=JSON.parse(await readFile("src/data/recitation/identity-lock.json","utf8"));
  const locks=new Map(registry.basta.map(k=>[k.id,k])),changedAnchors=[];
  for(const old of before){
    const now=byId.get(old.id);
    if(!now||now.status!==old.status||now.stanzas.length!==old.stanzas.length)
      throw Error("Changed kalam/stanza structure: "+old.id);
    const lock=locks.get(old.id);
    if(old.status!=="ready"||!lock)continue;
    for(let i=0;i<old.stanzas.length;i++){
      const a=stanzaAnchor(old.stanzas[i].urdu),b=stanzaAnchor(now.stanzas[i].urdu);
      if(a===b)continue;
      const pinned=lock.stanzas.find(x=>!x.retired&&x.anchor===a);
      if(!pinned)throw Error("Unmatched stanza "+old.id+"/"+old.stanzas[i].id+" "+a);
      if(lock.stanzas.some(x=>x!==pinned&&x.anchor===b))throw Error("Duplicate new anchor "+old.id);
      pinned.anchor=b;changedAnchors.push(old.id+"/"+pinned.id);
    }
  }
  for(const p of changed)await writeFile(p,updated.get(p));
  if(changedAnchors.length)await writeFile("src/data/recitation/identity-lock.json",JSON.stringify(registry,null,2)+"\n");
  console.log("PRESERVED_STANZA_IDS "+JSON.stringify(changedAnchors));
}
