import { z } from 'zod';

export const ContainerStatus = z.union([
  z.literal('up_to_date'),
  z.literal('outdated'),
  z.literal('local'),
  z.literal('error'),
  z.null(),
]);
export type ContainerStatus = z.infer<typeof ContainerStatus>;

export const Container = z.object({
  error: z.string().nullable(),
  image: z.string(),
  lastCheckedAt: z.number().nullable(),
  lastSuccessAt: z.number().nullable(),
  lastUpdateDetectedAt: z.number().nullable(),
  latestDigest: z.string().nullable(),
  localDigest: z.string().nullable(),
  requestedDigest: z.string().nullable(),
  createdAt: z.number().nullable(),
  name: z.string(),
  registry: z.string(),
  status: ContainerStatus,
  tag: z.string(),
});
export type Container = z.infer<typeof Container>;

export const ScanState = z.object({
  isScanning: z.boolean(),
  startedAt: z.number().nullable(),
  lastFinishedAt: z.number().nullable(),
});
export type ScanState = z.infer<typeof ScanState>;

export const ContainersResponse = z.object({
  containers: z.array(Container),
  scan: ScanState,
});
export type ContainersResponse = z.infer<typeof ContainersResponse>;

export const ScanStartResponse = z.object({
  started: z.boolean(),
  scan: ScanState,
});
export type ScanStartResponse = z.infer<typeof ScanStartResponse>;

export const NotificationEventDefinition = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
});
export type NotificationEventDefinition = z.infer<typeof NotificationEventDefinition>;

export const SettingsResponse = z.object({
  notifications_enabled: z.boolean(),
  notifications_recipients: z.array(z.string()),
  notifications_events: z.array(z.string()),
  notifications_available_events: z.array(NotificationEventDefinition),
});
export type SettingsResponse = z.infer<typeof SettingsResponse>;

export const NotificationTestResponse = z.object({
  attempted: z.boolean(),
  sent: z.boolean(),
  error: z.string().optional(),
});
export type NotificationTestResponse = z.infer<typeof NotificationTestResponse>;

export const AuthState = z.object({
  isInitialized: z.boolean(),
  isAuthenticated: z.boolean(),
});
export type AuthState = z.infer<typeof AuthState>;

export const ApiErrorResponse = z.object({
  error: z.string(),
  name: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});
export type ApiErrorResponse = z.infer<typeof ApiErrorResponse>;
