"""Quota, resume and local-only safeguards for the Round 2 Codex worker."""
from __future__ import annotations

import datetime as dt
import json
import os
import shutil
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch
import time

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
        self.assertIn("WorkingDirectory=/home/owner/Projects/lyrics-site\n", unit)
        self.assertNotIn('WorkingDirectory="', unit)
        self.assertIn("supervise --confirm-run", unit)
        self.assertIn("Restart=on-failure", unit)
        self.assertIn("RestartPreventExitStatus=78", unit)
        self.assertIn("WantedBy=default.target", unit)
        self.assertNotIn("git push", unit)
        self.assertNotIn("git commit", unit)
        self.assertIn("Environment=", unit)

    def test_systemd_verify_generated_unit(self):
        """Actual systemd parser guards against bad WorkingDirectory settings."""
        if not shutil.which("systemd-analyze"):
            self.skipTest("systemd-analyze not available")
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder) / "lyrics site"
            root.mkdir()
            unit = Path(folder) / "kalam-test.service"
            unit.write_text(worker.service_text(root), encoding="utf-8")
            result = subprocess.run(
                ["systemd-analyze", "verify", str(unit)],
                text=True, capture_output=True)
            self.assertEqual(result.returncode, 0, result.stderr)

    def test_systemd_working_directory_doubles_percent_without_quotes(self):
        value = worker.systemd_working_directory(Path("/home/owner/100% projects/site"))
        self.assertEqual(value, "/home/owner/100%% projects/site")

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
                # Invalid fixture has no verified source; this must remain human-review.
                self.assertEqual(state["results"]["poem.md"]["status"], "needs_human")
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

    def test_quota_retry_accounts_for_consumed_tokens(self):
        with tempfile.TemporaryDirectory() as folder:
            repo = self.setup_repo(folder)
            state = {"version": 1, "results": {}}
            item = SimpleNamespace(path="poem.md", task="roman")
            log = Path(folder) / "transcript.jsonl"
            log.write_text(
                json.dumps({"type": "turn.completed", "usage": {
                    "input_tokens": 501, "cached_input_tokens": 400,
                    "output_tokens": 35}}) + "\n" +
                json.dumps({"type": "turn.failed", "error": {
                    "message": "Usage limit reached. Try again at 10:24 PM."}}) + "\n",
                encoding="utf-8")
            def exhausted(root, candidate, prompt, model):
                return 1, log, Path(folder) / "summary"
            with patch.dict(os.environ, {"KALAM_CODEX_STATE_DIR": folder + "/state"}):
                with patch.object(worker, "invoke_codex", side_effect=exhausted):
                    outcome = worker.perform_one(repo, item, state, lambda x: "task")
            self.assertEqual(outcome, "retry")
            self.assertEqual(state["status"], "waiting_for_quota")
            self.assertEqual(len(state["usage_events"]), 1)
            self.assertEqual(
                state["usage_events"][str(log)]["usage"]["cached_input_tokens"], 400)

    def test_roman_only_task_cannot_silently_change_original_body(self):
        with tempfile.TemporaryDirectory() as folder:
            repo = self.setup_repo(folder)
            selected = repo / "poem.md"
            selected.write_text('---\nlang: ur\nlanguage: Urdu\n'
                                'romanLyrics: |-\n  Ae Husain tum aao\n'
                                '---\nاے حسین تم آؤ', encoding="utf-8")
            state = {"version": 1, "results": {}}
            item = SimpleNamespace(path="poem.md", task="audit")
            log = Path(folder) / "codex.jsonl"
            log.write_text("", encoding="utf-8")
            def changed_original(root, candidate, prompt, model):
                selected_in_workspace = root / candidate.path
                selected_in_workspace.write_text(
                    selected_in_workspace.read_text(encoding="utf-8").replace(
                        "اے حسین تم آؤ", "اے حسن تم آؤ"), encoding="utf-8")
                return 0, log, Path(folder) / "summary"
            with patch.dict(os.environ, {"KALAM_CODEX_STATE_DIR": folder + "/state"}):
                with patch.object(worker, "invoke_codex", side_effect=changed_original):
                    self.assertEqual(
                        worker.perform_one(repo, item, state, lambda _: "audit"), "done")
            result = state["results"]["poem.md"]
            self.assertEqual(result["status"], "needs_human")
            self.assertIn("source_modified", [v["code"] for v in result["validation_issues"]])


    def test_isolated_copyback_preserves_existing_dirty_files_and_no_git_commit(self):
        from kalam_codex_isolation import preview_workspace
        with tempfile.TemporaryDirectory() as folder:
            repo = self.setup_repo(folder)
            target = repo / "poem.md"
            target.write_text('---\nlang: ur\nlanguage: Urdu\n---\n۱\nاے حسین تم آؤ',
                              encoding="utf-8")
            state = {"version": 1, "results": {}}
            item = SimpleNamespace(path="poem.md", lang="ur",
                                   language="Urdu", task="roman")
            log = Path(folder) / "codex.jsonl"
            log.write_text("", encoding="utf-8")
            def fake_codex(workspace, candidate, prompt, model):
                self.assertNotEqual(workspace.resolve(), repo.resolve())
                self.assertFalse((workspace / "other.md").exists())
                p = workspace / candidate.path
                p.write_text(
                    '---\nlang: ur\nlanguage: Urdu\nromanLyrics: |-\n'
                    '  1\n  Ae Husain tum aao\n---\n۱\nاے حسین تم آؤ',
                    encoding="utf-8")
                self.assertEqual(
                    target.read_text(encoding="utf-8"),
                    '---\nlang: ur\nlanguage: Urdu\n---\n۱\nاے حسین تم آؤ')
                return 0, log, Path(folder) / "summary"
            with patch.dict(os.environ, {"KALAM_CODEX_STATE_DIR": folder + "/state"}):
                with patch.object(worker, "invoke_codex", side_effect=fake_codex):
                    self.assertEqual(
                        worker.perform_one(repo, item, state, lambda x: "transliterate"), "done")
            self.assertEqual(state["results"]["poem.md"]["status"], "edited_local")
            self.assertTrue(state["results"]["poem.md"]["applied"])
            self.assertIn("romanLyrics: |-", target.read_text(encoding="utf-8"))
            self.assertEqual((repo / "other.md").read_text(), "Already uncommitted")
            self.assertEqual(subprocess.run(
                ["git", "-C", str(repo), "log", "-1", "--pretty=%s"],
                capture_output=True, text=True).stdout.strip(), "fixture")
            snapshots = state["results"]["poem.md"]["snapshots"]
            self.assertEqual(Path(snapshots["before"]).read_text(encoding="utf-8"),
                             '---\nlang: ur\nlanguage: Urdu\n---\n۱\nاے حسین تم آؤ')
            self.assertIn("Ae Husain", Path(snapshots["after"]).read_text(encoding="utf-8"))

    def test_validation_error_not_applied_but_snapshots_retained(self):
        with tempfile.TemporaryDirectory() as folder:
            repo = self.setup_repo(folder)
            target = repo / "poem.md"
            before = '---\nlang: ur\nlanguage: Urdu\n---\n۱\nاے حسین تم آؤ'
            target.write_text(before, encoding="utf-8")
            state = {"version": 1, "results": {}}
            item = SimpleNamespace(path="poem.md", lang="ur",
                                   language="Urdu", task="roman")
            log = Path(folder) / "codex.jsonl"
            log.write_text("", encoding="utf-8")
            def bad_codex(workspace, candidate, prompt, model):
                (workspace / candidate.path).write_text(
                    before.replace('اے حسین تم آؤ', 'اے حسن تم آؤ') +
                    "\nroman english missing", encoding="utf-8")
                return 0, log, Path(folder) / "summary"
            with patch.dict(os.environ, {"KALAM_CODEX_STATE_DIR": folder + "/state"}):
                with patch.object(worker, "invoke_codex", side_effect=bad_codex):
                    self.assertEqual(worker.perform_one(
                        repo, item, state, lambda _: "audit"), "done")
            self.assertEqual(target.read_text(encoding="utf-8"), before)
            row = state["results"]["poem.md"]
            self.assertFalse(row["applied"])
            self.assertEqual(row["status"], "needs_human")
            self.assertIn("source_modified", [x["code"] for x in row["validation_issues"]])
            self.assertTrue(Path(row["snapshots"]["after"]).exists())

    def test_quota_retry_resumes_same_private_workspace(self):
        with tempfile.TemporaryDirectory() as folder:
            repo = self.setup_repo(folder)
            poem = repo / "poem.md"
            before = '---\nlang: ur\nlanguage: Urdu\n---\n۱\nاے حسین تم آؤ'
            poem.write_text(before, encoding="utf-8")
            state = {"version": 1, "results": {}}
            item = SimpleNamespace(path="poem.md", lang="ur",
                                   language="Urdu", task="roman")
            log = Path(folder) / "codex.jsonl"
            calls = []
            def codex_side_effect(workspace, candidate, prompt, model):
                calls.append(str(workspace))
                target = workspace / candidate.path
                if len(calls) == 1:
                    target.write_text(before + "\nPARTIAL", encoding="utf-8")
                    log.write_text(json.dumps({
                        "type": "turn.failed",
                        "error": {"message": "Quota exceeded, try again at 10:24 PM."}
                    }) + "\n", encoding="utf-8")
                    return 1, log, Path(folder) / "summary"
                self.assertIn("PARTIAL", target.read_text(encoding="utf-8"))
                target.write_text(
                    '---\nlang: ur\nlanguage: Urdu\nromanLyrics: |-\n'
                    '  1\n  Ae Husain tum aao\n---\n۱\nاے حسین تم آؤ',
                    encoding="utf-8")
                log.write_text("", encoding="utf-8")
                return 0, log, Path(folder) / "summary"
            with patch.dict(os.environ, {"KALAM_CODEX_STATE_DIR": folder + "/state"}):
                with patch.object(worker, "invoke_codex", side_effect=codex_side_effect):
                    self.assertEqual(worker.perform_one(
                        repo, item, state, lambda _: "transliterate"), "retry")
                    self.assertEqual(poem.read_text(encoding="utf-8"), before)
                    self.assertTrue(state.get("workspace_session"))
                    self.assertEqual(worker.perform_one(
                        repo, item, state, lambda _: "transliterate"), "done")
            self.assertEqual(calls[0], calls[1])
            self.assertIn("romanLyrics:", poem.read_text(encoding="utf-8"))
            self.assertEqual(state["results"]["poem.md"]["status"], "edited_local")

    def test_progress_report_shows_task_and_language_and_eta_safely(self):
        state = {"planned": {"total": 13, "by_task": {"roman": 3, "source": 10},
                             "by_language": {"ur": 13}},
                 "results": {"one": {"task": "roman", "lang": "ur",
                                     "duration_seconds": 20}}}
        report = worker.progress_report(state)
        self.assertEqual(report["processed"], 1)
        self.assertEqual(report["remaining"], 12)
        self.assertEqual(report["by_language"]["ur"]["processed"], 1)
        self.assertIsNone(report["rough_remaining_hours"])

    def test_fatal_error_creates_local_action_required_log(self):
        from kalam_codex_isolation import alert
        with tempfile.TemporaryDirectory() as folder:
            result = alert(Path(folder), "Unexpected isolated path", notifier=False)
            self.assertIn("ACTION REQUIRED", Path(result).read_text())
            self.assertTrue(result.endswith("ACTION-REQUIRED.log"))
            self.assertEqual(Path(result).stat().st_mode & 0o777, 0o600)

    def test_watchdog_kills_a_hung_codex_process(self):
        with tempfile.TemporaryDirectory() as folder:
            fake = ["python3", "-c", "import time; time.sleep(30)"]
            item = SimpleNamespace(path="poem.md", task="roman")
            with patch.dict(os.environ, {"KALAM_CODEX_STATE_DIR": folder}):
                with patch.object(worker, "codex_command", return_value=fake):
                    with patch.object(worker, "file_timeout_seconds", return_value=1):
                        start = time.monotonic()
                        status, transcript, _ = worker.invoke_codex(
                            Path(folder), item, "task text", None)
                        self.assertEqual(status, 124)
                        self.assertLess(time.monotonic()-start, 9)
                        self.assertIn("execution timed out",
                                      transcript.read_text(encoding="utf-8"))


    def test_no_copyback_with_new_trailing_ascii_spaces(self):
        from kalam_codex_isolation import added_whitespace_issues
        with tempfile.TemporaryDirectory() as folder:
            repo = self.setup_repo(folder)
            poem = repo / "poem.md"
            baseline = '---\nlang: ur\nlanguage: Urdu\n---\n۱\nاے حسین تم آؤ'
            poem.write_text(baseline, encoding="utf-8")
            state = {"version": 1, "results": {}}
            item = SimpleNamespace(path="poem.md", task="roman",
                                   lang="ur", language="Urdu")
            log = Path(folder) / "log.jsonl"
            log.write_text("", encoding="utf-8")
            def bad_model(workspace, candidate, prompt, model):
                (workspace / candidate.path).write_text(
                    '---\nlang: ur\nlanguage: Urdu\nromanLyrics: |-\n'
                    '  1\n  Ae Husain tum aao \n---\n۱\nاے حسین تم آؤ',
                    encoding="utf-8")
                return 0, log, Path(folder) / "last.md"
            with patch.dict(os.environ, {"KALAM_CODEX_STATE_DIR": folder + "/state"}):
                with patch.object(worker, "invoke_codex", side_effect=bad_model):
                    self.assertEqual(
                        worker.perform_one(repo, item, state, lambda _: "task"), "done")
            self.assertEqual(poem.read_text(encoding="utf-8"), baseline)
            result = state["results"]["poem.md"]
            self.assertFalse(result["applied"])
            self.assertEqual(result["status"], "needs_human")
            self.assertIn("new_trailing_whitespace",
                          [v["code"] for v in result["validation_issues"]])
            self.assertTrue(Path(result["snapshots"]["after"]).exists())
            self.assertFalse(added_whitespace_issues(b"keep existing \n", b"keep existing \n"))

    def test_source_script_reconstructed_from_roman_without_external_source(self):
        from kalam_codex import Candidate, prompt_for
        prompt = prompt_for(Candidate("poem.md", "source", "Urdu", "ur", 0, 1,
                                      "Roman-only source"))
        self.assertIn("Roman is sufficient input", prompt)
        self.assertIn("no external searches or verification", prompt)
        with tempfile.TemporaryDirectory() as folder:
            repo = self.setup_repo(folder)
            poem = repo / "poem.md"
            poem.write_text(
                '---\nlang: ur\nlanguage: Urdu\ntags: ["noUrdu"]\n'
                '---\n1\nAe Husain tum aao', encoding="utf-8")
            state = {"version": 1, "results": {}}
            item = SimpleNamespace(path="poem.md", task="source",
                                   lang="ur", language="Urdu", note="Roman-only source")
            log = Path(folder) / "log.jsonl"
            log.write_text("", encoding="utf-8")
            def reconstruct(workspace, candidate, prompt, model):
                self.assertIn("source-language", prompt)
                (workspace / candidate.path).write_text(
                    '---\nlang: ur\nlanguage: Urdu\ntags: []\n'
                    'romanLyrics: |-\n  1\n  Ae Husain tum aao\n'
                    '---\n۱\nاے حسین تم آؤ', encoding="utf-8")
                return 0, log, Path(folder) / "last.md"
            with patch.dict(os.environ, {"KALAM_CODEX_STATE_DIR": folder + "/state"}):
                with patch.object(worker, "invoke_codex", side_effect=reconstruct):
                    self.assertEqual(
                        worker.perform_one(repo, item, state, prompt_for), "done")
            self.assertEqual(state["results"]["poem.md"]["status"], "edited_local")
            self.assertTrue(state["results"]["poem.md"]["applied"])
            self.assertIn("romanLyrics: |-", poem.read_text(encoding="utf-8"))
            self.assertIn("اے حسین", poem.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
