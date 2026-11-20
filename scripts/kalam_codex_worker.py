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
import signal
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
    r"request timed out|execution timed out|transport error|incomplete response returned|"
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


def file_timeout_seconds() -> int:
    raw = os.environ.get("KALAM_CODEX_FILE_TIMEOUT_SECONDS", "2700")
    try:
        seconds = int(raw)
    except ValueError as exc:
        raise WorkerError("Invalid KALAM_CODEX_FILE_TIMEOUT_SECONDS: " + raw) from exc
    if seconds < 60 or seconds > 14400:
        raise WorkerError("Codex per-file timeout must be 60–14400 seconds")
    return seconds


def _end_process_group(proc: subprocess.Popen) -> None:
    """Terminate the Codex process tree on timeout, then force kill if needed."""
    try:
        os.killpg(proc.pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        proc.wait()


def invoke_codex(root: Path, item, prompt: str, model: str | None = None) -> tuple[int, Path, Path]:
    """Launch Codex only in a private file-scoped directory, never the checkout."""
    transcript, summary = next_log_paths()
    args = codex_command(model) + [str(root), "--output-last-message", str(summary)]
    if model:
        args.extend(["--model", model])
    args.append("-")
    descriptor = os.open(transcript, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
        print("Codex (isolated):", item.path, item.task,
              "transcript:", transcript, flush=True)
        proc = subprocess.Popen(
            args, stdin=subprocess.PIPE, stdout=stream,
            stderr=subprocess.STDOUT, cwd=root, text=True,
            start_new_session=True)
        previous_term = signal.getsignal(signal.SIGTERM)

        def terminate_worker(_signum, _frame):
            # A stopped supervisor must not leave an isolated Codex job behind.
            raise SystemExit(143)

        signal.signal(signal.SIGTERM, terminate_worker)
        try:
            proc.communicate(input=prompt, timeout=file_timeout_seconds())
        except subprocess.TimeoutExpired:
            _end_process_group(proc)
            stream.write("\n" + json.dumps({
                "type": "error", "message":
                "Codex execution timed out; isolated workspace retained for retry"}) + "\n")
            stream.flush()
            return 124, transcript, summary
        except BaseException:
            _end_process_group(proc)
            raise
        finally:
            signal.signal(signal.SIGTERM, previous_term)
    return proc.returncode, transcript, summary


def update_result(state: dict, item, outcome: str, *, details: str = "",
                  digest: str | None = None, transcript: str = "",
                  findings: list[dict] | None = None, usage: dict | None = None,
                  duration_seconds: float = 0.0, applied: bool = False,
                  snapshots: dict | None = None):
    state["results"][item.path] = {
        "status": outcome, "task": item.task, "detail": details[:500],
        "content_sha256": digest, "transcript": transcript,
        "validation_issues": findings or [], "token_usage": usage,
        "lang": getattr(item, "lang", ""), "language": getattr(item, "language", ""),
        "duration_seconds": round(duration_seconds, 2), "applied": applied,
        "snapshots": snapshots or {},
        "at": utcnow().isoformat(timespec="seconds")}
    state["current_path"] = None
    state["status"] = "running"
    state.pop("retry_at", None)
    state.pop("retry_kind", None)
    state.pop("error", None)
    state.pop("transient_attempts", None)
    save_state(state)

def mark_concurrent_edit(item, state: dict, reason: str, *,
                         duration_seconds: float = 0.0,
                         usage: dict | None = None, transcript: str = "") -> str:
    """Quarantine a Codex proposal, not the locally deduplicated target.

    A concurrently modified/deleted target must never be overwritten by this
    service, and a collision on one poem must not stall unrelated poems.
    """
    from kalam_codex_isolation import (
        finish_session, snapshot_interrupted_workspace,
    )
    session = state.get("workspace_session")
    snapshots = {}
    if session:
        if session.get("path") != item.path:
            raise WorkerError("A different in-flight workspace needs intervention")
        snapshots = snapshot_interrupted_workspace(state_home(), session)
    state.pop("workspace_session", None)
    update_result(
        state, item, "concurrent_edit", details=reason,
        findings=[{"code": "concurrent_target_edit", "severity": "error",
                   "message": reason}],
        snapshots=snapshots, duration_seconds=duration_seconds,
        usage=usage, transcript=transcript)
    if session:
        try:
            finish_session({"workspace_session": session})
        except OSError as exc:
            print("Workspace cleanup warning:", exc, file=sys.stderr)
    print("Codex skipped concurrently changed lyric:", item.path, reason,
          "(snapshots retained; requeue after dedup if desired)", flush=True)
    return "done"


def perform_one(root: Path, item, state: dict, prompt_for, *,
                model: str | None = None) -> str:
    """Run isolated Codex, validate, then atomically apply a single safe edit."""
    from kalam_codex_isolation import (
        IsolationError, added_whitespace_issues, apply_file, assert_workspace_clean_scope,
        finish_session, prepare_workspace, preview_workspace,
    )
    from kalam_codex_quality import (
        original_body, token_usage, validate_text,
    )
    target = root / item.path
    prior_session = state.get("workspace_session")
    if prior_session and prior_session.get("path") != item.path:
        raise WorkerError("Another isolated file is still in flight")
    # A resumed file can have been changed/deleted by dedup in the meantime.
    # Preserve the interrupted workspace as snapshots rather than overwrite it.
    if prior_session and (
            not target.is_file() or target.is_symlink() or
            sha_file(target) != prior_session["baseline_sha256"]):
        return mark_concurrent_edit(
            item, state, "Target changed during interrupted Codex session")
    if not target.is_file() or target.is_symlink():
        update_result(state, item, "missing", details="File disappeared before review")
        return "done"
    original_text = target.read_text(encoding="utf-8")
    resume = state.get("current_path") == item.path
    workdir, session = prepare_workspace(root, item.path, state_home(), state)
    if hashlib.sha256(original_text.encode("utf-8")).hexdigest() != session["baseline_sha256"]:
        return mark_concurrent_edit(
            item, state, "Target changed while preparing isolated session")
    prompt = prompt_for(item)
    if resume:
        prompt += ("\n\nRESUMING AN INTERRUPTED ISOLATED REVIEW. "
                   "The selected file already contains partial edits. "
                   "Inspect and finish them without discarding verified work.")
    state["current_path"] = item.path
    state["current_task"] = item.task
    state["status"] = "running"
    save_state(state)
    started = time.monotonic()
    exit_code, transcript, summary = invoke_codex(workdir, item, prompt, model)
    duration = max(0.0, time.monotonic() - started)
    usage = token_usage(transcript)
    events = state.setdefault("usage_events", {})
    if str(transcript) not in events:
        events[str(transcript)] = {
            "path": item.path, "task": item.task, "duration_seconds": round(duration, 2),
            "usage": usage,
        }
        save_state(state)
    # Only this poem is protected by compare-and-swap. Dedup may change other
    # files or advance HEAD without interrupting the one-file Codex task.
    if (not target.is_file() or target.is_symlink() or
            sha_file(target) != session["baseline_sha256"]):
        return mark_concurrent_edit(
            item, state, "Target changed during Codex invocation",
            duration_seconds=duration, usage=usage, transcript=str(transcript))
    # Even quota/transient retries MUST be scoped: never trust a modified
    # workspace or continue an unsafe partial run.
    try:
        assert_workspace_clean_scope(workdir, item.path, session["guidance_sha256"])
    except IsolationError as exc:
        state["status"] = "stopped_on_unexpected_edits"
        state["error"] = str(exc)
        state["last_transcript"] = str(transcript)
        save_state(state)
        raise WorkerError(str(exc) + "; isolated workspace preserved") from exc
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
        message = next((msg for msg in reversed(errors) if TRANSIENT_RE.search(msg)), None)
        if message:
            attempts = int(state.get("transient_attempts", 0)) + 1
            seconds = DELAY_SECONDS[min(attempts-1, len(DELAY_SECONDS)-1)]
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
        raise WorkerError(state["error"] + "; isolated work was preserved")
    try:
        orig, new, snap_before, snap_after = preview_workspace(
            root, item.path, state_home(), session)
    except IsolationError as exc:
        if (not target.is_file() or target.is_symlink() or
                sha_file(target) != session["baseline_sha256"]):
            return mark_concurrent_edit(
                item, state, "Target changed during isolated validation",
                duration_seconds=duration, usage=usage, transcript=str(transcript))
        state["status"] = "stopped_on_unexpected_edits"
        state["error"] = str(exc)
        save_state(state)
        raise WorkerError(str(exc) + "; isolated workspace preserved") from exc
    try:
        updated_text = new.decode("utf-8")
    except UnicodeDecodeError:
        state["status"] = "stopped_on_error"
        state["error"] = "Codex produced non-UTF8 poetry: " + item.path
        save_state(state)
        raise WorkerError(state["error"])
    # Codex often appends an EOF newline; preserve the exact authoritative
    # original-language body while retaining otherwise valid Roman edits.
    # Only normalize EOF line endings, never real source-language changes.
    if item.task in ("roman", "audit"):
        old_source = original_body(original_text)
        new_source = original_body(updated_text)
        if (old_source is not None and new_source is not None
                and old_source != new_source
                and old_source.rstrip("\r\n") == new_source.rstrip("\r\n")):
            updated_text = updated_text[:len(updated_text) - len(new_source)] + old_source
            new = updated_text.encode("utf-8")
    findings = validate_text(updated_text, task=item.task)
    findings.extend(added_whitespace_issues(orig, new))
    if item.task in ("roman", "audit"):
        if original_body(original_text) != original_body(updated_text):
            findings.append({"code": "source_modified", "severity": "error",
                             "message": "Original-language body changed during Roman task"})
    if item.task in ("source", "roman"):
        from kalam_codex import inspect_text
        revised = inspect_text(item.path, updated_text)
        if revised.task == item.task or revised.task == "blocked":
            findings.append({"code": "edition_incomplete", "severity": "error",
                             "message": "Required edition remains missing"})
    # No writeback when validation raises a structural error. Warnings can be
    # preserved as local changes but never treated as editorial approval.
    fatal = any(finding["severity"] == "error" for finding in findings)
    applied = False
    if not fatal:
        # All mechanical rejection checks run BEFORE the atomic copyback.
        try:
            applied = apply_file(root, item.path, orig, new, session)
        except IsolationError:
            if (not target.is_file() or target.is_symlink() or
                    sha_file(target) != session["baseline_sha256"]):
                return mark_concurrent_edit(
                    item, state, "Target changed immediately before copyback",
                    duration_seconds=duration, usage=usage, transcript=str(transcript))
            raise
    outcome = ("needs_human" if fatal or findings or not applied else "edited_local")
    summary_text = summary.read_text(encoding="utf-8", errors="replace") if summary.exists() else ""
    snapshots = {"before": snap_before, "after": snap_after}
    finished = state.pop("workspace_session", None)
    update_result(state, item, outcome,
                  digest=hashlib.sha256(new).hexdigest(),
                  findings=findings, usage=usage, duration_seconds=duration,
                  snapshots=snapshots, applied=applied,
                  details=("Applied but not human-approved" if applied else
                           "Not applied: incomplete or failed validation") +
                  ("; " + summary_text[:250] if summary_text else ""),
                  transcript=str(transcript))
    if finished:
        try:
            finish_session({"workspace_session": finished})
        except OSError as exc:
            print("Workspace cleanup warning (result already saved):", exc,
                  file=sys.stderr)
    print("Finished:", item.path, outcome,
          f"({len(findings)} findings; {'applied' if applied else 'not applied'})",
          flush=True)
    return "done"


def refresh_round2_queue(root: Path, base: str, state: dict) -> list[str]:
    """Reconcile the current local Round 2 additions after subsequent commits.

    HEAD identifies which imports belong to this branch, but never freezes
    editorial processing. Every file's actual text is read from the working
    tree immediately before its Codex task.
    """
    from kalam_codex import added_files, inspect_text
    paths = []
    tasks, languages = Counter(), Counter()
    for rel in added_files(base):
        target = root / rel
        if not target.is_file() or target.is_symlink():
            continue
        try:
            text = target.read_text(encoding="utf-8")
        except FileNotFoundError:
            continue  # Dedup deleted this while we refreshed the list.
        item = inspect_text(rel, text)
        paths.append(rel)
        tasks[item.task] += 1
        languages[item.lang or "unknown"] += 1
    # Read across the alphabet rather than running all Roman tasks first,
    # so Codex reviews earlier letters while dedup progresses to later ones.
    paths.sort(key=lambda path: (path.casefold(), path))
    prior = state.get("planned", {})
    state["planned"] = {
        "total": len(paths),
        "by_task": dict(tasks), "by_language": dict(languages),
        "started_at": prior.get("started_at") or utcnow().isoformat(timespec="seconds"),
    }
    save_state(state)
    return paths



def refresh_owned_queue(root: Path, base: str, state: dict) -> list[str]:
    """Select this worker's stable alphabetical slice of the Round 2 queue."""
    paths = refresh_round2_queue(root, base, state)
    raw_index = os.environ.get("KALAM_CODEX_SHARD_INDEX")
    raw_count = os.environ.get("KALAM_CODEX_SHARD_COUNT")
    if raw_index is None and raw_count is None:
        return paths
    if raw_index is None or raw_count is None:
        raise WorkerError("Both shard index and count are required")
    try:
        index, count = int(raw_index), int(raw_count)
    except ValueError as exc:
        raise WorkerError("Invalid parallel shard configuration") from exc
    if not 0 <= index < count <= 16:
        raise WorkerError("Invalid parallel shard index or count")
    if (state.get("parallel_worker_index") != index or
            state.get("parallel_worker_count") != count):
        raise WorkerError("Shard environment does not match persisted state")
    owned = [rel for i, rel in enumerate(paths)
             if i * count // len(paths) == index]
    from kalam_codex import inspect_text
    task_counts, language_counts = Counter(), Counter()
    for rel in owned:
        target = root / rel
        try:
            item = inspect_text(rel, target.read_text(encoding="utf-8"))
        except FileNotFoundError:
            continue
        task_counts[item.task] += 1
        language_counts[item.lang or "unknown"] += 1
    state["planned"]["global_total"] = len(paths)
    state["planned"]["total"] = len(owned)
    state["planned"]["by_task"] = dict(task_counts)
    state["planned"]["by_language"] = dict(language_counts)
    state["planned"]["shard_index"] = index
    state["planned"]["shard_count"] = count
    save_state(state)
    return owned

def supervise(args) -> int:
    """Sequential resumable queue; tolerate concurrent later-letter dedup commits."""
    from dataclasses import replace
    from kalam_codex import (
        ROOT, ROUND2, base_ref, inspect_text, prompt_for,
    )
    with exclusive_lock():
        branch = git(ROOT, "branch", "--show-current").strip()
        if branch != ROUND2:
            raise WorkerError("Worker must run on " + ROUND2 + ", not " + branch)
        if not args.confirm_run:
            raise WorkerError("Explicit --confirm-run is required")
        base = base_ref(args.base)
        state = load_state()
        existing_repo = state.get("repository")
        if existing_repo and existing_repo != str(ROOT.resolve()):
            raise WorkerError("Resume state belongs to another checkout: " + existing_repo)
        state["repository"] = str(ROOT.resolve())
        state["branch"] = ROUND2
        state["status"] = "running"
        save_state(state)
        last_head = git(ROOT, "rev-parse", "HEAD").strip()
        paths = refresh_owned_queue(ROOT, base, state)
        print(f"Round 2 worker: {len(paths)} locally present added kalams, "
              "alphabetical, one Codex file at a time; "
              "dedup commits allowed. State:", state_file(), flush=True)
        while True:
            # Switching branches is still unsafe, but new commits on this
            # same branch are routine and never stop an isolated Codex edit.
            if git(ROOT, "branch", "--show-current").strip() != ROUND2:
                raise WorkerError("Git branch changed during processing; stopped safely")
            wait_retry(state)
            new_head = git(ROOT, "rev-parse", "HEAD").strip()
            if new_head != last_head:
                paths = refresh_owned_queue(ROOT, base, state)
                last_head = new_head
                print("Round 2 dedup commit detected; refreshed local queue:",
                      len(paths), "files. Existing Codex results retained.",
                      flush=True)
            pending = [rel for rel in paths if rel not in state["results"]]
            in_flight = state.get("current_path")
            # If a simultaneous dedup commit removed/renamed the in-flight
            # file, preserve its isolated content and continue other files.
            if in_flight and in_flight not in pending and state.get("workspace_session"):
                from kalam_codex import Candidate
                from kalam_codex_isolation import IsolationError
                item = Candidate(in_flight, state.get("current_task", "blocked"),
                                 "", "", 0, 0, "Changed during dedup")
                mark_concurrent_edit(item, state, "In-flight poem removed or renamed during dedup")
                pending = [rel for rel in paths if rel not in state["results"]]
            if in_flight and in_flight in pending:
                pending.remove(in_flight)
                pending.insert(0, in_flight)
            if not pending:
                # HEAD may have changed between the last scan and exhaustion.
                final_head = git(ROOT, "rev-parse", "HEAD").strip()
                if final_head != last_head:
                    paths = refresh_owned_queue(ROOT, base, state)
                    last_head = final_head
                    continue
                state["current_path"] = None
                state["status"] = "complete"
                save_state(state)
                counts = Counter(v.get("status") for v in state["results"].values())
                print("Round 2 local queue exhausted:", len(paths),
                      "eligible files. Outcomes:", dict(counts), flush=True)
                return 0
            rel = pending[0]
            target = ROOT / rel
            if not target.is_file() or target.is_symlink():
                from kalam_codex import Candidate
                update_result(state, Candidate(rel, "blocked", "", "", 0, 0, ""),
                              "missing", details="File removed during dedup")
                continue
            try:
                item = inspect_text(rel, target.read_text(encoding="utf-8"))
            except FileNotFoundError:
                from kalam_codex import Candidate
                update_result(state, Candidate(rel, "blocked", "", "", 0, 0, ""),
                              "missing", details="File removed during dedup")
                continue
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


def progress_report(state: dict) -> dict:
    """Informational throughput and conservative ETA; never editorial approval."""
    import statistics
    planned = state.get("planned", {})
    total = int(planned.get("total", 0))
    results = state.get("results", {})
    completed = len(results)
    counts = Counter()
    languages = Counter()
    durations: dict[str, list[float]] = {}
    for result in results.values():
        task = result.get("task", "unknown")
        counts[task] += 1
        languages[result.get("lang") or "unknown"] += 1
        seconds = float(result.get("duration_seconds") or 0)
        if seconds > 0:
            durations.setdefault(task, []).append(seconds)
    remaining = {
        task: max(0, int(count) - counts[task])
        for task, count in planned.get("by_task", {}).items()
    }
    estimated_seconds = 0.0
    enough_samples = bool(remaining)
    for task, remaining_count in remaining.items():
        if not remaining_count:
            continue
        samples = durations.get(task, [])
        if len(samples) < 10:
            enough_samples = False
            break
        estimated_seconds += statistics.median(samples) * remaining_count
    return {
        "total": total,
        "processed": completed,
        "remaining": max(0, total - completed),
        "percent": round(100 * completed / total, 1) if total else 0,
        "by_task": {
            task: {"total": count, "processed": counts[task],
                   "remaining": max(0, count - counts[task])}
            for task, count in planned.get("by_task", {}).items()},
        "by_language": {
            lang: {"total": count, "processed": languages[lang],
                   "remaining": max(0, count - languages[lang])}
            for lang, count in planned.get("by_language", {}).items()},
        "rough_remaining_hours":
            round(estimated_seconds / 3600, 1) if enough_samples else None,
        "estimate_basis": "median duration per task; requires 10 samples of each remaining task",
    }


def show_status(*, json_output: bool = False) -> None:
    from kalam_codex_quality import usage_report
    state = load_state()
    completed = state["results"]
    counts = Counter(value.get("status") for value in completed.values())
    usage = usage_report(state)
    progress = progress_report(state)
    report = {
        "state_file": str(state_file()),
        "status": state.get("status"),
        "processed": len(completed),
        "outcomes": dict(counts),
        "progress": progress,
        "current_path": state.get("current_path"),
        "retry_at": state.get("retry_at"),
        "retry_kind": state.get("retry_kind"),
        "error": state.get("error"),
        "tokens": usage,
        "latest_snapshots":
            completed.get(next(reversed(completed)), {}).get("snapshots", {})
            if completed else {},
        "action_required_log": str(state_home() / "logs/ACTION-REQUIRED.log"),
    }
    if json_output:
        print(json.dumps(report, indent=2, ensure_ascii=False))
        return
    print("State:", state_file())
    print("Status:", state.get("status"),
          "| processed:", len(completed), "| outcomes:", dict(counts))
    if progress["total"]:
        print("Progress:", f"{progress['processed']}/{progress['total']}",
              f"({progress['percent']}%)",
              "| remaining:", progress["remaining"])
        for task, details in sorted(progress["by_task"].items()):
            print("  ", task, f"{details['processed']}/{details['total']}")
        print("By original language:",
              ", ".join(f"{lang} {data['processed']}/{data['total']}"
                        for lang, data in sorted(progress["by_language"].items())))
        if progress["rough_remaining_hours"] is not None:
            print("Rough remaining compute time:",
                  f"{progress['rough_remaining_hours']} hours",
                  "(based on observed per-task durations; not a deadline)")
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
    print("Alerts:", report["action_required_log"])
    print("No poetry changes have been committed or pushed by this CLI.")


def fatal_stop(message: str) -> None:
    """An unattended service must stop on editorial safety failures, with alert."""
    from kalam_codex_isolation import alert
    state = load_state()
    if not state.get("status", "").startswith("stopped_on_"):
        state["status"] = "stopped_on_error"
    state["error"] = str(message)
    save_state(state)
    record = alert(state_home(), str(message))
    print("ACTION REQUIRED:", record, file=sys.stderr)


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


def systemd_working_directory(root: Path) -> str:
    """WorkingDirectory is a path setting, not shell/ExecStart syntax.

    Quotes here are interpreted literally by systemd, making even a quoted
    absolute path invalid. Escape '%' specifiers without surrounding quotes.
    """
    path = str(root.resolve())
    if "\n" in path or "\r" in path:
        raise WorkerError("Invalid newline in service working directory")
    return path.replace("%", "%%")


def service_text(root: Path) -> str:
    workers_raw = os.environ.get("KALAM_CODEX_WORKERS", "1")
    try:
        workers = int(workers_raw)
    except ValueError as exc:
        raise WorkerError("Invalid KALAM_CODEX_WORKERS: " + workers_raw) from exc
    if not 1 <= workers <= 16:
        raise WorkerError("KALAM_CODEX_WORKERS must be between 1 and 16")
    entrypoint = ("scripts/kalam_codex_parallel.py" if workers > 1
                  else "scripts/kalam_codex.py")
    arguments = (f" run --workers {workers} --confirm-run" if workers > 1
                 else " supervise --confirm-run")
    unit_command = (systemd_quote(str(Path(sys.executable).resolve())) + " " +
                    systemd_quote(str(root / entrypoint)) + arguments)
    codex = shutil.which("codex")
    extra = ("Environment=" + systemd_quote("PATH=" + os.environ.get("PATH", "")) + "\n")
    if codex:
        extra += "Environment=" + systemd_quote("KALAM_CODEX_BIN=" + codex) + "\n"
    for setting in ("KALAM_CODEX_FILE_TIMEOUT_SECONDS", "KALAM_CODEX_NOTIFY",
                    "KALAM_CODEX_STATE_DIR", "KALAM_CODEX_WORKERS"):
        if setting in os.environ:
            extra += "Environment=" + systemd_quote(
                setting + "=" + os.environ[setting]) + "\n"
    return (
        "[Unit]\n"
        "StartLimitIntervalSec=300\n"
        "StartLimitBurst=4\n"
        "Description=KalamArchive Round 2 Codex original-language and Roman worker\n"
        "After=network.target\n\n"
        "[Service]\n"
        "Type=simple\n"
        "WorkingDirectory=" + systemd_working_directory(root) + "\n"
        + extra +
        "ExecStart=" + unit_command + "\n"
        "KillMode=control-group\n"
        "RestartPreventExitStatus=78\n"
        "RestartSec=30s\n"
        "TimeoutStopSec=30s\n"
        "Restart=on-failure\n"
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
