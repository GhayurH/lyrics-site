import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("Kalam Codex reviewer classifies source and Roman editions safely", () => {
  const run = spawnSync("python3", [
    "-m", "unittest", "discover", "-s", "tests", "-p", "test_kalam_codex*.py",
  ], { encoding: "utf8", timeout: 20000 });
  assert.equal(run.status, 0, run.stderr || String(run.error));
});
