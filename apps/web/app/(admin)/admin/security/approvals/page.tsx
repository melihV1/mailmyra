import { redirect } from 'next/navigation';

import { currentSession } from '../../../../../lib/auth/current';
import { listApprovals, NotStaffError } from '../../../../../lib/repo/admin';
import type { ApprovalQueueRow } from '../../../operations-model';
import { AdminPageHeader } from '../../../ui/AdminPageHeader';
import { ApprovalsView } from '../../../ui/GovernanceOperationsViews';
import { RefreshButton } from '../../../ui/RefreshButton';

export const metadata = { title: 'Approvals — Mailmyra staff' };
export const dynamic = 'force-dynamic';

/**
 * Gerçek onay defteri (ApprovalRequest). Onay/ret KONTROLLERİ bilinçli yok
 * — devir sözleşmesi §7: yetki + kalıcılık + denetim + hata yolu birlikte
 * gelmeden karar düğmesi açılmaz. `cancelled` satırlar kuyruğu
 * kalabalıklaştırmasın diye listelenmez (defterde dururlar).
 */
export default async function ApprovalsPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/security/approvals');

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
        crumb="Security & governance / Approvals"
        title="Approvals"
        support="Controlled decision queue for high-risk administrative changes."
        right={<RefreshButton />}
      />
      <ApprovalsView rows={rows} />
    </section>
  );
}
