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

export const ContainersResponse = z.object({
  containers: z.array(Container),
});
export type ContainersResponse = z.infer<typeof ContainersResponse>;

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
