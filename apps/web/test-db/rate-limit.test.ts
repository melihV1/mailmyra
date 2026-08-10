/**
 * Auth uçlarının deneme sayacı.
 *
 * Bellekte tutulamaz: `web.config` süreç sayısını sabitlemiyor ve iisnode
 * birden fazla süreç açarsa sayaç bölünür — saldırgan süreç sayısı kadar
 * fazla deneme hakkı kazanır. Mevcut `lib/rate-limit.ts` bunu zaten "tek Node
 * süreci varsayımı" diye yazmış; auth için o varsayım tutmuyor.
 *
 * Asıl sınav eşzamanlılık. Kaba kuvvet saldırısı zaten paralel gelir; okuma
 * ve yazmanın arasında yarış varsa limitin hiçbir anlamı kalmaz.
 */
import { afterAll, beforeEach, describe, expect, test } from 'vitest';

import { clearAttempts, consumeAttempt } from '../lib/auth/rate-limit';
import { prisma } from '../lib/db';
import { truncateAll } from './helpers';

beforeEach(truncateAll);
afterAll(async () => {
  await truncateAll();
  await prisma.$disconnect();
});

describe('counting attempts', () => {
  test('the first attempt is allowed and reports what is left', async () => {
    const result = await consumeAttempt('ip:1.2.3.4|ali@voldi.net');

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  test('the sixth attempt in a window is refused', async () => {
    const key = 'ip:1.2.3.4|ali@voldi.net';
    for (let i = 0; i < 5; i++) expect((await consumeAttempt(key)).allowed).toBe(true);

    const sixth = await consumeAttempt(key);

    expect(sixth.allowed).toBe(false);
    expect(sixth.remaining).toBe(0);
    expect(sixth.retryAfterSeconds).toBeGreaterThan(0);
  });

  test('two different keys do not share a budget', async () => {
    // Aynı ofisten iki kişi birbirini kilitlemesin.
    for (let i = 0; i < 5; i++) await consumeAttempt('ip:1.2.3.4|ali@voldi.net');

    expect((await consumeAttempt('ip:1.2.3.4|veli@voldi.net')).allowed).toBe(true);
  });

  test('a custom limit is honoured', async () => {
    // Giriş ucu (ip+email) için dar, IP için geniş bir bütçe kullanıyor.
    for (let i = 0; i < 20; i++) {
      expect((await consumeAttempt('ip:1.2.3.4', { limit: 20 })).allowed).toBe(true);
    }
    expect((await consumeAttempt('ip:1.2.3.4', { limit: 20 })).allowed).toBe(false);
  });
});

describe('the window moves on', () => {
  test('an old window does not count against the current one', async () => {
    const key = 'ip:1.2.3.4|ali@voldi.net';
    for (let i = 0; i < 5; i++) await consumeAttempt(key);
    expect((await consumeAttempt(key)).allowed).toBe(false);

    // Sayacı bir önceki pencereye taşı: zaman geçmiş gibi.
    const rows = await prisma.authAttempt.findMany();
    for (const row of rows) {
      await prisma.authAttempt.delete({
        where: { key_windowStart: { key: row.key, windowStart: row.windowStart } },
      });
      await prisma.authAttempt.create({
        data: {
          key: row.key,
          windowStart: new Date(row.windowStart.getTime() - 20 * 60 * 1000),
          count: row.count,
        },
      });
    }

    expect((await consumeAttempt(key)).allowed).toBe(true);
  });
});

describe('clearing after a success', () => {
  test('a correct password wipes the failure count', async () => {
    // Şifresini üçüncü denemede hatırlayan kullanıcı, bir sonraki girişte
    // iki hakla başlamamalı.
    const key = 'ip:1.2.3.4|ali@voldi.net';
    for (let i = 0; i < 4; i++) await consumeAttempt(key);

    await clearAttempts(key);

    expect((await consumeAttempt(key)).remaining).toBe(4);
  });

  test('clearing a key that was never used is not an error', async () => {
    await expect(clearAttempts('hic-denenmemis')).resolves.toBeUndefined();
  });
});

describe('a parallel brute force', () => {
  test('twenty simultaneous attempts still only spend five', async () => {
    // Saldırı sıralı gelmez. Okuma ile yazma arasında yarış varsa limit
    // kâğıt üstünde kalır.
    const key = 'ip:1.2.3.4|ali@voldi.net';

    const results = await Promise.all(
      Array.from({ length: 20 }, () => consumeAttempt(key)),
    );

    expect(results.filter((r) => r.allowed)).toHaveLength(5);
  });

  test('the stored count reflects every attempt, not just the allowed ones', async () => {
    const key = 'ip:1.2.3.4|ali@voldi.net';

    await Promise.all(Array.from({ length: 20 }, () => consumeAttempt(key)));

    const row = await prisma.authAttempt.findFirstOrThrow();
    expect(row.count).toBe(20);
  });
});
