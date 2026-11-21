# Manual adjudication of Codex Round 2

`tracker.csv` is the durable queue for **every snapshot with worker status `needs_human`** found in the original worker and shards 1–3 when imported on 2026-11-21. Each row identifies a distinct source lyric and candidate snapshot; review decisions are independent of the workers' `state.json` files.

## Process

1. Locate the current lyric, comparing the recorded `before_snapshot` and `after_snapshot` as well as the worker's validation codes. Never assume that `codex_applied=true` means editorially approved.
2. Establish what the original evidence actually contains. Where `before.md` already has source script, preserve that text and check Roman against it **line by line**, including preambles, stanza boundaries, verse order, doubtful words, and omissions. Where the original is Roman-only, check the script reconstruction against those Roman words; generated script in `after.md` is not an independent witness for a changed reading. Reconstruction is authorized without another manuscript, but a corrupt original phrase must not be replaced with an invented one. No English translations of non-English kalams.
3. Adjudicate each proposed change manually using [Editorial standards](../../../docs/EDITORIAL.md), the canonical authority. Roman letters are ASCII **except `ṅ`/`Ṅ` for nasal readings**; preserve the distinction between `jawaaṅ` (جواں) and `jawaan` (جوان), long vowels (`aa`, `u`, `i`), and permitted poem-specific spellings such as `Zehra`/`Zahra`. Preserve words that belong to the verse, including spoken titles such as `Hazrat`, rather than mistaking them for detachable honorific annotations. Do not indiscriminately transliterate by global replacement.
   A valid existing reading is not an error merely because another spelling is possible. Accept only corrections justified by the actual text and house rules, retaining the original where the proposal is unnecessary or unsupported. A no-change decision is valid. Recheck earlier adjudication edits against the snapshots as well as checking the Codex proposal; later edits can introduce regressions too.
4. Apply an approved correction to `src/data/lyrics` only where the record still exists. Leave original `before.md` and proposed `after.md` snapshots unchanged as evidence.
5. Record the decision, notes, and date in the corresponding tracker row. Use `resolved` for a checked decision and `source_verification` for a doubtful or damaged source where reliable text/audio is still required.
6. For `path_reconciliation`, first determine whether the target was renamed, merged, or deleted as a duplicate in the deduplication pass. **Do not recreate** a missing lyric on the strength of a stale snapshot.
7. When later snapshots are copied in, append their new `(worker, snapshot_id)` keys. Preserve existing reviews and never replace the tracker wholesale.

## Tracker columns

- `lyric_path`: original path from the worker state, which may now be stale.
- `current_lyric_path`: current canonical filename after renames/deduplication; blank until reconciled when the original path is gone.
- `worker`: original root worker or shard.
- `snapshot_id`, `before_snapshot`, `after_snapshot`: immutable evidence.
- `codex_applied`: whether the worker said its proposal was applied, **not** editorial approval.
- `validation_codes`: the worker's original warnings/errors.
- `review_status`: `pending`, `path_reconciliation`, `source_verification`, or `resolved`.
- `decision`: `corrected`, `approved_unchanged`, `blocked`, etc.
- `notes`: why a decision was made, including unresolved alternatives.
- `reviewed_at`: date of manual judgement.

Do not automatically run CI on this ongoing Round 2 editorial WIP.

## Final queue ingestion (2026-11-21)

The completed worker state files record **1,602 needs_human snapshots**: root 393, shard 1 450, shard 2 407, shard 3 352. The latest import appended **93 new snapshot records** to the existing 1,509-row queue, retaining all earlier editorial decisions. Codex proposals remain unapproved until the `review_status` and `decision` fields are explicitly changed. All four snapshot directories contain paired `before.md` and `after.md` files; CI remains off during editorial WIP.