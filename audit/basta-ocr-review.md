# Basta OCR marker audit

Source: `basta-clean.zip/original/NNN.png`.

- **Scope:** 219 distinct page numbers in `basta-error-report.csv`; ignore its first three rows.
- **Current-file scan complete:** 219 Urdu MDs and 168 existing Roman MDs examined for uncertainty markers. Absent Roman pages are intentional.
- **Status:** 30 pages still have markers; 189 have none.
- **Rule:** Check the printed scan before replacing a live marker. Keep existing Urdu/Roman files synchronized. No guessing; a page with no markers is **not** word-by-word cleared.
- **Latest:** restored a closing line on 260 and names on 357 from print; existing Roman synchronized, remaining uncertainties retained.

**Open marker pages (30):**

031 035 038 044 045 046 048 051 053 060 064 065 076 083 084 124 128 138 140 193 254 260 264 270 331 357 358 368 398 417

The historical CSV is only a page-selection list. Detailed edits are in Git history. Website build not run.
