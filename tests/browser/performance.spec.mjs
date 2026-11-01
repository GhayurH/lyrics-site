// Actual cold navigation measurements, reported rather than unstable CI time budgets.
import { test, expect } from "@playwright/test";
const routes = ["/", "/lyrics/aa-asghar-bin-tere/", "/basta/138/", "/search/"];
for (const route of routes) {
  test("report browser loading metrics for " + route + " @perf", async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      window.__kalamMetrics = { lcp: 0, cls: 0 };
      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries())
            window.__kalamMetrics.lcp = Math.max(window.__kalamMetrics.lcp, entry.startTime);
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries())
            if (!entry.hadRecentInput) window.__kalamMetrics.cls += entry.value;
        }).observe({ type: "layout-shift", buffered: true });
      } catch { /* Not available in some browser engines. */ }
    });
    await page.goto(route,{waitUntil:"networkidle"});
    await page.evaluate(() => document.fonts.ready);
    const result = await page.evaluate(() => {
      const timing = performance.getEntriesByType("navigation")[0];
      const resources = performance.getEntriesByType("resource");
      const byType = {};
      for (const entry of resources) {
        const url = new URL(entry.name);
        const kind = /\.(?:woff2?|ttf)(?:$|\?)/i.test(url.pathname) ? "font" :
          /\.css$/i.test(url.pathname) ? "css" : /\.js$/i.test(url.pathname) ? "js" : "other";
        const record = byType[kind] ||= { count:0, bytes:0, uncompressedBytes:0 };
        record.count++;
        record.bytes += entry.transferSize || 0;
        record.uncompressedBytes += entry.decodedBodySize || 0;
      }
      return {
        route:location.pathname,
        documentLoadMs:Math.round(timing?.loadEventEnd || 0),
        firstContentfulPaintMs:Math.round(performance.getEntriesByName("first-contentful-paint")[0]?.startTime || 0),
        lcpMs:Math.round(window.__kalamMetrics.lcp),
        cls:Math.round(window.__kalamMetrics.cls*1000)/1000,
        byType,
      };
    });
    await testInfo.attach("browser-performance.json",{
      contentType:"application/json",body:Buffer.from(JSON.stringify(result,null,2)),
    });
    console.log("PERFORMANCE "+JSON.stringify(result));
    expect(result.documentLoadMs).toBeGreaterThan(0);
    expect(result.cls).toBeGreaterThanOrEqual(0);
  });
}
