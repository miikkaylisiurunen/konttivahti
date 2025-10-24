import Dockerode from 'dockerode';
import { startJobs } from './jobs';
import { getEnv } from './env';

function main() {
  const env = getEnv();
  const ctx = {
    env,
    docker: new Dockerode({ socketPath: env.DOCKER_SOCKET }),
  };
  startJobs(ctx);
}

main();
