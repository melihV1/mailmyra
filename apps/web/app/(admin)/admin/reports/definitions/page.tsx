import { redirect } from 'next/navigation';
import { currentSession } from '../../../../../lib/auth/current';
import { getLang } from '../../../../../lib/i18n/lang.server';
import { adminNav } from '../../../../../lib/i18n/dict/admin-nav';
import { adminReports } from '../../../../../lib/i18n/dict/admin-reports';
import { NotStaffError, requireStaff } from '../../../../../lib/repo/admin';
import { KPI_DEFINITIONS } from '../../../reporting-model';
import { AdminPageHeader } from '../../../ui/AdminPageHeader';
import { KpiDefinitionsView } from '../../../ui/ReportingOperationsViews';

export async function generateMetadata() {
  const lang = await getLang();
  return { title: `${adminNav[lang].menu.reportsKpiDefinitions} — Mailmyra staff` };
}
export const dynamic = 'force-dynamic';
export default async function Page() {
  const session = await currentSession(); if (!session) redirect('/login?next=/admin/reports/definitions');
  try { await requireStaff(session.user.id); } catch (error) { if (error instanceof NotStaffError) redirect('/app'); throw error; }
  const lang = await getLang();
  const nav = adminNav[lang].menu;
  const t = adminReports[lang].pages.definitions;
  return <section><AdminPageHeader crumb={`${nav.reports} / ${nav.reportsKpiDefinitions}`} title={nav.reportsKpiDefinitions} support={t.support} /><KpiDefinitionsView rows={KPI_DEFINITIONS} /></section>;
}
