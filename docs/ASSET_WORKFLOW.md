# Asset workflow

This is the authoritative guide for Kalam Archive's large images, scans, PDFs, and other published binaries. They belong in the Cloudflare R2 bucket `kalam-archive-assets`, **not Git**; Git tracks their Markdown references and code.

## Public paths and preview deployments

Use stable root-relative links in source content:

```text
/images/lyrics/example.png
/images/basta/original/000.jpg
/files/example.pdf
```

Cloudflare Cloud Connector serves `kalamarchive.com/images/*` and `kalamarchive.com/files/*` from R2. The bucket also has the public hostname `r2-assets.kalamarchive.com`; do not replace source URLs with this hostname.

Preview hostnames (`*.lyrics-site.pages.dev`) do not inherit production Cloud Connector host rules. `public/_redirects` provides **302** fallbacks from `/images/*` and `/files/*` to the same path on `r2-assets.kalamarchive.com`. A working preview scan has a 302 followed by a successful R2 image response. Confirm `dist/_redirects` exists when debugging. Local `astro preview` does not execute Pages redirects.

## Local development

Keep your asset master outside the repository:

```text
~/KalamArchiveAssets/
  images/
    lyrics/
    basta/
  files/
```

Link it into the local Git checkout so the dev server can serve the files:

```bash
cd ~/Projects/lyrics-site
ln -s ~/KalamArchiveAssets/images public/images
ln -s ~/KalamArchiveAssets/files public/files
```

Both paths are Git-ignored. Create the symlinks only if the paths do not already exist; do not replace an existing directory.

## Publish new or changed assets

Place a new file at its intended relative public path (for example, `~/KalamArchiveAssets/images/lyrics/example.png`). Upload the appropriate subtree:

```bash
rclone copy ~/KalamArchiveAssets/images r2:kalam-archive-assets/images --checksum --progress
rclone copy ~/KalamArchiveAssets/files  r2:kalam-archive-assets/files  --checksum --progress
```

Run only the command relevant to your changes. `rclone copy` adds and overwrites objects without deleting unrelated R2 objects. **Do not use `rclone sync` for normal publishing** (it can delete remote assets), or `--immutable` when replacements are expected. Checksum comparison depends on what the remote supports.

Replacing an image at its existing relative path preserves the public URL. Cloudflare may temporarily cache the old content; purge the affected URL if needed instead of renaming the file merely to bypass caching.

## Verify uploads

```bash
rclone check ~/KalamArchiveAssets/images r2:kalam-archive-assets/images --one-way
rclone check ~/KalamArchiveAssets/files  r2:kalam-archive-assets/files  --one-way
rclone size r2:kalam-archive-assets
```

The checks compare local content to its corresponding remote subtree. Verify public image/PDF URLs and redirects separately if a deployment behaves differently from local development.

## Commit site changes

1. Add or correct the Markdown, metadata, and code in Git.
2. Add or replace large assets in the local master and upload them with `rclone copy`.
3. Verify changed R2 objects or preview links as needed.
4. Run the relevant [validation checks](CONTRIBUTING.md#validation), inspect `git diff` and `git status`, and commit **only** Git-tracked text/configuration files.
5. Purge affected Cloudflare cache URLs if an overwritten asset is still stale.

For lyric transcription or metadata standards, use [CONTRIBUTING.md](CONTRIBUTING.md#content-rules).
