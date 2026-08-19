// File role: Astro build configuration: declares the canonical site URL and integrations that affect generated output such as the sitemap.
// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://kalamarchive.com',
  integrations: [sitemap()],
});
