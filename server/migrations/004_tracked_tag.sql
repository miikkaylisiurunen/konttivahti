ALTER TABLE image_cache
ADD COLUMN trackedTag TEXT NOT NULL DEFAULT 'latest';

DROP INDEX IF EXISTS idx_image_cache_identity;

CREATE UNIQUE INDEX IF NOT EXISTS idx_image_cache_identity
ON image_cache(registry, image, tag, trackedTag, IFNULL(requestedDigest, ''));
