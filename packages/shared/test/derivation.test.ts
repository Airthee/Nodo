import { describe, it, expect } from 'bun:test';
import {
  deriveShareId,
  deriveEncryptionKey,
  shareIdToHex,
  shareIdFromHex,
  ENC_KEY_LENGTH_BYTES,
  SHARE_ID_LENGTH_BYTES,
  type CryptoAdapter,
} from '../src';

// Test adapter wired to Bun's WebCrypto. Casts via `as any` sidestep the
// Uint8Array<ArrayBufferLike> vs Uint8Array<ArrayBuffer> friction between
// Bun's @types/bun and lib.dom; the production adapters in apps/* will
// have matching typings native to their runtime.
const subtle = globalThis.crypto.subtle as any;

const bunCrypto: CryptoAdapter = {
  randomBytes(length) {
    const out = new Uint8Array(length);
    globalThis.crypto.getRandomValues(out);
    return out;
  },
  async hkdfSha256({ seed, salt, info, length }) {
    const key = await subtle.importKey('raw', seed, 'HKDF', false, ['deriveBits']);
    const bits = await subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt: salt ?? new Uint8Array(0), info },
      key,
      length * 8,
    );
    return new Uint8Array(bits);
  },
  async encryptAesGcm({ key, nonce, plaintext, aad }) {
    const cryptoKey = await subtle.importKey('raw', key, { name: 'AES-GCM' }, false, ['encrypt']);
    const buf = await subtle.encrypt(
      { name: 'AES-GCM', iv: nonce, additionalData: aad },
      cryptoKey,
      plaintext,
    );
    return new Uint8Array(buf);
  },
  async decryptAesGcm({ key, nonce, ciphertext, aad }) {
    const cryptoKey = await subtle.importKey('raw', key, { name: 'AES-GCM' }, false, ['decrypt']);
    const buf = await subtle.decrypt(
      { name: 'AES-GCM', iv: nonce, additionalData: aad },
      cryptoKey,
      ciphertext,
    );
    return new Uint8Array(buf);
  },
};

const seedA = new Uint8Array(64).fill(0x11);
const seedB = new Uint8Array(64).fill(0x22);

describe('derivation', () => {
  it('produces a 16-byte shareId', async () => {
    const id = await deriveShareId(bunCrypto, seedA);
    expect(id.length).toBe(SHARE_ID_LENGTH_BYTES);
  });

  it('produces a 32-byte encryption key', async () => {
    const key = await deriveEncryptionKey(bunCrypto, seedA);
    expect(key.length).toBe(ENC_KEY_LENGTH_BYTES);
  });

  it('is deterministic for the same seed', async () => {
    const id1 = await deriveShareId(bunCrypto, seedA);
    const id2 = await deriveShareId(bunCrypto, seedA);
    expect(Array.from(id1)).toEqual(Array.from(id2));

    const k1 = await deriveEncryptionKey(bunCrypto, seedA);
    const k2 = await deriveEncryptionKey(bunCrypto, seedA);
    expect(Array.from(k1)).toEqual(Array.from(k2));
  });

  it('produces different ids and keys for different seeds', async () => {
    const idA = await deriveShareId(bunCrypto, seedA);
    const idB = await deriveShareId(bunCrypto, seedB);
    expect(Array.from(idA)).not.toEqual(Array.from(idB));

    const kA = await deriveEncryptionKey(bunCrypto, seedA);
    const kB = await deriveEncryptionKey(bunCrypto, seedB);
    expect(Array.from(kA)).not.toEqual(Array.from(kB));
  });

  it('domain-separates shareId from encryption key', async () => {
    const id = await deriveShareId(bunCrypto, seedA);
    const key = await deriveEncryptionKey(bunCrypto, seedA);
    expect(Array.from(id)).not.toEqual(Array.from(key.slice(0, SHARE_ID_LENGTH_BYTES)));
  });

  it('round-trips shareId through hex', async () => {
    const id = await deriveShareId(bunCrypto, seedA);
    const hex = shareIdToHex(id);
    expect(hex).toMatch(/^[0-9a-f]{32}$/);
    const back = shareIdFromHex(hex);
    expect(Array.from(back)).toEqual(Array.from(id));
  });

  it('rejects invalid shareId hex', () => {
    expect(() => shareIdFromHex('abc')).toThrow();
    expect(() => shareIdFromHex('z'.repeat(32))).toThrow();
  });
});
