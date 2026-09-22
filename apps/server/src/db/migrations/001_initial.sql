CREATE TABLE IF NOT EXISTS shares (
  share_id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER,
  snapshot_ciphertext BLOB,
  snapshot_nonce BLOB,
  snapshot_uploaded_by TEXT,
  snapshot_uploaded_at INTEGER,
  snapshot_seq INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ops (
  share_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  device_id TEXT NOT NULL,
  ciphertext BLOB NOT NULL,
  nonce BLOB NOT NULL,
  client_ts INTEGER NOT NULL,
  server_ts INTEGER NOT NULL,
  PRIMARY KEY (share_id, seq),
  FOREIGN KEY (share_id) REFERENCES shares(share_id)
);

CREATE INDEX IF NOT EXISTS ops_by_share_seq ON ops(share_id, seq);

CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
