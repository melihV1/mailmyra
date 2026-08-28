import { redirect } from 'next/navigation';
import { currentSession } from '../../../../../lib/auth/current';
import { getLang } from '../../../../../lib/i18n/lang.server';
import { adminNav } from '../../../../../lib/i18n/dict/admin-nav';
import { adminRevenue } from '../../../../../lib/i18n/dict/admin-revenue';
import { listOrganizations, NotStaffError } from '../../../../../lib/repo/admin';
import type { OperationsOrgRow } from '../../../operations-model';
import { AdminPageHeader } from '../../../ui/AdminPageHeader';
import { RefreshButton } from '../../../ui/RefreshButton';
import { SeatLedgerView } from '../../../ui/RevenueOperationsViews';

export async function generateMetadata() {
  const lang = await getLang();
  return { title: `${adminNav[lang].menu.revenueSeatLedger} — Mailmyra staff` };
}
export const dynamic = 'force-dynamic';

export default async function SeatLedgerPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/revenue/seats');
  const lang = await getLang();
  const nav = adminNav[lang].menu;
  const t = adminRevenue[lang].pages.seatLedger;
  let source;
  try { source = await listOrganizations(session.user.id); } catch (error) { if (error instanceof NotStaffError) redirect('/app'); throw error; }
  const rows: OperationsOrgRow[] = source.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), trialEndsAt: row.trialEndsAt?.toISOString() ?? null, lastActivityAt: row.lastActivityAt?.toISOString() ?? null }));
  return <section><AdminPageHeader crumb={`${nav.revenue} / ${nav.revenueSeatLedger}`} title={nav.revenueSeatLedger} support={t.support} right={<RefreshButton />} /><SeatLedgerView rows={rows} /></section>;
}
