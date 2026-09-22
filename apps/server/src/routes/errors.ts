import type { Context } from 'hono';
import type { ErrorCode, ErrorDto } from '@nodo/shared';

export function errorResponse(
  c: Context,
  status: 400 | 404 | 409 | 410 | 429 | 500,
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
) {
  const body: ErrorDto = { code, message, ...(details ? { details } : {}) };
  return c.json(body, status);
}
