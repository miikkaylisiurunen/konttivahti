import type Docker from 'dockerode';
import { z } from 'zod';
import { Env } from './env';
import { DB } from './db';

export interface AppContext {
  env: Env;
  db: DB;
  docker: Docker;
}

export const RegistryToken = z.object({
  token: z.string().optional(),
  access_token: z.string().optional(),
});
export type RegistryToken = z.infer<typeof RegistryToken>;

export interface DbContainer {
  id: number;
  name: string;
  image: string;
  tag: string;
  requestedDigest: string | null;
  registry: string;
  localDigest: string | null;
  latestDigest: string | null;
  status: 'up_to_date' | 'outdated' | 'local' | 'error' | null;
  lastCheckedAt: number | null;
  lastSuccessAt: number | null;
  lastUpdateDetectedAt: number | null;
  createdAt: number | null;
  error: string | null;
}

export type ApiContainer = Omit<DbContainer, 'id'>;
