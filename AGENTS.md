# Engineering and editorial contract

Read [Architecture](docs/ARCHITECTURE.md) for ownership, [Contributing](docs/CONTRIBUTING.md) for source changes, [Quality assurance](docs/QUALITY_ASSURANCE.md) for testing and [Operations](docs/RECITATION_OPERATIONS.md) before touching Cloudflare resources.

## Non-negotiable invariants

- **Source authority:** reviewed Urdu/Roman wording, punctuation, printed Basta page identities, explicit `---***---` boundaries and existing recitation/stanza IDs must remain stable. Never resolve uncertain OCR or published identity mappings by guesswork.
- **Edition parity:** Urdu, Roman and scan editions share stanza interpretation, titles, bookmarking and reader controls. Static HTML remains useful without JavaScript. Keep individual verses on one line; only that line may pan at extreme zoom.
- **One owner per concern:** source parsers and identity rules in `src/lib/`; stateful browser controllers in `src/client/`; static markup in Astro components; CSS roles in domain stylesheets. Reuse an existing owner rather than copying logic into another route.
- **Security:** source scans live in R2; drafts and private organizer edit capabilities remain browser-local unless explicitly published. Never log, index, cache or expose organizer edit tokens.
- **Comments:** explain contracts, boundary conditions, reasons and failure behavior. Do not narrate individual statements or retain chronological/WIP commentary. Documentation describes **current architecture**, not a changelog.

## Verification

After Markdown edits: `npm run source:sync`, inspect the exact diff, then `npm run build`. After code changes: `npm run check`, `npm run build` and the relevant Chromium suite. Run `git diff --check`. The build already runs Node tests and source integrity checks: never duplicate those gates in CI.
