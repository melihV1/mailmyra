import { redirect } from 'next/navigation';
import { currentSession } from '../../../../../lib/auth/current';
import { NotStaffError, requireStaff } from '../../../../../lib/repo/admin';
import { KPI_DEFINITIONS } from '../../../reporting-model';
import { AdminPageHeader } from '../../../ui/AdminPageHeader';
import { KpiDefinitionsView } from '../../../ui/ReportingOperationsViews';

export const metadata = { title: 'KPI definitions — Mailmyra staff' };
export const dynamic = 'force-dynamic';
export default async function Page() { const session = await currentSession(); if (!session) redirect('/login?next=/admin/reports/definitions'); try { await requireStaff(session.user.id); } catch (error) { if (error instanceof NotStaffError) redirect('/app'); throw error; } return <section><AdminPageHeader crumb="Reports / KPI definitions" title="KPI definitions" support="Keep formulas, denominators, sources, grain, freshness and interpretation guardrails in one shared dictionary." /><KpiDefinitionsView rows={KPI_DEFINITIONS} /></section>; }
