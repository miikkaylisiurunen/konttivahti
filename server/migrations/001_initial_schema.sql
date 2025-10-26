CREATE TABLE IF NOT EXISTS image_cache (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  name                 TEXT NOT NULL,
  image                TEXT NOT NULL,
  tag                  TEXT NOT NULL,
  requestedDigest      TEXT,
  registry             TEXT NOT NULL,
  localDigest          TEXT,
  latestDigest         TEXT,
  status               TEXT,
  lastCheckedAt        INTEGER,
  lastSuccessAt        INTEGER,
  lastUpdateDetectedAt INTEGER,
  createdAt            INTEGER,
  error                TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_image_cache_identity
ON image_cache(registry, image, tag, IFNULL(requestedDigest, ''));
