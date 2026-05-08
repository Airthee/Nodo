import { z } from 'zod';
import { Base64Schema, DeviceIdSchema } from './operation';

export const SnapshotDtoSchema = z.object({
  seq: z.number().int().nonnegative(),
  nonce: Base64Schema,
  ciphertext: Base64Schema,
  uploadedBy: DeviceIdSchema,
  uploadedAt: z.number().int().nonnegative(),
});

export type SnapshotDto = z.infer<typeof SnapshotDtoSchema>;

export const SnapshotPutDtoSchema = z.object({
  expectedSeq: z.number().int().nonnegative(),
  nonce: Base64Schema,
  ciphertext: Base64Schema,
  uploadedBy: DeviceIdSchema,
});

export type SnapshotPutDto = z.infer<typeof SnapshotPutDtoSchema>;
