import { redirect } from 'next/navigation';
import { currentSession } from '../../../../../lib/auth/current';
import { getLang } from '../../../../../lib/i18n/lang.server';
import { adminNav } from '../../../../../lib/i18n/dict/admin-nav';
import { adminRevenue } from '../../../../../lib/i18n/dict/admin-revenue';
import { listInvoicesAdmin, NotStaffError } from '../../../../../lib/repo/admin';
import type { InvoiceWorkbenchRow } from '../../../invoice-workbench-model';
import { AdminPageHeader } from '../../../ui/AdminPageHeader';
import { ReceivablesView } from '../../../ui/RevenueOperationsViews';
import { RefreshButton } from '../../../ui/RefreshButton';

export async function generateMetadata() {
  const lang = await getLang();
  return { title: `${adminNav[lang].menu.revenueReceivables} — Mailmyra staff` };
}
export const dynamic = 'force-dynamic';

export default async function ReceivablesPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/revenue/receivables');
  const lang = await getLang();
  const nav = adminNav[lang].menu;
  const t = adminRevenue[lang].pages.receivables;
  let source;
  try { source = await listInvoicesAdmin(session.user.id); } catch (error) { if (error instanceof NotStaffError) redirect('/app'); throw error; }
  const rows: InvoiceWorkbenchRow[] = source.map((row) => ({ ...row, issuedAt: row.issuedAt.toISOString(), dueAt: row.dueAt?.toISOString() ?? null, paidAt: row.paidAt?.toISOString() ?? null }));
  return <section><AdminPageHeader crumb={`${nav.revenue} / ${nav.revenueReceivables}`} title={nav.revenueReceivables} support={t.support} right={<RefreshButton />} /><ReceivablesView rows={rows} now={Date.now()} /></section>;
}
