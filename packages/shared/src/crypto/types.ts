export interface CryptoAdapter {
  randomBytes(length: number): Uint8Array;

  hkdfSha256(input: {
    seed: Uint8Array;
    salt?: Uint8Array;
    info: Uint8Array;
    length: number;
  }): Promise<Uint8Array>;

  encryptAesGcm(input: {
    key: Uint8Array;
    nonce: Uint8Array;
    plaintext: Uint8Array;
    aad?: Uint8Array;
  }): Promise<Uint8Array>;

  decryptAesGcm(input: {
    key: Uint8Array;
    nonce: Uint8Array;
    ciphertext: Uint8Array;
    aad?: Uint8Array;
  }): Promise<Uint8Array>;
}

export const NONCE_LENGTH_BYTES = 12;
export const ENC_KEY_LENGTH_BYTES = 32;
export const SHARE_ID_LENGTH_BYTES = 16;
