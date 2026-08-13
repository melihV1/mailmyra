import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest';

import { changePassword } from '../lib/auth/account';
import { confirmEmailChange, login, register, requestEmailChange } from '../lib/auth/flows';
import { readSession, revokeOtherSessions } from '../lib/auth/session';
import { hashToken } from '../lib/auth/token';
import type { Mailer } from '../lib/mail';
import { MemoryMailer } from '../lib/mail/memory';
import { prisma } from '../lib/db';
import { truncateAll } from './helpers';

/** SMTP'nin çöktüğü an — bilgilendirme maili atılamıyor. */
const brokenMailer: Mailer = {
  kind: 'memory',
  send: async () => {
    throw new Error('SMTP down');
  },
};

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
  orgName: 'Voldi',
  termsVersion: 'v1',
  ip: '1.1.1.1',
};

async function freshUser() {
  const reg = await register(GOOD, mailer);
  if (!reg.ok) throw new Error('unreachable');
  const user = await prisma.user.findUniqueOrThrow({ where: { email: GOOD.email } });
  return { userId: user.id, sessionToken: reg.sessionToken };
}

// auth-flows.test.ts'teki desenin aynısı: son gönderilen mailin metninden
// linki, linkten token'ı ayıklar.
const linkFromLastMail = () => {
  const text = mailer.sent.at(-1)?.text ?? '';
  const url = text.match(/https?:\/\/\S+/)?.[0];
  if (!url) throw new Error('e-postada link yok');
  return new URL(url).searchParams.get('token') ?? '';
};

describe('changing the password', () => {
  test('requires the current password', async () => {
    const { userId } = await freshUser();

    const wrong = await changePassword(userId, {
      currentPassword: 'tamamen yanlis',
      newPassword: 'yepyeni saglam sifre',
    });

    expect(wrong).toEqual({ ok: false, reason: 'wrong_password' });
    expect((await login({ email: GOOD.email, password: GOOD.password, ip: '2.2.2.2' })).ok).toBe(true);
  });

  test('swaps the password and keeps only the acting session alive', async () => {
    const { userId, sessionToken } = await freshUser();
    const other = await login({ email: GOOD.email, password: GOOD.password, ip: '3.3.3.3' });
    if (!other.ok) throw new Error('unreachable');
    const keepId = (await readSession(sessionToken))!.id;

    const result = await changePassword(
      userId,
      { currentPassword: GOOD.password, newPassword: 'yepyeni saglam sifre' },
      { keepSessionId: keepId },
    );

    expect(result).toEqual({ ok: true });
    // Eski şifre öldü, yenisi çalışıyor.
    expect((await login({ email: GOOD.email, password: GOOD.password, ip: '4.4.4.4' })).ok).toBe(false);
    expect(
      (await login({ email: GOOD.email, password: 'yepyeni saglam sifre', ip: '5.5.5.5' })).ok,
    ).toBe(true);
    // İşlemi yapan oturum yaşıyor, diğeri öldü.
    expect(await readSession(sessionToken)).not.toBeNull();
    expect(await readSession(other.sessionToken)).toBeNull();
  });

  test('the new password still has to pass policy', async () => {
    const { userId } = await freshUser();
    expect(
      await changePassword(userId, {
        currentPassword: GOOD.password,
        newPassword: 'password123',
      }),
    ).toEqual({ ok: false, reason: 'weak_password' });
  });
});

describe('signing out other sessions', () => {
  test('keeps the named session and kills the rest', async () => {
    const { sessionToken } = await freshUser();
    const a = await login({ email: GOOD.email, password: GOOD.password, ip: '6.6.6.6' });
    const b = await login({ email: GOOD.email, password: GOOD.password, ip: '7.7.7.7' });
    if (!a.ok || !b.ok) throw new Error('unreachable');
    const me = (await readSession(sessionToken))!;

    await revokeOtherSessions(me.user.id, me.id);

    expect(await readSession(sessionToken)).not.toBeNull();
    expect(await readSession(a.sessionToken)).toBeNull();
    expect(await readSession(b.sessionToken)).toBeNull();
    expect(await prisma.session.count({ where: { tokenHash: hashToken(sessionToken) } })).toBe(1);
  });
});

describe('requestEmailChange', () => {
  test('sends a 24h verification to the NEW address and changes nothing yet', async () => {
    const { userId } = await freshUser();
    mailer.clear();

    const result = await requestEmailChange(
      userId,
      { newEmail: 'yeni@voldi.net', password: GOOD.password },
      mailer,
    );

    expect(result).toEqual({ ok: true });
    // Doğrulama YENİ adrese gitti, eskisine değil.
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]?.to).toBe('yeni@voldi.net');
    // Hesap hâlâ eski adresle giriş yapıyor — henüz hiçbir şey değişmedi.
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.email).toBe(GOOD.email);

    const tokenRow = await prisma.emailToken.findFirstOrThrow({
      where: { userId, type: 'email_change' },
    });
    expect(tokenRow.newEmail).toBe('yeni@voldi.net');
    // 24 saatlik pencere — birkaç saniyelik test payıyla.
    const ttl = tokenRow.expiresAt.getTime() - Date.now();
    expect(ttl).toBeGreaterThan(23 * 60 * 60 * 1000);
    expect(ttl).toBeLessThanOrEqual(24 * 60 * 60 * 1000 + 5000);
  });

  test('refuses the wrong password', async () => {
    const { userId } = await freshUser();
    mailer.clear();

    const result = await requestEmailChange(
      userId,
      { newEmail: 'yeni@voldi.net', password: 'tamamen yanlis' },
      mailer,
    );

    expect(result).toEqual({ ok: false, reason: 'invalid_credentials' });
    expect(mailer.sent).toHaveLength(0);
    expect(await prisma.emailToken.count({ where: { type: 'email_change' } })).toBe(0);
  });

  test('refuses a malformed or same address', async () => {
    const { userId } = await freshUser();
    mailer.clear();

    const malformed = await requestEmailChange(
      userId,
      { newEmail: 'yeni@', password: GOOD.password },
      mailer,
    );
    const sameAddress = await requestEmailChange(
      userId,
      { newEmail: GOOD.email, password: GOOD.password },
      mailer,
    );

    expect(malformed).toEqual({ ok: false, reason: 'invalid_email' });
    expect(sameAddress).toEqual({ ok: false, reason: 'invalid_email' });
    expect(mailer.sent).toHaveLength(0);
  });

  test('refuses an address another account holds', async () => {
    const { userId } = await freshUser();
    await register({ ...GOOD, email: 'baska@voldi.net' }, mailer);
    mailer.clear();

    const result = await requestEmailChange(
      userId,
      { newEmail: 'baska@voldi.net', password: GOOD.password },
      mailer,
    );

    expect(result).toEqual({ ok: false, reason: 'email_taken' });
    expect(mailer.sent).toHaveLength(0);
  });
});

describe('confirmEmailChange', () => {
  test('switches the address, refreshes verification, notifies the old one', async () => {
    const { userId } = await freshUser();
    mailer.clear();
    await requestEmailChange(
      userId,
      { newEmail: 'yeni@voldi.net', password: GOOD.password },
      mailer,
    );
    const token = linkFromLastMail();
    // "Tazelenir" iddiasını gerçekten sınamak için önceden eski bir doğrulama
    // damgası koyuyoruz — sonrasında ondan daha yeni olmalı.
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date('2020-01-01') },
    });
    mailer.clear();

    const result = await confirmEmailChange(token, mailer);

    expect(result).toEqual({ ok: true });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.email).toBe('yeni@voldi.net');
    expect(user.emailVerifiedAt).not.toBeNull();
    expect(user.emailVerifiedAt!.getTime()).toBeGreaterThan(new Date('2020-01-01').getTime());
    // Bilgilendirme ESKİ adrese gitti ve yeni adresi söylüyor.
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]?.to).toBe(GOOD.email);
    expect(mailer.sent[0]?.text).toContain('yeni@voldi.net');
  });

  test('a used or foreign token is invalid', async () => {
    const { userId } = await freshUser();
    const verifyToken = linkFromLastMail(); // kayıttan kalan 'verify' tipi token — yabancı akış
    mailer.clear();
    await requestEmailChange(
      userId,
      { newEmail: 'yeni@voldi.net', password: GOOD.password },
      mailer,
    );
    const changeToken = linkFromLastMail();

    // Yabancı: doğru şekilde ama yanlış akıştan gelen token.
    expect(await confirmEmailChange(verifyToken, mailer)).toEqual({
      ok: false,
      reason: 'invalid_token',
    });

    // Tüketilmiş: bir kez kullan, ikincisi düşer.
    expect(await confirmEmailChange(changeToken, mailer)).toEqual({ ok: true });
    expect(await confirmEmailChange(changeToken, mailer)).toEqual({
      ok: false,
      reason: 'invalid_token',
    });

    expect(await confirmEmailChange('salakca-bir-deger', mailer)).toEqual({
      ok: false,
      reason: 'invalid_token',
    });
  });

  test('loses the race if the address was taken meanwhile', async () => {
    const { userId } = await freshUser();
    mailer.clear();
    await requestEmailChange(
      userId,
      { newEmail: 'race@voldi.net', password: GOOD.password },
      mailer,
    );
    const token = linkFromLastMail();

    // İstek ile onay arasında üçüncü biri tam o adresle kayıt oldu.
    await register({ ...GOOD, email: 'race@voldi.net' }, mailer);

    const result = await confirmEmailChange(token, mailer);

    expect(result).toEqual({ ok: false, reason: 'email_taken' });
    const userA = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(userA.email).toBe(GOOD.email);
  });

  test('a broken notice mailer does not undo the switch', async () => {
    const { userId } = await freshUser();
    mailer.clear();
    await requestEmailChange(
      userId,
      { newEmail: 'yeni@voldi.net', password: GOOD.password },
      mailer,
    );
    const token = linkFromLastMail();

    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const result = await confirmEmailChange(token, brokenMailer);

      expect(result).toEqual({ ok: true });
      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      expect(user.email).toBe('yeni@voldi.net');
      expect(logged).toHaveBeenCalled();
    } finally {
      logged.mockRestore();
    }
  });
});
