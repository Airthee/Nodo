import {
  type CryptoAdapter,
  ENC_KEY_LENGTH_BYTES,
  SHARE_ID_LENGTH_BYTES,
} from '../crypto/types';

const SHARE_ID_INFO = new TextEncoder().encode('nodo:share-id:v1');
const ENC_KEY_INFO = new TextEncoder().encode('nodo:enc-key:v1');

export async function deriveShareId(
  crypto: CryptoAdapter,
  seed: Uint8Array,
): Promise<Uint8Array> {
  return crypto.hkdfSha256({
    seed,
    info: SHARE_ID_INFO,
    length: SHARE_ID_LENGTH_BYTES,
  });
}

export async function deriveEncryptionKey(
  crypto: CryptoAdapter,
  seed: Uint8Array,
): Promise<Uint8Array> {
  return crypto.hkdfSha256({
    seed,
    info: ENC_KEY_INFO,
    length: ENC_KEY_LENGTH_BYTES,
  });
}

export function shareIdToHex(shareId: Uint8Array): string {
  return Array.from(shareId, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function shareIdFromHex(hex: string): Uint8Array {
  if (hex.length !== SHARE_ID_LENGTH_BYTES * 2) {
    throw new Error(`Invalid shareId hex length: ${hex.length}`);
  }
  if (!/^[0-9a-f]+$/i.test(hex)) {
    throw new Error('Invalid shareId hex characters');
  }
  const out = new Uint8Array(SHARE_ID_LENGTH_BYTES);
  for (let i = 0; i < SHARE_ID_LENGTH_BYTES; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
