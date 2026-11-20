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
    items = [inspect_text(rel, (ROOT / rel).read_text(encoding="utf-8"))
             for rel in added_files(base)]
    return sorted(items, key=lambda item: (item.path.casefold(), item.path))


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
    """Send task-specific rules directly; avoid rereading entire editorial docs."""
    from kalam_codex_quality import rules_for
    task = {
        "source": (
            "Reconstruct the original-language Urdu/Shahmukhi/other appropriate script "
            "from the existing Roman transliteration. Roman is sufficient input; "
            "do not require an external source or stop for lack of verification. "
            "Keep the existing Roman reading in romanLyrics and produce a faithful "
            "verse-by-verse source-script edition, choosing conventional spellings "
            "for ambiguous Roman sounds without adding words or changing meaning."),
        "roman": (
            "Create the complete romanLyrics: |- pronunciation transcription for "
            "the verified original body, respecting every verse and stanza. "
            "Do NOT translate or modify the authoritative original."),
        "audit": (
            "Audit existing Roman against original verse-by-verse. "
            "Correct house spelling and alignment with evidence, not guesses. "
            "Preserve the authoritative source."),
    }[item.task]
    # Static rule prefix supports prompt caching; variable file data is last.
    return (rules_for(item.task) + "\n\n## Single-file execution\n" +
            "The root AGENTS.md is automatically provided by Codex. This prompt "
            "already includes the applicable full house transliteration rules: "
            "do NOT reread docs/EDITORIAL.md or other docs unless a material "
            "ambiguity genuinely requires more source context. "
            "Read ONLY the selected lyric. Roman-only source reconstruction needs "
            "no external searches or verification. Do not inventory the repo, run "
            "npm tests, build, formatting scripts or repeated broad searches. "
            "Modify ONLY the selected lyric, never commit/push or edit trackers. "
            "After the single edit provide a short factual completion summary.\n\n" +
            "FILE: " + item.path + "\nTASK: " + item.task +
            "\nSOURCE LANGUAGE: " + item.language + " (" + item.lang + ")" +
            "\nSCANNER OBSERVATION: " + item.note +
            "\n\nACTION: " + task)



def execute(item: Candidate, args: argparse.Namespace) -> int:
    """Review one file, preserving all earlier uncommitted local edits."""
    from kalam_codex_worker import single_run
    return single_run(item, args, prompt_for)


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
    worker_parser = sub.add_parser("supervise", help="Run resumable, quota-aware single-file queue")
    worker_parser.add_argument("--confirm-run", action="store_true")
    worker_parser.add_argument("--base")
    worker_parser.add_argument("--model")
    status_parser = sub.add_parser("status", help="Read-only local progress and token totals")
    status_parser.add_argument("--json", action="store_true")
    validation = sub.add_parser("validate", help="Local deterministic checks for one added kalam")
    validation.add_argument("--path", required=True)
    validation.add_argument("--task", choices=("auto", "source", "roman", "audit"), default="auto")
    retry_parser = sub.add_parser("requeue", help="Retry a previously processed lyric")
    retry_parser.add_argument("--path", required=True)
    service_parser = sub.add_parser("service", help="Manage a local systemd user unit")
    service_parser.add_argument("action", choices=("install", "uninstall"))
    service_parser.add_argument("--start", action="store_true",
                                help="Enable/start on installation; default installs only")
    args = parser.parse_args((sys.argv[1:] if argv is None else argv) or ["plan"])
    try:
        if args.command == "status":
            from kalam_codex_worker import show_status
            show_status(json_output=args.json)
            return 0
        if args.command == "validate":
            from kalam_codex_quality import validate_text
            rel = Path(args.path)
            if rel.is_absolute():
                rel = rel.resolve().relative_to(ROOT)
            name = rel.as_posix()
            if name not in added_files(base_ref(None)):
                raise ReviewError("Not an added Round 2 lyric: " + name)
            content = (ROOT / name).read_text(encoding="utf-8")
            scanned = inspect_text(name, content)
            task = scanned.task if args.task == "auto" else args.task
            findings = validate_text(content, task=task)
            print(json.dumps({"path": name, "task": task,
                              "findings": findings}, ensure_ascii=False, indent=2))
            return 1 if any(row["severity"] == "error" for row in findings) else 0
        if args.command == "requeue":
            from kalam_codex_worker import requeue
            requeue(args.path)
            return 0
        if args.command == "service":
            from kalam_codex_worker import service_action
            service_action(args.action, start=args.start)
            return 0
        if args.command == "supervise":
            from kalam_codex_worker import supervise
            return supervise(args)
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
        if args.command == "supervise":
            from kalam_codex_worker import fatal_stop
            fatal_stop(str(exc))
            return 78
        return 2
    except Exception as exc:
        from kalam_codex_worker import WorkerError
        from kalam_codex_isolation import IsolationError
        if not isinstance(exc, (WorkerError, IsolationError)):
            raise
        print("kalam-codex:", exc, file=sys.stderr)
        if args.command == "supervise":
            from kalam_codex_worker import fatal_stop
            fatal_stop(str(exc))
            return 78
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
