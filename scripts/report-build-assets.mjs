// Small, dependency-free build asset inventory for performance regression reviews.
import { readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
const root = "dist";
if (!existsSync(root)) { console.error("Build dist/ first"); process.exitCode = 1; }
else {
  const records = [];
  function visit(dir) {
    for (const entry of readdirSync(dir,{withFileTypes:true})) {
      const path = join(dir,entry.name);
      if (entry.isDirectory()) visit(path);
      else if (/\.(?:css|js|woff2?|ttf)$/i.test(entry.name))
        records.push({ path: relative(root,path), bytes: statSync(path).size });
    }
  }
  visit(root);
  const byExt = {};
  for (const record of records) {
    const ext = record.path.split(".").at(-1);
    const entry = byExt[ext] ||= { files:0,bytes:0 };
    entry.files++; entry.bytes += record.bytes;
  }
  console.log("Build assets by type:",JSON.stringify(byExt));
  console.log("Largest output assets:",records.sort((a,b)=>b.bytes-a.bytes).slice(0,12)
    .map((entry)=>entry.path+" ("+(entry.bytes/1024).toFixed(1)+" KiB)").join("\n"));
  console.log("File byte counts are not network transfer sizes; font downloads depend on chosen face and glyphs.");
}
