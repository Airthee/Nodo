import { z } from 'zod';

export const ErrorCodeSchema = z.enum([
  'invalid_share_id',
  'invalid_body',
  'share_deleted',
  'snapshot_conflict',
  'rate_limited',
  'internal_error',
]);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ErrorDtoSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});

export type ErrorDto = z.infer<typeof ErrorDtoSchema>;
