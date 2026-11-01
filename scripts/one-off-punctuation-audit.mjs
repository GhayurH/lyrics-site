// One-time audit for suspicious spacing immediately before punctuation.
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
const ignored = new Set([".git","node_modules",".astro","dist","old","coverage","test-results","playwright-report"]);
async function walk(dir) {
  const result=[];
  for(const item of await readdir(dir,{withFileTypes:true})) {
    if(ignored.has(item.name)) continue;
    const path=join(dir,item.name);
    if(item.isDirectory()) result.push(...await walk(path));
    else if(item.isFile() && path.endsWith(".md")) result.push(path);
  }
  return result;
}
const result = new Map(),examples=new Map();
const punct=/[ \t]+([,،，.。؛;!?؟:)\]}])/gu;
const category=(p)=>p.startsWith("src/data/basta/pages/")?"basta-urdu":
  p.startsWith("src/data/basta/roman/")?"basta-roman":
  p.startsWith("src/data/lyrics/")?"lyrics":"docs";
for(const file of (await walk(".")).sort()){
  const path=relative(".",file).replaceAll("\\","/");
  let inCode=false,inFrontmatter=false,frontmatterSeen=false;
  const lines=(await readFile(file,"utf8")).split("\n");
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    if(i===0 && line.trim()==="---") {inFrontmatter=true;frontmatterSeen=true;continue;}
    if(inFrontmatter && line.trim()==="---"){inFrontmatter=false;continue;}
    if(/^\s*(`{3,}|~{3,})/.test(line)){inCode=!inCode;continue;}
    if(inCode) continue;
    for(const match of line.matchAll(punct)){
      const idx=match.index,mark=match[1],prefix=line.slice(Math.max(0,idx-45),idx),suffix=line.slice(idx,Math.min(idx+90,line.length));
      const context = line.trim().startsWith("#")?"heading":
         (line.trim().startsWith("|")?"table":(inFrontmatter?"frontmatter":"body"));
      const kind=mark==="." && line.slice(idx+match[0].length).startsWith("..")?"ellipsis":
         mark===":" && line.slice(idx+match[0].length).startsWith("//")?"url":
         mark;
      const key=category(path)+" | "+kind+" | "+context;
      result.set(key,(result.get(key)||0)+1);
      const arr=examples.get(key)||[];
      if(arr.length<150)arr.push(path+":"+(i+1)+" | "+prefix+"␠"+suffix.trimEnd().slice(0,90));
      examples.set(key,arr);
    }
  }
}
for(const [key,count] of [...result].sort((a,b)=>a[0].localeCompare(b[0]))){
 console.log("GROUP "+key+" COUNT "+count);
 for(const sample of examples.get(key))console.log("LINE "+sample);
}
console.log("TOTAL_OCCURRENCES "+[...result.values()].reduce((a,b)=>a+b,0));
