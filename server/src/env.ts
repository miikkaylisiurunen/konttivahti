import { z } from 'zod';
import cron from 'node-cron';
import 'dotenv/config';

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
    console.error('Environment validation failed:', result.error);
    throw new Error('Invalid environment variables');
  }

  envCache = result.data;
  return envCache;
}
