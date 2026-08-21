import { redirect } from 'next/navigation';
import { currentSession } from '../../../../../lib/auth/current';
import { listOrganizations, NotStaffError } from '../../../../../lib/repo/admin';
import type { OperationsOrgRow } from '../../../operations-model';
import { AdminPageHeader } from '../../../ui/AdminPageHeader';
import { CustomerHealthView } from '../../../ui/CustomerOperationsViews';
import { RefreshButton } from '../../../ui/RefreshButton';

export const metadata = { title: 'Customer health — Mailmyra staff' };
export const dynamic = 'force-dynamic';

export default async function CustomerHealthPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/customers/health');
  let source;
  try { source = await listOrganizations(session.user.id); } catch (error) { if (error instanceof NotStaffError) redirect('/app'); throw error; }
  const rows: OperationsOrgRow[] = source.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), trialEndsAt: row.trialEndsAt?.toISOString() ?? null, lastActivityAt: row.lastActivityAt?.toISOString() ?? null }));
  return <section><AdminPageHeader crumb="Customers / Health" title="Customer health" support="Use explainable operational signals to focus intervention work; no opaque churn score." right={<RefreshButton />} /><CustomerHealthView rows={rows} now={Date.now()} /></section>;
}
