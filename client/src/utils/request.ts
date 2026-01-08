import { z } from 'zod';
import { ApiErrorResponse } from '../types';

export type ApiResponseResult<TSuccess> =
  | { ok: true; data: TSuccess; response: Response }
  | { ok: false; error: ApiErrorResponse; response: Response };

export function apiRequest(
  endpoint: string,
  { headers, ...options }: RequestInit = {},
): Promise<Response> {
  const finalHeaders = new Headers(headers);

  if (options.body && !finalHeaders.has('Content-Type')) {
    finalHeaders.set('Content-Type', 'application/json');
  }

  return fetch(endpoint, {
    ...options,
    headers: finalHeaders,
    credentials: 'same-origin',
  });
}

export async function parseApiResponse<TSuccess>(
  response: Response,
  schema: z.ZodType<TSuccess>,
): Promise<ApiResponseResult<TSuccess>> {
  const rawPayload = await response.json().catch(() => null);

  if (response.ok) {
    const parsedPayload = schema.safeParse(rawPayload);
    if (parsedPayload.success) {
      return { ok: true, data: parsedPayload.data, response };
    }

    return {
      ok: false,
      error: { error: 'Invalid response payload', name: 'ResponseParseError' },
      response,
    };
  }

  const parsedError = ApiErrorResponse.safeParse(rawPayload);

  if (parsedError.success) {
    return { ok: false, error: parsedError.data, response };
  }

  return {
    ok: false,
    error: {
      error: `Request failed (${response.status})`,
      name: 'HttpError',
    },
    response,
  };
}
