// Build-time inventory of the complete Pagefind index and the site assets it needs.
import { readdir, stat, writeFile, mkdir } from "node:fs/promises";
import { join, relative } from "node:path";
async function gather(dir, prefix, allowed = () => true) {
  const files = [];
  async function walk(current) {
    for (const entry of await readdir(current,{withFileTypes:true})) {
      if (entry.name.startsWith(".")) continue;
      const file = join(current,entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (allowed(entry.name)) {
        const info = await stat(file);
        files.push({path:prefix+relative(dir,file).replaceAll("\\","/"),bytes:info.size});
      }
    }
  }
  await walk(dir);
  return files.sort((a,b)=>a.path.localeCompare(b.path));
}
const search = await gather("dist/pagefind","/pagefind/");
const assets = await gather("dist/_astro","/_astro/",
  (name) => /\.(?:js|css|woff2?|ttf)$/.test(name));
const manifest = {
  version:1,
  files:search.map((f)=>f.path),
  assets:assets.map((f)=>f.path),
  totalBytes:[...search,...assets].reduce((sum,item)=>sum+item.bytes,0),
};
await mkdir("dist/data",{recursive:true});
await writeFile("dist/data/offline-search-assets.json",JSON.stringify(manifest));
console.log("Offline Search + app manifest:",manifest.files.length,"index files,",
  manifest.assets.length,"app assets,",(manifest.totalBytes/1048576).toFixed(1),"MiB");
