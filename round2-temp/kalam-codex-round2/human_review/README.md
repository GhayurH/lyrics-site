# Manual adjudication of Codex Round 2

`tracker.csv` is the durable queue for **every snapshot with worker status `needs_human`** found in the original worker and shards 1–3 when imported on 2026-11-21. Each row identifies a distinct source lyric and candidate snapshot; review decisions are independent of the workers' `state.json` files.

## Process

1. Locate the current lyric, comparing the recorded `before_snapshot` and `after_snapshot` as well as the worker's validation codes. Never assume that `codex_applied=true` means editorially approved.
2. Check the actual original-language text against the Roman transcription **line by line**, including preambles, stanza boundaries, verse order, doubtful words, and omissions. Preserve Urdu/Punjabi/Saraiki/Balti source script; no English translations of non-English kalams.
3. Adjudicate manually using the project's Roman transliteration and metadata rules: `Husain`/`Hasan`, `Kiun`, plain ASCII Roman letters, no Roman honorifics, `alternateTitle` Romanized from the original-script title, source-language title, appropriate `lang`, and existing stanza conventions. Do not indiscriminately transliterate by global replacement.
4. Apply an approved correction to `src/data/lyrics` only where the record still exists. Leave original `before.md` and proposed `after.md` snapshots unchanged as evidence.
5. Record the decision, notes, and date in the corresponding tracker row. Use `resolved` for a checked decision and `source_verification` for a doubtful or damaged source where reliable text/audio is still required.
6. For `path_reconciliation`, first determine whether the target was renamed, merged, or deleted as a duplicate in the deduplication pass. **Do not recreate** a missing lyric on the strength of a stale snapshot.
7. When later snapshots are copied in, append their new `(worker, snapshot_id)` keys. Preserve existing reviews and never replace the tracker wholesale.

## Tracker columns

- `lyric_path`: original path from the worker state, which may now be stale.
- `worker`: original root worker or shard.
- `snapshot_id`, `before_snapshot`, `after_snapshot`: immutable evidence.
- `codex_applied`: whether the worker said its proposal was applied, **not** editorial approval.
- `validation_codes`: the worker's original warnings/errors.
- `review_status`: `pending`, `path_reconciliation`, `source_verification`, or `resolved`.
- `decision`: `corrected`, `approved_unchanged`, `blocked`, etc.
- `notes`: why a decision was made, including unresolved alternatives.
- `reviewed_at`: date of manual judgement.

Do not automatically run CI on this ongoing Round 2 editorial WIP.