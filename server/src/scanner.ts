import type Docker from 'dockerode';
import { getDockerHubDigest, getRegistryDigest } from './registry';
import type { AppContext } from './types';

interface ImageIdentity {
  registry: string;
  image: string;
  tag: string;
  requestedDigest: string | null;
}

export function getImageIdentityKey(identity: ImageIdentity): string {
  const base = `${identity.registry}/${identity.image}:${identity.tag}`;
  return identity.requestedDigest ? `${base}@${identity.requestedDigest}` : base;
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

async function checkContainer(
  ctx: AppContext,
  containerInfo: Docker.ContainerInfo,
): Promise<ImageIdentity | null> {
  const container = ctx.docker.getContainer(containerInfo.Id);
  const inspect = await container.inspect();

  const imageName = inspect.Config.Image;
  const parsed = parseImage(imageName);

  if (!parsed) {
    console.log('Skipping unparseable image:', imageName);
    return null;
  }

  const key = getImageIdentityKey(parsed);
  const name = inspect.Name.replace(/^\//, '');
  const imageInspect = await ctx.docker.getImage(inspect.Image).inspect();
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
    console.log('Image has no repo digest and might be built locally or pulled without digest', {
      image: key,
    });
    return parsed;
  }

  try {
    let latestDigest: string | null;

    if (parsed.registry === 'docker.io') {
      latestDigest = await getDockerHubDigest(parsed.image);
    } else {
      latestDigest = await getRegistryDigest(`https://${parsed.registry}`, parsed.image);
    }

    const status = localDigest === latestDigest ? 'up_to_date' : 'outdated';

    if (status === 'outdated') {
      console.log(`Update available for ${parsed.registry}/${parsed.image} (${name}).`);
    }

    console.log(`Checked ${key}: ${status}`);
    return parsed;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`Failed to check ${key}: ${errorMsg}`);
    return parsed;
  }
}

export async function scanContainers(ctx: AppContext): Promise<void> {
  const startedAt = Date.now();

  try {
    const containers = await ctx.docker.listContainers();
    console.log(`Scanning ${containers.length} containers...`);

    for (const containerInfo of containers) {
      await checkContainer(ctx, containerInfo);
    }

    console.log('Scan complete', {
      containerCount: containers.length,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.log('Scan failed:', error instanceof Error ? error.message : String(error));
  }
}
