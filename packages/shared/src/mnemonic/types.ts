export interface MnemonicAdapter {
  generate24Words(): string;
  validatePhrase(phrase: string): boolean;
  phraseToSeed(phrase: string, passphrase?: string): Promise<Uint8Array>;
}

export const PHRASE_WORD_COUNT = 24;
