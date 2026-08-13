import { createHash, randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest';

import { changePassword, deleteAccount } from '../lib/auth/account';
import { confirmEmailChange, login, register, requestEmailChange } from '../lib/auth/flows';
import { hashPassword } from '../lib/auth/password';
import { readSession, revokeOtherSessions } from '../lib/auth/session';
import { hashToken } from '../lib/auth/token';
import type { Mailer } from '../lib/mail';
import { MemoryMailer } from '../lib/mail/memory';
import { prisma } from '../lib/db';
import { primaryOrgId } from '../lib/repo/senders';
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

// deleteAccount testleri için: gerçek dosya + gerçek Asset satırı. Dosya
// adı gerçek CDN kuralına uyar (16 hex karakter) ama bu testte önemli olan
// tek şey, deleteAccount'ın diskteki dosyayı gerçekten silmesi.
async function writeAssetFile(
  dir: string,
  orgId: string,
  kind: 'avatar' | 'logo' | 'handSignature',
) {
  const filename = `${randomBytes(8).toString('hex')}.png`;
  const filePath = join(dir, filename);
  const bytes = Buffer.from(`sahte-png-icerigi-${filename}`);
  await writeFile(filePath, bytes);
  await prisma.asset.create({
    data: {
      orgId,
      filename,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      kind,
      bytes: bytes.length,
    },
  });
  return { filename, filePath };
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
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

describe('deleteAccount', () => {
  test('a sole member takes the workspace and its CDN files with them', async () => {
    const { userId } = await freshUser();
    const orgId = (await primaryOrgId(userId))!;
    const legal = await prisma.legalAcceptance.findFirstOrThrow({ where: { userId } });
    const dir = await mkdtemp(join(tmpdir(), 'mailmyra-account-'));
    try {
      const asset1 = await writeAssetFile(dir, orgId, 'logo');
      const asset2 = await writeAssetFile(dir, orgId, 'avatar');

      const result = await deleteAccount(
        userId,
        { password: GOOD.password, emailConfirm: GOOD.email },
        { cdnWritePath: dir },
      );

      expect(result).toEqual({ ok: true });
      expect(await prisma.user.findUnique({ where: { id: userId } })).toBeNull();
      expect(await prisma.organization.findUnique({ where: { id: orgId } })).toBeNull();
      expect(await prisma.asset.count({ where: { orgId } })).toBe(0);
      expect(await fileExists(asset1.filePath)).toBe(false);
      expect(await fileExists(asset2.filePath)).toBe(false);

      // Kabul kanıtı hesap ve org gitse de duruyor — yalnızca bağları koptu.
      const survivor = await prisma.legalAcceptance.findUnique({ where: { id: legal.id } });
      expect(survivor).not.toBeNull();
      expect(survivor!.userId).toBeNull();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('a missing CDN file does not stop the deletion', async () => {
    const { userId } = await freshUser();
    const orgId = (await primaryOrgId(userId))!;
    const dir = await mkdtemp(join(tmpdir(), 'mailmyra-account-'));
    try {
      // Satır var, dosya hiç yazılmadı — silme diskte "yok" hatasıyla karşılaşacak.
      await prisma.asset.create({
        data: {
          orgId,
          filename: `${randomBytes(8).toString('hex')}.png`,
          sha256: createHash('sha256').update('kayip-dosya').digest('hex'),
          kind: 'logo',
          bytes: 1234,
        },
      });

      const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const result = await deleteAccount(
          userId,
          { password: GOOD.password, emailConfirm: GOOD.email },
          { cdnWritePath: dir },
        );

        expect(result).toEqual({ ok: true });
        expect(await prisma.user.findUnique({ where: { id: userId } })).toBeNull();
        expect(await prisma.organization.findUnique({ where: { id: orgId } })).toBeNull();
        expect(await prisma.asset.count({ where: { orgId } })).toBe(0);
        expect(logged).toHaveBeenCalled();
      } finally {
        logged.mockRestore();
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('an invited member leaves without touching the org', async () => {
    const { userId: ownerId } = await freshUser();
    const orgId = (await primaryOrgId(ownerId))!;
    const editorPassword = 'editorun saglam sifresi';
    const editor = await prisma.user.create({
      data: { email: 'editor@voldi.net', passwordHash: await hashPassword(editorPassword) },
    });
    await prisma.membership.create({ data: { userId: editor.id, orgId, role: 'editor' } });

    const result = await deleteAccount(editor.id, {
      password: editorPassword,
      emailConfirm: 'editor@voldi.net',
    });

    expect(result).toEqual({ ok: true });
    expect(await prisma.user.findUnique({ where: { id: editor.id } })).toBeNull();
    // Org ve owner el sürülmeden duruyor.
    expect(await prisma.organization.findUnique({ where: { id: orgId } })).not.toBeNull();
    expect(await prisma.user.findUnique({ where: { id: ownerId } })).not.toBeNull();
    expect(await prisma.membership.count({ where: { orgId } })).toBe(1);
  });

  test('the last owner with members is refused', async () => {
    const { userId: ownerId } = await freshUser();
    const orgId = (await primaryOrgId(ownerId))!;
    const editor = await prisma.user.create({
      data: { email: 'editor2@voldi.net', passwordHash: await hashPassword('baska saglam sifre') },
    });
    await prisma.membership.create({ data: { userId: editor.id, orgId, role: 'editor' } });

    const result = await deleteAccount(ownerId, {
      password: GOOD.password,
      emailConfirm: GOOD.email,
    });

    expect(result).toEqual({ ok: false, reason: 'workspace_has_members' });
    expect(await prisma.user.findUnique({ where: { id: ownerId } })).not.toBeNull();
    expect(await prisma.organization.findUnique({ where: { id: orgId } })).not.toBeNull();
    expect(await prisma.membership.count({ where: { orgId } })).toBe(2);
  });

  test('the wrong password or wrong typed e-mail is refused', async () => {
    const { userId } = await freshUser();

    expect(
      await deleteAccount(userId, { password: 'tamamen yanlis', emailConfirm: GOOD.email }),
    ).toEqual({ ok: false, reason: 'invalid_credentials' });

    expect(
      await deleteAccount(userId, { password: GOOD.password, emailConfirm: 'baska@voldi.net' }),
    ).toEqual({ ok: false, reason: 'email_mismatch' });

    // Hesap hâlâ duruyor — reddedilen denemeler hiçbir şey silmedi.
    expect(await prisma.user.findUnique({ where: { id: userId } })).not.toBeNull();

    // Büyük/küçük harf normalize edilir: doğru adres farklı harf kasıyla da geçer.
    expect(
      await deleteAccount(userId, {
        password: GOOD.password,
        emailConfirm: GOOD.email.toUpperCase(),
      }),
    ).toEqual({ ok: true });
  });

  test('a missing CDN_WRITE_PATH is a hard error when there are assets to clean — nothing is deleted', async () => {
    const { userId } = await freshUser();
    const orgId = (await primaryOrgId(userId))!;
    await prisma.asset.create({
      data: {
        orgId,
        filename: `${randomBytes(8).toString('hex')}.png`,
        sha256: createHash('sha256').update('konfig-eksik').digest('hex'),
        kind: 'logo',
        bytes: 42,
      },
    });

    // .env.local'daki geliştirme değerini geçici olarak kaldırıyoruz — burada
    // sınanan şey "prod'da unutulursa ne olur" senaryosu.
    const previous = process.env.CDN_WRITE_PATH;
    delete process.env.CDN_WRITE_PATH;
    try {
      await expect(
        deleteAccount(userId, { password: GOOD.password, emailConfirm: GOOD.email }),
      ).rejects.toThrow(/CDN_WRITE_PATH/);

      // Hata silmeden ÖNCE atıldı — hesap, org ve asset satırı hâlâ duruyor.
      expect(await prisma.user.findUnique({ where: { id: userId } })).not.toBeNull();
      expect(await prisma.organization.findUnique({ where: { id: orgId } })).not.toBeNull();
      expect(await prisma.asset.count({ where: { orgId } })).toBe(1);
    } finally {
      if (previous === undefined) delete process.env.CDN_WRITE_PATH;
      else process.env.CDN_WRITE_PATH = previous;
    }
  });

  test('a user who solely owns two orgs takes both — org rows, assets and files', async () => {
    const { userId } = await freshUser();
    const firstOrgId = (await primaryOrgId(userId))!;
    // İkinci org: davetle katılınıp o org'da da tek üye kalınmış gibi —
    // doğrudan prisma ile kuruluyor (members.test.ts'teki desenin aynısı).
    const secondOrg = await prisma.organization.create({ data: { name: 'İkinci Alan' } });
    await prisma.membership.create({
      data: { userId, orgId: secondOrg.id, role: 'owner' },
    });

    const dir = await mkdtemp(join(tmpdir(), 'mailmyra-account-'));
    try {
      const inFirst = await writeAssetFile(dir, firstOrgId, 'logo');
      const inSecond = await writeAssetFile(dir, secondOrg.id, 'avatar');

      const result = await deleteAccount(
        userId,
        { password: GOOD.password, emailConfirm: GOOD.email },
        { cdnWritePath: dir },
      );

      expect(result).toEqual({ ok: true });
      expect(await prisma.user.findUnique({ where: { id: userId } })).toBeNull();
      expect(await prisma.organization.findUnique({ where: { id: firstOrgId } })).toBeNull();
      expect(await prisma.organization.findUnique({ where: { id: secondOrg.id } })).toBeNull();
      expect(
        await prisma.asset.count({ where: { orgId: { in: [firstOrgId, secondOrg.id] } } }),
      ).toBe(0);
      expect(await fileExists(inFirst.filePath)).toBe(false);
      expect(await fileExists(inSecond.filePath)).toBe(false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('a user who is last owner of a second org (that has another member) is refused — nothing deleted anywhere', async () => {
    const { userId } = await freshUser();
    const firstOrgId = (await primaryOrgId(userId))!;
    // İkinci org'da aynı kullanıcı yine owner, ama yanında başka biri de var —
    // orada tek başına ayrılamıyor.
    const secondOrg = await prisma.organization.create({ data: { name: 'Ortakli Alan' } });
    await prisma.membership.create({ data: { userId, orgId: secondOrg.id, role: 'owner' } });
    const teammate = await prisma.user.create({
      data: { email: 'teammate@voldi.net', passwordHash: await hashPassword('yeterince uzun sifre') },
    });
    await prisma.membership.create({
      data: { userId: teammate.id, orgId: secondOrg.id, role: 'editor' },
    });

    const result = await deleteAccount(userId, {
      password: GOOD.password,
      emailConfirm: GOOD.email,
    });

    expect(result).toEqual({ ok: false, reason: 'workspace_has_members' });
    // Ne birinci org, ne ikinci org, ne de kullanıcı silindi.
    expect(await prisma.user.findUnique({ where: { id: userId } })).not.toBeNull();
    expect(await prisma.organization.findUnique({ where: { id: firstOrgId } })).not.toBeNull();
    expect(await prisma.organization.findUnique({ where: { id: secondOrg.id } })).not.toBeNull();
    expect(await prisma.membership.count({ where: { orgId: secondOrg.id } })).toBe(2);
  });
});
