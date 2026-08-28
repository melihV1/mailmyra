import { redirect } from 'next/navigation';
import { currentSession } from '../../../../../lib/auth/current';
import { getLang } from '../../../../../lib/i18n/lang.server';
import { adminNav } from '../../../../../lib/i18n/dict/admin-nav';
import { adminCustomers } from '../../../../../lib/i18n/dict/admin-customers';
import { listOrganizations, NotStaffError } from '../../../../../lib/repo/admin';
import type { OperationsOrgRow } from '../../../operations-model';
import { AdminPageHeader } from '../../../ui/AdminPageHeader';
import { CustomerHealthView } from '../../../ui/CustomerOperationsViews';
import { RefreshButton } from '../../../ui/RefreshButton';

export async function generateMetadata() {
  const lang = await getLang();
  return { title: `${adminNav[lang].menu.customersHealth} — Mailmyra staff` };
}
export const dynamic = 'force-dynamic';

export default async function CustomerHealthPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/customers/health');
  const lang = await getLang();
  const nav = adminNav[lang].menu;
  const t = adminCustomers[lang].pages.health;
  let source;
  try { source = await listOrganizations(session.user.id); } catch (error) { if (error instanceof NotStaffError) redirect('/app'); throw error; }
  const rows: OperationsOrgRow[] = source.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), trialEndsAt: row.trialEndsAt?.toISOString() ?? null, lastActivityAt: row.lastActivityAt?.toISOString() ?? null }));
  return <section><AdminPageHeader crumb={`${nav.customers} / ${t.crumbLeaf}`} title={nav.customersHealth} support={t.support} right={<RefreshButton />} /><CustomerHealthView rows={rows} now={Date.now()} /></section>;
}
