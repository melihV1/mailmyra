import { redirect } from 'next/navigation';
import { currentSession } from '../../../../../lib/auth/current';
import { listInvoicesAdmin, listOrganizations, NotStaffError } from '../../../../../lib/repo/admin';
import type { InvoiceWorkbenchRow } from '../../../invoice-workbench-model';
import type { OperationsOrgRow } from '../../../operations-model';
import { AdminPageHeader } from '../../../ui/AdminPageHeader';
import { RefreshButton } from '../../../ui/RefreshButton';
import { RevenueOverviewView } from '../../../ui/RevenueOperationsViews';

export const metadata = { title: 'Revenue overview — Mailmyra staff' };
export const dynamic = 'force-dynamic';

export default async function RevenueOverviewPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/revenue/overview');
  let invoicesSource; let orgSource;
  try { [invoicesSource, orgSource] = await Promise.all([listInvoicesAdmin(session.user.id), listOrganizations(session.user.id)]); } catch (error) { if (error instanceof NotStaffError) redirect('/app'); throw error; }
  const invoices: InvoiceWorkbenchRow[] = invoicesSource.map((row) => ({ ...row, issuedAt: row.issuedAt.toISOString(), dueAt: row.dueAt?.toISOString() ?? null, paidAt: row.paidAt?.toISOString() ?? null }));
  const organizations: OperationsOrgRow[] = orgSource.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), trialEndsAt: row.trialEndsAt?.toISOString() ?? null, lastActivityAt: row.lastActivityAt?.toISOString() ?? null }));
  return <section><AdminPageHeader crumb="Revenue / Overview" title="Revenue overview" support="Read recorded billing performance by currency, customer and invoice status." right={<RefreshButton />} /><RevenueOverviewView invoices={invoices} organizations={organizations} now={Date.now()} /></section>;
}
