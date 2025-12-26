import Dockerode from 'dockerode';
import { startJobs } from './jobs';
import { getEnv } from './env';
import { DB } from './db';
import { createApp } from './app';

function main() {
  const env = getEnv();
  const ctx = {
    env,
    db: new DB(env.DATABASE_PATH),
    docker: new Dockerode({ socketPath: env.DOCKER_SOCKET }),
  };

  ctx.db.runMigrations();

  const app = createApp(ctx);
  app.listen(env.PORT, () => {
    console.log(`Server listening on port ${env.PORT}`);
  });

  startJobs(ctx);
}

main();
