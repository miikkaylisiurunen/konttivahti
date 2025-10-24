import type Docker from 'dockerode';
import { z } from 'zod';
import { Env } from './env';

export interface AppContext {
  env: Env;
  docker: Docker;
}

export const RegistryToken = z.object({
  token: z.string().optional(),
  access_token: z.string().optional(),
});
export type RegistryToken = z.infer<typeof RegistryToken>;
