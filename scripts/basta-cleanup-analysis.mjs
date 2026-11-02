import {readFile,readdir} from "node:fs/promises";
import { buildBastaKalamCatalog } from "../src/lib/basta-kalam-units.ts";
const root = new URL("../src/data/basta/", import.meta.url);
const index = JSON.parse(await readFile(new URL("index.json",root),"utf8"));
async function load(kind){ const dir=new URL(kind+"/",root); const files=(await readdir(dir)).filter(x=>/^[0-9]+\.md$/.test(x)); return Promise.all(files.map(async name=>{const raw=await readFile(new URL(name,dir),"utf8");const m=raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);return {page:Number(name.slice(0,-3)),body:raw.slice(m[0].length),imageOnly:/^imageOnly:\s*true\s*$/m.test(m[0])};}));}
const [urdu, roman]=await Promise.all([load("pages"),load("roman")]);
const romanMap=new Map(roman.map(x=>[x.page,x.body]));
const cat=buildBastaKalamCatalog(index,urdu.filter(x=>!x.imageOnly).map(x=>({page:x.page,urdu:x.body,roman:romanMap.get(x.page)})));
const poem=cat.kalams.filter(x=>["Salam","Marsiye"].includes(x.sectionRoman)).map(x=>{const lines=x.urdu.trim().split("\n").map(z=>z.trim()).filter(Boolean),romanLines=x.roman?.trim().split("\n").map(z=>z.trim()).filter(Boolean);const firstVerse=x.stanzas[0]?.urdu?.split("\n").find(z=>z.trim())||"";return {id:x.id,section:x.sectionRoman,name:x.name,romanName:x.romanName,status:x.status,pages:x.pages,startPage:x.startPage,issues:x.issues,numbered:x.numbered,stanzas:x.stanzas.length,lines:lines.length,first:lines.slice(0,5),firstVerse,last:lines.slice(-6),romanFirst:romanLines?.slice(0,4),romanLast:romanLines?.slice(-5)};});
console.log(JSON.stringify({total:cat.kalams.length,ready:cat.kalams.filter(x=>x.status==="ready").length,issues:cat.issues,poems:poem},null,2));