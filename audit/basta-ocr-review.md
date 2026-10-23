# Basta OCR review

Source: `basta-clean.zip` → `original/NNN.png`. Branch: `fix/basta-ocr-order-2026-10`.

**Scope:** 219 distinct page numbers in `basta-error-report.csv` (ignore the first three CSV rows). The CSV is a *page list*, not a list of errors to trust.

**Method:** Check the current Urdu file and Roman file **if present**. Missing Roman files are intentional. Only investigate live uncertainty/error markers; compare the actual original scan before correcting. Keep Urdu/Roman text, stanza order, and line breaks aligned when both files exist. Retain genuinely unreadable material as flagged. No guessed wording.

## Page-marker audit

- **022–025:** image-only; no text markers.
- **026:** markers remain in an unclear biography and proper name; another historical OCR name needs checking.
- **030–031, 033, 035:** unresolved names/titles; source checks still needed.
- **032, 034, 036:** no remaining uncertainty markers.
- **037–053:** some markers cleared in previous commits; outstanding passages require further scan checks.
- **109, 111, 117, 119, 121:** historical CSV flags absent from current files; previously reviewed or corrected.
- **123–128, 132, 135–140:** paired lyric reviews partly completed; a few uncertain verses/names remain. Check current files rather than historical CSV text.
- **Other CSV pages:** pending current-file marker scan.

This is **marker triage**, not full word-by-word proofreading. Site build has not been run. Individual fixes and source-reading details are retained in Git commit history.
