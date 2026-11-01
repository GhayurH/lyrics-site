import test from "node:test";
import assert from "node:assert/strict";
import { checkOrWrite, normalizeUrduYeh } from "../scripts/normalize-urdu-yeh.mjs";

test("Arabic yeh variants become Urdu yeh in Urdu text, including metadata", () => {
  assert.equal(normalizeUrduYeh("src/data/lyrics/example.md", 'title: "ياد"\n\nميرى زندگی'),
    'title: "یاد"\n\nمیری زندگی');
});

test("preserves Arabic quotes in Basta and the Arabic opening of Ya Sari'ar-Riza", () => {
  const quran = "---\npage: 3\n---\nلَا يُحِبُّ اللّٰهُ الْجَهْرَ";
  assert.equal(normalizeUrduYeh("src/data/basta/pages/003.md", quran), quran);
  const hadith = "---\npage: 8\n---\nاللهم صل على محمد وآل محمد وإني أتيت";
  assert.equal(normalizeUrduYeh("src/data/basta/pages/008.md", hadith), hadith);
  const lyric = '---\ntitle: "يَا سَرِيعَ الرِّضَا"\n---\n\nيَا سَرِيعَ الرِّضَا\n۱\nميرى دعا';
  assert.equal(normalizeUrduYeh("src/data/lyrics/ya-sari-ar-riza.md", lyric),
    '---\ntitle: "يَا سَرِيعَ الرِّضَا"\n---\n\nيَا سَرِيعَ الرِّضَا\n۱\nمیری دعا');
});

test("all content Markdown follows the Urdu yeh convention", async () => {
  assert.deepEqual(await checkOrWrite(), [], "run node scripts/normalize-urdu-yeh.mjs --write");
});
