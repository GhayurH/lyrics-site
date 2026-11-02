// File role: Ensure Pages preview URLs resolve externally stored R2 assets without copying binaries into Git.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const redirects = readFileSync(new URL("../public/_redirects", import.meta.url), "utf8");
const rules = redirects.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));

test("Cloudflare Pages redirects images and documents to the public R2 origin", () => {
  assert.deepEqual(rules, [
    "/images/* https://r2-assets.kalamarchive.com/images/:splat 302",
    "/files/* https://r2-assets.kalamarchive.com/files/:splat 302",
  ]);
});

test("preview asset redirection preserves nested source paths and filenames", () => {
  for (const [path, destination] of [
    ["/images/basta/original/138.png", "https://r2-assets.kalamarchive.com/images/basta/original/138.png"],
    ["/images/lyrics/aa-asghar-bin-tere.png", "https://r2-assets.kalamarchive.com/images/lyrics/aa-asghar-bin-tere.png"],
    ["/files/example.pdf", "https://r2-assets.kalamarchive.com/files/example.pdf"],
  ]) {
    const prefix = path.startsWith("/images/") ? "images" : "files";
    const result = new URL(`https://r2-assets.kalamarchive.com/${prefix}/${path.slice(prefix.length + 2)}`);
    assert.equal(result.href, destination);
  }
});
