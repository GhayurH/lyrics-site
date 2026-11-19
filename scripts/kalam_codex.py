#!/usr/bin/env python3
"""Opt-in Codex reviewer for new Round 2 kalams; no tracker or auto-commits."""
from __future__ import annotations

import argparse
from collections import Counter
from dataclasses import asdict, dataclass
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
LYRICS = "src/data/lyrics/"
ROUND2 = "round2-kalams-2026-11-14"
RULES = ROOT / "scripts" / "kalam-codex-instructions.md"
LANG_CODES = {"ur", "pa-Arab", "skr-Arab", "bft-Arab", "ar", "fa"}
LANG_NAMES = {"urdu", "panjabi", "punjabi", "saraiki", "balti", "arabic", "persian", "roman urdu"}
ARABIC = re.compile(r"[\u0621-\u063a\u0641-\u064a\u066e-\u06d3\u06fa-\u06ff\u0750-\u077f]")
LATIN = re.compile(r"[A-Za-zṅṄ]{2,}")
NUMBER = re.compile(r"[0-9۰-۹٠-٩]+")
FRONT = re.compile(r"\A---\r?\n(.*?)\r?\n---(?:\r?\n|$)", re.S)


class ReviewError(RuntimeError):
    pass


@dataclass(frozen=True)
class Candidate:
    path: str
    task: str
    language: str
    lang: str
    source_lines: int
    roman_lines: int
    note: str


def git(*args: str) -> str:
    result = subprocess.run(["git", "-C", str(ROOT), *args],
                            capture_output=True, text=True)
    if result.returncode:
        raise ReviewError(result.stderr.strip() or result.stdout.strip())
    return result.stdout


def scalar(head: str, key: str) -> str:
    match = re.search(r"(?m)^" + re.escape(key) + r":\s*(.*?)\s*$", head)
    return match.group(1).strip().strip("'\"") if match else ""


def roman_section(head: str) -> str:
    lines = head.splitlines()
    for n, line in enumerate(lines):
        match = re.match(r"^romanLyrics:\s*(.*)$", line)
        if not match:
            continue
        value = match.group(1).strip()
        result = [] if re.fullmatch(r"[|>][+-]?", value) else [value]
        for following in lines[n + 1:]:
            if following.startswith(("  ", "\t")) or not following.strip():
                result.append(following.strip())
            else:
                break
        return "\n".join(result).strip("'\" \n")
    return ""


def verses(text: str, script: str) -> list[str]:
    found = []
    for line in text.splitlines():
        line = line.strip().strip("'\"").strip()
        if (not line or NUMBER.fullmatch(line) or line in ("---***---", "Saani", "Antra")
                or line.startswith(("#", "<!--", "---"))):
            continue
        if script == "arabic":
            if len(ARABIC.findall(line)) >= 3:
                found.append(line)
        elif len(LATIN.findall(line)) >= 2:
            found.append(line)
    return found


def inspect_text(path: str, content: str) -> Candidate:
    match = FRONT.match(content)
    if not match:
        return Candidate(path, "blocked", "", "", 0, 0, "Missing YAML frontmatter")
    head, body = match.group(1), content[match.end():]
    language, lang = scalar(head, "language"), scalar(head, "lang")
    source = verses(body, "arabic")
    roman = verses(roman_section(head), "latin")
    latin_body = verses(body, "latin")
    absent_tag = bool(re.search(
        r"(?m)^tags:\s*\[[^\n]*(?:noUrdu|noPanjabi|noSaraiki|noBalti|noArabic|noPersian)",
        head))
    if lang == "en" or language.lower() == "english":
        return Candidate(path, "skip", language, lang, len(source), len(roman),
                         "English original: no transliteration needed")
    if source:
        if lang and lang not in LANG_CODES:
            task, note = "blocked", "Source and language code conflict"
        elif roman:
            task, note = "audit", "Check existing transliteration against source"
            if len(roman) != len(source):
                note += f" (physical verse lines: Roman {len(roman)}, source {len(source)})"
        else:
            task, note = "roman", "Original-language body exists; Roman missing"
        if absent_tag:
            note += "; stale missing-edition tag may need correction"
    elif latin_body or roman:
        if (lang in LANG_CODES or absent_tag or
                (language.lower() in LANG_NAMES and lang not in {"pa", "skr", "bft"})):
            task, note = "source", "Roman material exists; original Arabic-script body missing"
        else:
            task, note = "blocked", "Latin original or uncertain language; needs human classification"
    else:
        task, note = "blocked", "No readable source or Roman verses"
    return Candidate(path, task, language, lang, len(source), len(roman), note)

def base_ref(requested: str | None) -> str:
    if requested:
        git("rev-parse", "--verify", requested)
        return requested
    for ref in ("origin/main", "main"):
        check = subprocess.run(["git", "-C", str(ROOT), "rev-parse", "--verify", ref],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if check.returncode == 0:
            return ref
    raise ReviewError("Cannot find main. Fetch origin/main or use --base")


def added_files(base: str) -> list[str]:
    fork = git("merge-base", "HEAD", base).strip()
    result = subprocess.run(
        ["git", "-C", str(ROOT), "diff", "--no-renames", "--diff-filter=A",
         "--name-only", "-z", fork, "HEAD", "--", LYRICS],
        capture_output=True, check=True)
    return sorted({
        rel for rel in result.stdout.decode("utf-8").split("\0")
        if rel.startswith(LYRICS) and rel.endswith(".md")
        and "/" not in rel[len(LYRICS):]
        and (ROOT / rel).is_file() and not (ROOT / rel).is_symlink()
    })


def inventory(base: str) -> list[Candidate]:
    return [inspect_text(rel, (ROOT / rel).read_text(encoding="utf-8"))
            for rel in added_files(base)]


def target_for(args: argparse.Namespace) -> Candidate:
    path = Path(args.path)
    if path.is_absolute():
        try:
            rel = path.resolve().relative_to(ROOT).as_posix()
        except ValueError as exc:
            raise ReviewError("Selected file must belong to the repository") from exc
    else:
        rel = path.as_posix()
    if rel not in added_files(base_ref(args.base)):
        raise ReviewError("Not a retained added Round 2 lyric: " + rel)
    item = inspect_text(rel, (ROOT / rel).read_text(encoding="utf-8"))
    if item.task not in ("source", "roman", "audit"):
        raise ReviewError("Blocked or excluded: " + item.note)
    if args.task != "auto" and args.task != item.task:
        raise ReviewError("Requested task does not match detected " + item.task)
    return item


def prompt_for(item: Candidate) -> str:
    rules = RULES.read_text(encoding="utf-8")
    task = {
        "source": (
            "Restore a VERIFIED original-language Arabic-script body for this Roman-only "
            "poem. Roman is a pronunciation clue, not proof of exact original wording. "
            "Use authoritative evidence, preserve Roman in romanLyrics, and correct "
            "language metadata only when verified. If uncertain, do not invent text."),
        "roman": (
            "Create romanLyrics: |- transliterating the original-language body with "
            "matching opening, verse order, stanza boundaries and Western digits. "
            "Do not translate or edit the verified original source."),
        "audit": (
            "Review every existing Roman verse against the original. Correct house "
            "style, pronunciation and structure only with evidence. Do not change "
            "source-language text to force line-count agreement."),
    }[item.task]
    return (rules.strip() + "\n\nFILE: " + item.path +
            "\nTASK: " + item.task + "\nLANGUAGE: " + item.language +
            " (" + item.lang + ")\nOBSERVATION: " + item.note + "\n\n" +
            task + "\n\nRead AGENTS.md, docs/EDITORIAL.md, and the complete file. "
            "Edit ONLY the selected Markdown. Do not modify trackers, other poems, "
            "Basta, identity locks, source imports, docs or Git history. "
            "Do not commit, push, or run broad normalizers. "
            "Report uncertainties and what a human still needs to verify.")


def execute(item: Candidate, args: argparse.Namespace) -> int:
    if not args.confirm_run:
        raise ReviewError("No model call without explicit --confirm-run")
    branch = git("branch", "--show-current").strip()
    if branch != args.expected_branch:
        raise ReviewError(f"Expected {args.expected_branch}, currently {branch}")
    if git("status", "--porcelain", "--untracked-files=all").strip():
        raise ReviewError("Working tree must be completely clean")
    codex = shutil.which("codex")
    if not codex:
        raise ReviewError("Codex CLI missing: install @openai/codex and log in")
    cmd = [codex, "exec", "--sandbox", "workspace-write", "--ephemeral",
           "-C", str(ROOT)]
    if args.model:
        cmd.extend(["--model", args.model])
    cmd.append("-")
    print("Selected:", item.path, "task:", item.task, flush=True)
    completed = subprocess.run(cmd, cwd=ROOT, input=prompt_for(item), text=True)
    changed = set(git("diff", "--name-only").splitlines())
    changed.update(git("ls-files", "--others", "--exclude-standard").splitlines())
    extras = sorted(changed - {item.path})
    if extras:
        print("Unapproved paths modified; inspect manually:", *extras,
              sep="\n  ", file=sys.stderr)
        return 3
    if subprocess.run(["git", "-C", str(ROOT), "diff", "--check"]).returncode:
        print("Whitespace check failed; inspect manually", file=sys.stderr)
        return 3
    if completed.returncode:
        return completed.returncode
    print("Finished. No commit, push, tracker or automatic approval was made.")
    print("Manually verify the diff and original evidence before accepting it.")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    plan = sub.add_parser("plan", help="Read-only added-file inventory (default)")
    plan.add_argument("--base")
    plan.add_argument("--task", choices=["all", "source", "roman", "audit", "blocked"], default="all")
    plan.add_argument("--json", action="store_true")
    plan.add_argument("--limit", type=int, default=30)
    for name in ("prompt", "run"):
        command = sub.add_parser(name, help=("Preview prompt" if name == "prompt" else "Review ONE file"))
        command.add_argument("--base")
        command.add_argument("--path", required=True)
        command.add_argument("--task", choices=["auto", "source", "roman", "audit"], default="auto")
        if name == "run":
            command.add_argument("--confirm-run", action="store_true")
            command.add_argument("--expected-branch", default=ROUND2)
            command.add_argument("--model")
    args = parser.parse_args((sys.argv[1:] if argv is None else argv) or ["plan"])
    try:
        if args.command == "plan":
            rows = inventory(base_ref(args.base))
            counts = Counter(item.task for item in rows)
            chosen = [item for item in rows if args.task in ("all", item.task)]
            if args.json:
                print(json.dumps({"total": len(rows), "counts": dict(counts),
                                  "items": [asdict(item) for item in chosen]},
                                 ensure_ascii=False, indent=2))
            else:
                if args.limit < 0:
                    raise ReviewError("--limit must not be negative")
                print(f"Added: {len(rows)} | missing source: {counts['source']} | "
                      f"missing Roman: {counts['roman']} | Roman audit: {counts['audit']} | "
                      f"blocked: {counts['blocked']} | English originals: {counts['skip']}")
                for item in chosen[:args.limit]:
                    print(f"{item.task:7} {item.path} [{item.lang}] {item.note}")
                if len(chosen) > args.limit:
                    print(f"... {len(chosen)-args.limit} more; --json shows all")
            return 0
        item = target_for(args)
        if args.command == "prompt":
            print(prompt_for(item))
            return 0
        return execute(item, args)
    except (ReviewError, OSError, subprocess.CalledProcessError) as exc:
        print("kalam-codex:", exc, file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
