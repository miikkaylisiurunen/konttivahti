import type Docker from 'dockerode';
import { z } from 'zod';
import type { DB } from './db';
import type { Env } from './env';

export interface AppContext {
  env: Env;
  db: DB;
  docker: Docker;
}

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

export const NotificationTest = z.object({
  url: z.string().trim().min(1),
});
export type NotificationTest = z.infer<typeof NotificationTest>;

export const AuthState = z.object({
  isInitialized: z.boolean(),
  isAuthenticated: z.boolean(),
});
export type AuthState = z.infer<typeof AuthState>;

export const AuthCredentials = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
export type AuthCredentials = z.infer<typeof AuthCredentials>;

export const RegistryToken = z.object({
  token: z.string().optional(),
  access_token: z.string().optional(),
});
export type RegistryToken = z.infer<typeof RegistryToken>;

export const NotificationEventCatalog = [
  {
    id: 'update-available',
    label: 'New version detected',
    description: 'Alert when a container image has a newer version available.',
  },
  {
    id: 'scan-error',
    label: 'Image scan failed',
    description: 'Notify when a registry lookup or scan throws an error.',
  },
  {
    id: 'suspicious-login',
    label: 'Suspicious login attempts',
    description: 'Notify on repeated failed login attempts.',
  },
] as const;
export type NotificationEventCatalogEntry = (typeof NotificationEventCatalog)[number];
export type NotificationEventKey = NotificationEventCatalogEntry['id'];

export const ApiSettings = z.object({
  notifications_enabled: z.boolean(),
  notifications_recipients: z.array(z.string().trim().min(1)),
  notifications_events: z
    .array(z.string().trim().min(1))
    .refine(
      (events) =>
        events.every((event) => NotificationEventCatalog.some((entry) => entry.id === event)),
      { message: 'Invalid notification event key' },
    ),
});
export type ApiSettings = z.infer<typeof ApiSettings>;
