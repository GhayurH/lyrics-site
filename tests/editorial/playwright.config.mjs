// Private workspace tests use a temporary Git corpus and an independent local
// server. They never build Astro or read/write the real review trackers.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.', testMatch: 'workspace.spec.mjs', fullyParallel: false, workers: 1,
  timeout: 30_000, expect: { timeout: 5000 }, retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  outputDir: '../../test-results/editorial',
  use: { browserName: 'chromium', headless: true, viewport: { width: 1360, height: 900 },
    trace: 'retain-on-failure', screenshot: 'only-on-failure' },
});
