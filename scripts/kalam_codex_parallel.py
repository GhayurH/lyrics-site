"""Run isolated Kalam Codex reviewers in parallel without losing existing state.

Use only after stopping the original single-worker systemd service. Every child
gets a disjoint alphabetical range, a private JSON ledger, and private isolated
workspaces. Existing review results are seeded into the appropriate ledgers.
"""
from __future__ import annotations

import argparse
from collections import Counter
import fcntl
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time

from kalam_codex import ROOT, ROUND2, added_files, base_ref
from kalam_codex_worker import (
    WorkerError, exclusive_lock, git, load_state, save_state, secure_dir,
    state_home,
)

MAX_WORKERS = 16


def all_paths() -> list[str]:
    paths = (
        rel for rel in added_files(base_ref(None))
        if (ROOT / rel).is_file() and not (ROOT / rel).is_symlink()
    )
    return sorted(paths, key=lambda rel: (rel.casefold(), rel))


def owner(position: int, total: int, workers: int) -> int:
    """Contiguous stable alphabetical slices of an unchanged Round 2 inventory."""
    return position * workers // total if total else 0


def shard_home(index: int) -> Path:
    root = state_home()
    return root if index == 0 else root / "shards" / str(index)


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_new_state(directory: Path, state: dict) -> None:
    secure_dir(directory)
    target = directory / "state.json"
    if target.exists():
        return
    temporary = directory / "state.json.bootstrap"
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
        json.dump(state, stream, ensure_ascii=False, indent=2)
        stream.write("\n")
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(temporary, target)


def bootstrap(workers: int) -> None:
    if not 2 <= workers <= MAX_WORKERS:
        raise WorkerError(f"Parallel worker count must be 2–{MAX_WORKERS}")
    if git(ROOT, "branch", "--show-current").strip() != ROUND2:
        raise WorkerError("Expected branch " + ROUND2)
    # This lock also prevents initialization while the existing worker runs.
    with exclusive_lock():
        original = load_state()
        old_count = original.get("parallel_worker_count")
        if old_count is not None and old_count != workers:
            raise WorkerError(
                f"Parallel state is already configured for {old_count} workers; "
                "changing the shard count requires an explicit state migration."
            )
        paths = all_paths()
        if not paths:
            raise WorkerError("No added Round 2 kalams found")
        assignments = {rel: owner(i, len(paths), workers)
                       for i, rel in enumerate(paths)}
        inflight = (original.get("workspace_session") or {}).get("path")
        inflight = inflight or original.get("current_path")
        if inflight and inflight in assignments and assignments[inflight] != 0:
            raise WorkerError(
                "Interrupted review belongs outside worker 0: " + inflight +
                ". Resume/finish that file using the original single worker first."
            )
        # Preserve the original state and its in-flight workspace in shard 0.
        # Other shards inherit only their own already-completed work.
        for index in range(1, workers):
            path = shard_home(index) / "state.json"
            if path.exists():
                saved = read_json(path)
                if saved.get("parallel_worker_count") != workers or saved.get("parallel_worker_index") != index:
                    raise WorkerError("Incompatible existing shard state: " + str(path))
                continue
            owned = {rel for rel, shard in assignments.items() if shard == index}
            seeded = {
                "version": 1,
                "repository": str(ROOT.resolve()),
                "branch": ROUND2,
                "status": "not_started",
                "results": {rel: result for rel, result in original["results"].items()
                            if rel in owned},
                "usage_events": {key: value for key, value in
                                 original.get("usage_events", {}).items()
                                 if value.get("path") in owned},
                "parallel_worker_count": workers,
                "parallel_worker_index": index,
            }
            write_new_state(shard_home(index), seeded)
        original["parallel_worker_count"] = workers
        original["parallel_worker_index"] = 0
        save_state(original)


def status() -> None:
    original = load_state()
    workers = original.get("parallel_worker_count", 1)
    paths = all_paths()
    counts: Counter[str] = Counter()
    by_worker = []
    for index in range(workers):
        file = shard_home(index) / "state.json"
        state = read_json(file) if file.exists() else {"results": {}, "status": "not_started"}
        owned = [rel for i, rel in enumerate(paths) if owner(i, len(paths), workers) == index]
        results = state.get("results", {})
        finished = sum(path in results for path in owned)
        for path in owned:
            if path in results:
                counts[results[path].get("status", "unknown")] += 1
        by_worker.append({
            "worker": index, "processed": finished, "total": len(owned),
            "status": state.get("status", "not_started"),
            "current_path": state.get("current_path"),
            "retry_at": state.get("retry_at"),
            "error": state.get("error"),
        })
    report = {
        "total": len(paths), "processed": sum(row["processed"] for row in by_worker),
        "remaining": len(paths) - sum(row["processed"] for row in by_worker),
        "outcomes": dict(counts), "workers": by_worker,
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))


def terminate(children: list[subprocess.Popen]) -> None:
    for child in children:
        if child.poll() is None:
            child.terminate()
    for child in children:
        try:
            child.wait(timeout=20)
        except subprocess.TimeoutExpired:
            child.kill()
            child.wait()


def run(workers: int, model: str | None = None) -> int:
    directory = state_home()
    secure_dir(directory)
    lockpath = directory / "parallel-supervisor.lock"
    with open(lockpath, "a+", encoding="utf-8") as handle:
        os.chmod(lockpath, 0o600)
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as exc:
            raise WorkerError("Another parallel supervisor is already running") from exc
        bootstrap(workers)
        children: list[subprocess.Popen] = []
        command = [sys.executable, str(ROOT / "scripts/kalam_codex.py"),
                   "supervise", "--confirm-run"]
        if model:
            command += ["--model", model]
        try:
            for index in range(workers):
                env = os.environ.copy()
                env.update({
                    "KALAM_CODEX_STATE_DIR": str(shard_home(index)),
                    "KALAM_CODEX_SHARD_INDEX": str(index),
                    "KALAM_CODEX_SHARD_COUNT": str(workers),
                })
                proc = subprocess.Popen(command, cwd=ROOT, env=env)
                children.append(proc)
                print(f"Started worker {index + 1}/{workers} PID {proc.pid} "
                      f"state={shard_home(index) / 'state.json'}", flush=True)
            while True:
                codes = [child.poll() for child in children]
                if any(code is not None and code != 0 for code in codes):
                    print("A worker failed; stopping the other workers safely.",
                          file=sys.stderr, flush=True)
                    return next(code for code in codes if code is not None and code != 0)
                if all(code == 0 for code in codes):
                    print("All parallel shards complete.", flush=True)
                    return 0
                time.sleep(2)
        except KeyboardInterrupt:
            return 130
        finally:
            terminate(children)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    subs = parser.add_subparsers(dest="command", required=True)
    execute = subs.add_parser("run", help="Start bounded parallel workers")
    execute.add_argument("--workers", type=int, default=4)
    execute.add_argument("--confirm-run", action="store_true")
    execute.add_argument("--model")
    subs.add_parser("status", help="Read-only combined progress of all shards")
    args = parser.parse_args()
    try:
        if args.command == "status":
            status()
            return 0
        if not args.confirm_run:
            raise WorkerError("Explicit --confirm-run is required")
        return run(args.workers, model=args.model)
    except (WorkerError, OSError, ValueError) as exc:
        print("Parallel worker error:", exc, file=sys.stderr)
        return 78


if __name__ == "__main__":
    raise SystemExit(main())
