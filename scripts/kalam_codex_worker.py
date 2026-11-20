"""Resumable local-only supervisor for the bounded Kalam Codex CLI.

Runs one poem at a time. All poems remain uncommitted; only a private JSON
resume ledger is written under ~/.local/state. Never fetches, commits or pushes.
"""
from __future__ import annotations

from collections import Counter
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import sys
import time

SERVICE = "kalam-codex-round2.service"
DELAY_SECONDS = (90, 180, 300, 900, 1800, 3600)
QUOTA_RE = re.compile(
    r"usage limit|quota exceeded|rate limit|too many requests|"
    r"out of credits|credits exhausted|limit reached|"
    r"you.ve hit your limit|try again at", re.I)
TRANSIENT_RE = re.compile(
    r"stream disconnected|connection (?:reset|closed|lost)|"
    r"internal server error|service unavailable|gateway timeout|"
    r"request timed out|transport error|incomplete response returned|"
    r"max_output_tokens", re.I)


class WorkerError(RuntimeError):
    pass


def utcnow() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def state_home() -> Path:
    override = os.environ.get("KALAM_CODEX_STATE_DIR")
    if override:
        return Path(override).expanduser().resolve()
    return Path(os.environ.get("XDG_STATE_HOME", str(Path.home() / ".local/state"))) / "kalam-codex-round2"


def secure_dir(path: Path) -> None:
    path.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.chmod(path, 0o700)


def state_file() -> Path:
    return state_home() / "state.json"


def load_state() -> dict:
    path = state_file()
    if not path.exists():
        return {"version": 1, "results": {}, "status": "not_started"}
    value = json.loads(path.read_text(encoding="utf-8"))
    if value.get("version") != 1 or not isinstance(value.get("results"), dict):
        raise WorkerError("Unsupported or corrupt local state: " + str(path))
    return value


def save_state(state: dict) -> None:
    directory = state_home()
    secure_dir(directory)
    state["updated_at"] = utcnow().isoformat(timespec="seconds")
    raw = json.dumps(state, ensure_ascii=False, indent=2) + "\n"
    target = state_file()
    tmp = directory / "state.json.tmp"
    descriptor = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
        stream.write(raw)
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(tmp, target)


def exclusive_lock():
    secure_dir(state_home())
    lockfile = state_home() / "worker.lock"
    handle = open(lockfile, "a+", encoding="utf-8")
    os.chmod(lockfile, 0o600)
    try:
        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError as exc:
        handle.close()
        raise WorkerError("Another Kalam Codex worker is running") from exc
    return handle


def git(root: Path, *args: str) -> str:
    run = subprocess.run(["git", "-C", str(root), *args],
                         capture_output=True, text=True)
    if run.returncode:
        raise WorkerError(run.stderr.strip() or run.stdout.strip())
    return run.stdout


def changed_snapshot(root: Path) -> dict[str, tuple | None]:
    """Detect changes even to files that were already dirty before Codex.

    Staged, unstaged and untracked paths are considered. Metadata fingerprints
    for already dirty files avoid hashing thousands of poems on every turn.
    """
    output = subprocess.run(
        ["git", "-C", str(root), "diff", "--name-only", "-z", "HEAD"],
        capture_output=True, check=True).stdout
    untracked = subprocess.run(
        ["git", "-C", str(root), "ls-files", "--others", "--exclude-standard", "-z"],
        capture_output=True, check=True).stdout
    paths = set(filter(None, (output + untracked).decode("utf-8").split("\0")))
    result = {}
    for rel in paths:
        p = root / rel
        try:
            s = p.lstat()
            result[rel] = (s.st_size, s.st_mtime_ns, s.st_mode)
        except FileNotFoundError:
            result[rel] = None
    return result


def unsafe_changes(before: dict, after: dict, allowed: str) -> list[str]:
    return sorted(path for path in before.keys() | after.keys()
                  if path != allowed and before.get(path) != after.get(path))


def sha_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def quota_retry_at(messages: list[str], now: dt.datetime | None = None):
    """Parse the old supervisor's machine-local 'try again at H:MM PM' reset."""
    matching = [message for message in messages if QUOTA_RE.search(message)]
    if not matching:
        return None
    now = now or utcnow()
    joined = "\n".join(matching)
    mark = re.search(r"try\s+again\s+at\s+(\d{1,2}):(\d{2})\s*([ap])\.?m\.?", joined, re.I)
    if mark:
        hour = int(mark.group(1)) % 12 + (12 if mark.group(3).lower() == "p" else 0)
        minute = int(mark.group(2))
        if minute < 60:
            local = now.astimezone().replace(tzinfo=None)
            candidate = local.replace(hour=hour, minute=minute, second=0, microsecond=0)
            if candidate <= local:
                if local - candidate <= dt.timedelta(minutes=15):
                    candidate = local + dt.timedelta(minutes=5)
                else:
                    candidate += dt.timedelta(days=1)
            retry = dt.datetime.fromtimestamp(candidate.timestamp(), tz=dt.timezone.utc)
            return retry + dt.timedelta(seconds=60)
    return now + dt.timedelta(minutes=30)


def transcript_errors(path: Path) -> list[str]:
    if not path.exists():
        return []
    with path.open("rb") as handle:
        handle.seek(0, os.SEEK_END)
        start = max(0, handle.tell() - 256 * 1024)
        handle.seek(start)
        lines = handle.read().decode("utf-8", errors="replace").splitlines()
    if start:
        lines = lines[1:]
    errors = []
    for line in lines:
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            if QUOTA_RE.search(line) or TRANSIENT_RE.search(line):
                errors.append(line[-1200:])
            continue
        if not isinstance(event, dict):
            continue
        kind = event.get("type")
        if kind == "turn.failed":
            problem = event.get("error")
            message = problem.get("message", "") if isinstance(problem, dict) else problem
        elif kind == "error":
            message = event.get("message", "")
        else:
            continue
        if isinstance(message, str) and message:
            errors.append(message)
    return errors[-10:]


def wait_retry(state: dict):
    stamp = state.get("retry_at")
    if not stamp:
        return
    retry = dt.datetime.fromisoformat(stamp)
    if retry.tzinfo is None:
        raise WorkerError("Invalid quota retry_at without timezone")
    remaining = int(max(0, (retry - utcnow()).total_seconds()))
    if remaining:
        print("Kalam Codex paused until", retry.astimezone().isoformat(),
              f"({state.get('retry_kind', 'quota')}); remaining {remaining}s", flush=True)
    while True:
        remaining = (retry - utcnow()).total_seconds()
        if remaining <= 0:
            break
        time.sleep(min(60, remaining))
    for key in ("retry_at", "retry_kind", "error"):
        state.pop(key, None)
    state["status"] = "running"
    save_state(state)


def next_log_paths() -> tuple[Path, Path]:
    logs = state_home() / "logs"
    secure_dir(logs)
    stamp = utcnow().strftime("%Y%m%dT%H%M%SZ")
    identifier = f"{stamp}-{os.getpid()}-{time.time_ns() % 1000000}"
    return logs / (identifier + ".jsonl"), logs / (identifier + ".md")


def codex_command(model: str | None = None) -> list[str]:
    codex = os.environ.get("KALAM_CODEX_BIN") or shutil.which("codex")
    if not codex:
        raise WorkerError("Cannot find codex; install/authenticate the Codex CLI")
    return [codex, "exec", "--sandbox", "workspace-write", "--ephemeral",
            "--json", "-C"]


def invoke_codex(root: Path, item, prompt: str, model: str | None = None) -> tuple[int, Path, Path]:
    transcript, summary = next_log_paths()
    args = codex_command(model) + [str(root), "--output-last-message", str(summary)]
    if model:
        args.extend(["--model", model])
    args.append("-")
    descriptor = os.open(transcript, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
        print("Codex:", item.path, item.task, "transcript:", transcript, flush=True)
        stream.write("# Kalam Codex JSONL and stderr\n")
        stream.flush()
        proc = subprocess.run(args, input=prompt, text=True, cwd=root,
                              stdout=stream, stderr=subprocess.STDOUT)
    return proc.returncode, transcript, summary


def update_result(state: dict, item, outcome: str, *, details: str = "",
                  digest: str | None = None, transcript: str = "",
                  findings: list[dict] | None = None, usage: dict | None = None):
    state["results"][item.path] = {
        "status": outcome, "task": item.task, "detail": details[:500],
        "content_sha256": digest, "transcript": transcript,
        "validation_issues": findings or [], "token_usage": usage,
        "at": utcnow().isoformat(timespec="seconds")}
    state["current_path"] = None
    state["status"] = "running"
    state.pop("retry_at", None)
    state.pop("retry_kind", None)
    state.pop("error", None)
    state.pop("transient_attempts", None)
    save_state(state)

def perform_one(root: Path, item, state: dict, prompt_for, *,
                model: str | None = None) -> str:
    """One invocation. The caller owns the lock and schedules any retries."""
    target = root / item.path
    if not target.is_file() or target.is_symlink():
        update_result(state, item, "missing", details="File disappeared before review")
        return "done"
    before = changed_snapshot(root)
    previous_sha = sha_file(target)
    recovery = state.get("current_path") == item.path
    prompt = prompt_for(item)
    if recovery:
        prompt += ("\n\nRESUMING AN INTERRUPTED SINGLE-FILE REVIEW: "
                   "the target may contain partial local edits. Inspect them, "
                   "preserve verified work, and finish only this file.")
    state["current_path"] = item.path
    state["current_task"] = item.task
    state["status"] = "running"
    save_state(state)
    exit_code, transcript, summary = invoke_codex(root, item, prompt, model)
    # Account for every invocation, including quota retries and failed edits.
    # The reported turn usage is cumulative; NEVER sum completed turns.
    from kalam_codex_quality import token_usage, validate_text
    usage = token_usage(transcript)
    if usage is not None:
        events = state.setdefault("usage_events", {})
        if str(transcript) not in events:
            events[str(transcript)] = {
                "path": item.path, "task": item.task, "usage": usage}
            save_state(state)
    after = changed_snapshot(root)
    unexpected = unsafe_changes(before, after, item.path)
    if unexpected:
        state["status"] = "stopped_on_unexpected_edits"
        state["error"] = "Codex modified other paths: " + ", ".join(unexpected[:25])
        state["last_transcript"] = str(transcript)
        save_state(state)
        raise WorkerError(state["error"] + ". Inspect all local changes; nothing was reset")
    errors = transcript_errors(transcript)
    state["last_transcript"] = str(transcript)
    if exit_code:
        deadline = quota_retry_at(errors)
        if deadline:
            state["retry_kind"] = "quota"
            state["retry_at"] = deadline.isoformat(timespec="seconds")
            state["status"] = "waiting_for_quota"
            state["error"] = errors[-1] if errors else "Codex usage limit"
            save_state(state)
            return "retry"
        message = next((s for s in reversed(errors) if TRANSIENT_RE.search(s)), None)
        if message:
            attempts = int(state.get("transient_attempts", 0)) + 1
            seconds = DELAY_SECONDS[min(attempts - 1, len(DELAY_SECONDS) - 1)]
            state["transient_attempts"] = attempts
            state["retry_kind"] = "transient"
            state["retry_at"] = (utcnow() + dt.timedelta(seconds=seconds)).isoformat(timespec="seconds")
            state["status"] = "waiting_for_transient"
            state["error"] = message
            save_state(state)
            return "retry"
        state["status"] = "stopped_on_error"
        state["error"] = f"Codex exit {exit_code}: " + (errors[-1] if errors else "inspect transcript")
        save_state(state)
        raise WorkerError(state["error"] + " (local changes preserved)")
    if not target.is_file():
        state["status"] = "stopped_on_error"
        state["error"] = "Codex removed the selected kalam: " + item.path
        save_state(state)
        raise WorkerError(state["error"])
    whitespace = subprocess.run(["git", "-C", str(root), "diff", "--check", "--", item.path])
    if whitespace.returncode:
        state["status"] = "stopped_on_error"
        state["error"] = "Whitespace errors in " + item.path
        save_state(state)
        raise WorkerError(state["error"] + "; fix locally, then restart")
    final_sha = sha_file(target)
    summary_text = summary.read_text(encoding="utf-8", errors="replace") if summary.exists() else ""
    outcome = "edited_local" if previous_sha != final_sha else "needs_human"
    # A partial edit is not a completed missing-language edition. The worker
    # still advances so unavailable source evidence cannot create a retry loop.
    if item.task in ("source", "roman"):
        from kalam_codex import inspect_text
        revised = inspect_text(item.path, target.read_text(encoding="utf-8"))
        if revised.task == item.task or revised.task == "blocked":
            outcome = "needs_human"
    findings = validate_text(target.read_text(encoding="utf-8"), task=item.task)
    # Even a successfully edited poem with mechanical anomalies needs review.
    # Fixing by inference/repeated model invocations is intentionally forbidden.
    if findings:
        outcome = "needs_human"
    update_result(state, item, outcome, findings=findings, usage=usage, digest=final_sha,
                  details=("Edited but not human-approved" if outcome == "edited_local"
                           else "No edit: verify whether evidence was missing") +
                  ("; " + summary_text[:250] if summary_text else ""),
                  transcript=str(transcript))
    print("Finished:", item.path, outcome,
          f"({len(findings)} local validation findings)", flush=True)
    return "done"


def supervise(args) -> int:
    """Sequential finite queue; excludes originals and skipped/unclassified entries."""
    from dataclasses import replace
    from kalam_codex_quality import TASK_ORDER
    from kalam_codex import (
        ROOT, ROUND2, added_files, base_ref, inspect_text, prompt_for,
    )
    with exclusive_lock():
        branch = git(ROOT, "branch", "--show-current").strip()
        if branch != ROUND2:
            raise WorkerError("Worker must run on " + ROUND2 + ", not " + branch)
        if not args.confirm_run:
            raise WorkerError("Explicit --confirm-run is required")
        head = git(ROOT, "rev-parse", "HEAD").strip()
        base = base_ref(args.base)
        state = load_state()
        existing_repo = state.get("repository")
        if existing_repo and existing_repo != str(ROOT.resolve()):
            raise WorkerError("Resume state belongs to another checkout: " + existing_repo)
        state["repository"] = str(ROOT.resolve())
        state["branch"] = ROUND2
        state["status"] = "running"
        save_state(state)
        paths = added_files(base)
        # Stable work priority: create missing Roman, audit existing Roman,
        # only then attempt evidence-dependent Roman-only source recovery.
        # Never preempt a saved in-flight file when resuming.
        priorities = {}
        for path in paths:
            scan = inspect_text(path, (ROOT / path).read_text(encoding="utf-8"))
            priorities[path] = TASK_ORDER.get(scan.task, 9)
        paths.sort(key=lambda path: (priorities[path], path))
        original_count = len(paths)
        print(f"Round 2 worker: {original_count} added kalams, one Codex file at a time",
              "state:", state_file(), flush=True)
        while True:
            if git(ROOT, "branch", "--show-current").strip() != ROUND2:
                raise WorkerError("Git branch changed during processing; stopped safely")
            if git(ROOT, "rev-parse", "HEAD").strip() != head:
                raise WorkerError("Branch HEAD changed during processing. "
                                  "Stop dedup/commits and restart the service to refresh scope")
            wait_retry(state)
            pending = [rel for rel in paths if rel not in state["results"]]
            in_flight = state.get("current_path")
            if in_flight and in_flight in pending:
                pending.remove(in_flight)
                pending.insert(0, in_flight)
            if not pending:
                state["current_path"] = None
                state["status"] = "complete"
                save_state(state)
                counts = Counter(v.get("status") for v in state["results"].values())
                print("Round 2 queue exhausted:", original_count,
                      "source files. Outcomes:", dict(counts), flush=True)
                return 0
            rel = pending[0]
            target = ROOT / rel
            if not target.is_file() or target.is_symlink():
                from kalam_codex import Candidate
                update_result(state, Candidate(rel, "blocked", "", "", 0, 0, ""),
                              "missing", details="File removed during work")
                continue
            item = inspect_text(rel, target.read_text(encoding="utf-8"))
            if state.get("current_path") == rel and state.get("current_task") in ("source", "roman", "audit"):
                item = replace(item, task=state["current_task"])
            if item.task in ("skip", "blocked"):
                update_result(state, item,
                              "excluded_english" if item.task == "skip" else "needs_human",
                              details=item.note, digest=sha_file(target))
                continue
            result = perform_one(ROOT, item, state, prompt_for, model=args.model)
            if result == "retry":
                print("Codex quota/transient pause:", state.get("retry_kind"),
                      "retry_at:", state.get("retry_at"), flush=True)
                continue


def single_run(item, args, prompt_for) -> int:
    """Keep the interactive one-file command but allow prior uncommitted edits."""
    from kalam_codex import ROOT, ROUND2
    if not args.confirm_run:
        raise WorkerError("No Codex calls without --confirm-run")
    with exclusive_lock():
        branch = git(ROOT, "branch", "--show-current").strip()
        if branch != args.expected_branch:
            raise WorkerError("Expected " + args.expected_branch + "; currently " + branch)
        if branch != ROUND2:
            raise WorkerError("Refusing to run on an unrelated branch")
        state = load_state()
        state.setdefault("results", {})
        if item.path in state["results"]:
            raise WorkerError("Already processed according to local state: " + item.path +
                              ". Requeue explicitly before re-running")
        result = perform_one(ROOT, item, state, prompt_for, model=args.model)
        if result == "retry":
            print("Paused. Restart the service/worker when quota has reset.",
                  state.get("retry_at"), flush=True)
            return 75
        return 0


def show_status(*, json_output: bool = False) -> None:
    """Report task progress and real Codex JSONL token usage, not estimates."""
    from kalam_codex_quality import usage_report
    state = load_state()
    completed = state["results"]
    counts = Counter(value.get("status") for value in completed.values())
    usage = usage_report(state)
    report = {
        "state_file": str(state_file()),
        "status": state.get("status"),
        "processed": len(completed),
        "outcomes": dict(counts),
        "current_path": state.get("current_path"),
        "retry_at": state.get("retry_at"),
        "retry_kind": state.get("retry_kind"),
        "error": state.get("error"),
        "tokens": usage,
    }
    if json_output:
        print(json.dumps(report, indent=2, ensure_ascii=False))
        return
    print("State:", state_file())
    print("Status:", state.get("status"), "| processed:", len(completed))
    print("Outcomes:", dict(counts))
    print("Current file:", state.get("current_path") or "(none)")
    if state.get("retry_at"):
        print("Retry:", state["retry_at"], "| reason:", state.get("retry_kind"))
    if state.get("error"):
        print("Error:", state["error"])
    print("Codex token usage:",
          f"{usage['input_tokens']:,} input",
          f"({usage['cached_input_tokens']:,} cached, "
          f"{usage['uncached_input_tokens']:,} uncached);",
          f"{usage['output_tokens']:,} output;",
          f"{usage['model_invocations_with_usage']} measured invocations")
    print("Cache share:", f"{usage['cache_share_percent']}%")
    for task, tokens in sorted(usage["by_task"].items()):
        print(f"  {task}: {tokens['input_tokens']:,} input, "
              f"{tokens['cached_input_tokens']:,} cached, "
              f"{tokens['output_tokens']:,} output")
    print("No poetry changes have been committed or pushed by this CLI.")


def requeue(path: str) -> None:
    """Remove a single local resume result without touching its Markdown."""
    from kalam_codex import ROOT
    with exclusive_lock():
        state = load_state()
        rel = Path(path)
        if rel.is_absolute():
            rel = rel.resolve().relative_to(ROOT)
        key = rel.as_posix()
        if key not in state["results"]:
            raise WorkerError("No result for this path: " + key)
        state["results"].pop(key)
        state["status"] = "not_started"
        save_state(state)
        print("Requeued locally:", key)


def systemd_quote(value: str) -> str:
    """Escape systemd exec/environment arguments, including percent specifiers."""
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"').replace("%", "%%") + '"'


def service_text(root: Path) -> str:
    unit_command = (systemd_quote(str(Path(sys.executable).resolve())) + " " +
                    systemd_quote(str(root / "scripts/kalam_codex.py")) +
                    " supervise --confirm-run")
    codex = shutil.which("codex")
    extra = ("Environment=" + systemd_quote("PATH=" + os.environ.get("PATH", "")) + "\n")
    if codex:
        extra += "Environment=" + systemd_quote("KALAM_CODEX_BIN=" + codex) + "\n"
    return (
        "[Unit]\n"
        "Description=KalamArchive Round 2 Codex original-language and Roman worker\n"
        "After=network.target\n\n"
        "[Service]\n"
        "Type=simple\n"
        "WorkingDirectory=" + systemd_quote(str(root)) + "\n"
        + extra +
        "ExecStart=" + unit_command + "\n"
        "KillMode=control-group\n"
        "TimeoutStopSec=15s\n"
        "Restart=no\n"
        "StandardOutput=journal\n"
        "StandardError=journal\n\n"
        "[Install]\nWantedBy=default.target\n")


def service_action(action: str, *, start: bool = False) -> None:
    from kalam_codex import ROOT
    if not sys.platform.startswith("linux"):
        raise WorkerError("This service installer supports Linux systemd user units only")
    unitdir = Path.home() / ".config/systemd/user"
    unit = unitdir / SERVICE
    if action == "install":
        unitdir.mkdir(mode=0o700, parents=True, exist_ok=True)
        unit.write_text(service_text(ROOT), encoding="utf-8")
        subprocess.run(["systemctl", "--user", "daemon-reload"], check=True)
        print("Installed:", unit)
        if start:
            subprocess.run(["systemctl", "--user", "enable", "--now", SERVICE], check=True)
            print("Enabled and started:", SERVICE)
        else:
            print("Not started. After dedup completes, run:",
                  f"systemctl --user enable --now {SERVICE}")
        return
    if action == "uninstall":
        subprocess.run(["systemctl", "--user", "disable", "--now", SERVICE], check=False)
        unit.unlink(missing_ok=True)
        subprocess.run(["systemctl", "--user", "daemon-reload"], check=True)
        print("Uninstalled systemd unit; local state and lyric edits preserved")
        return
    raise WorkerError("Unknown service action: " + action)
