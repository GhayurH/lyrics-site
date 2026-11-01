# Manual visual and accessibility matrix

The browser suite includes geometry and keyboard checks but cannot establish actual Nastaliq readability, screen-reader announcements, or physical-device rendering. Capture date, browser/OS, viewport, zoom, edition combination and theme for any confirmed issue.

## Viewports and scaling

| Size | Scenario |
| --- | --- |
| 320×568 | narrow portrait, one edition and both editions |
| 390×844 | mainstream portrait, Focus title/toolbar and scan viewer |
| 640×360 | narrow landscape, browser chrome and Focus layout |
| 768×1024 | tablet portrait, two editions, long verses |
| 1440×900 | wide desktop, three editions and synchronized scroll |
| 200% and 400% zoom | WCAG reflow and focus-not-obscured; intentionally one-line source verses may need explicit enlargement option |

## Pages

- Standalone kalam (`/lyrics/aa-asghar-bin-tere/`): long Urdu/Roman verses, title, original scan, options, correction dialog.
- Basta page (`/basta/138/`): scan, bilingual columns, content anchors, page navigation, single-edition Focus.
- Continuous Basta (`/basta/read/`): chunk loading, index, resume, source scans, hash deep links.
- Individual Basta (`/basta/kalams/` then any verified kalam): source-page links, stanza source maps.
- Recitation reader: locally created mixed Urdu/Basta set, optional follow-live, sequential/continuous navigation.
- Saved library: keyboard import, explicit backup warnings, offline download/error feedback.

For each: Light, Dark, Sepia, Custom high-contrast and AMOLED, default Nastaliq + at least one Naskh face. Test keyboard Tab/Shift+Tab/Escape, focus visibility and VoiceOver/NVDA/Orca where available. Compare source scans visually, not just DOM geometry.

## Performance checks

Record cold/mobile network CSS/JS/font requests, LCP and cumulative layout shift using browser Performance tooling. `npm run perf:assets` reports emitted asset size and reveals unusually large compiled assets; it does not claim network transfer size or font usage.

Do not mark any item as manually verified solely because Chromium CI passed.

## Implemented vs. physical-device work

- Browser tests automatically check 320×568 through 1440×900 geometry, reader-focus keyboard access, saved-data import, searchable individual kalams and source anchor links.
- At extreme desktop/browser magnification and mobile pinch zoom, verses that would shrink below 16 px retain their single-line structure but become individually keyboard-pannable, rather than reducing text indefinitely.
- `tests/browser/performance.spec.mjs` measures actual navigation FCP/LCP, layout shift and resource transfer sizes in Chromium. Run `npm run perf:browser` after building.
- Run `npm run basta:kalams:review` to get a linked editorial queue for the 29 unverified kalams and unassigned source fragments; review each source image before assigning boundaries.
- Actual devices, assistive technologies, original printed scan region coordinates, and mobile-network throttling require human verification. Automated CI is not evidence these manual checks occurred.
