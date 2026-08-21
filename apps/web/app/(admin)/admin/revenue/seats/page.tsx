import { redirect } from 'next/navigation';
import { currentSession } from '../../../../../lib/auth/current';
import { listOrganizations, NotStaffError } from '../../../../../lib/repo/admin';
import type { OperationsOrgRow } from '../../../operations-model';
import { AdminPageHeader } from '../../../ui/AdminPageHeader';
import { RefreshButton } from '../../../ui/RefreshButton';
import { SeatLedgerView } from '../../../ui/RevenueOperationsViews';

export const metadata = { title: 'Seat ledger — Mailmyra staff' };
export const dynamic = 'force-dynamic';

export default async function SeatLedgerPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/revenue/seats');
  let source;
  try { source = await listOrganizations(session.user.id); } catch (error) { if (error instanceof NotStaffError) redirect('/app'); throw error; }
  const rows: OperationsOrgRow[] = source.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), trialEndsAt: row.trialEndsAt?.toISOString() ?? null, lastActivityAt: row.lastActivityAt?.toISOString() ?? null }));
  return <section><AdminPageHeader crumb="Revenue / Seat ledger" title="Seat ledger" support="Compare authoritative active seats with the entitlement assigned to each billing organization." right={<RefreshButton />} /><SeatLedgerView rows={rows} /></section>;
}
