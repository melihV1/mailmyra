/**
 * Üyeler ve davetler. Son-owner koruması core'da kanıtlı; burada sınanan,
 * o kuralların veri katmanında gerçekten uygulandığı ve davet yaşam döngüsü.
 */
import { afterAll, beforeEach, describe, expect, test } from 'vitest';

import { hashToken } from '../lib/auth/token';
import { prisma } from '../lib/db';
import { MemoryMailer } from '../lib/mail/memory';
import {
  acceptInvitation,
  changeMemberRole,
  inviteMember,
  listInvitations,
  listMembers,
  removeMember,
  revokeInvitation,
} from '../lib/repo/members';
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

async function owner(email = 'sahip@voldi.net') {
  const user = await prisma.user.create({ data: { email, passwordHash: 'x' } });
  const org = await prisma.organization.create({ data: { name: 'Voldi', entitledSeats: 5 } });
  await prisma.membership.create({ data: { userId: user.id, orgId: org.id, role: 'owner' } });
  return { userId: user.id, orgId: org.id };
}

function inviteLinkToken(): string {
  const text = mailer.sent.at(-1)?.text ?? '';
  const m = /invite\?token=([A-Za-z0-9_-]+)/.exec(text);
  if (!m) throw new Error('davet linki mailde yok');
  return m[1]!;
}

describe('inviting', () => {
  test('an owner invites; the mail carries a working link and the org name', async () => {
    const o = await owner();

    const result = await inviteMember(o.userId, { email: 'yeni@voldi.net', role: 'editor' }, mailer);

    expect(result).toEqual({ ok: true });
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]?.to).toBe('yeni@voldi.net');
    expect(mailer.sent[0]?.subject).toContain('Voldi');
    const rows = await listInvitations(o.userId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ email: 'yeni@voldi.net', role: 'editor' });
  });

  test('an editor cannot invite — member:manage draws the line', async () => {
    const o = await owner();
    const editor = await prisma.user.create({ data: { email: 'e@voldi.net', passwordHash: 'x' } });
    await prisma.membership.create({ data: { userId: editor.id, orgId: o.orgId, role: 'editor' } });

    expect(await inviteMember(editor.id, { email: 'x@voldi.net', role: 'viewer' }, mailer)).toEqual({
      ok: false,
      reason: 'forbidden',
    });
    expect(mailer.sent).toHaveLength(0);
  });

  test('someone who is already a member cannot be invited again', async () => {
    const o = await owner();
    expect(await inviteMember(o.userId, { email: 'sahip@voldi.net', role: 'admin' }, mailer)).toEqual({
      ok: false,
      reason: 'already_member',
    });
  });

  test('re-inviting the same address replaces the old invitation', async () => {
    const o = await owner();
    await inviteMember(o.userId, { email: 'yeni@voldi.net', role: 'viewer' }, mailer);
    const firstToken = inviteLinkToken();

    await inviteMember(o.userId, { email: 'yeni@voldi.net', role: 'admin' }, mailer);

    const rows = await listInvitations(o.userId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.role).toBe('admin');
    // Eski link ölmüş olmalı — yoksa düşük rolle verilen eski mail yüksek
    // rollü daveti gasp edebilirdi... tersi de vahim: eski YÜKSEK rollü link.
    const dead = await prisma.user.create({ data: { email: 'yeni@voldi.net', passwordHash: 'x' } });
    expect(await acceptInvitation(firstToken, dead.id)).toEqual({
      ok: false,
      reason: 'invalid_token',
    });
  });

  test('owner role cannot be handed out by invitation', async () => {
    const o = await owner();
    expect(
      await inviteMember(o.userId, { email: 'x@voldi.net', role: 'owner' as never }, mailer),
    ).toEqual({ ok: false, reason: 'invalid_role' });
  });
});

describe('accepting', () => {
  test('a fresh signup absorbs their empty starter workspace into the invite', async () => {
    const o = await owner();
    await inviteMember(o.userId, { email: 'yeni@voldi.net', role: 'editor' }, mailer);
    const token = inviteLinkToken();
    // Davetli normal kayıt oldu: kendi boş "Workspace" org'u açıldı.
    const invitee = await prisma.user.create({
      data: { email: 'yeni@voldi.net', passwordHash: 'x' },
    });
    const starter = await prisma.organization.create({ data: { name: 'Workspace' } });
    await prisma.membership.create({
      data: { userId: invitee.id, orgId: starter.id, role: 'owner' },
    });

    const result = await acceptInvitation(token, invitee.id);

    expect(result).toEqual({ ok: true, orgId: o.orgId });
    const members = await listMembers(o.userId);
    expect(members.map((m) => m.role).sort()).toEqual(['editor', 'owner']);
    // Boş başlangıç org'u emildi: primaryOrgId artık davet eden org.
    expect(await prisma.organization.findUnique({ where: { id: starter.id } })).toBeNull();
  });

  test('a starter workspace with content is kept, membership still added', async () => {
    const o = await owner();
    await inviteMember(o.userId, { email: 'yeni@voldi.net', role: 'viewer' }, mailer);
    const token = inviteLinkToken();
    const invitee = await prisma.user.create({
      data: { email: 'yeni@voldi.net', passwordHash: 'x' },
    });
    const starter = await prisma.organization.create({ data: { name: 'Dolu' } });
    await prisma.membership.create({
      data: { userId: invitee.id, orgId: starter.id, role: 'owner' },
    });
    await prisma.signature.create({ data: { orgId: starter.id, name: 'Emek', data: {} } });

    expect(await acceptInvitation(token, invitee.id)).toEqual({ ok: true, orgId: o.orgId });
    expect(await prisma.organization.findUnique({ where: { id: starter.id } })).not.toBeNull();
  });

  test('an expired invitation is refused and single-use is enforced', async () => {
    const o = await owner();
    await inviteMember(o.userId, { email: 'yeni@voldi.net', role: 'editor' }, mailer);
    const token = inviteLinkToken();
    const invitee = await prisma.user.create({
      data: { email: 'yeni@voldi.net', passwordHash: 'x' },
    });

    await prisma.invitation.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await acceptInvitation(token, invitee.id)).toEqual({
      ok: false,
      reason: 'invalid_token',
    });

    await prisma.invitation.updateMany({ data: { expiresAt: new Date(Date.now() + 60_000) } });
    expect((await acceptInvitation(token, invitee.id)).ok).toBe(true);
    expect(await acceptInvitation(token, invitee.id)).toEqual({
      ok: false,
      reason: 'invalid_token',
    });
  });
});

describe('managing members', () => {
  test('the last owner can be neither demoted nor removed — core rule, enforced here', async () => {
    const o = await owner();
    expect(await changeMemberRole(o.userId, o.userId, 'admin')).toEqual({
      ok: false,
      reason: 'last_owner',
    });
    expect(await removeMember(o.userId, o.userId)).toEqual({ ok: false, reason: 'last_owner' });
  });

  test('an admin can change roles and remove, within the matrix', async () => {
    const o = await owner();
    const admin = await prisma.user.create({ data: { email: 'a@voldi.net', passwordHash: 'x' } });
    const editor = await prisma.user.create({ data: { email: 'e@voldi.net', passwordHash: 'x' } });
    await prisma.membership.create({ data: { userId: admin.id, orgId: o.orgId, role: 'admin' } });
    await prisma.membership.create({ data: { userId: editor.id, orgId: o.orgId, role: 'editor' } });

    expect(await changeMemberRole(admin.id, editor.id, 'viewer')).toEqual({ ok: true });
    expect(await removeMember(admin.id, editor.id)).toEqual({ ok: true });
    expect((await listMembers(o.userId)).map((m) => m.email).sort()).toEqual([
      'a@voldi.net',
      'sahip@voldi.net',
    ]);
  });

  test('revoking an invitation kills its link', async () => {
    const o = await owner();
    await inviteMember(o.userId, { email: 'yeni@voldi.net', role: 'editor' }, mailer);
    const token = inviteLinkToken();
    const inv = (await listInvitations(o.userId))[0]!;

    expect(await revokeInvitation(o.userId, inv.id)).toEqual({ ok: true });

    const invitee = await prisma.user.create({
      data: { email: 'yeni@voldi.net', passwordHash: 'x' },
    });
    expect(await acceptInvitation(token, invitee.id)).toEqual({
      ok: false,
      reason: 'invalid_token',
    });
    expect(await prisma.invitation.count({ where: { tokenHash: hashToken(token) } })).toBe(0);
  });
});
