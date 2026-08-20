# Asset workflow

This is the quick day-to-day workflow for adding new images, PDFs, or other large assets to Kalam Archive.

Large binary assets are kept outside Git under `~/KalamArchiveAssets/` and published to the `kalam-archive-assets` Cloudflare R2 bucket. The Git repository contains the corresponding code, Markdown, and metadata only.

For the full storage model, verification commands, replacement behavior, and cache notes, see [CONTRIBUTING.md](CONTRIBUTING.md#asset-storage-and-publishing).

## Add an image

Place the image in the local asset master at the path it should have on the site. For example:

```text
~/KalamArchiveAssets/images/lyrics/new-kalam.png
```

Because the local development setup symlinks `~/KalamArchiveAssets/images` into the site, the new image is immediately available during local development.

When the image is ready to publish, upload the image tree to R2:

```bash
rclone copy \
  ~/KalamArchiveAssets/images \
  r2:kalam-archive-assets/images \
  --checksum \
  --progress
```

`rclone copy` uploads new files and updates changed files without deleting unrelated objects already in R2.

## Add a PDF or other file

Place the file under:

```text
~/KalamArchiveAssets/files/
```

Then publish the files tree:

```bash
rclone copy \
  ~/KalamArchiveAssets/files \
  r2:kalam-archive-assets/files \
  --checksum \
  --progress
```

The source workflow uses the same separate upload path for PDFs/files.

## Commit the site changes

Code, Markdown, and metadata remain normal Git-tracked content:

```bash
cd ~/Projects/lyrics-site

git add .
git commit -m "Add new kalam"
git push
```

The large image or file itself should **not** enter Git.

## Summary

The normal sequence is:

1. Add or replace the asset under `~/KalamArchiveAssets/`.
2. Confirm it works locally through the existing symlink.
3. Upload the appropriate asset tree to R2 with `rclone copy`.
4. Commit and push only the Git-tracked code, Markdown, and metadata changes.

For corrections that replace an existing asset, R2 verification, Cloudflare cache handling, and non-destructive upload guidance, use the full instructions in [CONTRIBUTING.md](CONTRIBUTING.md#asset-storage-and-publishing).
