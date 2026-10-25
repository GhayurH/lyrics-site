// File role: Confirm original R2-backed source assets work, independent of local build output.
import { test, expect } from "@playwright/test";

test("published source scans and lyric sheets are reachable from production and R2 directly", async ({ request }) => {
  for (const path of ["/images/basta/original/138.png", "/images/lyrics/aa-asghar-bin-tere.png"]) {
    for (const origin of ["https://kalamarchive.com", "https://r2-assets.kalamarchive.com"]) {
      const response = await request.get(`${origin}${path}`, { timeout: 20000 });
      expect(response.ok(), `R2 asset ${origin}${path} should be accessible`).toBe(true);
      expect(response.headers()["content-type"]).toMatch(/^image\//);
      expect((await response.body()).byteLength).toBeGreaterThan(5000);
    }
  }
});
