import { z } from 'zod';

const SHARE_ID_HEX = /^[0-9a-f]{32}$/;
const BASE64 = /^[A-Za-z0-9+/=]+$/;

export const ShareIdSchema = z.string().regex(SHARE_ID_HEX, 'shareId must be 32 hex chars');

export const DeviceIdSchema = z.string().uuid();

export const Base64Schema = z.string().regex(BASE64, 'must be base64');

export const OperationDtoSchema = z.object({
  deviceId: DeviceIdSchema,
  nonce: Base64Schema,
  ciphertext: Base64Schema,
  clientTs: z.number().int().nonnegative(),
});

export type OperationDto = z.infer<typeof OperationDtoSchema>;

export const StoredOperationDtoSchema = OperationDtoSchema.extend({
  seq: z.number().int().positive(),
  serverTs: z.number().int().nonnegative(),
});

export type StoredOperationDto = z.infer<typeof StoredOperationDtoSchema>;

export const OperationBatchDtoSchema = z.object({
  operations: z.array(OperationDtoSchema).min(1).max(500),
});

export type OperationBatchDto = z.infer<typeof OperationBatchDtoSchema>;

export const OperationBatchAckDtoSchema = z.object({
  accepted: z.array(
    z.object({
      seq: z.number().int().positive(),
      clientTs: z.number().int().nonnegative(),
    }),
  ),
});

export type OperationBatchAckDto = z.infer<typeof OperationBatchAckDtoSchema>;

export const OperationsPageDtoSchema = z.object({
  operations: z.array(StoredOperationDtoSchema),
  highestSeq: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});

export type OperationsPageDto = z.infer<typeof OperationsPageDtoSchema>;
