import { afterAll, beforeEach, describe, expect, test } from 'vitest';

import { hashToken } from '../lib/auth/token';
import {
  createSession,
  readSession,
  revokeAllSessionsForUser,
  revokeSession,
} from '../lib/auth/session';
import { prisma } from '../lib/db';
import { truncateAll } from './helpers';

beforeEach(truncateAll);
afterAll(async () => {
  await truncateAll();
  await prisma.$disconnect();
});

const newUser = (email = 'ali@voldi.net') =>
  prisma.user.create({ data: { email, passwordHash: 'x' } });

const HOUR = 60 * 60 * 1000;

describe('creating a session', () => {
  test('the raw token is returned to the caller and never stored', async () => {
    // Veritabanı sızarsa oturumlar ele geçirilememeli. Token'ın kendisi
    // tabloda geçiyorsa bu güvence yok demektir.
    const user = await newUser();

    const { token } = await createSession(user.id);

    const rows = await prisma.session.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.tokenHash).toBe(hashToken(token));
    expect(JSON.stringify(rows)).not.toContain(token);
  });

  test('two logins produce two independent sessions', async () => {
    const user = await newUser();
    const a = await createSession(user.id);
    const b = await createSession(user.id);

    expect(a.token).not.toBe(b.token);
    expect(await prisma.session.count()).toBe(2);
  });

  test('the request fingerprint is kept for the sessions screen', async () => {
    const user = await newUser();
    await createSession(user.id, { userAgent: 'Firefox/141', ip: '10.0.0.7' });

    const row = await prisma.session.findFirstOrThrow();
    expect(row.userAgent).toBe('Firefox/141');
    expect(row.ip).toBe('10.0.0.7');
  });
});

describe('reading a session', () => {
  test('a valid token resolves to its user', async () => {
    const user = await newUser();
    const { token } = await createSession(user.id);

    const session = await readSession(token);

    expect(session?.user.id).toBe(user.id);
    expect(session?.user.email).toBe('ali@voldi.net');
  });

  test('an unknown token resolves to nothing', async () => {
    expect(await readSession('bu-token-hic-var-olmadi')).toBeNull();
  });

  test('an expired session resolves to nothing', async () => {
    const user = await newUser();
    const { token } = await createSession(user.id);
    await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    expect(await readSession(token)).toBeNull();
  });

  test('an expired session is swept away rather than left to rot', async () => {
    const user = await newUser();
    const { token } = await createSession(user.id);
    await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    await readSession(token);

    expect(await prisma.session.count()).toBe(0);
  });
});

describe('the thirty days slide', () => {
  test('an idle session that comes back gets its clock reset', async () => {
    const user = await newUser();
    const { token } = await createSession(user.id);
    const before = await prisma.session.findFirstOrThrow();
    // İki saat sessiz kalmış gibi davran.
    await prisma.session.updateMany({ data: { lastSeenAt: new Date(Date.now() - 2 * HOUR) } });

    await readSession(token);

    const after = await prisma.session.findFirstOrThrow();
    expect(after.expiresAt.getTime()).toBeGreaterThan(before.expiresAt.getTime());
    expect(after.lastSeenAt.getTime()).toBeGreaterThan(before.lastSeenAt.getTime() - 1000);
  });

  test('a busy session is not rewritten on every single request', async () => {
    // Her istekte UPDATE atmak, sayfa başına birden çok yazma demek. Kayan
    // süre için gereken şey bu değil; saatte bir yenilemek yeterli.
    const user = await newUser();
    const { token } = await createSession(user.id);
    const before = await prisma.session.findFirstOrThrow();

    await readSession(token);
    await readSession(token);
    await readSession(token);

    const after = await prisma.session.findFirstOrThrow();
    expect(after.expiresAt.getTime()).toBe(before.expiresAt.getTime());
    expect(after.lastSeenAt.getTime()).toBe(before.lastSeenAt.getTime());
  });
});

describe('revoking', () => {
  test('a revoked session stops working immediately', async () => {
    const user = await newUser();
    const { token } = await createSession(user.id);

    await revokeSession(token);

    expect(await readSession(token)).toBeNull();
    expect(await prisma.session.count()).toBe(0);
  });

  test('revoking an unknown token is not an error', async () => {
    // Çıkış ucu, çerezi süresi geçmiş bir token'la da çağrılabilir.
    await expect(revokeSession('yok-boyle-bir-token')).resolves.toBeUndefined();
  });

  test('changing a password can end every session at once', async () => {
    const user = await newUser();
    const other = await newUser('baska@voldi.net');
    const a = await createSession(user.id);
    const b = await createSession(user.id);
    const untouched = await createSession(other.id);

    await revokeAllSessionsForUser(user.id);

    expect(await readSession(a.token)).toBeNull();
    expect(await readSession(b.token)).toBeNull();
    expect(await readSession(untouched.token)).not.toBeNull();
  });
});
