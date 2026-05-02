import { startJobs } from './jobs';
import { getEnv } from './env';
import { DB } from './db';
import { createApp } from './app';
import { getLogger } from './logger';
import { createDockerClient } from './docker';

const logger = getLogger('Server');

function main() {
  const env = getEnv();
  const ctx = {
    env,
    db: new DB(env.DATABASE_PATH),
    docker: createDockerClient(env),
  };

  ctx.db.runMigrations();

  const app = createApp(ctx);
  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'Server listening');
  });

  startJobs(ctx);
}

main();
