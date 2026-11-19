import test from "node:test";
import assert from "node:assert/strict";
import { analyzeExplicitLanguage } from "../scripts/round2-explicit-language-fix.mjs";
const md=(language,lang,direction="ltr",title="Original")=>
  ["---",`title: "${title}"`, "language: "+language, "lang: "+lang, "direction: "+direction,
  "tags: []", "romanLyrics: |-", "  A separate edition", "---", "Untouched poem", ""].join("\n");
test("Punjabi and Saraiki source titles reclassify metadata, not text",()=>{
  for(const [filename,source,target,code] of [
    ["kalam-lyrics-punjabi.md",md("Urdu","ur"),"Panjabi","pa"],
    ["kalam.md",md("Urdu","ur","rtl","A Punjabi original"),"Panjabi","pa-Arab"],
    ["noha-lyrics-saraiki.md",md("Urdu","ur"),"Saraiki","skr"],
    ["noha-lyrics-siraiki.md",md("Urdu","ur","rtl"),"Saraiki","skr-Arab"],
  ]){
    const r=analyzeExplicitLanguage(filename,source);
    assert.equal(r.type,"change");
    assert.equal(r.target,target);
    assert.match(r.source,new RegExp("lang: "+code.replace("-","\\-")));
    assert.ok(r.source.endsWith("Untouched poem\n"));
    assert.equal(analyzeExplicitLanguage(filename,r.source).type,"already");
  }
});
test("mixed-language, Urdu verses and commentary do not trigger false relabels",()=>{
  assert.equal(analyzeExplicitLanguage("poem.md",md("Urdu","ur","rtl","Ali da wali")).type,"no-evidence");
  assert.equal(analyzeExplicitLanguage("saraiki-punjabi.md",md("Urdu","ur")).type,"mixed-evidence");
  const editorial=md("Urdu","ur") .replace("---\nUntouched", "# editorial_note: Some Punjabi lines were added\n---\nUntouched");
  assert.equal(analyzeExplicitLanguage("poem.md",editorial).type,"no-evidence");
});
