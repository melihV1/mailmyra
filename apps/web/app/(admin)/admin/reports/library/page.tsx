import { redirect } from 'next/navigation';
import { currentSession } from '../../../../../lib/auth/current';
import { NotStaffError, requireStaff } from '../../../../../lib/repo/admin';
import { REPORT_LIBRARY } from '../../../reporting-model';
import { AdminPageHeader } from '../../../ui/AdminPageHeader';
import { ReportLibraryView } from '../../../ui/ReportingOperationsViews';

export const metadata = { title: 'Report library — Mailmyra staff' };
export const dynamic = 'force-dynamic';
export default async function Page() { const session = await currentSession(); if (!session) redirect('/login?next=/admin/reports/library'); try { await requireStaff(session.user.id); } catch (error) { if (error instanceof NotStaffError) redirect('/app'); throw error; } return <section><AdminPageHeader crumb="Reports / Library" title="Report library" support="Use a governed catalog of operating reports with explicit owners, sources and metric contracts." /><ReportLibraryView rows={REPORT_LIBRARY} /></section>; }
