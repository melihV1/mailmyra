import { describe, expect, it } from 'vitest';

import { hashToken, newSessionToken } from '../lib/auth/token';

describe('session tokens', () => {
  it('are different every time', () => {
    const seen = new Set(Array.from({ length: 200 }, () => newSessionToken()));
    expect(seen.size).toBe(200);
  });

  it('carry at least 256 bits of entropy', () => {
    // 32 bayt, base64url'de dolgusuz 43 karakter. Tahmin edilebilir bir
    // oturum token'ı, şifreyi hiç görmeden hesabı açar.
    expect(Buffer.from(newSessionToken(), 'base64url')).toHaveLength(32);
  });

  it('are URL and cookie safe', () => {
    for (let i = 0; i < 50; i++) {
      expect(newSessionToken()).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });
});

describe('token hashing', () => {
  it('is deterministic', () => {
    const token = newSessionToken();
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it('maps different tokens to different hashes', () => {
    expect(hashToken(newSessionToken())).not.toBe(hashToken(newSessionToken()));
  });

  it('produces exactly the 64 hex characters the column holds', () => {
    // `Session.tokenHash` şemada `Char(64)`. Daha uzun bir çıktı sessizce
    // kırpılır ve iki farklı token aynı satıra düşebilir.
    expect(hashToken(newSessionToken())).toMatch(/^[0-9a-f]{64}$/);
  });

  it('does not contain the token itself', () => {
    const token = newSessionToken();
    expect(hashToken(token)).not.toContain(token);
  });
});
