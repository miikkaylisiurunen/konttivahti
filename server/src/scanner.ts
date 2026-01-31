import type Docker from 'dockerode';
import { getDockerHubDigest, getRegistryDigest } from './registry';
import type { AppContext } from './types';
import { getLogger } from './logger';

const logger = getLogger('Scanner');

const TRUTHY_LABEL_VALUES = new Set(['1', 'true', 'yes', 'on']);

interface ImageIdentity {
  registry: string;
  image: string;
  tag: string;
  requestedDigest: string | null;
}

export function getRegistryBaseUrl(registry: string): string {
  const lowerRegistry = registry.toLowerCase();
  const host = lowerRegistry.startsWith('[')
    ? lowerRegistry.slice(1, lowerRegistry.indexOf(']'))
    : lowerRegistry.split(':')[0];
  const isLocalRegistry = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  return `${isLocalRegistry ? 'http' : 'https'}://${registry}`;
}

export function getImageIdentityKey(identity: ImageIdentity): string {
  const base = `${identity.registry}/${identity.image}:${identity.tag}`;
  return identity.requestedDigest ? `${base}@${identity.requestedDigest}` : base;
}

export function shouldIgnoreContainer(
  ignoreLabel: string,
  labels?: Record<string, string>,
): boolean {
  if (!ignoreLabel || !labels) return false;
  if (!(ignoreLabel in labels)) return false;

  const rawValue = labels[ignoreLabel];
  if (rawValue === undefined || rawValue === '') return true;

  return TRUTHY_LABEL_VALUES.has(rawValue.trim().toLowerCase());
}

export function parseImage(imageName: string): ImageIdentity | null {
  const trimmed = imageName.trim();
  if (!trimmed) return null;

  const atPos = trimmed.indexOf('@');
  const namePart = atPos === -1 ? trimmed : trimmed.slice(0, atPos);
  const requestedDigest = atPos === -1 ? null : trimmed.slice(atPos + 1);

  if (!namePart) return null;
  if (atPos !== -1 && !requestedDigest) return null;

  const firstSlash = namePart.indexOf('/');
  const firstPart = firstSlash === -1 ? namePart : namePart.slice(0, firstSlash);
  const hasRegistry =
    firstSlash !== -1 &&
    (firstPart.includes('.') || firstPart.includes(':') || firstPart === 'localhost');

  const registry = hasRegistry ? firstPart : 'docker.io';
  const imageWithTag = hasRegistry ? namePart.slice(firstSlash + 1) : namePart;

  if (!imageWithTag) return null;

  const lastColon = imageWithTag.lastIndexOf(':');
  const lastSlash = imageWithTag.lastIndexOf('/');
  const hasTag = lastColon > lastSlash;

  const image = hasTag ? imageWithTag.slice(0, lastColon) : imageWithTag;
  const tag = hasTag ? imageWithTag.slice(lastColon + 1) : 'latest';

  if (!image || !tag) return null;

  return { registry, image, tag, requestedDigest };
}

function parseDateToMs(value?: string): number | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getTime();
}

async function checkContainer(
  ctx: AppContext,
  containerInfo: Docker.ContainerInfo,
  latestDigestCache: Map<string, string>,
  blockedRegistries: Set<string>,
): Promise<ImageIdentity | null> {
  const checkStartedAt = Date.now();
  const container = ctx.docker.getContainer(containerInfo.Id);
  const inspect = await container.inspect();

  const imageName = inspect.Config.Image;
  const parsed = parseImage(imageName);

  if (!parsed) {
    logger.warn(
      { image: imageName, durationMs: Date.now() - checkStartedAt },
      'Skipping unparseable image',
    );
    return null;
  }

  const key = getImageIdentityKey(parsed);
  const latestDigestKey = `${parsed.registry}/${parsed.image}`;
  const name = inspect.Name.replace(/^\//, '');
  const existing = ctx.db.getContainer(
    parsed.registry,
    parsed.image,
    parsed.tag,
    parsed.requestedDigest,
  );

  const imageInspect = await ctx.docker.getImage(inspect.Image).inspect();
  const createdAt = parseDateToMs(imageInspect.Created);

  const repoDigests = imageInspect.RepoDigests || [];

  let localDigest: string | null = null;
  for (const repoDigest of repoDigests) {
    if (repoDigest.includes(`${parsed.image}@`)) {
      const parts = repoDigest.split('@');
      if (parts.length === 2) {
        localDigest = parts[1];
        break;
      }
    }
  }

  if (!localDigest) {
    const now = Date.now();
    logger.info(
      { image: key, durationMs: Date.now() - checkStartedAt },
      'Image has no repo digest and might be built locally or pulled without digest',
    );
    ctx.db.upsertContainer({
      name,
      image: parsed.image,
      tag: parsed.tag,
      registry: parsed.registry,
      requestedDigest: parsed.requestedDigest,
      localDigest: null,
      latestDigest: null,
      status: 'local',
      lastCheckedAt: now,
      lastSuccessAt: null,
      lastUpdateDetectedAt: null,
      createdAt,
      error: null,
    });
    return parsed;
  }

  try {
    let latestDigest = latestDigestCache.get(latestDigestKey);

    if (!latestDigest) {
      if (blockedRegistries.has(parsed.registry)) {
        logger.info(
          { image: key, registry: parsed.registry },
          'Skipping image check because registry is rate limited for this scan',
        );
        return parsed;
      }

      if (parsed.registry === 'docker.io') {
        latestDigest = await getDockerHubDigest(parsed.image);
      } else {
        latestDigest = await getRegistryDigest(getRegistryBaseUrl(parsed.registry), parsed.image);
      }
      latestDigestCache.set(latestDigestKey, latestDigest);
    }

    const status = localDigest === latestDigest ? 'up_to_date' : 'outdated';
    const now = Date.now();
    let lastUpdateDetectedAt: number | null = null;

    if (status === 'outdated') {
      if (!existing || existing.latestDigest !== latestDigest) {
        lastUpdateDetectedAt = now;
      }
    }

    ctx.db.upsertContainer({
      name,
      image: parsed.image,
      tag: parsed.tag,
      registry: parsed.registry,
      requestedDigest: parsed.requestedDigest,
      localDigest,
      latestDigest,
      status,
      lastCheckedAt: now,
      lastSuccessAt: now,
      lastUpdateDetectedAt,
      createdAt,
      error: null,
    });

    logger.info(
      {
        image: key,
        status,
        localDigest,
        latestDigest,
        durationMs: Date.now() - checkStartedAt,
      },
      'Image check complete',
    );
    return parsed;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes('429')) {
      if (!blockedRegistries.has(parsed.registry)) {
        blockedRegistries.add(parsed.registry);
        logger.warn(
          { registry: parsed.registry, image: key },
          'Registry rate limit reached. Skipping remaining checks for this registry in current scan.',
        );
      }
      return parsed;
    }

    logger.error(
      { image: key, error: errorMsg, durationMs: Date.now() - checkStartedAt },
      'Image check failed',
    );
    const now = Date.now();

    ctx.db.upsertContainer({
      name,
      image: parsed.image,
      tag: parsed.tag,
      registry: parsed.registry,
      requestedDigest: parsed.requestedDigest,
      localDigest,
      latestDigest: null,
      status: 'error',
      lastCheckedAt: now,
      lastSuccessAt: null,
      lastUpdateDetectedAt: null,
      createdAt,
      error: errorMsg,
    });
    return parsed;
  }
}

export async function scanContainers(ctx: AppContext): Promise<void> {
  const startedAt = Date.now();

  try {
    const containers = await ctx.docker.listContainers();
    logger.info({ containerCount: containers.length }, 'Scan started');
    const latestDigestCache = new Map<string, string>();
    const blockedRegistries = new Set<string>();
    const cachedContainers = ctx.db.getAllContainers();
    const lastSuccessByKey = new Map<string, number>();

    for (const cached of cachedContainers) {
      lastSuccessByKey.set(getImageIdentityKey(cached), cached.lastSuccessAt ?? 0);
    }

    const sortedContainers = [...containers].sort((a, b) => {
      const parsedA = parseImage(a.Image);
      const parsedB = parseImage(b.Image);
      const keyA = parsedA ? getImageIdentityKey(parsedA) : '';
      const keyB = parsedB ? getImageIdentityKey(parsedB) : '';
      const lastA = lastSuccessByKey.get(keyA) ?? 0;
      const lastB = lastSuccessByKey.get(keyB) ?? 0;

      if (lastA !== lastB) return lastA - lastB;
      return keyA.localeCompare(keyB);
    });

    for (const containerInfo of sortedContainers) {
      if (shouldIgnoreContainer(ctx.env.IGNORE_CONTAINER_LABEL, containerInfo.Labels)) {
        const name = containerInfo.Names?.[0]?.replace(/^\//, '') ?? containerInfo.Id;
        logger.info(
          { container: name, label: ctx.env.IGNORE_CONTAINER_LABEL },
          'Skipping container with ignore label',
        );
        continue;
      }

      await checkContainer(ctx, containerInfo, latestDigestCache, blockedRegistries);
    }

    logger.info(
      { containerCount: containers.length, durationMs: Date.now() - startedAt },
      'Scan complete',
    );
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startedAt,
      },
      'Scan failed',
    );
  }
}
