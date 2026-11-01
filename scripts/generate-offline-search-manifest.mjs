// Compiled Pagefind files, not an external index, are downloaded on explicit opt-in.
import { readdir, stat, writeFile, mkdir } from "node:fs/promises";
import { join, relative } from "node:path";
const root = "dist/pagefind", files = [];
async function walk(dir) {
  for (const entry of await readdir(dir,{withFileTypes:true})) {
    const path = join(dir,entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (!entry.name.startsWith(".")) {
      const info = await stat(path);
      files.push({path:"/pagefind/"+relative(root,path).replaceAll("\\","/"),bytes:info.size});
    }
  }
}
await walk(root);
files.sort((a,b)=>a.path.localeCompare(b.path));
const manifest = {version:1,files:files.map((file)=>file.path),
  totalBytes:files.reduce((sum,file)=>sum+file.bytes,0)};
await mkdir("dist/data",{recursive:true});
await writeFile("dist/data/offline-search-assets.json",JSON.stringify(manifest));
console.log("Offline Pagefind manifest:",manifest.files.length,"files,",
  (manifest.totalBytes/1048576).toFixed(1),"MiB");
