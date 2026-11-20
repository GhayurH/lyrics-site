"""Local file-scoped Codex workspaces and durable editorial snapshots.

Every Codex invocation runs in an isolated throwaway Git worktree under XDG
state, never inside lyrics-site. Only the named lyric may be copied back.
No Git commit, staging, merge, push or source correction occurs here.
"""
from __future__ import annotations

import hashlib
import difflib
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import tempfile
import time
import uuid

ROOT_GUIDANCE = (
    "# Kalam Codex single-file workspace\n"
    "Edit ONLY the selected Markdown lyric in this isolated workspace. "
    "Do not create other files, fetch the original repository, run broad "
    "scripts or use absolute paths outside this workspace. "
    "The full task-specific house rules are in the invocation prompt. "
    "Do not commit, stage or push.\n"
)


class IsolationError(RuntimeError):
    """Stop rather than risking accidental edits to the source checkout."""


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def validate_relpath(rel: str) -> Path:
    path = Path(rel)
    if (path.is_absolute() or not rel or ".." in path.parts or
            any(part in ("", ".") for part in path.parts)):
        raise IsolationError("Unsafe target path: " + rel)
    if not rel.endswith(".md"):
        raise IsolationError("Only poem Markdown is allowed: " + rel)
    return path


def workspace_home(state_dir: Path) -> Path:
    return state_dir / "workspaces"


def snapshot_home(state_dir: Path) -> Path:
    return state_dir / "snapshots"


def _mkdir_private(path: Path) -> None:
    path.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.chmod(path, 0o700)


def _regular_file(path: Path) -> None:
    try:
        status = path.lstat()
    except FileNotFoundError as exc:
        raise IsolationError("Missing required file: " + str(path)) from exc
    if not stat.S_ISREG(status.st_mode):
        raise IsolationError("Not an ordinary file: " + str(path))


def _safe_write(path: Path, data: bytes, *, mode: int = 0o600) -> None:
    _mkdir_private(path.parent)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, mode)
    with os.fdopen(fd, "wb") as stream:
        stream.write(data)
        stream.flush()
        os.fsync(stream.fileno())


def _atomic_write(path: Path, data: bytes, *, mode: int) -> None:
    fd, temporary = tempfile.mkstemp(prefix=".kalam-codex-", dir=str(path.parent))
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(temporary, mode)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def _workspace_paths(directory: Path) -> set[str]:
    """Never follow symlinked directories: only .git internals may be present."""
    found = set()
    for root, dirs, names in os.walk(directory, followlinks=False):
        base = Path(root)
        for dirname in list(dirs):
            child = base / dirname
            if child.is_symlink():
                raise IsolationError("Symlink directory in isolated workspace: " + str(child))
            if child == directory / ".git":
                dirs.remove(dirname)
        for name in names:
            path = base / name
            if path.is_symlink():
                raise IsolationError("Symlink file in isolated workspace: " + str(path))
            found.add(path.relative_to(directory).as_posix())
    return found


def assert_workspace_clean_scope(directory: Path, rel: str, guidance_sha: str) -> None:
    target = directory / validate_relpath(rel)
    _regular_file(target)
    guidance = directory / "AGENTS.md"
    _regular_file(guidance)
    if digest(guidance.read_bytes()) != guidance_sha:
        raise IsolationError("Codex changed the workspace instructions")
    allowed = {rel, "AGENTS.md"}
    unexpected = sorted(_workspace_paths(directory) - allowed)
    if unexpected:
        raise IsolationError("Codex created unexpected workspace files: " +
                             ", ".join(unexpected[:15]))


def _snapshot(state_dir: Path, session: dict, name: str, data: bytes) -> str:
    folder = snapshot_home(state_dir) / session["id"]
    _mkdir_private(folder)
    path = folder / name
    if path.exists():
        if path.read_bytes() != data:
            raise IsolationError("Existing snapshot differs from expected data: " + str(path))
    else:
        _safe_write(path, data)
    return str(path)


def prepare_workspace(root: Path, rel: str, state_dir: Path, state: dict) -> tuple[Path, dict]:
    """Resume an incomplete isolated workspace or create a new persisted one.

    The original file remains unchanged until the model returns and is validated.
    Persist session metadata in the caller's state immediately after returning.
    """
    validate_relpath(rel)
    original = root / rel
    _regular_file(original)
    current = original.read_bytes()
    session = state.get("workspace_session")
    if session and session.get("path") == rel:
        workspace = Path(session["workspace"])
        if not workspace.is_dir() or workspace.is_symlink():
            raise IsolationError("Saved Codex workspace missing or unsafe: " + str(workspace))
        if digest(current) != session.get("baseline_sha256"):
            raise IsolationError("Original lyric changed during interrupted session: " + rel)
        assert_workspace_clean_scope(workspace, rel, session["guidance_sha256"])
        return workspace, session
    if session and session.get("path") != rel:
        raise IsolationError("Prior Codex workspace is pending: " + session["path"])
    identifier = uuid.uuid4().hex
    home = workspace_home(state_dir)
    _mkdir_private(home)
    workspace = home / identifier
    _mkdir_private(workspace)
    guidance = ROOT_GUIDANCE.encode("utf-8")
    _safe_write(workspace / "AGENTS.md", guidance)
    target = workspace / rel
    _safe_write(target, current)
    # Codex exec can require a repository; this private one has NO commits.
    subprocess.run(["git", "-C", str(workspace), "init", "-q"],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    session = {
        "id": identifier,
        "path": rel,
        "workspace": str(workspace),
        "baseline_sha256": digest(current),
        "guidance_sha256": digest(guidance),
        "initial_mode": stat.S_IMODE(original.stat().st_mode),
        "created_at": time.time(),
    }
    session["snapshot_before"] = _snapshot(state_dir, session, "before.md", current)
    session["snapshot_after"] = None
    state["workspace_session"] = session
    return workspace, session


def preview_workspace(root: Path, rel: str, state_dir: Path,
                      session: dict) -> tuple[bytes, bytes, str, str]:
    """Validate and save AFTER snapshot; do not mutate source checkout."""
    workspace = Path(session["workspace"])
    assert_workspace_clean_scope(workspace, rel, session["guidance_sha256"])
    original = root / rel
    _regular_file(original)
    original_bytes = original.read_bytes()
    if digest(original_bytes) != session["baseline_sha256"]:
        raise IsolationError("Original lyric changed while Codex was running: " + rel)
    new = (workspace / rel).read_bytes()
    after = _snapshot(state_dir, session, "after.md", new)
    session["snapshot_after"] = after
    return original_bytes, new, session["snapshot_before"], after


def added_whitespace_issues(original: bytes, updated: bytes) -> list[dict]:
    """Reject new trailing ASCII whitespace BEFORE publishing any local edit."""
    try:
        earlier = original.decode("utf-8").splitlines()
        changed = updated.decode("utf-8").splitlines()
    except UnicodeDecodeError:
        return [{"code": "invalid_utf8", "severity": "error",
                 "message": "Poetry must remain UTF-8"}]
    violations = []
    for line in difflib.ndiff(earlier, changed):
        if line.startswith("+ ") and line[2:].endswith((" ", "\t")):
            violations.append(line[2:][:90])
    if violations:
        return [{"code": "new_trailing_whitespace", "severity": "error",
                 "message": "New trailing ASCII whitespace on edited line(s): " +
                            repr(violations[:3])}]
    return []


def apply_file(root: Path, rel: str, original: bytes, replacement: bytes,
               session: dict) -> bool:
    """Atomically publish just ONE safely validated file to the local checkout."""
    original_path = root / rel
    _regular_file(original_path)
    if original_path.read_bytes() != original:
        raise IsolationError("Source changed before applying Codex edit: " + rel)
    if replacement == original:
        return False
    _atomic_write(original_path, replacement, mode=int(session["initial_mode"]))
    return True


def finish_session(state: dict, *, preserve_workspace: bool = False) -> None:
    session = state.pop("workspace_session", None)
    if not session:
        return
    if not preserve_workspace:
        root = Path(session["workspace"])
        # State-managed UUID workspace only; reject unusual paths.
        if root.parent.name != "workspaces" or root.name != session["id"]:
            raise IsolationError("Refusing to cleanup unexpected workspace: " + str(root))
        shutil.rmtree(root, ignore_errors=False)


def alert(state_dir: Path, message: str, *, notifier=True) -> str:
    """Record persistent action-required event and optionally notify on desktop."""
    _mkdir_private(state_dir / "logs")
    record = state_dir / "logs" / "ACTION-REQUIRED.log"
    message = message.replace("\n", " ").strip()[:1400]
    stamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with open(record, "a", encoding="utf-8") as stream:
        stream.write(stamp + " ACTION REQUIRED: " + message + "\n")
    os.chmod(record, 0o600)
    if notifier and os.environ.get("KALAM_CODEX_NOTIFY", "1") != "0":
        command = shutil.which("notify-send")
        if command:
            try:
                subprocess.run([command, "-u", "critical", "-a", "KalamArchive Codex",
                                "Kalam Codex needs attention", message[:500]],
                               timeout=5, check=False, stdout=subprocess.DEVNULL,
                               stderr=subprocess.DEVNULL)
            except (OSError, subprocess.TimeoutExpired):
                pass
    return str(record)
