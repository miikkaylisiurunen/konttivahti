import type { ApiContainer, AppContext, DbContainer } from './types';
import { getImageIdentityKey, parseImage, shouldIgnoreContainer } from './scanner';
import { getLogger } from './logger';

const logger = getLogger('Status');

function buildCacheMap(rows: DbContainer[]): Map<string, DbContainer> {
  const map = new Map<string, DbContainer>();
  for (const row of rows) {
    map.set(getImageIdentityKey(row), row);
  }
  return map;
}

export async function getStatusContainers(ctx: AppContext): Promise<ApiContainer[]> {
  const containers = await ctx.docker.listContainers();
  const cache = buildCacheMap(ctx.db.getAllContainers());
  const results: ApiContainer[] = [];

  for (const containerInfo of containers) {
    if (shouldIgnoreContainer(ctx.env.IGNORE_CONTAINER_LABEL, containerInfo.Labels)) {
      continue;
    }

    const parsed = parseImage(containerInfo.Image);
    if (!parsed) {
      logger.warn({ image: containerInfo.Image }, 'Skipping unparsable image');
      continue;
    }

    const key = getImageIdentityKey(parsed);
    const cached = cache.get(key);
    const name = containerInfo.Names?.[0]?.replace(/^\//, '') ?? containerInfo.Id;
    results.push({
      name,
      image: parsed.image,
      tag: parsed.tag,
      requestedDigest: parsed.requestedDigest,
      registry: parsed.registry,
      localDigest: cached?.localDigest ?? null,
      latestDigest: cached?.latestDigest ?? null,
      status: cached?.status ?? null,
      createdAt: cached?.createdAt ?? null,
      lastCheckedAt: cached?.lastCheckedAt ?? null,
      lastSuccessAt: cached?.lastSuccessAt ?? null,
      lastUpdateDetectedAt: cached?.lastUpdateDetectedAt ?? null,
      error: cached?.error ?? null,
    });
  }

  return results;
}
