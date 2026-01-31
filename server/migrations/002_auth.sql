CREATE TABLE IF NOT EXISTS sessions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash   TEXT NOT NULL UNIQUE,
  createdAt    INTEGER NOT NULL,
  lastAccessed INTEGER NOT NULL,
  expiresAt    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires
ON sessions(expiresAt);

CREATE TABLE IF NOT EXISTS auth_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  createdAt INTEGER NOT NULL
);
