// Temporary editorial migration. Run once; remove this file after verification.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root=fileURLToPath(new URL("../src/data/basta",import.meta.url));
const apply=process.argv.includes("--apply");
const genre=/^(?:\[?\s*(?:مختصر\s+)?قطعہ\s*\]?|رباعی|\[?\s*(?:Mukhtasar\s+)?Qit['a-z’\-]*\s*\]?|\[?\s*Rubai\s*\]?)/iu;
const courtesy=/^\s*\(?(?:بشکریہ|Bashukriya)(?:\s|[):]|$)/iu;
const removedTitles=[];
let squashedBlanks=0,separatedCredits=0,changedFiles=0;
for(const kind of ["pages","roman"]){
  const folder=join(root,kind);
  for(const name of (await readdir(folder)).filter(n=>/^\d+\.md$/u.test(n)).sort()){
    const page=Number(name.slice(0,-3));
    if(page<85)continue;
    const path=join(folder,name),raw=await readFile(path,"utf8");
    const front=raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/u);
    if(!front)throw Error("Missing source frontmatter: "+path);
    let body=raw.slice(front[0].length);
    // Source fragments separated by the exact printed-poem marker.
    const fragments=body.split(/(^---\*\*\*---$)/gmu);
    for(let j=0;j<fragments.length;j++){
      if(fragments[j]==="---***---")continue;
      const lines=fragments[j].split("\n");
      const meaningful=lines.map((line,i)=>({i,text:line.trim()})).filter(x=>x.text);
      if(!meaningful.length||!genre.test(meaningful[0].text))continue;
      const initial=meaningful.slice(0,7).map(x=>x.text);
      const redundant=meaningful.slice(-4).filter(x=>x.i!==meaningful[0].i
        && initial.includes(x.text) && meaningful.filter(y=>y.text===x.text).length>=2);
      if(redundant.length){
        const victim=redundant[redundant.length-1];
        lines.splice(victim.i,1);
        fragments[j]=lines.join("\n");
        removedTitles.push({edition:kind,page,fragment:j,text:victim.text});
      }
    }
    body=fragments.join("");
    const excess=[...body.matchAll(/\n{3,}/gu)];
    squashedBlanks+=excess.length;
    body=body.replace(/\n{3,}/gu,"\n\n");
    const out=[];
    for(const line of body.split("\n")){
      if(courtesy.test(line)&&out.length&&out[out.length-1].trim()
          &&out[out.length-1].trim()!=="---***---"){
        out.push("");
        separatedCredits++;
      }
      out.push(line);
    }
    body=out.join("\n").replace(/\n{3,}/gu,"\n\n");
    const updated=front[0]+body;
    if(updated!==raw){
      changedFiles++;
      if(apply)await writeFile(path,updated);
    }
  }
}
if(removedTitles.length!==7)
  throw Error("Expected exactly seven redundant Rubai/Qit'a headings; found "+removedTitles.length);
if(separatedCredits<200||squashedBlanks<70)
  throw Error("Unexpected cleanup scope; stopping for editorial review");
console.log(JSON.stringify({apply,changedFiles,squashedBlanks,separatedCredits,removedTitles},null,2));
