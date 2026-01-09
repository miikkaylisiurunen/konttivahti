import { z } from 'zod';
import cron from 'node-cron';
import 'dotenv/config';
import { getLogger } from './logger';

const logger = getLogger('Env');

const Env = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_PATH: z.string().min(1),
  SCAN_SCHEDULE: z
    .string()
    .default('0 */6 * * *')
    .refine((val) => cron.validate(val)),
  DOCKER_SOCKET: z.string().default('/var/run/docker.sock'),
  IGNORE_CONTAINER_LABEL: z.string().default('konttivahti.ignore'),
});
export type Env = z.infer<typeof Env>;

let envCache: Env | null = null;

export function getEnv(): Env {
  if (envCache) return envCache;

  const result = Env.safeParse(process.env);

  if (!result.success) {
    logger.error({ err: result.error }, 'Environment validation failed');
    throw new Error('Invalid environment variables');
  }

  envCache = result.data;
  return envCache;
}
