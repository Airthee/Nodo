import type { Context, Next } from 'hono';
import { ShareIdSchema } from '@nodo/shared';
import { errorResponse } from '../routes/errors';

export async function validateShareId(c: Context, next: Next) {
  const shareId = c.req.param('shareId');
  if (!shareId || !ShareIdSchema.safeParse(shareId).success) {
    return errorResponse(c, 400, 'invalid_share_id', 'shareId must be 32 hex chars');
  }
  return next();
}
