import { redirect } from 'next/navigation';

import { currentSession } from '../../../../../lib/auth/current';
import { getLang } from '../../../../../lib/i18n/lang.server';
import { adminNav } from '../../../../../lib/i18n/dict/admin-nav';
import { adminSecurity } from '../../../../../lib/i18n/dict/admin-security';
import { listApprovals, NotStaffError } from '../../../../../lib/repo/admin';
import type { ApprovalQueueRow } from '../../../operations-model';
import { NewApprovalButton } from '../../../ui/ApprovalActions';
import { AdminPageHeader } from '../../../ui/AdminPageHeader';
import { ApprovalsView } from '../../../ui/GovernanceOperationsViews';
import { RefreshButton } from '../../../ui/RefreshButton';

export async function generateMetadata() {
  const lang = await getLang();
  return { title: `${adminNav[lang].menu.securityApprovals} — Mailmyra staff` };
}
export const dynamic = 'force-dynamic';

/**
 * Gerçek onay defteri (ApprovalRequest). Onay/ret/iptal KONTROLLERİ artık
 * var — yetki + kalıcılık + denetim + hata yolu aynı transaction'da birlikte
 * gelir (bkz. `lib/repo/admin.ts` decideApproval/cancelApprovalRequest).
 * `cancelled` satırlar kuyruğu kalabalıklaştırmasın diye hâlâ listelenmez
 * (defterde dururlar, yalnız bu görünümden düşerler).
 */
export default async function ApprovalsPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/security/approvals');

  const lang = await getLang();
  const nav = adminNav[lang].menu;
  const t = adminSecurity[lang].pages.approvals;

  let source;
  try {
    source = await listApprovals(session.user.id);
  } catch (error) {
    if (error instanceof NotStaffError) redirect('/app');
    throw error;
  }

  const asRisk = (v: string): ApprovalQueueRow['risk'] =>
    v === 'high' || v === 'critical' ? v : 'medium';
  const rows: ApprovalQueueRow[] = source
    .filter((r) => r.status !== 'cancelled')
    .map((r) => ({
      id: r.id,
      title: r.title,
      domain: r.domain,
      requester: r.requester,
      customer: r.customer,
      risk: asRisk(r.risk),
      status: r.status === 'approved' || r.status === 'rejected' ? r.status : 'pending',
      requestedAt: r.requestedAt.toISOString(),
      requiredApprovals: r.requiredApprovals,
      approvals: r.approvals,
    }));

  return (
    <section>
      <AdminPageHeader
        crumb={`${nav.security} / ${nav.securityApprovals}`}
        title={nav.securityApprovals}
        support={t.support}
        right={
          <>
            <NewApprovalButton />
            <RefreshButton />
          </>
        }
      />
      <ApprovalsView rows={rows} />
    </section>
  );
}
