# Basta OCR marker audit

Source: `basta-clean.zip/original/NNN.png`.

- **Scope:** 219 distinct page numbers in `basta-error-report.csv`; ignore its first three rows.
- **Current-file scan complete:** 219 Urdu MDs and 168 existing Roman MDs examined for uncertainty markers. Absent Roman pages are intentional.
- **Status:** 54 pages still have markers; 165 have none.
- **Rule:** Check the printed scan before replacing a live marker. Keep existing Urdu/Roman files synchronized. No guessing; a page with no markers is **not** word-by-word cleared.
- **Latest:** recovered additional lines on 375 and 417; existing Roman pages kept in sync.

**Open marker pages (54):**

026 030 031 033 035 038 044 045 046 048 049 051 053 056 058 059 060 061 062 063 064 065 068 070 071 072 076 083 084 124 128 135 138 140 193 254 255 260 264 270 293 311 331 356 357 358 368 372 374 375 393 396 398 417

The historical CSV is only a page-selection list. Detailed edits are in Git history. Website build not run.
