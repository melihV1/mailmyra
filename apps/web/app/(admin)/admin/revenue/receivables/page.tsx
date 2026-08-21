import { redirect } from 'next/navigation';
import { currentSession } from '../../../../../lib/auth/current';
import { listInvoicesAdmin, NotStaffError } from '../../../../../lib/repo/admin';
import type { InvoiceWorkbenchRow } from '../../../invoice-workbench-model';
import { AdminPageHeader } from '../../../ui/AdminPageHeader';
import { ReceivablesView } from '../../../ui/RevenueOperationsViews';
import { RefreshButton } from '../../../ui/RefreshButton';

export const metadata = { title: 'Receivables — Mailmyra staff' };
export const dynamic = 'force-dynamic';

export default async function ReceivablesPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/revenue/receivables');
  let source;
  try { source = await listInvoicesAdmin(session.user.id); } catch (error) { if (error instanceof NotStaffError) redirect('/app'); throw error; }
  const rows: InvoiceWorkbenchRow[] = source.map((row) => ({ ...row, issuedAt: row.issuedAt.toISOString(), dueAt: row.dueAt?.toISOString() ?? null, paidAt: row.paidAt?.toISOString() ?? null }));
  return <section><AdminPageHeader crumb="Revenue / Receivables" title="Receivables" support="Prioritize open balances by due date and aging without mixing currency ledgers." right={<RefreshButton />} /><ReceivablesView rows={rows} now={Date.now()} /></section>;
}
