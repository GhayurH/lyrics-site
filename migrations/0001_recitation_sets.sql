-- Shareable programmes contain only references to archive content.
-- Edit capability is a randomly generated token whose SHA-256 digest is stored here.
CREATE TABLE IF NOT EXISTS recitation_sets (
  id TEXT PRIMARY KEY NOT NULL,
  document TEXT NOT NULL,
  edit_token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
