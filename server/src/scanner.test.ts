import { describe, it, expect } from 'vitest';
import { getImageIdentityKey, parseImage, shouldIgnoreContainer } from './scanner';

describe('parseImage', () => {
  it('parses simple image name', () => {
    expect(parseImage('nginx')).toEqual({
      registry: 'docker.io',
      image: 'nginx',
      tag: 'latest',
      requestedDigest: null,
    });
  });

  it('parses image with tag', () => {
    expect(parseImage('nginx:1.25')).toEqual({
      registry: 'docker.io',
      image: 'nginx',
      tag: '1.25',
      requestedDigest: null,
    });
  });

  it('trims surrounding whitespace before parsing', () => {
    expect(parseImage('  nginx:1.25  ')).toEqual({
      registry: 'docker.io',
      image: 'nginx',
      tag: '1.25',
      requestedDigest: null,
    });
  });

  it('parses image with namespace', () => {
    expect(parseImage('library/nginx:latest')).toEqual({
      registry: 'docker.io',
      image: 'library/nginx',
      tag: 'latest',
      requestedDigest: null,
    });
  });

  it('treats a slash-separated namespace as a docker.io image, not a registry', () => {
    expect(parseImage('team/service')).toEqual({
      registry: 'docker.io',
      image: 'team/service',
      tag: 'latest',
      requestedDigest: null,
    });
  });

  it('parses ghcr.io image', () => {
    expect(parseImage('ghcr.io/user/repo:v1.0.0')).toEqual({
      registry: 'ghcr.io',
      image: 'user/repo',
      tag: 'v1.0.0',
      requestedDigest: null,
    });
  });

  it('parses custom registry image without tag', () => {
    expect(parseImage('registry.example.com/myapp/backend')).toEqual({
      registry: 'registry.example.com',
      image: 'myapp/backend',
      tag: 'latest',
      requestedDigest: null,
    });
  });

  it('parses docker.io with explicit registry', () => {
    expect(parseImage('docker.io/nginx')).toEqual({
      registry: 'docker.io',
      image: 'nginx',
      tag: 'latest',
      requestedDigest: null,
    });
  });

  it('parses image with digest only', () => {
    expect(parseImage('nginx@sha256:1234abcd')).toEqual({
      registry: 'docker.io',
      image: 'nginx',
      tag: 'latest',
      requestedDigest: 'sha256:1234abcd',
    });
  });

  it('parses image with tag and digest', () => {
    expect(parseImage('nginx:1.25@sha256:1234abcd')).toEqual({
      registry: 'docker.io',
      image: 'nginx',
      tag: '1.25',
      requestedDigest: 'sha256:1234abcd',
    });
  });

  it('parses image from registry with port', () => {
    expect(parseImage('registry.example.com:5000/team/app:1.2.3')).toEqual({
      registry: 'registry.example.com:5000',
      image: 'team/app',
      tag: '1.2.3',
      requestedDigest: null,
    });
  });

  it('parses localhost registry with port', () => {
    expect(parseImage('localhost:5000/myapp:1.0')).toEqual({
      registry: 'localhost:5000',
      image: 'myapp',
      tag: '1.0',
      requestedDigest: null,
    });
  });

  it('parses localhost registry without port', () => {
    expect(parseImage('localhost/myapp:1.0')).toEqual({
      registry: 'localhost',
      image: 'myapp',
      tag: '1.0',
      requestedDigest: null,
    });
  });

  it('parses loopback ipv4 registry with port', () => {
    expect(parseImage('127.0.0.1:5000/myapp:1.0')).toEqual({
      registry: '127.0.0.1:5000',
      image: 'myapp',
      tag: '1.0',
      requestedDigest: null,
    });
  });

  it('parses loopback ipv6 registry with port', () => {
    expect(parseImage('[::1]:5000/myapp:1.0')).toEqual({
      registry: '[::1]:5000',
      image: 'myapp',
      tag: '1.0',
      requestedDigest: null,
    });
  });

  it('parses docker.io with explicit namespace path', () => {
    expect(parseImage('docker.io/library/nginx:latest')).toEqual({
      registry: 'docker.io',
      image: 'library/nginx',
      tag: 'latest',
      requestedDigest: null,
    });
  });

  it('parses image with nested path, tag, and digest from custom registry', () => {
    expect(parseImage('ghcr.io/org/platform/service:v2@sha256:abcd1234')).toEqual({
      registry: 'ghcr.io',
      image: 'org/platform/service',
      tag: 'v2',
      requestedDigest: 'sha256:abcd1234',
    });
  });

  it('parses image with namespace and digest', () => {
    expect(parseImage('library/nginx@sha256:1234abcd')).toEqual({
      registry: 'docker.io',
      image: 'library/nginx',
      tag: 'latest',
      requestedDigest: 'sha256:1234abcd',
    });
  });

  it('parses explicit registry image with digest and no tag', () => {
    expect(parseImage('ghcr.io/org/app@sha256:abcd')).toEqual({
      registry: 'ghcr.io',
      image: 'org/app',
      tag: 'latest',
      requestedDigest: 'sha256:abcd',
    });
  });

  it('returns null for empty string', () => {
    expect(parseImage('')).toBeNull();
  });

  it('returns null for whitespace only string', () => {
    expect(parseImage('   ')).toBeNull();
  });

  it('returns null when registry is present without image path', () => {
    expect(parseImage('ghcr.io/')).toBeNull();
  });

  it('returns null when tag separator is present without tag', () => {
    expect(parseImage('nginx:')).toBeNull();
  });

  it('returns null when digest separator is present without digest', () => {
    expect(parseImage('nginx@')).toBeNull();
  });
});

describe('shouldIgnoreContainer', () => {
  const label = 'konttivahti.ignore';

  it('returns false when label is missing', () => {
    expect(shouldIgnoreContainer(label, { 'other.label': 'true' })).toBe(false);
  });

  it('returns true when ignore label is truthy among other labels', () => {
    expect(
      shouldIgnoreContainer(label, {
        'com.example.service': 'api',
        'com.example.env': 'prod',
        [label]: 'true',
      }),
    ).toBe(true);
  });

  it('returns false when labels are undefined', () => {
    expect(shouldIgnoreContainer(label, undefined)).toBe(false);
  });

  it('returns true when label is present with empty value', () => {
    expect(shouldIgnoreContainer(label, { [label]: '' })).toBe(true);
  });

  it('returns true for truthy label values', () => {
    expect(shouldIgnoreContainer(label, { [label]: 'true' })).toBe(true);
    expect(shouldIgnoreContainer(label, { [label]: '1' })).toBe(true);
    expect(shouldIgnoreContainer(label, { [label]: ' TRUE ' })).toBe(true);
    expect(shouldIgnoreContainer(label, { [label]: ' On ' })).toBe(true);
  });

  it('returns false for non-truthy label values', () => {
    expect(shouldIgnoreContainer(label, { [label]: 'false' })).toBe(false);
    expect(shouldIgnoreContainer(label, { [label]: '0' })).toBe(false);
    expect(shouldIgnoreContainer(label, { [label]: 'abc' })).toBe(false);
  });
});

describe('getImageIdentityKey', () => {
  it('includes requested digest in the key', () => {
    expect(
      getImageIdentityKey({
        registry: 'docker.io',
        image: 'nginx',
        tag: 'latest',
        requestedDigest: 'sha256:aaa',
      }),
    ).toBe('docker.io/nginx:latest@sha256:aaa');
  });

  it('separates digest-pinned image from plain tag image', () => {
    const plainKey = getImageIdentityKey({
      registry: 'docker.io',
      image: 'nginx',
      tag: 'latest',
      requestedDigest: null,
    });
    const pinnedKey = getImageIdentityKey({
      registry: 'docker.io',
      image: 'nginx',
      tag: 'latest',
      requestedDigest: 'sha256:bbb',
    });

    expect(plainKey).not.toBe(pinnedKey);
  });

  it('normalizes null and empty digest to the same key', () => {
    const nullDigestKey = getImageIdentityKey({
      registry: 'docker.io',
      image: 'nginx',
      tag: 'latest',
      requestedDigest: null,
    });
    const emptyDigestKey = getImageIdentityKey({
      registry: 'docker.io',
      image: 'nginx',
      tag: 'latest',
      requestedDigest: '',
    });

    expect(nullDigestKey).toBe(emptyDigestKey);
    expect(nullDigestKey).toBe('docker.io/nginx:latest');
  });

  it('changes key when registry, image, or tag changes', () => {
    const baseInput = {
      registry: 'docker.io',
      image: 'nginx',
      tag: 'latest',
      requestedDigest: null,
    } as const;
    const base = getImageIdentityKey(baseInput);
    const differentRegistry = getImageIdentityKey({ ...baseInput, registry: 'ghcr.io' });
    const differentImage = getImageIdentityKey({ ...baseInput, image: 'library/nginx' });
    const differentTag = getImageIdentityKey({ ...baseInput, tag: '1.25' });

    expect(base).not.toBe(differentRegistry);
    expect(base).not.toBe(differentImage);
    expect(base).not.toBe(differentTag);
  });
});
