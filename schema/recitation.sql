-- Canonical D1 schema for a NEW Kalam Archive Recitation Sets database.
-- Not an incremental migration: existing deployed databases already use this schema.
-- Never execute the CREATE TABLE statements as an upgrade to an older schema.
-- Programmes store source IDs and arrangement metadata, not poem text or scans.
CREATE TABLE IF NOT EXISTS recitation_sets (
  id TEXT PRIMARY KEY NOT NULL,
  document TEXT NOT NULL,
  edit_token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  permanent INTEGER NOT NULL DEFAULT 0 CHECK (permanent IN (0, 1)),
  expires_at TEXT
);

CREATE INDEX IF NOT EXISTS recitation_sets_expiration
  ON recitation_sets (permanent, expires_at);

-- Creation-rate buckets contain only hashed, hourly client identifiers.
CREATE TABLE IF NOT EXISTS recitation_creation_limits (
  bucket_key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS recitation_creation_limits_expiry
  ON recitation_creation_limits (expires_at);

-- Daily operational metrics. Cleanup retains at most 90 days.
CREATE TABLE IF NOT EXISTS recitation_maintenance_metrics (
  day TEXT PRIMARY KEY NOT NULL,
  sets_total INTEGER NOT NULL,
  sets_permanent INTEGER NOT NULL,
  sets_expired_pending INTEGER NOT NULL,
  document_bytes_estimate INTEGER NOT NULL,
  deleted_sets INTEGER NOT NULL
);
