import { afterEach, describe, it, expect, vi } from 'vitest';
import { getDockerHubDigest, getRegistryDigest, parseWWWAuthenticate } from './registry';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('parseWWWAuthenticate', () => {
  it('parses full www-authenticate header', () => {
    const header =
      'Bearer realm="https://ghcr.io/token",service="ghcr.io",scope="repository:user/repo:pull"';
    expect(parseWWWAuthenticate(header)).toEqual({
      realm: 'https://ghcr.io/token',
      service: 'ghcr.io',
      scope: 'repository:user/repo:pull',
    });
  });

  it('parses header with only realm', () => {
    const header = 'Bearer realm="https://auth.docker.io/token"';
    expect(parseWWWAuthenticate(header)).toEqual({
      realm: 'https://auth.docker.io/token',
    });
  });

  it('parses header with realm and service', () => {
    const header = 'Bearer realm="https://auth.docker.io/token",service="registry.docker.io"';
    expect(parseWWWAuthenticate(header)).toEqual({
      realm: 'https://auth.docker.io/token',
      service: 'registry.docker.io',
    });
  });

  it('parses header with realm and scope', () => {
    const header =
      'Bearer realm="https://auth.docker.io/token",scope="repository:library/nginx:pull"';
    expect(parseWWWAuthenticate(header)).toEqual({
      realm: 'https://auth.docker.io/token',
      scope: 'repository:library/nginx:pull',
    });
  });

  it('parses header with spaces after commas', () => {
    const header =
      'Bearer realm="https://ghcr.io/token", service="ghcr.io", scope="repository:user/repo:pull"';
    expect(parseWWWAuthenticate(header)).toEqual({
      realm: 'https://ghcr.io/token',
      service: 'ghcr.io',
      scope: 'repository:user/repo:pull',
    });
  });

  it('parses only the supported fields when extra params are present', () => {
    const header =
      'Bearer realm="https://auth.docker.io/token",service="registry.docker.io",scope="repository:library/nginx:pull",error="insufficient_scope"';
    expect(parseWWWAuthenticate(header)).toEqual({
      realm: 'https://auth.docker.io/token',
      service: 'registry.docker.io',
      scope: 'repository:library/nginx:pull',
    });
  });

  it('parses header when parameters use a different order', () => {
    const header =
      'Bearer realm="https://auth.docker.io/token",scope="repository:library/nginx:pull",service="registry.docker.io"';
    expect(parseWWWAuthenticate(header)).toEqual({
      realm: 'https://auth.docker.io/token',
      service: 'registry.docker.io',
      scope: 'repository:library/nginx:pull',
    });
  });

  it('parses header when spaces surround equals signs', () => {
    const header =
      'Bearer realm = "https://auth.docker.io/token",service = "registry.docker.io",scope = "repository:library/nginx:pull"';
    expect(parseWWWAuthenticate(header)).toEqual({
      realm: 'https://auth.docker.io/token',
      service: 'registry.docker.io',
      scope: 'repository:library/nginx:pull',
    });
  });

  it('parses lowercase bearer scheme', () => {
    const header =
      'bearer realm="https://ghcr.io/token",service="ghcr.io",scope="repository:user/repo:pull"';
    expect(parseWWWAuthenticate(header)).toEqual({
      realm: 'https://ghcr.io/token',
      service: 'ghcr.io',
      scope: 'repository:user/repo:pull',
    });
  });

  it('returns null for non-Bearer header', () => {
    expect(parseWWWAuthenticate('Basic realm="test"')).toBeNull();
  });

  it('returns null for malformed header', () => {
    expect(parseWWWAuthenticate('Bearer invalid')).toBeNull();
  });
});

describe('getRegistryDigest', () => {
  it('requests the manifest for the supplied tag', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: { 'Docker-Content-Digest': 'sha256:remote-17' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(getRegistryDigest('https://registry.example.com', 'team/app', '17')).resolves.toBe(
      'sha256:remote-17',
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://registry.example.com/v2/team/app/manifests/17',
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://registry.example.com/v2/team/app/manifests/17',
      expect.any(Object),
    );
  });
});

describe('getDockerHubDigest', () => {
  it('uses Docker Hub library namespace and supplied tag', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: { 'Docker-Content-Digest': 'sha256:postgres-17' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(getDockerHubDigest('postgres', '17')).resolves.toBe('sha256:postgres-17');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://registry-1.docker.io/v2/library/postgres/manifests/17',
      expect.any(Object),
    );
  });
});
