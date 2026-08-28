import { redirect } from 'next/navigation';
import { currentSession } from '../../../../../lib/auth/current';
import { getLang } from '../../../../../lib/i18n/lang.server';
import { adminNav } from '../../../../../lib/i18n/dict/admin-nav';
import { adminRevenue } from '../../../../../lib/i18n/dict/admin-revenue';
import { listInvoicesAdmin, listOrganizations, NotStaffError } from '../../../../../lib/repo/admin';
import type { InvoiceWorkbenchRow } from '../../../invoice-workbench-model';
import type { OperationsOrgRow } from '../../../operations-model';
import { AdminPageHeader } from '../../../ui/AdminPageHeader';
import { RefreshButton } from '../../../ui/RefreshButton';
import { RevenueOverviewView } from '../../../ui/RevenueOperationsViews';

export async function generateMetadata() {
  const lang = await getLang();
  return { title: `${adminNav[lang].menu.revenueOverview} — Mailmyra staff` };
}
export const dynamic = 'force-dynamic';

export default async function RevenueOverviewPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/revenue/overview');
  const lang = await getLang();
  const nav = adminNav[lang].menu;
  const t = adminRevenue[lang].pages.overview;
  let invoicesSource; let orgSource;
  try { [invoicesSource, orgSource] = await Promise.all([listInvoicesAdmin(session.user.id), listOrganizations(session.user.id)]); } catch (error) { if (error instanceof NotStaffError) redirect('/app'); throw error; }
  const invoices: InvoiceWorkbenchRow[] = invoicesSource.map((row) => ({ ...row, issuedAt: row.issuedAt.toISOString(), dueAt: row.dueAt?.toISOString() ?? null, paidAt: row.paidAt?.toISOString() ?? null }));
  const organizations: OperationsOrgRow[] = orgSource.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), trialEndsAt: row.trialEndsAt?.toISOString() ?? null, lastActivityAt: row.lastActivityAt?.toISOString() ?? null }));
  return <section><AdminPageHeader crumb={`${nav.revenue} / ${t.crumbLeaf}`} title={nav.revenueOverview} support={t.support} right={<RefreshButton />} /><RevenueOverviewView invoices={invoices} organizations={organizations} now={Date.now()} /></section>;
}
