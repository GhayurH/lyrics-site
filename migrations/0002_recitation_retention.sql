-- Apply after 0001, once per database. Existing published IDs and edit tokens are preserved.
-- SQLite requires a separate UPDATE when a new column needs a dynamic default.
ALTER TABLE recitation_sets ADD COLUMN permanent INTEGER NOT NULL DEFAULT 0 CHECK (permanent IN (0, 1));
ALTER TABLE recitation_sets ADD COLUMN expires_at TEXT;
UPDATE recitation_sets
SET expires_at = strftime('%Y-%m-%dT%H:%M:%fZ', updated_at, '+24 months')
WHERE expires_at IS NULL;
CREATE INDEX IF NOT EXISTS recitation_sets_expiration ON recitation_sets (permanent, expires_at);

-- Only anonymized one-hour bucket keys are kept; not raw IP addresses.
CREATE TABLE IF NOT EXISTS recitation_creation_limits (
  bucket_key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS recitation_creation_limits_expiry ON recitation_creation_limits (expires_at);

-- Compact daily totals for trend monitoring. Retain only the last 90 days.
CREATE TABLE IF NOT EXISTS recitation_maintenance_metrics (
  day TEXT PRIMARY KEY NOT NULL,
  sets_total INTEGER NOT NULL,
  sets_permanent INTEGER NOT NULL,
  sets_expired_pending INTEGER NOT NULL,
  document_bytes_estimate INTEGER NOT NULL,
  deleted_sets INTEGER NOT NULL
);
