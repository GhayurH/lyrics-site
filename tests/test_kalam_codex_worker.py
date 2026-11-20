"""Quota, resume and local-only safeguards for the Round 2 Codex worker."""
from __future__ import annotations

import datetime as dt
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import kalam_codex_worker as worker


class WorkerTests(unittest.TestCase):
    def test_quota_fallback(self):
        now = dt.datetime(2026, 11, 20, 1, 0, tzinfo=dt.timezone.utc)
        self.assertEqual(worker.quota_retry_at(["quota exceeded"], now),
                         now + dt.timedelta(minutes=30))
        self.assertIsNone(worker.quota_retry_at(["not authorized"], now))

    def test_reported_quota_reset_time(self):
        now = dt.datetime.now(dt.timezone.utc)
        result = worker.quota_retry_at(["Usage limit reached. Try again at 10:24 PM."], now)
        self.assertGreater(result, now)
        self.assertLess(result - now, dt.timedelta(hours=25))

    def test_existing_dirty_path_modification_detected(self):
        before = {"old.md": (14, 100, 1), "target.md": (10, 10, 1)}
        after = {"old.md": (22, 110, 1), "target.md": (15, 20, 1)}
        self.assertEqual(worker.unsafe_changes(before, after, "target.md"), ["old.md"])

    def test_selected_file_may_be_dirty_without_false_positive(self):
        before = {"a.md": (4, 10, 1)}
        after = {"a.md": (5, 20, 1)}
        self.assertEqual(worker.unsafe_changes(before, after, "a.md"), [])

    def test_transcript_quota_json_event(self):
        with tempfile.TemporaryDirectory() as folder:
            logfile = Path(folder) / "codex.jsonl"
            logfile.write_text(
                json.dumps({"type": "turn.failed", "error": {
                    "message": "Usage limit reached; try again at 10:24 PM"}}) + "\n",
                encoding="utf-8")
            messages = worker.transcript_errors(logfile)
            self.assertTrue(worker.quota_retry_at(messages))

    def test_systemd_user_service_is_explicit_and_local(self):
        unit = worker.service_text(Path("/home/owner/Projects/lyrics-site"))
        self.assertIn("ExecStart=", unit)
        self.assertIn("supervise --confirm-run", unit)
        self.assertIn("Restart=no", unit)
        self.assertIn("WantedBy=default.target", unit)
        self.assertNotIn("git push", unit)
        self.assertNotIn("git commit", unit)
        self.assertIn("Environment=", unit)

    def test_state_atomic_resume_file(self):
        with tempfile.TemporaryDirectory() as folder:
            with patch.dict(os.environ, {"KALAM_CODEX_STATE_DIR": folder}):
                state = {"version": 1, "results": {}, "status": "waiting_for_quota",
                         "retry_at": "2026-11-20T12:00:00+00:00"}
                worker.save_state(state)
                got = worker.load_state()
                self.assertEqual(got["status"], "waiting_for_quota")
                self.assertEqual(got["retry_at"], state["retry_at"])
                self.assertEqual(worker.state_file().stat().st_mode & 0o777, 0o600)

    def setup_repo(self, folder):
        repo = Path(folder) / "repo"
        repo.mkdir()
        subprocess.run(["git", "init", "-q", str(repo)], check=True)
        subprocess.run(["git", "-C", str(repo), "config", "user.name", "Fixture"], check=True)
        subprocess.run(["git", "-C", str(repo), "config", "user.email", "test@example.invalid"], check=True)
        (repo / "poem.md").write_text("Original", encoding="utf-8")
        (repo / "other.md").write_text("Older local work", encoding="utf-8")
        subprocess.run(["git", "-C", str(repo), "add", "."], check=True)
        subprocess.run(["git", "-C", str(repo), "commit", "-qm", "fixture"], check=True)
        (repo / "other.md").write_text("Already uncommitted", encoding="utf-8")
        return repo

    def test_process_file_preserves_other_prior_dirty_work(self):
        with tempfile.TemporaryDirectory() as folder:
            repo = self.setup_repo(folder)
            state = {"version": 1, "results": {}}
            item = SimpleNamespace(path="poem.md", task="roman")
            transcript = Path(folder) / "transcript.jsonl"
            transcript.write_text("", encoding="utf-8")
            def fake_codex(root, candidate, prompt, model):
                (root / candidate.path).write_text("Edited only this poem", encoding="utf-8")
                return 0, transcript, Path(folder) / "summary-missing"
            with patch.dict(os.environ, {"KALAM_CODEX_STATE_DIR": folder + "/state"}):
                with patch.object(worker, "invoke_codex", side_effect=fake_codex):
                    outcome = worker.perform_one(repo, item, state, lambda x: "editorial task")
                self.assertEqual(outcome, "done")
                self.assertEqual(state["results"]["poem.md"]["status"], "edited_local")
                self.assertEqual((repo / "other.md").read_text(), "Already uncommitted")
                self.assertEqual(subprocess.run(
                    ["git", "-C", str(repo), "log", "-1", "--pretty=%s"],
                    capture_output=True, text=True).stdout.strip(), "fixture")

    def test_detects_edits_to_an_already_dirty_unrelated_file(self):
        with tempfile.TemporaryDirectory() as folder:
            repo = self.setup_repo(folder)
            state = {"version": 1, "results": {}}
            item = SimpleNamespace(path="poem.md", task="roman")
            transcript = Path(folder) / "transcript.jsonl"
            transcript.write_text("", encoding="utf-8")
            def bad_codex(root, candidate, prompt, model):
                (root / "other.md").write_text("Codex unexpectedly changed this file", encoding="utf-8")
                return 0, transcript, Path(folder) / "summary-missing"
            with patch.dict(os.environ, {"KALAM_CODEX_STATE_DIR": folder + "/state"}):
                with patch.object(worker, "invoke_codex", side_effect=bad_codex):
                    with self.assertRaises(worker.WorkerError):
                        worker.perform_one(repo, item, state, lambda x: "editorial task")
                self.assertEqual(state["status"], "stopped_on_unexpected_edits")


if __name__ == "__main__":
    unittest.main()
