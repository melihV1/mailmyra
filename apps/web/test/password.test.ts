import { describe, expect, it } from 'vitest';

import {
  checkPasswordPolicy,
  hashPassword,
  verifyPassword,
  verifyPasswordAgainstMaybeHash,
} from '../lib/auth/password';

describe('hashing', () => {
  it('never produces the same hash twice for the same password', async () => {
    // Aynı çıktı = tuz yok. İki kullanıcı aynı şifreyi seçtiğinde bu, tek bir
    // gökkuşağı tablosu sorgusuyla ikisini birden açar.
    const a = await hashPassword('correct horse battery');
    const b = await hashPassword('correct horse battery');
    expect(a).not.toBe(b);
  });

  it('accepts the password it was given', async () => {
    const hash = await hashPassword('correct horse battery');
    expect(await verifyPassword('correct horse battery', hash)).toBe(true);
  });

  it('rejects a different password', async () => {
    const hash = await hashPassword('correct horse battery');
    expect(await verifyPassword('correct horse batteryy', hash)).toBe(false);
  });

  it('carries its own parameters so they can be raised later', async () => {
    // Maliyet parametresi yıllar içinde artacak. Hash kendi ayarlarını
    // taşımazsa eski kayıtlar doğrulanamaz hâle gelir ve herkesin şifresini
    // sıfırlamak gerekir.
    const hash = await hashPassword('correct horse battery');
    const [scheme, n, r, p, salt, digest] = hash.split('$');
    expect(scheme).toBe('scrypt');
    expect(Number(n)).toBeGreaterThanOrEqual(16384);
    expect(Number(r)).toBeGreaterThan(0);
    expect(Number(p)).toBeGreaterThan(0);
    expect(salt).toBeTruthy();
    expect(digest).toBeTruthy();
  });

  it('verifies a hash written with weaker parameters than today defaults to', async () => {
    // Bir önceki maddenin kanıtı: maliyet yükseltildiğinde dünkü kayıt hâlâ
    // açılmalı. Buradaki 4096, bugünün varsayılanının dörtte biri.
    const old = await hashPassword('correct horse battery', { cost: 4096 });
    const today = await hashPassword('correct horse battery');

    expect(old.split('$')[1]).toBe('4096');
    expect(today.split('$')[1]).not.toBe('4096');
    expect(await verifyPassword('correct horse battery', old)).toBe(true);
    expect(await verifyPassword('yanlis sifre burada', old)).toBe(false);
  });
});

describe('verification refuses to crash on bad input', () => {
  // Bozuk hash veritabanı bozulmasından ya da elle veri düzeltmesinden gelir.
  // Fırlatırsa giriş ucu 500 döner ve "bu hesap bozuk" bilgisini sızdırır;
  // sessizce `false` dönmesi doğru davranış.
  it.each([
    ['boş', ''],
    ['şema yok', 'deadbeef'],
    ['bilinmeyen şema', 'bcrypt$16384$8$1$c2FsdA$aGFzaA'],
    ['eksik alan', 'scrypt$16384$8$1'],
    ['sayı olmayan maliyet', 'scrypt$abc$8$1$c2FsdA$aGFzaA'],
    ['base64 olmayan', 'scrypt$16384$8$1$!!!$!!!'],
  ])('returns false for a %s hash', async (_label, hash) => {
    await expect(verifyPassword('correct horse battery', hash)).resolves.toBe(false);
  });
});

describe('an unknown account must not answer faster than a known one', () => {
  // Kullanıcı bulunamayınca scrypt hiç koşmazsa giriş ucu milisaniyeler
  // içinde döner; var olan hesapta ~50 ms sürer. Bu fark, şifreyi hiç
  // bilmeden "bu e-posta kayıtlı mı" sorusunu yanıtlar.
  it('still returns false when there is no stored hash', async () => {
    expect(await verifyPasswordAgainstMaybeHash('correct horse battery', null)).toBe(false);
  });

  it('burns the same kind of work as a real verification', async () => {
    const started = performance.now();
    await verifyPasswordAgainstMaybeHash('correct horse battery', null);
    const elapsed = performance.now() - started;

    // Düz `return false` bir milisaniyenin altında biterdi. Eşik geniş
    // tutuldu: ölçülen şey süre değil, işin yapılıp yapılmadığı.
    expect(elapsed).toBeGreaterThan(5);
  });
});

describe('password policy', () => {
  it('accepts a long enough password', () => {
    expect(checkPasswordPolicy('correct horse battery')).toEqual({ ok: true });
  });

  it('rejects anything under ten characters', () => {
    // Karmaşıklık kuralı yok — uzunluk daha etkili ve insanları `P@ssw0rd!`
    // yazmaya itmiyor.
    expect(checkPasswordPolicy('Kisa1!')).toEqual({ ok: false, reason: 'too_short' });
    expect(checkPasswordPolicy('123456789')).toEqual({ ok: false, reason: 'too_short' });
  });

  it('rejects a common password even when it is long enough', () => {
    expect(checkPasswordPolicy('qwertyuiop')).toEqual({ ok: false, reason: 'too_common' });
    expect(checkPasswordPolicy('password123')).toEqual({ ok: false, reason: 'too_common' });
  });

  it('matches common passwords regardless of case', () => {
    expect(checkPasswordPolicy('QWERTYUIOP')).toEqual({ ok: false, reason: 'too_common' });
  });

  it('counts characters, not bytes', () => {
    // "şifreşifre" 10 karakter ama UTF-8'de 14 bayt. Bayt sayan bir kontrol
    // Türkçe şifreleri haksız yere kabul ya da reddederdi.
    expect(checkPasswordPolicy('şifreşifre')).toEqual({ ok: true });
    expect(checkPasswordPolicy('şifreşifr')).toEqual({ ok: false, reason: 'too_short' });
  });
});
