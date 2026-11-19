// Read-only full-corpus language audit for round2; does not alter kalams.
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const directory=fileURLToPath(new URL("../src/data/lyrics/", import.meta.url));
const files=(await readdir(directory)).filter(f=>f.endsWith(".md")).sort();
const counts=new Map(), labels=new Map(), candidates=[];
const add=(m,k)=>m.set(k,(m.get(k)||0)+1);
const tags=(h,k)=> {
  const m=h.match(new RegExp("^"+k+":\\s*([^\\r\\n]*)$","m"));
  return m?.[1].trim().replace(/^["']|["']$/g,"")||"(missing)";
};
const strongPunjabi=/\b(?:punjabi|panjabi|shahmukhi|punjab|punj\xa0abi)\b/iu;
const strongSaraiki=/\b(?:saraiki|siraiki|seraiki|saraek[iy])\b/iu;
const strongBalti=/\b(?:balti)\b/iu;
const commonPunjabi=/\b(?:da|de|di|vich|wich|saanu|mainu|tainu|tenu|nu|sohna|maahi|puttar|ve|jaddon|jadon|kithay|kithon|aonda|rehndi|rahwa[nṅ]|haye|metho[nṅ]|tere|meri)\b/giu;
const romanSiraiki=/\b(?:meko[nṅ]|tekoo[nṅ]|teko[nṅ]|meda|teda|sadae[nṅ]|asa[nṅ]|tukoo[nṅ]|hikko|hik)\b/giu;
const shahmukhiTokens=/(?:^|[\s،])(?:دے|دا|دی|نوں|وچ|اتے|ایہہ|اوہناں|مینوں|تینوں|تیکوں|میکوں|تیڈا|میڈا|رہندا|ہن|ایویں|جیہڑا|کدوں)(?=$|[\s،])/gu;
const sample=(label,limit=30)=> {
  const xs=candidates.filter(c=>c.bucket===label);
  console.log("SAMPLES "+label+" total="+xs.length);
  for(const x of xs.slice(0,limit))console.log(JSON.stringify(x));
};
for (const name of files){
  const raw=await readFile(join(directory,name),"utf8");
  const m=/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(raw);
  if(!m){add(counts,"invalid-frontmatter");continue;}
  const h=m[1], body=raw.slice(m[0].length), language=tags(h,"language"),lang=tags(h,"lang"),direction=tags(h,"direction");
  const title=tags(h,"title"), alternate=tags(h,"alternateTitle");
  const roman=tags(h,"romanLyrics");
  const meta=(h.split("\n").filter(l=>/^(?:#.*(?:punjabi|panjabi|saraiki|balti)|aliases:|alternateTitle:)/iu.test(l)).join(" "))+ " " +name;
  const pMeta=strongPunjabi.test(meta), sMeta=strongSaraiki.test(meta), bMeta=strongBalti.test(meta);
  const romans=[alternate, name.replace(/[-_.]/g," ")].join(" ");
  const romanWords=[...romans.matchAll(commonPunjabi)].map(m=>m[0].toLowerCase());
  const saraikiWords=[...romans.matchAll(romanSiraiki)].map(m=>m[0].toLowerCase());
  const urduWords=[...body.matchAll(shahmukhiTokens)].map(m=>m[0].trim());
  add(counts,language+" | "+lang+" | "+direction);
  add(labels,language);add(labels,"lang:"+lang);
  const bucket= (sMeta ? "saraiki-metadata" : bMeta ? "balti-metadata" : pMeta ? "punjabi-metadata" :
    language==="Urdu" && saraikiWords.length ? "urdu-saraiki-lexicon" :
    language==="Urdu" && (romanWords.length >= 2 || urduWords.length >= 2) ? "urdu-punjabi-lexicon" :
    language==="Panjabi" && direction==="ltr" ? "panjabi-ltr" :
    language==="Balti" && direction==="ltr" ? "balti-ltr" : "");
  if(bucket)candidates.push({name,language,lang,direction,title,alternate,romanWords:romanWords.slice(0,8),saraikiWords,urduWords:urduWords.slice(0,8),bucket});
}
console.log("TOTAL_FILES "+files.length);
console.log("SOURCE_LANGUAGES "+JSON.stringify([...labels.entries()].sort((a,b)=>b[1]-a[1])));
console.log("COMBINATIONS "+JSON.stringify([...counts.entries()].sort((a,b)=>b[1]-a[1])));
for(const bucket of ["punjabi-metadata","saraiki-metadata","balti-metadata","urdu-punjabi-lexicon","urdu-saraiki-lexicon","panjabi-ltr","balti-ltr"])sample(bucket,45);
console.log("CANDIDATE_TOTALS "+JSON.stringify([...new Set(candidates.map(c=>c.bucket))].map(k=>[k,candidates.filter(c=>c.bucket===k).length])));
