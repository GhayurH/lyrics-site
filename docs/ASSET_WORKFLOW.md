# Asset workflow

Large scans, images, and PDFs belong in Cloudflare R2 bucket `kalam-archive-assets`, **not Git**. Source Markdown keeps stable root-relative paths such as `/images/lyrics/example.png`, `/images/basta/original/000.jpg`, and `/files/example.pdf`.

## Public URLs and previews

Production `kalamarchive.com/images/*` and `/files/*` use Cloudflare Cloud Connector. Preview deployments (`*.lyrics-site.pages.dev`) use `public/_redirects` to redirect those paths (302) to `https://r2-assets.kalamarchive.com`. **Do not** put the R2 hostname in source files. Confirm `dist/_redirects` if previews fail; local `astro preview` does not apply Pages redirects.

## Local development

Store master assets outside the checkout and link the directories into `public/` (links are Git-ignored):

```bash
# ~/KalamArchiveAssets/{images,files}/
cd ~/Projects/lyrics-site
ln -s ~/KalamArchiveAssets/images public/images
ln -s ~/KalamArchiveAssets/files public/files
```

Only create symlinks when those paths are absent; don't replace existing directories.

## Upload and verify

Use the command(s) for the changed subtree:

```bash
rclone copy ~/KalamArchiveAssets/images r2:kalam-archive-assets/images --checksum --progress
rclone copy ~/KalamArchiveAssets/files  r2:kalam-archive-assets/files  --checksum --progress

rclone check ~/KalamArchiveAssets/images r2:kalam-archive-assets/images --one-way
rclone check ~/KalamArchiveAssets/files  r2:kalam-archive-assets/files  --one-way
```

`rclone copy` adds/replaces without deleting unrelated objects; **never use `sync` for normal publishing**. Don't use `--immutable` when replacements are intended; checksum behavior depends on backend support.

Commit Markdown/code changes separately from binaries; validate changed public/preview URLs. Purge affected Cloudflare cache entries if a replaced file stays stale. Follow [Contributing](CONTRIBUTING.md#validation) for build/tests.
