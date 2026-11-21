"""Pure scanner fixtures for the Round 2 Codex reviewer."""
import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from kalam_codex import inspect_text, roman_section, verses


def poem(body, roman=None, lang="ur", language="Urdu", tags="[]"):
    roman_field = ""
    if roman is not None:
        roman_field = "romanLyrics: |-\n" + "\n".join(
            "  " + line if line else "" for line in roman.splitlines()) + "\n"
    return (f'---\ntitle: "Fixture"\nlanguage: "{language}"\nlang: "{lang}"\n'
            f'direction: "rtl"\ntags: {tags}\n{roman_field}---\n{body}')


class ReviewScannerTests(unittest.TestCase):
    def test_missing_roman(self):
        item = inspect_text("src/data/lyrics/a.md", poem("یہ ایک اصل اردو شعر ہے\nیہ دوسرا شعر ہے"))
        self.assertEqual(item.task, "roman")

    def test_existing_both_requires_audit(self):
        item = inspect_text("src/data/lyrics/a.md", poem(
            "یہ ایک اصل اردو شعر ہے", "Ye ek asal Urdu sher hai"))
        self.assertEqual(item.task, "audit")

    def test_missing_original(self):
        item = inspect_text("src/data/lyrics/a.md", poem(
            "Ye ek asal Urdu sher hai\nDusra misra yahan hai", tags='["noUrdu"]'))
        self.assertEqual(item.task, "source")

    def test_existing_quoted_multiline_roman(self):
        head = ("lang: ur\nlanguage: Urdu\nromanLyrics: 'Roman first verse here\n"
                "\n  Roman second verse here'\ntags: []")
        self.assertIn("Roman second verse", roman_section(head))
        item = inspect_text("src/data/lyrics/a.md",
                            "---\n" + head + "\n---\nیہ ایک اصل اردو شعر ہے")
        self.assertEqual(item.task, "audit")

    def test_english_original_excluded(self):
        item = inspect_text("src/data/lyrics/a.md",
                            poem("A poem in English here", lang="en", language="English"))
        self.assertEqual(item.task, "skip")

    def test_latin_panjabi_original_blocked(self):
        item = inspect_text("src/data/lyrics/a.md",
                            poem("A Latin Panjabi original", lang="pa", language="Panjabi"))
        self.assertEqual(item.task, "blocked")

    def test_shahmukhi_source_needs_roman(self):
        item = inspect_text("src/data/lyrics/a.md", poem(
            "تینوں ویکھ کے ماہی کچھ کہنا سی", lang="pa-Arab", language="Panjabi"))
        self.assertEqual(item.task, "roman")

    def test_urdu_numerals_do_not_fake_source(self):
        item = inspect_text("src/data/lyrics/a.md", poem(
            "۱\nA roman stanza without Urdu source\n۲\nAnother roman stanza here",
            tags='["noUrdu"]'))
        self.assertEqual(item.source_lines, 0)
        self.assertEqual(item.task, "source")

    def test_malformed_frontmatter_blocked(self):
        self.assertEqual(inspect_text("src/data/lyrics/a.md", "Only prose").task, "blocked")

    def test_verse_markers_ignored(self):
        self.assertEqual(len(verses("۱\nاے حسین تم آؤ\n---***---\n۲", "arabic")), 1)


if __name__ == "__main__":
    unittest.main()
