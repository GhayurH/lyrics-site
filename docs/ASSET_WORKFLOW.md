# Asset storage and delivery

R2 owns large source scans and PDFs; Git owns Markdown, code, small public icons and **license-compliant** self-hosted fonts. Poetry references stable root-relative paths (`/images/...` and `/files/...`), not the provider hostname.

## Delivery paths

- **Production:** Cloudflare Cloud Connector serves `/images/*` and `/files/*` from the R2 bucket `kalam-archive-assets`.
- **Pages previews:** `public/_redirects` forwards those paths to `https://r2-assets.kalamarchive.com` because preview hostnames do not inherit the production connector.
- **Local `astro preview`:** does not apply Cloudflare redirects. Symlink local assets only where required for editing.

The separate paths are deliberate; never replace source Markdown image URLs with absolute R2 URLs.

## Working on binary assets

Keep masters outside Git. For local editing, create nontracked symlinks if the destinations do not already exist:

```bash
ln -s ~/KalamArchiveAssets/images public/images
ln -s ~/KalamArchiveAssets/files public/files
```

Upload only changed subtrees, verifying remote objects before publishing:

```bash
rclone copy ~/KalamArchiveAssets/images r2:kalam-archive-assets/images --checksum
rclone copy ~/KalamArchiveAssets/files  r2:kalam-archive-assets/files  --checksum
rclone check ~/KalamArchiveAssets/images r2:kalam-archive-assets/images --one-way
rclone check ~/KalamArchiveAssets/files  r2:kalam-archive-assets/files  --one-way
```

`copy` does not delete unrelated assets; avoid `sync` for routine publishing. Check generated `dist/_redirects`, affected preview/production URLs and the Cloudflare cache if an intentionally replaced scan remains stale.

Fonts are separate: the normal reading fonts come from licensed packages; optional faces load on demand. Keep original copyright/OFL notices beside any bundled font; do not embed fonts whose licenses prohibit redistribution.

The service worker downloads scans only at the reader's request. Large scans never belong in the unconditional application cache. See [Architecture](ARCHITECTURE.md#offline-and-infrastructure-boundaries).
