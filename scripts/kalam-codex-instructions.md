# Round 2 Codex worker entry point

The authoritative policy remains docs/EDITORIAL.md. The single-file worker injects the task-specific, fully elaborated excerpts and examples from scripts/kalam-transliteration-rules.md directly into Codex, so it does not have to reread the entire editorial manual or traverse the repository on every invocation.

- The worker only edits one newly added standalone lyric at a time, and never commits, stages, pushes, deploys, rewrites identifiers or edits editorial trackers.
- All non-English originals remain in their source language, accompanied only by phonetic Roman transliteration (not English translations).
- The three bounded tasks are missing Roman, existing Roman audit, and reconstruction of source-script verses from existing Roman-only kalams. Roman text is sufficient to reconstruct the source-language script; no independent source verification is required. Preserve the Roman words and produce the corresponding source script without translation.
- The local Python validator reports deterministic structural and orthographic warning signs. It never certifies the reading, automatically edits a poem, or substitutes for human editorial approval.
- Update the task rule bundle whenever docs/EDITORIAL.md changes, and keep both consistent. The shared rules precede task-specific rules to encourage caching. Arabic-script recovery intentionally excludes irrelevant Roman orthographic details.

A complete processed file is still an unapproved local edit until separately verified.

## Parallel local worker (after dedup finishes)

The supervisor can run 2–16 independent Codex processes on disjoint, contiguous
alphabetical slices of the current added-kalam inventory. Every process has its
own resume ledger, isolated workspace, log and file-specific snapshots.
**Use 4 workers initially.** Four simultaneous Codex sessions consume the
same account quotas; increasing concurrency may not improve effective throughput
if they start hitting rate limits. The shard count must remain fixed until
this round is finished; changing it requires deliberate state migration.

The primary `state.json` and any interrupted review remain with worker 0.
When parallel mode is started for the first time, already-processed results for
the other workers are copied from the primary ledger, so previous progress
is not repeated. If the interrupted file is outside worker 0's range,
bootstrap refuses to proceed rather than discard it. Finish that one file
with the legacy worker first, then repeat the transition.

First stop the currently running systemd unit, update the checked-out branch
from the remote, and install a parallel unit:

```bash
systemctl --user stop kalam-codex-round2.service
git pull --ff-only
KALAM_CODEX_WORKERS=4 python3 scripts/kalam_codex.py service install
systemctl --user start kalam-codex-round2.service
```

This does **not** run Git tests, commit files, stage changes, or push.
`git pull --ff-only` requires your local branch to be compatible with
the remote; resolve any divergence manually without discarding existing
uncommitted lyric edits.

Track combined progress and inspect service logs:

```bash
python3 scripts/kalam_codex_parallel.py status
journalctl --user -u kalam-codex-round2.service -f
```

To pause safely, use `systemctl --user stop kalam-codex-round2.service`.
Restart with `systemctl --user start kalam-codex-round2.service`.
Do not launch the legacy `supervise` worker alongside parallel mode.
Never change `KALAM_CODEX_WORKERS` by editing the service environment alone;
shard configuration is persisted and enforced on restart.

If all workers encounter a shared Codex quota, they will pause according
to their existing retry logic, and overall throughput will drop. The combined
`status` command counts processed files across shards and distinguishes
`edited_local` from `needs_human`; a processed file is not editorially approved.

## Rebalancing after a shard finishes

Once worker 0 has finished its original alphabetical slice, it can safely take
some **unstarted** kalams from the ends of workers 1–3's queues. This keeps the
same four workers and preserves all completed results, isolated workspaces,
logs and snapshots. No files are edited during the redistribution itself.

**Stop the service first**, update the scripts, preview the new assignment,
then apply the manifest and restart the existing service:

```bash
systemctl --user stop kalam-codex-round2.service
git pull --ff-only
python3 -m py_compile scripts/kalam_codex_worker.py scripts/kalam_codex_parallel.py
python3 scripts/kalam_codex_parallel.py rebalance
python3 scripts/kalam_codex_parallel.py rebalance --apply
systemctl --user start kalam-codex-round2.service
python3 scripts/kalam_codex_parallel.py status
```

The preview does not write anything. `--apply` creates the private
`~/.local/state/kalam-codex-round2/queue-ownership.json` manifest; neither
command changes the Git repository or clears historical results.

The supervisor and all worker locks must be free when applying the rebalance.
A previous interruption's `current_path` and `workspace_session.path` remain
assigned to the original worker. The new worker 0 receives only previously
unstarted files. The ownership manifest uses a checksum of the full
alphabetical inventory; if files are later added, renamed or removed, it
fails closed rather than risk overlapping assignments. Re-run the migration
only with the service stopped and inspect any inventory-change error first.

Do not delete shard state files, copy other shards' `results` into worker 0,
or run the old single-worker supervisor concurrently.