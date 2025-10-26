import Dockerode from 'dockerode';
import { startJobs } from './jobs';
import { getEnv } from './env';
import { DB } from './db';

function main() {
  const env = getEnv();
  const ctx = {
    env,
    db: new DB(env.DATABASE_PATH),
    docker: new Dockerode({ socketPath: env.DOCKER_SOCKET }),
  };

  ctx.db.runMigrations();

  startJobs(ctx);
}

main();
