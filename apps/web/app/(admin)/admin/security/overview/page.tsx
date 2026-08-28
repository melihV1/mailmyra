import { redirect } from 'next/navigation';
import { currentSession } from '../../../../../lib/auth/current';
import { headers } from 'next/headers';

import { getLang } from '../../../../../lib/i18n/lang.server';
import { adminNav } from '../../../../../lib/i18n/dict/admin-nav';
import { adminSecurity } from '../../../../../lib/i18n/dict/admin-security';
import { listAdminActions, listApprovals, listKvkkRequests, listStaffAccess, listStaffAccounts, NotStaffError } from '../../../../../lib/repo/admin';
import type { StaffAccessLogRow } from '../../../access-log-model';
import type { AdminActionLogRow } from '../../../action-log-model';
import { buildGovernanceOverview } from '../../../governance-overview-model';
import type { ApprovalQueueRow, DataRequestRow, StaffAccountRow } from '../../../operations-model';
import { AdminPageHeader } from '../../../ui/AdminPageHeader';
import { SecurityOverviewView } from '../../../ui/GovernanceOperationsViews';
import { RefreshButton } from '../../../ui/RefreshButton';

export async function generateMetadata() {
  const lang = await getLang();
  return { title: `${adminNav[lang].menu.securityOverview} — Mailmyra staff` };
}
export const dynamic = 'force-dynamic';

export default async function SecurityOverviewPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/security/overview');
  const lang = await getLang();
  const nav = adminNav[lang].menu;
  const t = adminSecurity[lang].pages.overview;
  const h = await headers();
  const ctx = {
    ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined,
    userAgent: h.get('user-agent') ?? undefined,
  };

  let staffSource;
  let accessSource;
  let actionSource;
  let approvalSource;
  let kvkkSource;
  try {
    [staffSource, accessSource, actionSource, approvalSource, kvkkSource] = await Promise.all([
      listStaffAccounts(session.user.id),
      listStaffAccess(session.user.id),
      listAdminActions(session.user.id),
      listApprovals(session.user.id),
      // KVKK okuması burada da günlüğe düşer — genel bakış da subjectEmail taşır.
      listKvkkRequests(session.user.id, ctx),
    ]);
  } catch (error) {
    if (error instanceof NotStaffError) redirect('/app');
    throw error;
  }
  const staff: StaffAccountRow[] = staffSource.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), lastLoginAt: row.lastLoginAt?.toISOString() ?? null }));
  const access: StaffAccessLogRow[] = accessSource.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
  const actions: AdminActionLogRow[] = actionSource.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
  const asRisk = (v: string) => (v === 'high' || v === 'critical' ? v : ('medium' as const));
  const approvals: ApprovalQueueRow[] = approvalSource
    .filter((r) => r.status !== 'cancelled')
    .map((r) => ({
      id: r.id,
      title: r.title,
      domain: r.domain,
      requester: r.requester,
      customer: r.customer,
      risk: asRisk(r.risk),
      status: r.status === 'approved' || r.status === 'rejected' ? r.status : ('pending' as const),
      requestedAt: r.requestedAt.toISOString(),
      requiredApprovals: r.requiredApprovals,
      approvals: r.approvals,
    }));
  const asType = (v: string) =>
    v === 'erasure' || v === 'correction' || v === 'portability' ? v : ('access' as const);
  const asStatus = (v: string) =>
    v === 'identity_check' || v === 'in_progress' || v === 'legal_review' || v === 'completed'
      ? v
      : ('intake' as const);
  const requests: DataRequestRow[] = kvkkSource.map((r) => ({
    id: r.id,
    reference: r.reference,
    subjectEmail: r.subjectEmail,
    customer: r.customer || '—',
    type: asType(r.type),
    status: asStatus(r.status),
    receivedAt: r.receivedAt.toISOString(),
    dueAt: r.dueAt.toISOString(),
    owner: r.owner,
    evidenceCount: r.evidenceCount,
    identityVerified: r.identityVerified,
  }));
  const snapshot = buildGovernanceOverview({ staff, access, actions, approvals, requests, now: Date.now(), sources: { staff: true, access: true, actions: true, approvals: true, requests: true } });
  return <section><AdminPageHeader crumb={`${nav.security} / ${t.crumbLeaf}`} title={nav.securityOverview} support={t.support} right={<RefreshButton />} /><SecurityOverviewView snapshot={snapshot} /></section>;
}
