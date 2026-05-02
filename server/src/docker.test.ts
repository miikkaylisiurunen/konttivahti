import { describe, expect, it } from 'vitest';
import { getDockerOptions } from './docker';

describe('getDockerOptions', () => {
  it('uses DOCKER_SOCKET when DOCKER_HOST is not set', () => {
    expect(
      getDockerOptions({
        DOCKER_SOCKET: '/var/run/docker.sock',
        DOCKER_HOST: undefined,
      }),
    ).toEqual({ socketPath: '/var/run/docker.sock' });
  });

  it('supports unix DOCKER_HOST values', () => {
    expect(
      getDockerOptions({
        DOCKER_SOCKET: '/var/run/docker.sock',
        DOCKER_HOST: 'unix:///custom/docker.sock',
      }),
    ).toEqual({ socketPath: '/custom/docker.sock' });
  });

  it('supports tcp Docker API endpoints', () => {
    expect(
      getDockerOptions({
        DOCKER_SOCKET: '/var/run/docker.sock',
        DOCKER_HOST: 'tcp://docker-socket-proxy:2375',
      }),
    ).toEqual({
      protocol: 'http',
      host: 'docker-socket-proxy',
      port: '2375',
    });
  });

  it('supports http Docker API endpoints', () => {
    expect(
      getDockerOptions({
        DOCKER_SOCKET: '/var/run/docker.sock',
        DOCKER_HOST: 'http://docker-socket-proxy:2375',
      }),
    ).toEqual({
      protocol: 'http',
      host: 'docker-socket-proxy',
      port: '2375',
    });
  });

  it('rejects unsupported protocols', () => {
    expect(() =>
      getDockerOptions({
        DOCKER_SOCKET: '/var/run/docker.sock',
        DOCKER_HOST: 'ssh://docker-host',
      }),
    ).toThrow(/Unsupported DOCKER_HOST protocol/i);
  });
});
