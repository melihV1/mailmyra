import { afterAll, beforeEach, describe, expect, test } from 'vitest';

import { changePassword } from '../lib/auth/account';
import { login, register } from '../lib/auth/flows';
import { readSession, revokeOtherSessions } from '../lib/auth/session';
import { hashToken } from '../lib/auth/token';
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
