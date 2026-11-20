# Round 2 Codex worker entry point

The authoritative policy remains docs/EDITORIAL.md. The single-file worker injects the task-specific, fully elaborated excerpts and examples from scripts/kalam-transliteration-rules.md directly into Codex, so it does not have to reread the entire editorial manual or traverse the repository on every invocation.

- The worker only edits one newly added standalone lyric at a time, and never commits, stages, pushes, deploys, rewrites identifiers or edits editorial trackers.
- All non-English originals remain in their source language, accompanied only by phonetic Roman transliteration (not English translations).
- The three bounded tasks are missing Roman, existing Roman audit, and reconstruction of source-script verses from existing Roman-only kalams. Roman text is sufficient to reconstruct the source-language script; no independent source verification is required. Preserve the Roman words and produce the corresponding source script without translation.
- The local Python validator reports deterministic structural and orthographic warning signs. It never certifies the reading, automatically edits a poem, or substitutes for human editorial approval.
- Update the task rule bundle whenever docs/EDITORIAL.md changes, and keep both consistent. The shared rules precede task-specific rules to encourage caching. Arabic-script recovery intentionally excludes irrelevant Roman orthographic details.

A complete processed file is still an unapproved local edit until separately verified.