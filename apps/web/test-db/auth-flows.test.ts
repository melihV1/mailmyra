/**
 * Kayıt · giriş · doğrulama · sıfırlama akışları.
 *
 * HTTP yok: akışlar saf girdi alıp sonuç dönüyor, e-postayı `MemoryMailer`e
 * yazıyor. Route handler'lar bunların ince sargısı olacak.
 */
import { afterAll, beforeEach, describe, expect, test } from 'vitest';

import {
  login,
  register,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  verifyEmailToken,
} from '../lib/auth/flows';
import { readSession } from '../lib/auth/session';
import { MemoryMailer } from '../lib/mail/memory';
import { prisma } from '../lib/db';
import { truncateAll } from './helpers';

const mailer = new MemoryMailer();

beforeEach(async () => {
  await truncateAll();
  mailer.clear();
});
afterAll(async () => {
  await truncateAll();
  await prisma.$disconnect();
});

const GOOD = {
  email: 'ali@voldi.net',
  password: 'correct horse battery',
  orgName: 'Voldi Creative',
  termsVersion: '2026-08-10',
  ip: '10.0.0.7',
};

const linkFromLastMail = () => {
  const text = mailer.sent.at(-1)?.text ?? '';
  const url = text.match(/https?:\/\/\S+/)?.[0];
  if (!url) throw new Error('e-postada link yok');
  return new URL(url).searchParams.get('token') ?? '';
};

describe('register', () => {
  test('creates the user, their org, an owner membership and a trial', async () => {
    const result = await register(GOOD, mailer);
    if (!result.ok) throw new Error(`kayit reddedildi: ${result.reason}`);

    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'ali@voldi.net' } });
    expect(user.emailVerifiedAt).toBeNull();

    const membership = await prisma.membership.findFirstOrThrow({
      where: { userId: user.id },
      include: { org: true },
    });
    expect(membership.role).toBe('owner');
    expect(membership.org.name).toBe('Voldi Creative');
    expect(membership.org.entitlementState).toBe('trial');
    expect(membership.org.trialEndsAt).not.toBeNull();

    // Dönen oturum gerçekten çalışıyor.
    const session = await readSession(result.sessionToken);
    expect(session?.user.id).toBe(user.id);
  });

  test('stores the email lowercased however it was typed', async () => {
    await register({ ...GOOD, email: 'Ali@Voldi.NET' }, mailer);
    await expect(
      prisma.user.findUniqueOrThrow({ where: { email: 'ali@voldi.net' } }),
    ).resolves.toBeTruthy();
  });

  test('sends a verification email whose token verifies the account', async () => {
    await register(GOOD, mailer);
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]?.to).toBe('ali@voldi.net');

    const outcome = await verifyEmailToken(linkFromLastMail());

    expect(outcome).toEqual({ ok: true });
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'ali@voldi.net' } });
    expect(user.emailVerifiedAt).not.toBeNull();
  });

  test('records the terms acceptance with version and ip', async () => {
    await register(GOOD, mailer);
    const acceptance = await prisma.legalAcceptance.findFirstOrThrow();
    expect(acceptance.docType).toBe('terms');
    expect(acceptance.version).toBe('2026-08-10');
    expect(acceptance.ip).toBe('10.0.0.7');
  });

  test('refuses a weak password before touching the database', async () => {
    const result = await register({ ...GOOD, password: 'password123' }, mailer);
    expect(result).toEqual({ ok: false, reason: 'weak_password' });
    expect(await prisma.user.count()).toBe(0);
    expect(mailer.sent).toHaveLength(0);
  });

  test('refuses a taken email, case-insensitively', async () => {
    await register(GOOD, mailer);
    const again = await register({ ...GOOD, email: 'ALI@voldi.net' }, mailer);
    expect(again).toEqual({ ok: false, reason: 'email_taken' });
    expect(await prisma.user.count()).toBe(1);
  });

  test('refuses a malformed email', async () => {
    expect(await register({ ...GOOD, email: 'ali@' }, mailer)).toEqual({
      ok: false,
      reason: 'invalid_email',
    });
  });
});

describe('login', () => {
  test('the right password opens a working session', async () => {
    await register(GOOD, mailer);
    const result = await login({ email: 'ali@voldi.net', password: GOOD.password, ip: '1.1.1.1' });
    if (!result.ok) throw new Error(`giris reddedildi: ${result.reason}`);

    expect((await readSession(result.sessionToken))?.user.email).toBe('ali@voldi.net');
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'ali@voldi.net' } });
    expect(user.lastLoginAt).not.toBeNull();
  });

  test('a different case of the email still logs in', async () => {
    await register(GOOD, mailer);
    const result = await login({ email: 'ALI@VOLDI.NET', password: GOOD.password, ip: '1.1.1.1' });
    expect(result.ok).toBe(true);
  });

  test('a wrong password and an unknown account are indistinguishable', async () => {
    // İkisi farklı cevap verseydi giriş formu "bu e-posta kayıtlı mı"
    // sorusunun cevabını dağıtırdı.
    await register(GOOD, mailer);

    const wrongPass = await login({ email: 'ali@voldi.net', password: 'yanlis sifre', ip: '1.1.1.1' });
    const noAccount = await login({ email: 'yok@voldi.net', password: 'yanlis sifre', ip: '1.1.1.1' });

    expect(wrongPass).toEqual(noAccount);
    expect(wrongPass).toEqual({ ok: false, reason: 'invalid_credentials' });
  });

  test('the sixth failure in a window is rate limited, not password checked', async () => {
    await register(GOOD, mailer);
    for (let i = 0; i < 5; i++) {
      await login({ email: 'ali@voldi.net', password: 'yanlis sifre', ip: '1.1.1.1' });
    }

    // Altıncıda doğru şifre bile kapıdan dönmeli — sayaç şifreden önce.
    const result = await login({ email: 'ali@voldi.net', password: GOOD.password, ip: '1.1.1.1' });

    if (result.ok || result.reason !== 'rate_limited') {
      throw new Error(`beklenen rate_limited, gelen: ${JSON.stringify(result)}`);
    }
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  test('a successful login resets the failure budget', async () => {
    await register(GOOD, mailer);
    for (let i = 0; i < 4; i++) {
      await login({ email: 'ali@voldi.net', password: 'yanlis', ip: '1.1.1.1' });
    }
    expect((await login({ email: 'ali@voldi.net', password: GOOD.password, ip: '1.1.1.1' })).ok).toBe(true);

    // Bütçe tazelendi: dört yeni yanlış deneme hâlâ kapıya çarpmıyor.
    for (let i = 0; i < 4; i++) {
      const r = await login({ email: 'ali@voldi.net', password: 'yanlis', ip: '1.1.1.1' });
      if (r.ok) throw new Error('unreachable');
      expect(r.reason).toBe('invalid_credentials');
    }
  });

  test('the limit keys on ip and email together', async () => {
    // Aynı IP'den başka bir hesaba (ya da başka IP'den aynı hesaba) yapılan
    // denemeler ofisteki meslektaşı kilitlemesin.
    await register(GOOD, mailer);
    for (let i = 0; i < 5; i++) {
      await login({ email: 'ali@voldi.net', password: 'yanlis', ip: '1.1.1.1' });
    }

    expect((await login({ email: 'ali@voldi.net', password: GOOD.password, ip: '2.2.2.2' })).ok).toBe(true);
  });
});

describe('verifying the email address', () => {
  test('a token works exactly once', async () => {
    await register(GOOD, mailer);
    const token = linkFromLastMail();

    expect(await verifyEmailToken(token)).toEqual({ ok: true });
    expect(await verifyEmailToken(token)).toEqual({ ok: false, reason: 'invalid_token' });
  });

  test('an expired token is refused', async () => {
    await register(GOOD, mailer);
    await prisma.emailToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    expect(await verifyEmailToken(linkFromLastMail())).toEqual({
      ok: false,
      reason: 'invalid_token',
    });
  });

  test('garbage is refused without an exception', async () => {
    expect(await verifyEmailToken('salakca-bir-deger')).toEqual({
      ok: false,
      reason: 'invalid_token',
    });
  });
});

describe('resending the verification email', () => {
  const userIdOf = async (email: string) =>
    (await prisma.user.findUniqueOrThrow({ where: { email } })).id;

  test('sends a fresh email whose token verifies the account', async () => {
    await register(GOOD, mailer);
    mailer.clear();

    const result = await resendVerification(await userIdOf('ali@voldi.net'), mailer);

    expect(result).toEqual({ ok: true });
    expect(mailer.sent).toHaveLength(1);
    expect(await verifyEmailToken(linkFromLastMail())).toEqual({ ok: true });
  });

  test('an already verified account gets nothing', async () => {
    await register(GOOD, mailer);
    await verifyEmailToken(linkFromLastMail());
    mailer.clear();

    const result = await resendVerification(await userIdOf('ali@voldi.net'), mailer);

    expect(result).toEqual({ ok: false, reason: 'already_verified' });
    expect(mailer.sent).toHaveLength(0);
  });

  test('the button cannot be hammered into a mail cannon', async () => {
    // Uç oturum gerektiriyor ama kendi hesabına sınırsız gönderim, bizim
    // SMTP itibarımızı yakar — sayaç kullanıcı başına.
    await register(GOOD, mailer);
    const userId = await userIdOf('ali@voldi.net');
    mailer.clear();

    for (let i = 0; i < 3; i++) {
      expect((await resendVerification(userId, mailer)).ok).toBe(true);
    }
    const fourth = await resendVerification(userId, mailer);

    expect(fourth.ok).toBe(false);
    if (fourth.ok || fourth.reason !== 'rate_limited') throw new Error('beklenen rate_limited');
    expect(mailer.sent).toHaveLength(3);
  });
});

describe('password reset', () => {
  test('a known and an unknown address get the same answer', async () => {
    // Sıfırlama formu hesap avlamak için en kolay kapı; iki durumda da aynı
    // "gönderdiysek gönderdik" cevabı dönmeli.
    await register(GOOD, mailer);
    mailer.clear();

    const known = await requestPasswordReset({ email: 'ali@voldi.net', ip: '1.1.1.1' }, mailer);
    const unknown = await requestPasswordReset({ email: 'yok@voldi.net', ip: '1.1.1.1' }, mailer);

    expect(known).toEqual(unknown);
    expect(known).toEqual({ ok: true });
    // Ama e-posta yalnız gerçek hesaba gitti.
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]?.to).toBe('ali@voldi.net');
  });

  test('the emailed token sets a new password and the old one stops working', async () => {
    await register(GOOD, mailer);
    mailer.clear();
    await requestPasswordReset({ email: 'ali@voldi.net', ip: '1.1.1.1' }, mailer);

    const outcome = await resetPassword({
      token: linkFromLastMail(),
      newPassword: 'tamamen yeni bir sifre',
    });

    expect(outcome).toEqual({ ok: true });
    expect((await login({ email: 'ali@voldi.net', password: GOOD.password, ip: '3.3.3.3' })).ok).toBe(false);
    expect(
      (await login({ email: 'ali@voldi.net', password: 'tamamen yeni bir sifre', ip: '4.4.4.4' })).ok,
    ).toBe(true);
  });

  test('resetting kills every open session', async () => {
    // "Şifremi değiştirdim" çoğu zaman "hesabımda başkası var" demek.
    await register(GOOD, mailer);
    const open = await login({ email: 'ali@voldi.net', password: GOOD.password, ip: '1.1.1.1' });
    if (!open.ok) throw new Error('unreachable');
    mailer.clear();
    await requestPasswordReset({ email: 'ali@voldi.net', ip: '1.1.1.1' }, mailer);

    await resetPassword({ token: linkFromLastMail(), newPassword: 'tamamen yeni bir sifre' });

    expect(await readSession(open.sessionToken)).toBeNull();
  });

  test('a reset token is single use', async () => {
    await register(GOOD, mailer);
    mailer.clear();
    await requestPasswordReset({ email: 'ali@voldi.net', ip: '1.1.1.1' }, mailer);
    const token = linkFromLastMail();

    await resetPassword({ token, newPassword: 'tamamen yeni bir sifre' });
    const second = await resetPassword({ token, newPassword: 'bir baska sifre daha' });

    expect(second).toEqual({ ok: false, reason: 'invalid_token' });
  });

  test('the new password still has to pass policy', async () => {
    await register(GOOD, mailer);
    mailer.clear();
    await requestPasswordReset({ email: 'ali@voldi.net', ip: '1.1.1.1' }, mailer);

    expect(
      await resetPassword({ token: linkFromLastMail(), newPassword: 'password123' }),
    ).toEqual({ ok: false, reason: 'weak_password' });
  });

  test('requests are rate limited per ip', async () => {
    await register(GOOD, mailer);
    for (let i = 0; i < 5; i++) {
      await requestPasswordReset({ email: `deneme${i}@voldi.net`, ip: '9.9.9.9' }, mailer);
    }

    const result = await requestPasswordReset({ email: 'ali@voldi.net', ip: '9.9.9.9' }, mailer);

    expect(result.ok).toBe(false);
  });
});
