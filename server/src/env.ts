import { z } from 'zod';
import cron from 'node-cron';
import 'dotenv/config';

const Env = z.object({
  SCAN_SCHEDULE: z
    .string()
    .default('0 */6 * * *')
    .refine((val) => cron.validate(val)),
  DOCKER_SOCKET: z.string().default('/var/run/docker.sock'),
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
