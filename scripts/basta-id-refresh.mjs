// One-time guarded identity migration for reviewed Basta source edits.
// Refuses renumbering, missing poems, duplicate anchors, or unrelated edits.
import { readFile, readdir, writeFile } from "node:fs/promises";
import { buildBastaKalamCatalog } from "../src/lib/basta-kalam-units.ts";
import { stanzaAnchor } from "../src/lib/recitation-identity.ts";

const base = new URL("../src/data/basta/", import.meta.url);
const lockFile=new URL("../src/data/recitation/identity-lock.json",import.meta.url);
const lock=JSON.parse(await readFile(lockFile,"utf8"));
const index=JSON.parse(await readFile(new URL("index.json",base),"utf8"));
async function source(kind){
 const dir=new URL(kind+"/",base);
 return Promise.all((await readdir(dir)).filter(n=>/^\d+\.md$/.test(n)).map(async n=>{
  const raw=await readFile(new URL(n,dir),"utf8");
  const m=raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if(!m)throw Error("Missing header "+n);
  return {page:Number(n.slice(0,-3)),body:raw.slice(m[0].length),
   imageOnly:/^imageOnly:\s*true\s*$/m.test(m[1])};
 }));
}
const [ur,ro]=await Promise.all([source("pages"),source("roman")]);
const romans=new Map(ro.map(x=>[x.page,x.body]));
const catalog=buildBastaKalamCatalog(index,ur.filter(x=>!x.imageOnly).map(x=>({
 page:x.page,urdu:x.body,roman:romans.get(x.page)
})));
const map=new Map(catalog.kalams.map(x=>[x.id,x]));
const repairs={
 "basta-marsiye-094":["stanza-006"],
 "basta-marsiye-107":["stanza-003","stanza-004"],
 "basta-marsiye-111":["stanza-006"],
 "basta-marsiye-121":["stanza-001"],
 "basta-marsiye-124":["stanza-002"],
 "basta-marsiye-135":["stanza-004"]
};
const audit=[];
for(const [poemId,targetIds] of Object.entries(repairs)){
 const now=map.get(poemId),old=lock.basta.find(x=>x.id===poemId);
 if(!now||now.status!=="ready"||!old)throw Error(poemId+" unavailable");
 if(now.stanzas.length!==old.stanzas.length)throw Error(poemId+" stanza count changed");
 const targets=new Set(targetIds);
 const oldIds=new Set(old.stanzas.map(x=>x.id));
 if(now.stanzas.some(x=>!oldIds.has(x.id)))throw Error(poemId+" printed IDs shifted");
 for(const stanza of now.stanzas){
  const pinned=old.stanzas.find(x=>x.id===stanza.id);
  if(!pinned)throw Error("Unknown lock "+poemId+"/"+stanza.id);
  const anchor=stanzaAnchor(stanza.urdu);
  if(targets.has(stanza.id)){
    if(pinned.anchor===anchor)throw Error("Already matching correction "+poemId+"/"+stanza.id);
    audit.push({poem:poemId,id:stanza.id,page:stanza.pages,old:pinned.anchor,new:anchor});
    pinned.anchor=anchor;
  }else if(pinned.anchor!==anchor)throw Error("Unreviewed changed stanza "+poemId+"/"+stanza.id);
 }
 if(new Set(old.stanzas.map(x=>x.anchor)).size!==old.stanzas.length)
   throw Error("Duplicate stanza hashes "+poemId);
}
const id="basta-marsiye-063";
const current=map.get(id),previous=lock.basta.find(x=>x.id===id);
if(!current||current.status!=="ready"||!previous)throw Error(id+" unavailable");
if(previous.stanzas.length!==6||current.stanzas.length!==10)
  throw Error(id+" requires exactly four recovered stanzas");
for(let i=0;i<6;i++){
 if(previous.stanzas[i].id!==current.stanzas[i].id||
    previous.stanzas[i].anchor!==stanzaAnchor(current.stanzas[i].urdu))
   throw Error(id+" old stanza "+(i+1)+" differs");
}
for(const stanza of current.stanzas.slice(6)){
 if(![7,8,9,10].includes(stanza.number))throw Error("Unexpected stanza number");
 const anchor=stanzaAnchor(stanza.urdu);
 if(previous.stanzas.some(x=>x.anchor===anchor||x.id===stanza.id))throw Error("Recovered ID already exists");
 previous.stanzas.push({id:stanza.id,anchor});
 audit.push({poem:id,id:stanza.id,page:stanza.pages,recovered:true});
}
await writeFile(lockFile,JSON.stringify(lock,null,2)+"\n");
console.log(JSON.stringify({repaired:audit.length,items:audit},null,2));
