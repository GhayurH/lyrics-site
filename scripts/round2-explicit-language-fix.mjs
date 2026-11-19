// Round2: reclassify only imported poems explicitly labelled in filenames, titles,
// aliases or archived source URLs. No lexical guesses and no verse rewriting.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const directory=fileURLToPath(new URL("../src/data/lyrics/",import.meta.url));
const tokens={
  Panjabi: /(?:^|[^a-z])(?:punjabi|panjabi)(?=$|[^a-z])/iu,
  Saraiki: /(?:^|[^a-z])(?:saraiki|siraiki|seraiki|saraeki)(?=$|[^a-z])/iu,
  Balti: /(?:^|[^a-z])balti(?=$|[^a-z])/iu,
};
const codes={
  Panjabi:{rtl:"pa-Arab",ltr:"pa"},
  Saraiki:{rtl:"skr-Arab",ltr:"skr"},
  Balti:{rtl:"bft-Arab",ltr:"bft"},
};
function scalar(header,key){
  const m=header.match(new RegExp("^"+key+":\\s*([^\\r\\n]*)$","m"));
  return m?.[1].trim().replace(/^["']|["']$/gu,"");
}
export function analyzeExplicitLanguage(filename,source){
  const m=/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(source);
  if(!m)return {type:"invalid"};
  const header=m[1],label=scalar(header,"language"),lang=scalar(header,"lang"),direction=scalar(header,"direction");
  // Source URL/title may declare source language. Editorial notes may describe
  // mixed-language inserts or uncertainty, so never use those as automatic proof.
  const evidence=[
    filename,scalar(header,"title")||"",scalar(header,"alternateTitle")||"",
    header.match(/^aliases:\s*(.*)$/mu)?.[1]||"",
    header.match(/^# source_url:\s*(.*)$/mu)?.[1]||"",
  ].join(" ");
  const found=Object.keys(tokens).filter(x=>tokens[x].test(evidence));
  if(found.length>1)return {type:"mixed-evidence",label,direction,evidence:evidence.slice(0,190)};
  if(!found.length)return {type:"no-evidence"};
  const target=found[0];
  if(!["ltr","rtl"].includes(direction))return {type:"unclear-script",label,target};
  if(!["Urdu","Panjabi","Saraiki","Balti"].includes(label))
    return {type:"conflicting-language",label,target};
  const desired=codes[target][direction];
  if(label===target && lang===desired)return {type:"already",target,lang};
  const updatedHeader=header
    .replace(/^language:[^\r\n]*$/mu, line=>{
      const raw=line.replace(/^language:\s*/u,"");
      const q=raw.startsWith('"')?'"':raw.startsWith("'")?"'":"";
      return "language: "+q+target+q;
    })
    .replace(/^lang:[^\r\n]*$/mu,line=>{
      const raw=line.replace(/^lang:\s*/u,"");
      const q=raw.startsWith('"')?'"':raw.startsWith("'")?"'":"";
      return "lang: "+q+desired+q;
    });
  if(updatedHeader===header)return {type:"missing-fields",label,target};
  const start=source.indexOf(header,m.index);
  const next=source.slice(0,start)+updatedHeader+source.slice(start+header.length);
  return {type:"change",target,lang:desired,label,oldLang:lang,source:next};
}
export async function run(write=false){
  const files=(await readdir(directory)).filter(f=>f.endsWith(".md")).sort();
  const counts={},examples={},changedBy={};
  for(const name of files){
    const path=join(directory,name),raw=await readFile(path,"utf8");
    const r=analyzeExplicitLanguage(name,raw);
    counts[r.type]=(counts[r.type]||0)+1;
    if(r.type==="change"){
      changedBy[r.target+" "+r.lang]=(changedBy[r.target+" "+r.lang]||0)+1;
      (examples[r.target]??=[]).push({name,from:r.label+" / "+r.oldLang,to:r.target+" / "+r.lang});
      if(write)await writeFile(path,r.source,"utf8");
    }else if(["mixed-evidence","conflicting-language","unclear-script","missing-fields"].includes(r.type)){
      (examples[r.type]??=[]).push({name,label:r.label,target:r.target,evidence:r.evidence});
    }
  }
  console.log("EXPLICIT_LANGUAGE_AUDIT "+JSON.stringify({write,total:files.length,counts,changedBy}));
  for(const [k,items] of Object.entries(examples))console.log("EXAMPLES "+k+" "+JSON.stringify(items.slice(0,25)));
  return counts;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const write=process.argv.includes("--write");
  if(process.argv.includes("--check")===write)throw Error("Use exactly one of --check or --write");
  const c=await run(write);
  if(!write&&(c.change||0)>0)process.exitCode=1;
}