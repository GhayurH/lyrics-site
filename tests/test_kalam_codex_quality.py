"""Prompt scope, transliteration safeguards and Codex token accounting."""
from __future__ import annotations

import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from kalam_codex import Candidate, prompt_for, inventory
from kalam_codex_quality import (
    TASK_ORDER, rule_sections, rules_for, validate_text, token_usage, usage_report
)


def fixture(body, roman=None, lang="ur", tags="[]"):
    roman_field = ("romanLyrics: |-\n" +
                   "\n".join("  " + line if line else "" for line in roman.splitlines()) + "\n"
                   if roman is not None else "")
    return ('---\ntitle: "Ae Husain"\n'
            f'language: "Urdu"\nlang: "{lang}"\ndirection: "rtl"\n'
            f'tags: {tags}\n{roman_field}---\n{body}')


class QualityTests(unittest.TestCase):
    def test_rule_bundle_contains_all_sections(self):
        rules = rule_sections()
        self.assertEqual(set(rules), {"Shared", "Roman", "Source", "Audit"})
        for word in ("Husain", "Hasan", "Kiun", "Kiuṅ", "Ae", "jawaaṅ",
                     "jawaan", "bewafa", "Shab o Roz", "۱", "romanLyrics: |-",
                     "ZWNJ", "noUrdu", "x2", "never English"):
            self.assertIn(word.lower(), ("\n".join(rules.values())).lower())

    def test_source_task_avoids_irrelevant_roman_orthography(self):
        original = rules_for("source")
        roman = rules_for("roman")
        audit = rules_for("audit")
        self.assertIn("RECONSTRUCT", original.upper())
        self.assertIn("source", original.lower())
        self.assertNotIn("Long vowels are", original)
        self.assertIn("Long vowels are", roman)
        self.assertIn("Long vowels are", audit)
        self.assertIn("EACH Roman verse", audit)
        self.assertNotIn("EACH Roman verse", roman)

    def test_direct_prompt_does_not_force_reopening_docs(self):
        candidate = Candidate("src/data/lyrics/fixture.md", "roman", "Urdu", "ur",
                              2, 0, "Roman missing")
        text = prompt_for(candidate)
        self.assertIn("Long vowels are", text)
        self.assertIn("do NOT reread docs/EDITORIAL.md", text)
        self.assertIn("Read ONLY the selected lyric", text)
        self.assertIn("FILE: src/data/lyrics/fixture.md", text)

    def test_priority_is_roman_then_audit_then_source(self):
        self.assertLess(TASK_ORDER["roman"], TASK_ORDER["audit"])
        self.assertLess(TASK_ORDER["audit"], TASK_ORDER["source"])

    def test_linter_accepts_clean_aligned_roman(self):
        text = fixture("۱\nاے حسین تم آؤ", "1\nAe Husain tum aao")
        self.assertEqual(validate_text(text, task="roman"), [])
        self.assertEqual(validate_text(text, task="audit"), [])

    def test_linter_reports_missing_edition(self):
        self.assertIn("missing_roman", {r["code"] for r in
                      validate_text(fixture("اے حسین تم آؤ"), task="roman")})
        self.assertIn("missing_source", {r["code"] for r in
                      validate_text(fixture("Ye koi roman sher hai"), task="source")})

    def test_linter_detects_forbidden_unicode_and_roman_digits(self):
        text = fixture("۱\nاے حسین تم آؤ",
                       "۱\nĀe Husain tum aao")
        codes = {r["code"] for r in validate_text(text, task="audit")}
        self.assertIn("wrong_stanza_numerals", codes)
        self.assertIn("roman_forbidden_characters", codes)

    def test_linter_flags_noncanonical_spelling_not_autocorrect(self):
        text = fixture("۱\nاے حسین تم آؤ", "1\nKyun Hussain aao")
        codes = {r["code"] for r in validate_text(text)}
        self.assertIn("roman_house_spellings", codes)
        self.assertEqual(text, fixture("۱\nاے حسین تم آؤ", "1\nKyun Hussain aao"))

    def test_linter_accepts_nasal_ng_and_urdu_numerals(self):
        text = fixture("۱\nجواں حسین آئے", "1\nJawaaṅ Husain aaye")
        self.assertNotIn("roman_forbidden_characters",
                         {r["code"] for r in validate_text(text)})

    def test_linter_warns_alignment_without_inventing_text(self):
        text = fixture("۱\nاے حسین تم آؤ\nیہ بھی ایک مصرع ہے",
                       "1\nAe Husain tum aao")
        self.assertIn("verse_alignment_review",
                      {r["code"] for r in validate_text(text)})

    def test_source_reconstruction_must_preserve_roman_edition(self):
        no_roman = fixture("۱\nاے حسین تم آؤ")
        codes = {r["code"] for r in validate_text(no_roman, task="source")}
        self.assertIn("lost_roman_after_source", codes)
        still_in_body = fixture("۱\nاے حسین تم آؤ\nYe abhi roman mein hai",
                                "1\nAe Husain tum aao")
        codes = {r["code"] for r in validate_text(still_in_body, task="source")}
        self.assertIn("roman_left_in_source_body", codes)

    def test_linter_blocks_obsolete_roman_language_code(self):
        text = fixture("اے حسین تم آؤ", "Ae Husain tum aao", lang="ur-Latn")
        self.assertIn("roman_as_language",
                      {r["code"] for r in validate_text(text)})

    def test_last_cumulative_usage_event_only(self):
        with tempfile.TemporaryDirectory() as folder:
            file = Path(folder) / "log.jsonl"
            file.write_text(
                "\n".join(json.dumps(x) for x in [
                    {"type": "thread.started", "thread_id": "abc"},
                    {"type": "turn.completed", "usage": {
                        "input_tokens": 900, "cached_input_tokens": 450,
                        "output_tokens": 150}},
                    {"type": "turn.completed", "usage": {
                        "input_tokens": 1500, "cached_input_tokens": 900,
                        "output_tokens": 250, "reasoning_output_tokens": 80}},
                ]), encoding="utf-8")
            use = token_usage(file)
            self.assertEqual(use["input_tokens"], 1500)
            self.assertEqual(use["cached_input_tokens"], 900)
            self.assertEqual(use["output_tokens"], 250)

    def test_usage_report_counts_retries_separately(self):
        state = {"usage_events": {
            "first": {"task": "roman", "path": "a.md", "usage": {
                "input_tokens": 100, "cached_input_tokens": 70, "output_tokens": 10}},
            "retry": {"task": "roman", "path": "a.md", "usage": {
                "input_tokens": 300, "cached_input_tokens": 250, "output_tokens": 20}},
            "source": {"task": "source", "path": "b.md", "usage": {
                "input_tokens": 200, "cached_input_tokens": 0, "output_tokens": 80}},
        }}
        usage = usage_report(state)
        self.assertEqual(usage["model_invocations_with_usage"], 3)
        self.assertEqual(usage["input_tokens"], 600)
        self.assertEqual(usage["cached_input_tokens"], 320)
        self.assertEqual(usage["uncached_input_tokens"], 280)
        self.assertEqual(usage["output_tokens"], 110)
        self.assertEqual(usage["by_task"]["roman"]["input_tokens"], 400)
        self.assertEqual(usage["most_expensive_files"][0]["path"], "a.md")


if __name__ == "__main__":
    unittest.main()
