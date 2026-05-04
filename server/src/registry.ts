import { RegistryToken } from './types';

interface CachedToken {
  token: string;
  expiresAt: number;
}

interface WWWAuthenticate {
  realm: string;
  service?: string;
  scope?: string;
}

const tokenCache = new Map<string, CachedToken>();

// Parse www-authenticate header to extract auth parameters
// Example: Bearer realm="https://ghcr.io/token",service="ghcr.io",scope="repository:linuxserver/nginx:pull"
export function parseWWWAuthenticate(header: string): WWWAuthenticate | null {
  const schemeMatch = header.match(/^Bearer\s+(.+)$/i);
  if (!schemeMatch) return null;

  const params = new Map<string, string>();
  const paramPattern = /([a-zA-Z][a-zA-Z0-9_-]*)\s*=\s*"([^"]*)"/g;

  for (const match of schemeMatch[1].matchAll(paramPattern)) {
    params.set(match[1].toLowerCase(), match[2]);
  }

  const realm = params.get('realm');
  if (!realm) return null;

  return {
    realm,
    service: params.get('service'),
    scope: params.get('scope'),
  };
}

async function getRegistryToken(
  registryUrl: string,
  image: string,
  tag: string,
): Promise<string | null> {
  const cacheKey = `${registryUrl}:${image}:${tag}`;
  const cached = tokenCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  const probeRes = await fetch(`${registryUrl}/v2/${image}/manifests/${tag}`, {
    headers: {
      Accept:
        'application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.index.v1+json',
    },
  });

  if (probeRes.ok) {
    return null;
  }

  if (probeRes.status !== 401) {
    throw new Error(`Unexpected response status: ${probeRes.status}`);
  }

  const wwwAuth = probeRes.headers.get('www-authenticate');
  if (!wwwAuth) {
    throw new Error('No www-authenticate header in 401 response');
  }

  const authParams = parseWWWAuthenticate(wwwAuth);
  if (!authParams) {
    throw new Error('Failed to parse www-authenticate header');
  }

  const tokenUrl = new URL(authParams.realm);
  if (authParams.service) {
    tokenUrl.searchParams.set('service', authParams.service);
  }
  if (authParams.scope) {
    tokenUrl.searchParams.set('scope', authParams.scope);
  }

  const tokenRes = await fetch(tokenUrl.toString());
  if (!tokenRes.ok) {
    throw new Error(`Token fetch failed: ${tokenRes.status}`);
  }

  const parsedToken = RegistryToken.safeParse(await tokenRes.json());
  if (!parsedToken.success) {
    throw new Error('Invalid token response');
  }

  const tokenData = parsedToken.data;
  const token = tokenData.token || tokenData.access_token;

  if (!token) {
    throw new Error('No token in response');
  }

  tokenCache.set(cacheKey, {
    token,
    expiresAt: Date.now() + 240 * 1000,
  });

  return token;
}

export async function getRegistryDigest(
  registryUrl: string,
  image: string,
  tag: string,
): Promise<string> {
  const token = await getRegistryToken(registryUrl, image, tag);

  const headers: Record<string, string> = {
    Accept:
      'application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.v2+json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const manifestRes = await fetch(`${registryUrl}/v2/${image}/manifests/${tag}`, {
    headers,
  });

  if (!manifestRes.ok) {
    throw new Error(`Registry API error: ${manifestRes.status}`);
  }

  const digest = manifestRes.headers.get('Docker-Content-Digest');
  if (!digest) {
    throw new Error('No Docker-Content-Digest header in response');
  }

  return digest;
}

export async function getDockerHubDigest(image: string, tag: string): Promise<string> {
  const fullImage = image.includes('/') ? image : `library/${image}`;
  return getRegistryDigest('https://registry-1.docker.io', fullImage, tag);
}
