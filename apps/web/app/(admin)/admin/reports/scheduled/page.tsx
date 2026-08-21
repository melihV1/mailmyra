import { redirect } from 'next/navigation';

import { currentSession } from '../../../../../lib/auth/current';
import { listReportSchedules, NotStaffError } from '../../../../../lib/repo/admin';
import { REPORT_LIBRARY, type ReportSchedule } from '../../../reporting-model';
import { AdminPageHeader } from '../../../ui/AdminPageHeader';
import { ScheduledReportsView } from '../../../ui/ReportingOperationsViews';
import { RefreshButton } from '../../../ui/RefreshButton';

export const metadata = { title: 'Scheduled reports — Mailmyra staff' };
export const dynamic = 'force-dynamic';

/**
 * Gerçek zamanlama defteri (ReportSchedule + koşu/teslim defterleri).
 * Çalıştırıcı VAR (`npm run reports -w apps/web`, scripts/run-reports.ts,
 * her sabah Plesk Scheduled Task ile) — koşu ve teslim defterleri gerçek
 * koşulardan dolar. `lastRun` alanları yalnız o zamanlama HİÇ koşmadıysa
 * null kalır ve görünüm "Never" der; sahte teslim başarısı üretilmez.
 * `nextRunAt` boşsa kadans matematiğinden türetilir (gelecek plan, geçmiş
 * değil). Zamanlama OLUŞTURMA kontrolü hâlâ bilinçli yok — schedule satırı
 * elle SQL ile açılır.
 */
export default async function Page() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/reports/scheduled');

  let source;
  try {
    source = await listReportSchedules(session.user.id);
  } catch (error) {
    if (error instanceof NotStaffError) redirect('/app');
    throw error;
  }

  const FORMAT_LABEL: Record<string, ReportSchedule['format']> = {
    csv: 'CSV',
    pdf: 'PDF',
    digest: 'Email digest',
  };
  const asCadence = (v: string): ReportSchedule['cadence'] =>
    v === 'daily' || v === 'monthly' ? v : 'weekly';

  const rows: ReportSchedule[] = source.map((r) => {
    const def = REPORT_LIBRARY.find((d) => d.id === r.reportId);
    return {
      id: r.id,
      reportId: r.reportId,
      reportName: def?.name ?? r.reportId,
      cadence: asCadence(r.cadence),
      nextRunAt: r.nextRunAt.toISOString(),
      recipients: r.recipients,
      format: FORMAT_LABEL[r.format] ?? 'CSV',
      owner: r.ownerEmail,
      status:
        r.status === 'paused' ? 'paused' : r.lastRunStatus === 'failed' ? 'attention' : 'active',
      lastRunAt: r.lastRunAt ? r.lastRunAt.toISOString() : null,
      lastRunStatus:
        r.lastRunStatus === 'success' || r.lastRunStatus === 'failed' ? r.lastRunStatus : null,
    };
  });

  return (
    <section>
      <AdminPageHeader
        crumb="Reports / Scheduled"
        title="Scheduled reports"
        support="Cadence, recipients and delivery format — executions and deliveries are written by the scheduled runner (npm run reports, daily Plesk task); schedules are still opened via SQL."
        right={<RefreshButton />}
      />
      <ScheduledReportsView rows={rows} now={Date.now()} />
    </section>
  );
}
