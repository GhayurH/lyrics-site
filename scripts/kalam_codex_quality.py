"""Bounded, deterministic checks and prompt selection for the Round 2 Codex worker.

No edits, API calls or judgment of original-language correctness. Reports
machine-checkable problems for human correction; editorial authority is in
docs/EDITORIAL.md and the task rule bundle is maintained alongside it.
"""
from __future__ import annotations

from collections import Counter
import json
from pathlib import Path
import re
import unicodedata

HERE = Path(__file__).resolve().parent
BUNDLE = HERE / "kalam-transliteration-rules.md"
METRICS = ("input_tokens", "cached_input_tokens", "output_tokens", "reasoning_output_tokens")
TASK_ORDER = {"roman": 0, "audit": 1, "source": 2, "blocked": 3, "skip": 4}
SOURCE_NUMBERS = "۰۱۲۳۴۵۶۷۸۹"
ROMAN_NUMBERS = "0123456789"
ARABIC_NUMBERS = "٠١٢٣٤٥٦٧٨٩"
NUMERAL = re.compile(r"^[0-9۰-۹٠-٩]+$")
BAD_ROMAN = re.compile(r"\b(?:kyun|hussain|hussein|be-wafa|baar-baar)\b", re.I)
REPETITION = re.compile(r"(?i)(?<!\w)\(?x2\)?(?!\w)")
STANZA_LABEL = re.compile(r"(?i)^(?:saani|antra)$")


def rule_sections(path: Path = BUNDLE) -> dict[str, str]:
    """Parse fixed rule headings. Fail closed if a task loses its instructions."""
    sections: dict[str, list[str]] = {}
    section = None
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("## "):
            section = line[3:].strip()
            if section in sections:
                raise ValueError("Duplicate instruction section: " + section)
            sections[section] = []
        elif section:
            sections[section].append(line)
    required = {"Shared", "Roman", "Source", "Audit"}
    if not required.issubset(sections):
        raise ValueError("Missing house-rule sections: " + ", ".join(sorted(required - sections.keys())))
    return {key: "\n".join(lines).strip() for key, lines in sections.items()}


def rules_for(task: str, path: Path = BUNDLE) -> str:
    sections = rule_sections(path)
    if task not in ("roman", "source", "audit"):
        raise ValueError("Unknown editorial task: " + str(task))
    chosen = ["Shared", "Source"] if task == "source" else ["Shared", "Roman"]
    if task == "audit":
        chosen.append("Audit")
    return "\n\n".join("## " + k + "\n" + sections[k] for k in chosen)


def _issue(code: str, message: str, severity: str = "warning") -> dict:
    return {"code": code, "severity": severity, "message": message}


def _stanza_issues(lines: list[str], *, roman: bool) -> list[dict]:
    issues = []
    valid = ROMAN_NUMBERS if roman else SOURCE_NUMBERS
    label = "Roman" if roman else "Source"
    for i, line in enumerate(lines):
        stripped = line.strip()
        if STANZA_LABEL.fullmatch(stripped):
            issues.append(_issue("structural_label", label + " contains Saani/Antra label"))
        if not NUMERAL.fullmatch(stripped):
            continue
        if any(ch not in valid for ch in stripped):
            issues.append(_issue("wrong_stanza_numerals",
                                 label + " stanza number must use " +
                                 ("Western 1/2/3" if roman else "Urdu ۱/۲/۳")))
        if i + 1 < len(lines) and not lines[i + 1].strip():
            issues.append(_issue("blank_after_stanza_number",
                                 label + " has a blank line immediately after a stanza number"))
    return issues


def original_body(content: str) -> str | None:
    """Exact original-language Markdown body; unchanged on Roman/audit tasks."""
    from kalam_codex import FRONT
    matched = FRONT.match(content)
    return content[matched.end():] if matched else None


def validate_text(content: str, *, task: str = "audit") -> list[dict]:
    """Check only defensible structural/orthographic signals, never semantics.

    A warning is not proof of a mistake (dialects, lines and song markers vary).
    No file is auto-approved, auto-corrected or retried from these checks.
    """
    from kalam_codex import FRONT, ARABIC, roman_section, verses, scalar
    match = FRONT.match(content)
    if not match:
        return [_issue("frontmatter", "Missing or malformed YAML frontmatter", "error")]
    head, body = match.group(1), content[match.end():]
    roman = roman_section(head)
    lang = scalar(head, "lang")
    source_lines = verses(body, "arabic")
    roman_lines = verses(roman, "latin")
    problems = []
    if lang == "ur-Latn" or scalar(head, "language").lower() == "roman urdu":
        problems.append(_issue("roman_as_language", "Original-language metadata must not identify Roman Urdu", "error"))
    if source_lines and lang == "ur" and "\u200c" in body:
        for occurrence in re.finditer("\u200c", body):
            around = body[max(0, occurrence.start()-2):occurrence.end()+2]
            if "بی\u200cبی" not in around:
                problems.append(_issue("source_zwnj", "Unexpected source ZWNJ; only بی‌بی uses it"))
                break
    if task == "roman" and not roman_lines:
        problems.append(_issue("missing_roman", "Roman text is still absent", "error"))
    if task == "source" and not source_lines:
        problems.append(_issue("missing_source", "Source-script edition is still absent", "error"))
    if task == "source" and source_lines and not roman_lines:
        problems.append(_issue("lost_roman_after_source",
                               "Source was restored but original Roman is missing from romanLyrics", "error"))
    if task == "source" and source_lines and verses(body, "latin"):
        problems.append(_issue("roman_left_in_source_body",
                               "Roman-looking verses remain in source body after reconstruction"))
    if source_lines and not roman_lines and task in ("audit", "roman"):
        if not any(p["code"] == "missing_roman" for p in problems):
            problems.append(_issue("missing_roman", "Missing the expected Roman edition", "error"))
    if source_lines:
        problems.extend(_stanza_issues(body.splitlines(), roman=False))
    if roman:
        problems.extend(_stanza_issues(roman.splitlines(), roman=True))
        roman_scalar = re.search(r"(?m)^romanLyrics:\s*(.*?)\s*$", head)
        if roman_scalar and roman_scalar.group(1).strip() != "|-":
            problems.append(_issue("roman_literal_style", "Use YAML romanLyrics: |- literal block"))
        if ARABIC.search(roman):
            problems.append(_issue("arabic_in_roman", "Arabic-script text appears inside romanLyrics", "error"))
        if "\u200c" in roman:
            problems.append(_issue("roman_zwnj", "Roman transcription must not contain ZWNJ"))
        nonlatin = sorted({ch for ch in roman
                           if (("LATIN" in unicodedata.name(ch, "") and
                                (not ch.isascii()) and ch not in "ṅṄ") or
                               unicodedata.category(ch) in ("Mn", "Mc") or
                               ch in "ʿʾ‘’")})
        if nonlatin:
            problems.append(_issue("roman_forbidden_characters",
                                   "Unexpected Latin/combining characters in Roman: " +
                                   "".join(nonlatin), "error"))
        bad = sorted({m.group(0) for m in BAD_ROMAN.finditer(roman)}, key=str.lower)
        if bad:
            problems.append(_issue("roman_house_spellings", "Review noncanonical spellings: " +
                                   ", ".join(bad)))
        if REPETITION.search(roman):
            problems.append(_issue("roman_reciter_x2", "Remove reciter x2 marker from Roman"))
        if source_lines and roman_lines and len(source_lines) != len(roman_lines):
            if not re.search(r"(?m)^stanzaLineExceptions:", head):
                problems.append(_issue("verse_alignment_review",
                                       f"Review source/Roman physical verse counts: " +
                                       f"{len(source_lines)} vs {len(roman_lines)}"))
    if REPETITION.search(body):
        problems.append(_issue("source_reciter_x2", "Remove reciter x2 marker from source"))
    if source_lines and re.search(r"(?m)^tags:\s*\[[^\n]*(?:noUrdu|noPanjabi|noSaraiki|noBalti|noArabic|noPersian)", head):
        problems.append(_issue("stale_missing_source_tag", "Source exists but missing-source tag remains"))
    # Keep one finding per rule: warnings are not text-substitution instructions.
    return list({problem["code"]: problem for problem in problems}.values())


def token_usage(transcript: Path) -> dict[str, int] | None:
    """Read the LAST turn.completed usage snapshot, not a sum of cumulative events."""
    usage = None
    if not transcript.is_file():
        return None
    with transcript.open("r", encoding="utf-8", errors="replace") as stream:
        for line in stream:
            if '"turn.completed"' not in line and '"type": "turn.completed"' not in line:
                continue
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue
            if event.get("type") == "turn.completed" and isinstance(event.get("usage"), dict):
                candidate = event["usage"]
                if isinstance(candidate.get("input_tokens"), (int, float)) and not isinstance(candidate["input_tokens"], bool):
                    usage = candidate
    if usage is None:
        return None
    counts = {name: max(0, int(usage.get(name, 0) or 0)) for name in METRICS}
    counts["cached_input_tokens"] = min(counts["input_tokens"], counts["cached_input_tokens"])
    return counts


def add_tokens(a: dict | None, b: dict | None) -> dict[str, int]:
    return {name: int((a or {}).get(name, 0)) + int((b or {}).get(name, 0)) for name in METRICS}


def usage_report(state: dict) -> dict:
    """Include successful, failed and quota-retried attempts, without assuming prices."""
    total = {key: 0 for key in METRICS}
    by_task: dict[str, dict] = {}
    by_path: dict[str, dict] = {}
    attempts = 0
    for entry in state.get("usage_events", {}).values():
        if not isinstance(entry, dict) or not isinstance(entry.get("usage"), dict):
            continue
        attempts += 1
        use = entry["usage"]
        total = add_tokens(total, use)
        task = entry.get("task", "unknown")
        by_task[task] = add_tokens(by_task.get(task), use)
        path = entry.get("path", "unknown")
        by_path[path] = add_tokens(by_path.get(path), use)
    cache = total["cached_input_tokens"]
    return {
        "model_invocations_with_usage": attempts,
        "input_tokens": total["input_tokens"],
        "cached_input_tokens": cache,
        "uncached_input_tokens": max(0, total["input_tokens"] - cache),
        "output_tokens": total["output_tokens"],
        "reasoning_output_tokens": total["reasoning_output_tokens"],
        "cache_share_percent": round(cache / total["input_tokens"] * 100, 1) if total["input_tokens"] else 0,
        "by_task": by_task,
        "most_expensive_files": [{"path": path,
                                  "input_tokens": use["input_tokens"],
                                  "output_tokens": use["output_tokens"]}
                                 for path, use in sorted(
                                     by_path.items(),
                                     key=lambda pair: pair[1]["input_tokens"] + pair[1]["output_tokens"],
                                     reverse=True)[:5]],
    }
