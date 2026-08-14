import { can, canChangeRole, canRemoveMember, type Role } from '@mailmyra/core';

import { prisma } from '../db';
import { hashToken, newSessionToken } from '../auth/token';
import { inviteEmail, type Mailer } from '../mail';
import { notifyOrgManagers } from './notifications';

/**
 * Üyeler ve davetler.
 *
 * Davet, `EmailToken`dan bilerek ayrı: o tablo bir kullanıcı ister, davetin
 * muhatabının ise henüz hesabı olmayabilir. Son-owner koruması core'daki
 * `canChangeRole`/`canRemoveMember`dan gelir — arayüz düğme gizler, kapı
 * burasıdır.
 */

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // spec §6: 7 gün

/** Linklerin tabanı — auth/flows ile aynı kural. */
function appUrl(): string {
  return process.env.APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
}

async function managerOrgId(userId: string): Promise<string | null> {
  const m = await prisma.membership.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  if (!m || !can(m.role, 'member:manage')) return null;
  return m.orgId;
}

// ─── Davet ───────────────────────────────────────────────────────────────

/** Davetle verilebilecek roller. `owner` YOK: sahiplik davetle dağıtılmaz. */
export const INVITABLE_ROLES = ['admin', 'editor', 'viewer'] as const;
export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export type InviteResult =
  | { ok: true }
  | { ok: false; reason: 'forbidden' | 'already_member' | 'invalid_role' };

export async function inviteMember(
  userId: string,
  input: { email: string; role: string },
  mailer: Mailer,
): Promise<InviteResult> {
  const orgId = await managerOrgId(userId);
  if (!orgId) return { ok: false, reason: 'forbidden' };

  if (!(INVITABLE_ROLES as readonly string[]).includes(input.role)) {
    return { ok: false, reason: 'invalid_role' };
  }
  const role = input.role as InvitableRole;
  const email = input.email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { where: { orgId } } },
  });
  if (existing && existing.memberships.length > 0) {
    return { ok: false, reason: 'already_member' };
  }

  const token = newSessionToken();
  const data = {
    role,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    acceptedAt: null,
  };
  // Aynı adrese ikinci davet eskisini DEĞİŞTİRİR: iki canlı link, düşük
  // rollü eski mailin yüksek rollü daveti (ya da tersini) gasp etmesi demek.
  await prisma.invitation.upsert({
    where: { orgId_email: { orgId, email } },
    create: { orgId, email, ...data },
    update: data,
  });

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
  await mailer.send({
    to: email,
    ...inviteEmail({ actionUrl: `${appUrl()}/invite?token=${token}`, orgName: org.name }),
  });
  return { ok: true };
}

export interface InvitationRow {
  id: string;
  email: string;
  role: Role;
  expiresAt: Date;
}

export async function listInvitations(userId: string): Promise<InvitationRow[]> {
  const orgId = await managerOrgId(userId);
  if (!orgId) return [];
  return prisma.invitation.findMany({
    where: { orgId, acceptedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, role: true, expiresAt: true },
  });
}

export type RevokeResult = { ok: true } | { ok: false; reason: 'forbidden' | 'not_found' };

export async function revokeInvitation(userId: string, invitationId: string): Promise<RevokeResult> {
  const orgId = await managerOrgId(userId);
  if (!orgId) return { ok: false, reason: 'forbidden' };
  const deleted = await prisma.invitation.deleteMany({ where: { id: invitationId, orgId } });
  return deleted.count > 0 ? { ok: true } : { ok: false, reason: 'not_found' };
}

export type AcceptResult =
  | { ok: true; orgId: string }
  | { ok: false; reason: 'invalid_token' | 'already_member' };

/**
 * Daveti kabul eder — çağıran, oturum açmış davetli.
 *
 * Kayıt akışı herkese boş bir "Workspace" org'u açıyor; davetle gelen biri
 * için o org anlamsız. Boşsa (içerik yok, tek üye kendisi) EMİLİR ki
 * `primaryOrgId` davet eden org'u göstersin. Doluysa dokunulmaz — kimsenin
 * emeği silinmez; çoklu org deneyimi Faz 4'ün işi.
 */
export async function acceptInvitation(token: string, userId: string): Promise<AcceptResult> {
  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date()) {
    return { ok: false, reason: 'invalid_token' };
  }

  const already = await prisma.membership.findUnique({
    where: { userId_orgId: { userId, orgId: invitation.orgId } },
  });
  if (already) return { ok: false, reason: 'already_member' };

  const starterOrgIds: string[] = [];
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: { org: { include: { _count: { select: { signatures: true, senderIdentities: true, memberships: true } } } } },
  });
  for (const m of memberships) {
    const c = m.org._count;
    if (m.role === 'owner' && c.memberships === 1 && c.signatures === 0 && c.senderIdentities === 0) {
      starterOrgIds.push(m.orgId);
    }
  }

  await prisma.$transaction([
    prisma.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    }),
    prisma.membership.create({
      data: { userId, orgId: invitation.orgId, role: invitation.role },
    }),
    // Boş başlangıç org'ları (CASCADE üyeliği de götürür).
    ...starterOrgIds.map((id) => prisma.organization.delete({ where: { id } })),
  ]);

  // Bildirim transaction DIŞINDA ve hata yutar — kabul commit'lendi,
  // zile yazılamaması akışı geri alamaz (publish'teki mail kuralı).
  const acceptor = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  await notifyOrgManagers({
    orgId: invitation.orgId,
    type: 'invitation_accepted',
    payload: { email: acceptor?.email ?? '', role: invitation.role },
    excludeUserId: userId,
  });

  return { ok: true, orgId: invitation.orgId };
}

// ─── Çalışma alanı ───────────────────────────────────────────────────────

export interface WorkspaceInfo {
  id: string;
  name: string;
}

/** Members ekranının başlık kartı: kullanıcının birincil org'unun kimliği. */
export async function getWorkspace(userId: string): Promise<WorkspaceInfo | null> {
  const m = await prisma.membership.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: { org: { select: { id: true, name: true } } },
  });
  return m ? { id: m.org.id, name: m.org.name } : null;
}

export type RenameResult = { ok: true } | { ok: false; reason: 'forbidden' | 'invalid_name' };

/**
 * Çalışma alanını yeniden adlandırır (2026-08-14: kayıtta ad sorulmuyor,
 * herkes "Workspace" ile başlıyor — değiştirme yolu buydu, yoktu). Yetki
 * `member:manage` (owner+admin): ad, davet mailinde ve koltuk uyarısında
 * geçen bir yönetim bilgisi; `billing:manage` (yalnız owner) fazla dar olurdu.
 */
export async function renameWorkspaceAs(userId: string, name: string): Promise<RenameResult> {
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > 255) return { ok: false, reason: 'invalid_name' };
  const orgId = await managerOrgId(userId);
  if (!orgId) return { ok: false, reason: 'forbidden' };
  await prisma.organization.update({ where: { id: orgId }, data: { name: trimmed } });
  return { ok: true };
}

// ─── Üyeler ──────────────────────────────────────────────────────────────

export interface MemberRow {
  userId: string;
  email: string;
  role: Role;
  joinedAt: Date;
  avatarUrl: string | null;
}

/** Görüntüleme her role açık (rol matrisi: signature:view herkeste). */
export async function listMembers(userId: string): Promise<MemberRow[]> {
  const m = await prisma.membership.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  if (!m) return [];
  const rows = await prisma.membership.findMany({
    where: { orgId: m.orgId },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { email: true, avatarUrl: true } } },
  });
  return rows.map((r) => ({
    userId: r.userId,
    email: r.user.email,
    role: r.role,
    joinedAt: r.createdAt,
    avatarUrl: r.user.avatarUrl,
  }));
}

export type MemberChangeResult =
  | { ok: true }
  | { ok: false; reason: 'forbidden' | 'not_found' | 'last_owner' | 'invalid_role' };

async function loadOrgMembers(orgId: string) {
  return prisma.membership.findMany({ where: { orgId }, select: { userId: true, role: true } });
}

export async function changeMemberRole(
  userId: string,
  targetUserId: string,
  nextRole: string,
): Promise<MemberChangeResult> {
  const orgId = await managerOrgId(userId);
  if (!orgId) return { ok: false, reason: 'forbidden' };
  if (!(['owner', 'admin', 'editor', 'viewer'] as const).includes(nextRole as Role)) {
    return { ok: false, reason: 'invalid_role' };
  }

  const members = await loadOrgMembers(orgId);
  if (!members.some((m) => m.userId === targetUserId)) return { ok: false, reason: 'not_found' };
  // Son owner düşürülemez — org'u panelden kurtaracak kimse kalmaz.
  if (!canChangeRole(members, targetUserId, nextRole as Role)) {
    return { ok: false, reason: 'last_owner' };
  }

  await prisma.membership.update({
    where: { userId_orgId: { userId: targetUserId, orgId } },
    data: { role: nextRole as Role },
  });
  return { ok: true };
}

export async function removeMember(
  userId: string,
  targetUserId: string,
): Promise<MemberChangeResult> {
  const orgId = await managerOrgId(userId);
  if (!orgId) return { ok: false, reason: 'forbidden' };

  const members = await loadOrgMembers(orgId);
  if (!members.some((m) => m.userId === targetUserId)) return { ok: false, reason: 'not_found' };
  if (!canRemoveMember(members, targetUserId)) return { ok: false, reason: 'last_owner' };

  await prisma.membership.delete({
    where: { userId_orgId: { userId: targetUserId, orgId } },
  });
  return { ok: true };
}
