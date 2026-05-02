import Dockerode from 'dockerode';
import type Docker from 'dockerode';
import type { Env } from './env';

type DockerEnv = Pick<Env, 'DOCKER_HOST' | 'DOCKER_SOCKET'>;

export function getDockerOptions(env: DockerEnv): Docker.DockerOptions {
  if (!env.DOCKER_HOST) {
    return { socketPath: env.DOCKER_SOCKET };
  }

  const dockerHost = new URL(env.DOCKER_HOST);

  if (dockerHost.protocol === 'unix:') {
    return { socketPath: dockerHost.pathname };
  }

  if (dockerHost.protocol === 'tcp:' || dockerHost.protocol === 'http:') {
    return {
      protocol: 'http',
      host: dockerHost.hostname,
      port: dockerHost.port,
    };
  }

  if (dockerHost.protocol === 'https:') {
    return {
      protocol: 'https',
      host: dockerHost.hostname,
      port: dockerHost.port,
    };
  }

  throw new Error(`Unsupported DOCKER_HOST protocol: ${dockerHost.protocol}`);
}

export function createDockerClient(env: DockerEnv): Docker {
  return new Dockerode(getDockerOptions(env));
}
